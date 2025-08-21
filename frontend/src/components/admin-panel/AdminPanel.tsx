import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { userApi, groupApi } from '../../utils/api';
import type { User, UserGroup } from '../../types';
import * as XLSX from 'xlsx';
import SMTPsettingsTab from './SMTPsettingsTab';

const AdminPanel: React.FC = () => {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    admins: 0,
    subAdmins: 0,
    regularUsers: 0,
    totalGroups: 0
  });

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'sub-admin' | 'user',
    selectedGroups: [] as string[]
  });

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: ''
  });

  // Edit user states
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editUser, setEditUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'sub-admin' | 'user',
    selectedGroups: [] as string[]
  });

  // Bulk upload states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [csvData, setCsvData] = useState('');
  const [csvError, setCsvError] = useState('');
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Group members modal states
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const [usersResponse, groupsResponse] = await Promise.all([
        userApi.getAllUsers(),
        groupApi.getAllGroups()
      ]);
      
      const userData = usersResponse.data.users;
      const groupData = groupsResponse.data.groups;
      
      setUsers(userData);
      setGroups(groupData);
      
      // Calculate stats
      setStats({
        totalUsers: userData.length,
        admins: userData.filter((u: User) => u.role === 'admin').length,
        subAdmins: userData.filter((u: User) => u.role === 'sub-admin').length,
        regularUsers: userData.filter((u: User) => u.role === 'user').length,
        totalGroups: groupData.length
      });
    } catch (error: any) {
      console.error('Load users error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load users';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userData = {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        groupIDs: newUser.selectedGroups
      };
      
      await userApi.createUser(userData);
      setNewUser({ name: '', email: '', password: '', role: 'user', selectedGroups: [] });
      setShowCreateUser(false);
      loadUsers();
    } catch (error: any) {
      console.error('Create user error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create user';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await groupApi.createGroup(newGroup);
      setNewGroup({ name: '', description: '' });
      setShowCreateGroup(false);
      loadUsers();
    } catch (error: any) {
      console.error('Create group error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create group';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Are you sure you want to delete this group? This will remove all users from the group.')) return;
    try {
      await groupApi.deleteGroup(groupId);
      loadUsers();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to delete group');
    }
  };

  const handleViewGroupMembers = async (group: UserGroup) => {
    try {
      setSelectedGroup(group);
      setShowGroupMembers(true);
      setMemberSearchTerm(''); // Reset search term
      
      // Filter users who belong to this group
      const members = users.filter(user => 
        user.groupIDs && user.groupIDs.includes(group.id)
      );
      setGroupMembers(members);
    } catch (error: any) {
      console.error('Load group members error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load group members';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }
  };

  const handleRemoveMemberFromGroup = async (userId: string, groupId: string) => {
    if (!window.confirm('Are you sure you want to remove this member from the group?')) return;
    
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const updatedGroupIDs = (user.groupIDs || []).filter(id => id !== groupId);
      
      await userApi.updateUser(userId, { groupIDs: updatedGroupIDs });
      
      // Update local state
      setGroupMembers(prev => prev.filter(member => member.id !== userId));
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, groupIDs: updatedGroupIDs } : u
      ));
      
      // Show success message
      setError(''); // Clear any existing errors
    } catch (error: any) {
      console.error('Remove member error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to remove member';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }
  };

  // Bulk upload functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.oasis.opendocument.spreadsheet'
    ];

    const allowedExtensions = ['.csv', '.xls', '.xlsx', '.ods'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      setFileError('Please select a CSV, XLS, XLSX, or ODS file.');
      return;
    }

    setSelectedFile(file);
    setFileError('');
  };

  const parseFileData = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          let workbook: XLSX.WorkBook;
          
          if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
            workbook = XLSX.read(data, { type: 'string' });
          } else {
            workbook = XLSX.read(data, { type: 'array' });
          }
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          resolve(jsonData as any[]);
        } catch (error) {
          reject(new Error('Failed to parse file. Please check the file format.'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file.'));
      };
      
      if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    
    setFileError('');
    setIsUploading(true);
    
    try {
      const rawData = await parseFileData(selectedFile);
      
      if (rawData.length < 2) {
        setFileError('File must contain at least a header row and one data row.');
        setIsUploading(false);
        return;
      }
      
      const headers = rawData[0].map((h: string) => h.toString().toLowerCase().trim());
      const requiredHeaders = ['email'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        setFileError(`Missing required header: email`);
        setIsUploading(false);
        return;
      }
      
      const results: any[] = [];
      const successfulUsers: any[] = [];
      
      for (let i = 1; i < rawData.length; i++) {
        const values = rawData[i];
        const row: any = {};
        
        headers.forEach((header: string, index: number) => {
          row[header] = values[index]?.toString().trim() || '';
        });
        
        const result = {
          rowNumber: i + 1,
          name: row.name,
          email: row.email,
          role: row.role,
          groups: row.groups,
          status: 'processing',
          message: '',
          success: false
        };
        
        // Only email is required
        if (!row.email) {
          result.status = 'error';
          result.message = 'Email is required';
          result.success = false;
          results.push(result);
          continue;
        }

        // Default name to email if empty
        const name = row.name?.trim() ? row.name.trim() : row.email.trim();

        // Generate password if empty
        const password = row.password?.trim() ? row.password.trim() : generatePassword();

        // Default role to 'user' if empty or invalid
        const role = ['admin', 'sub-admin', 'user'].includes(row.role?.trim()) ? row.role.trim() : 'user';
        
        // Process groups if provided
        const { groupIds, invalidNames } = getGroupIdsFromNames(row.groups || '');
        
        // Add warning for invalid group names
        if (invalidNames.length > 0) {
          result.message = `Warning: Invalid group names: ${invalidNames.join(', ')}. User will be created without these groups.`;
        }
        
        try {
          const response = await userApi.createUser({
            name,
            email: row.email.trim(),
            password,
            role,
            groupIDs: groupIds
          });
          
          result.status = 'success';
          result.message = 'User created successfully';
          result.success = true;
          successfulUsers.push(response.data.user);
          results.push(result);
        } catch (error: any) {
          result.status = 'error';
          result.message = error.response?.data?.error || 'Failed to create user';
          result.success = false;
          results.push(result);
        }
      }
      
      // Update the users list with successful creations
      if (successfulUsers.length > 0) {
        setUsers([...users, ...successfulUsers]);
        loadUsers(); // Reload to get updated stats
      }
      
      setUploadResults(results);
      setShowResults(true);
      setSelectedFile(null);
      
    } catch (error: any) {
      setFileError(error.message || 'Failed to process file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCsvUpload = async () => {
    setCsvError('');
    setIsUploading(true);
    
    try {
      const lines = csvData.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      const requiredHeaders = ['email'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        setCsvError(`Missing required header: email`);
        setIsUploading(false);
        return;
      }

      const results: any[] = [];
      const successfulUsers: any[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        const result = {
          rowNumber: i + 1,
          name: row.name,
          email: row.email,
          role: row.role,
          groups: row.groups,
          status: 'processing',
          message: '',
          success: false
        };

        // Only email is required
        if (!row.email) {
          result.status = 'error';
          result.message = 'Email is required';
          result.success = false;
          results.push(result);
          continue;
        }

        // Default name to email if empty
        const name = row.name?.trim() ? row.name.trim() : row.email.trim();

        // Generate password if empty
        const password = row.password?.trim() ? row.password.trim() : generatePassword();

        // Default role to 'user' if empty or invalid
        const role = ['admin', 'sub-admin', 'user'].includes(row.role?.trim()) ? row.role.trim() : 'user';

        // Process groups if provided
        const { groupIds, invalidNames } = getGroupIdsFromNames(row.groups || '');
        
        // Add warning for invalid group names
        if (invalidNames.length > 0) {
          result.message = `Warning: Invalid group names: ${invalidNames.join(', ')}. User will be created without these groups.`;
        }

        try {
          const response = await userApi.createUser({
            name,
            email: row.email.trim(),
            password,
            role,
            groupIDs: groupIds
          });
          
          result.status = 'success';
          result.message = 'User created successfully';
          result.success = true;
          successfulUsers.push(response.data.user);
          results.push(result);
        } catch (error: any) {
          result.status = 'error';
          result.message = error.response?.data?.error || 'Failed to create user';
          result.success = false;
          results.push(result);
        }
      }

      // Update the users list with successful creations
      if (successfulUsers.length > 0) {
        setUsers([...users, ...successfulUsers]);
        loadUsers(); // Reload to get updated stats
      }

      setUploadResults(results);
      setShowResults(true);
      setCsvData('');
      
    } catch (error) {
      setCsvError('Invalid CSV format. Please check your data.');
    } finally {
      setIsUploading(false);
    }
  };

  // Helper function to convert group names to group IDs
  const getGroupIdsFromNames = (groupNames: string): { groupIds: string[]; invalidNames: string[] } => {
    if (!groupNames || !groupNames.trim()) return { groupIds: [], invalidNames: [] };
    
    const names = groupNames.split(';').map(name => name.trim()).filter(name => name);
    const groupIds: string[] = [];
    const invalidNames: string[] = [];
    
    for (const name of names) {
      const group = groups.find(g => g.name.toLowerCase() === name.toLowerCase());
      if (group) {
        groupIds.push(group.id);
      } else {
        invalidNames.push(name);
      }
    }
    
    return { groupIds, invalidNames };
  };

  const downloadCsvTemplate = () => {
    const csvTemplate = `name,email,password,role,groups
John Doe,john@example.com,password123,user,Group A;Group B
Jane Smith,jane@example.com,admin123,admin,Admin Group
Bob Wilson,bob@example.com,subadmin123,sub-admin,`;
    
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setShowResults(false);
    setUploadResults([]);
    setSelectedFile(null);
    setCsvData('');
    setFileError('');
    setCsvError('');
    setIsUploading(false);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'sub-admin': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
          </svg>
        );
      case 'sub-admin':
        return (
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await userApi.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      loadUsers();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditUser({
      name: user.name,
      email: user.email,
      password: '', // Don't populate password for security
      role: user.role as 'admin' | 'sub-admin' | 'user',
      selectedGroups: user.groupIDs || []
    });
    setShowEditUser(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      const updateData: any = {
        name: editUser.name,
        email: editUser.email,
        role: editUser.role,
        groupIDs: editUser.selectedGroups
      };
      
      // Only include password if it's provided
      if (editUser.password.trim()) {
        updateData.password = editUser.password;
      }
      
      await userApi.updateUser(editingUser.id, updateData);
      setShowEditUser(false);
      setEditingUser(null);
      setEditUser({ name: '', email: '', password: '', role: 'user', selectedGroups: [] });
      loadUsers();
    } catch (error: any) {
      console.error('Update user error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update user';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">This area is restricted to administrators only.</p>
          <Link to="/dashboard" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
                  <p className="text-xs text-gray-500">Voter98 Management</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L4.414 9H17a1 1 0 110 2H4.414l5.293 5.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to Dashboard
              </Link>
              
              <button
                onClick={logout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 hover-lift cursor-pointer"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Admin Welcome */}
        <div className="mb-8 animate-fade-in">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">
                  Admin Control Center ⚡
                </h2>
                <p className="text-purple-100 text-lg">
                  Manage users, polls, and monitor the entire voting platform.
                </p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-xl p-4">
                <div className="text-center">
                  <p className="text-purple-900 text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-purple-900 text-sm">Total Users</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover-lift animate-fade-in">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                <p className="text-gray-600 text-sm">Total Users</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover-lift animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.admins}</p>
                <p className="text-gray-600 text-sm">Admins</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover-lift animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.subAdmins}</p>
                <p className="text-gray-600 text-sm">Sub-Admins</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover-lift animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.regularUsers}</p>
                <p className="text-gray-600 text-sm">Regular Users</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg animate-slide-in-right">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-red-700 font-medium">{error}</span>
          </div>
        )}

        {/* Main Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                key="users"
                onClick={() => setActiveTab('users')}
                className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors duration-200 cursor-pointer ${
                  activeTab === 'users'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">👥</span>
                User Management
              </button>
              <button
                key="groups"
                onClick={() => setActiveTab('groups')}
                className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors duration-200 cursor-pointer ${
                  activeTab === 'groups'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">🏷️</span>
                Group Management
              </button>
              <button
                key="smtp"
                onClick={() => setActiveTab('smtp')}
                className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors duration-200 cursor-pointer ${
                  activeTab === 'smtp'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">📧</span>
                SMTP Management
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'users' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">User Management</h3>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowCreateUser(!showCreateUser)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 hover-lift cursor-pointer"
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Create New User
                    </button>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Upload Users
                    </button>
                  </div>
                </div>

                {/* Create User Form */}
                {showCreateUser && (
                  <div className="bg-gray-50 rounded-xl p-6 mb-6 animate-slide-in-right">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Create New User</h4>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                          <input
                            type="text"
                            value={newUser.name}
                            onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                            required
                            placeholder="Enter user's full name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                          <input
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                            required
                            placeholder="Enter user's email"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                          <input
                            type="password"
                            value={newUser.password}
                            onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                            required
                            placeholder="Enter user's password"
                            minLength={6}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                          <select
                            value={newUser.role}
                            onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                          >
                            <option value="user">User</option>
                            <option value="sub-admin">Sub-Admin</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Groups</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3">
                          {groups.map((group) => (
                            <label key={group.id} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newUser.selectedGroups.includes(group.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewUser({
                                      ...newUser,
                                      selectedGroups: [...newUser.selectedGroups, group.id]
                                    });
                                  } else {
                                    setNewUser({
                                      ...newUser,
                                      selectedGroups: newUser.selectedGroups.filter(id => id !== group.id)
                                    });
                                  }
                                }}
                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-sm text-gray-700">{group.name}</span>
                            </label>
                          ))}
                          {groups.length === 0 && (
                            <span className="text-sm text-gray-500 col-span-full">No groups available</span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          type="submit"
                          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 hover-lift cursor-pointer"
                        >
                          Create User
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCreateUser(false)}
                          className="flex-1 bg-gray-300 text-gray-700 font-medium py-3 px-6 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Edit User Form */}
                {showEditUser && editingUser && (
                  <div className="bg-gray-50 rounded-xl p-6 mb-6 animate-slide-in-right">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Edit User: {editingUser.name}</h4>
                    <form onSubmit={handleUpdateUser} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                          <input
                            type="text"
                            value={editUser.name}
                            onChange={(e) => setEditUser({...editUser, name: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                            required
                            placeholder="Enter user's full name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                          <input
                            type="email"
                            value={editUser.email}
                            onChange={(e) => setEditUser({...editUser, email: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                            required
                            placeholder="Enter user's email"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                          <input
                            type="password"
                            value={editUser.password}
                            onChange={(e) => setEditUser({...editUser, password: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                            placeholder="Leave blank to keep current password"
                            minLength={6}
                          />
                          <p className="text-xs text-gray-500 mt-1">Leave blank to keep the current password</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                          <select
                            value={editUser.role}
                            onChange={(e) => setEditUser({...editUser, role: e.target.value as 'admin' | 'sub-admin' | 'user'})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                          >
                            <option value="user">User</option>
                            <option value="sub-admin">Sub-Admin</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Groups</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3">
                          {groups.map((group) => (
                            <label key={group.id} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editUser.selectedGroups.includes(group.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditUser({
                                      ...editUser,
                                      selectedGroups: [...editUser.selectedGroups, group.id]
                                    });
                                  } else {
                                    setEditUser({
                                      ...editUser,
                                      selectedGroups: editUser.selectedGroups.filter(id => id !== group.id)
                                    });
                                  }
                                }}
                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-sm text-gray-700">{group.name}</span>
                            </label>
                          ))}
                          {groups.length === 0 && (
                            <span className="text-sm text-gray-500 col-span-full">No groups available</span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          type="submit"
                          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 hover-lift cursor-pointer"
                        >
                          Update User
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowEditUser(false);
                            setEditingUser(null);
                            setEditUser({ name: '', email: '', password: '', role: 'user', selectedGroups: [] });
                          }}
                          className="flex-1 bg-gray-300 text-gray-700 font-medium py-3 px-6 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Users Table */}
                <div className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Groups</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-200">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                                  <span className="text-white font-semibold text-sm">
                                    {user.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                  <div className="text-sm text-gray-500">ID: {user.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{user.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                                {getRoleIcon(user.role)}
                                <span className="ml-1">{user.role.toUpperCase()}</span>
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-wrap gap-1">
                                {user.groups && user.groups.length > 0 ? (
                                  user.groups.map((group) => (
                                    <span
                                      key={group.id}
                                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                                    >
                                      {group.name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-sm text-gray-500">No groups</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                <button 
                                  className="text-blue-600 hover:text-blue-900 font-medium transition-colors duration-200 cursor-pointer"
                                  onClick={() => handleEditUser(user)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="text-red-600 hover:text-red-900 font-medium transition-colors duration-200 cursor-pointer"
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'groups' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Group Management</h3>
                  <button
                    onClick={() => setShowCreateGroup(!showCreateGroup)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 hover-lift cursor-pointer"
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Create New Group
                  </button>
                </div>

                {/* Groups Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Total Groups</p>
                        <p className="text-2xl font-bold">{groups.length}</p>
                      </div>
                      <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Total Members</p>
                        <p className="text-2xl font-bold">
                          {users.reduce((total, user) => total + (user.groupIDs?.length || 0), 0)}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Active Groups</p>
                        <p className="text-2xl font-bold">
                          {groups.filter(group => 
                            users.some(user => user.groupIDs?.includes(group.id))
                          ).length}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Avg Members</p>
                        <p className="text-2xl font-bold">
                          {groups.length > 0 
                            ? Math.round(users.reduce((total, user) => total + (user.groupIDs?.length || 0), 0) / groups.length)
                            : 0
                          }
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Create Group Form */}
                {showCreateGroup && (
                  <div className="bg-gray-50 rounded-xl p-6 mb-6 animate-slide-in-right">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Create New Group</h4>
                    <form onSubmit={handleCreateGroup} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
                          <input
                            type="text"
                            value={newGroup.name}
                            onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                            required
                            placeholder="Enter group name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                          <input
                            type="text"
                            value={newGroup.description}
                            onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                            placeholder="Enter group description (optional)"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          type="submit"
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                        >
                          Create Group
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCreateGroup(false)}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Groups List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {groups.map((group) => (
                          <tr key={group.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center mr-3">
                                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                  </svg>
                                </div>
                                <div>
                                  <button
                                    onClick={() => handleViewGroupMembers(group)}
                                    className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors duration-200 cursor-pointer"
                                  >
                                    {group.name}
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{group.description || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {users.filter(user => user.groupIDs?.includes(group.id)).length} members
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(group.createdAt || Date.now()).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleDeleteGroup(group.id)}
                                className="text-red-600 hover:text-red-900 transition-colors duration-200"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'smtp' && <SMTPsettingsTab />}
          </div>
        </div>
      </main>

      {/* Upload Users Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 backdrop-filter backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {showResults ? 'Upload Results' : 'Upload Users'}
                </h3>
                <button
                  onClick={handleCloseUploadModal}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {showResults ? (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Success Card */}
                    <div className="bg-green-50 rounded-lg p-4 flex items-center">
                      <svg className="h-6 w-6 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-green-600">Success</p>
                        <p className="text-lg font-semibold text-green-900">{uploadResults.filter(r => r.success).length}</p>
                        <p className="text-xs text-green-700">Users created successfully</p>
                      </div>
                    </div>
                    {/* Alert Card */}
                    <div className="bg-yellow-50 rounded-lg p-4 flex items-center">
                      <svg className="h-6 w-6 text-yellow-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-yellow-600">Alerts</p>
                        <p className="text-lg font-semibold text-yellow-900">{uploadResults.filter(r => r.status === 'error' && r.message && r.message.toLowerCase().includes('already exists')).length}</p>
                        <p className="text-xs text-yellow-700">Users already existed</p>
                      </div>
                    </div>
                    {/* Error Card */}
                    <div className="bg-red-50 rounded-lg p-4 flex items-center">
                      <svg className="h-6 w-6 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-red-600">Errors</p>
                        <p className="text-lg font-semibold text-red-900">{uploadResults.filter(r => r.status === 'error' && (!r.message || !r.message.toLowerCase().includes('already exists'))).length}</p>
                        <p className="text-xs text-red-700">Other errors</p>
                      </div>
                    </div>
                  </div>

                  {/* Results Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Groups</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {uploadResults.map((result, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">{result.rowNumber || index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{result.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{result.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{result.role || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{result.groups || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {result.success ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Success</span>
                              ) : result.status === 'error' && result.message && result.message.toLowerCase().includes('already exists') ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Alert: {result.message}</span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Error: {result.message}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleCloseUploadModal}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                /* Upload Form */
                <div className="space-y-4">
                  {/* Upload Mode Tabs */}
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                      <button
                        onClick={() => setUploadMode('file')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                          uploadMode === 'file'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                        disabled={isUploading}
                      >
                        Upload File
                      </button>
                      <button
                        onClick={() => setUploadMode('text')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                          uploadMode === 'text'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                        disabled={isUploading}
                      >
                        Paste Data
                      </button>
                    </nav>
                  </div>

                  {/* Download Template Button */}
                  <div>
                    <button
                      onClick={downloadCsvTemplate}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                      disabled={isUploading}
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Download CSV Template
                    </button>
                  </div>

                  {uploadMode === 'file' ? (
                    /* File Upload Mode */
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select File
                        </label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                          <div className="space-y-1 text-center">
                            <svg
                              className="mx-auto h-12 w-12 text-gray-400"
                              stroke="currentColor"
                              fill="none"
                              viewBox="0 0 48 48"
                            >
                              <path
                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <div className="flex text-sm text-gray-600">
                              <label
                                htmlFor="file-upload"
                                className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                              >
                                <span>Upload a file</span>
                                <input
                                  id="file-upload"
                                  name="file-upload"
                                  type="file"
                                  className="sr-only"
                                  accept=".csv,.xls,.xlsx,.ods"
                                  onChange={handleFileSelect}
                                  disabled={isUploading}
                                />
                              </label>
                              <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500">
                              CSV, XLS, XLSX, or ODS files only
                            </p>
                            {selectedFile && (
                              <p className="text-sm text-green-600 mt-2">
                                Selected: {selectedFile.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {fileError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                          {fileError}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Manual Text Input Mode */
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CSV Data
                        </label>
                        <textarea
                          value={csvData}
                          onChange={(e) => setCsvData(e.target.value)}
                          rows={10}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                          placeholder="name,email,password,role,groups&#10;John Doe,john@example.com,password123,user,Group A;Group B&#10;Jane Smith,jane@example.com,admin123,admin,Admin Group&#10;Bob Wilson,bob@example.com,subadmin123,sub-admin,"
                          disabled={isUploading}
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Required columns: name, email, password, role. Optional: groups (semicolon-separated group names). Allowed roles: user, sub-admin, admin
                        </p>
                      </div>

                      {csvError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                          {csvError}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseUploadModal}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer"
                      disabled={isUploading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={uploadMode === 'file' ? handleFileUpload : handleCsvUpload}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      disabled={isUploading || (uploadMode === 'file' ? !selectedFile : !csvData.trim())}
                    >
                      {isUploading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </div>
                      ) : (
                        'Upload Users'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Group Members Modal */}
      {showGroupMembers && selectedGroup && (
        <div className="fixed inset-0 backdrop-filter backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Group Members: {selectedGroup.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedGroup.description || 'No description'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowGroupMembers(false);
                    setSelectedGroup(null);
                    setGroupMembers([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {groupMembers.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      {groupMembers.length} member{groupMembers.length !== 1 ? 's' : ''} in this group
                    </p>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={memberSearchTerm}
                      onChange={(e) => setMemberSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupMembers
                        .filter(member => 
                          member.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                          member.email.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                          member.role.toLowerCase().includes(memberSearchTerm.toLowerCase())
                        )
                        .map((member) => (
                        <div key={member.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {member.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {member.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {member.email}
                              </p>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(member.role)}`}>
                                {getRoleIcon(member.role)}
                                <span className="ml-1">{member.role.toUpperCase()}</span>
                              </span>
                            </div>
                            <button
                              onClick={() => handleRemoveMemberFromGroup(member.id, selectedGroup!.id)}
                              className="text-red-500 hover:text-red-700 transition-colors duration-200 p-1"
                              title="Remove from group"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {groupMembers.filter(member => 
                      member.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                      member.email.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                      member.role.toLowerCase().includes(memberSearchTerm.toLowerCase())
                    ).length === 0 && memberSearchTerm && (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No members found matching "{memberSearchTerm}"</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Members</h3>
                  <p className="text-gray-500">
                    This group doesn't have any members yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

// Helper to generate password
function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let pass = '';
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}
