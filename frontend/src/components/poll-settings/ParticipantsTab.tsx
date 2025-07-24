import React, { useState, useEffect } from 'react';
import type { Poll, PollPermissions } from '../../types';
import { pollApi } from '../../utils/api';
import * as XLSX from 'xlsx';

interface ParticipantsTabProps {
  poll: Poll;
  permissions: PollPermissions;
  onSave: (updates: Partial<Poll>) => void;
  saving: boolean;
}

const ParticipantsTab: React.FC<ParticipantsTabProps> = ({ poll, permissions }) => {
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [csvError, setCsvError] = useState('');
  const [addParticipantError, setAddParticipantError] = useState('');
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set());
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    email: '',
    isUser: undefined as boolean | undefined, // undefined = auto-detect
    voteWeight: 1.0,
    token: ''
  });

  useEffect(() => {
    if (poll?.id) {
      loadParticipants();
    }
  }, [poll?.id]);

  const loadParticipants = async () => {
    if (!poll?.id) return;
    
    try {
      const response = await pollApi.getParticipants(poll.id);
      setParticipants(response.data.participants);
    } catch (error) {
      console.error('Failed to load participants:', error);
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  };

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
            // For CSV files
            workbook = XLSX.read(data, { type: 'string' });
          } else {
            // For Excel and ODS files
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
    if (!selectedFile || !poll?.id) return;
    
    setFileError('');
    setIsUploading(true);
    const results: any[] = [];
    
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
        setFileError(`Missing required headers: ${missingHeaders.join(', ')}`);
        setIsUploading(false);
        return;
      }
      
      const addedParticipants = [];
      
      for (let i = 1; i < rawData.length; i++) {
        const values = rawData[i];
        const row: any = {};
        
        headers.forEach((header: string, index: number) => {
          row[header] = values[index]?.toString().trim() || '';
        });
        
        const rowResult = {
          rowNumber: i + 1,
          name: row.name || row.email || '',
          originalName: row.name || row.email || '', // Keep track of original name
          email: row.email || '',
          isUser: 'Auto-detected', // Will be determined by backend
          voteWeight: parseFloat(row.vote_weight) || 1.0,
          token: '',
          status: '',
          message: '',
          success: false,
          systemNameUsed: false
        };
        
        if (!row.email) {
          rowResult.status = 'Error';
          rowResult.message = 'Email is required';
          results.push(rowResult);
          continue;
        }
        
        const voteWeight = parseFloat(row.vote_weight) || 1.0;
        const token = row.token || undefined;
        rowResult.token = token || 'Auto-generated if needed';
        
        try {
          const participantData: any = {
            name: row.name || row.email,
            email: row.email,
            voteWeight
          };
          
          // Only include token if explicitly provided
          if (token) {
            participantData.token = token;
          }
          
          const response = await pollApi.addParticipant(poll.id, participantData);
          
          addedParticipants.push(response.data.participant);
          rowResult.status = 'Success';
          rowResult.message = 'Participant added successfully';
          rowResult.success = true;
          rowResult.isUser = response.data.participant.isUser ? 'Yes (Registered User)' : 'No (External)';
          rowResult.token = response.data.participant.token || 'N/A';
          
          // Handle system name usage
          if (response.data.systemNameUsed) {
            rowResult.systemNameUsed = true;
            // Keep the original name for display, but note that system name was used
            rowResult.message = `User already exists, system name '${response.data.participant.name}' will be used`;
          }
        } catch (error: any) {
          rowResult.status = 'Error';
          rowResult.message = error.response?.data?.message || error.response?.data?.error || 'Failed to add participant';
        }
        
        results.push(rowResult);
      }
      
      // Update participants list with successfully added ones
      if (addedParticipants.length > 0) {
        setParticipants([...participants, ...addedParticipants]);
      }
      
      setUploadResults(results);
      setShowResults(true);
      
    } catch (error: any) {
      setFileError(error.message || 'Failed to process file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloseUploadModal = () => {
    setShowCsvModal(false);
    setSelectedFile(null);
    setCsvData('');
    setFileError('');
    setCsvError('');
    setUploadResults([]);
    setShowResults(false);
    setIsUploading(false);
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!poll?.id) return;
    
    setAddParticipantError('');
    setIsAddingParticipant(true);
    
    try {
      const participantData: any = {
        name: newParticipant.name || newParticipant.email,
        email: newParticipant.email,
        voteWeight: newParticipant.voteWeight
      };
      
      // Only include token if provided
      if (newParticipant.token) {
        participantData.token = newParticipant.token;
      }
      
      const response = await pollApi.addParticipant(poll.id, participantData);
      
      setParticipants([...participants, response.data.participant]);
      setNewParticipant({ name: '', email: '', isUser: undefined, voteWeight: 1.0, token: '' });
      setShowAddModal(false);
    } catch (error: any) {
      console.error('Failed to add participant:', error);
      
      // Extract error message properly
      let errorMessage = 'Failed to add participant';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.details && Array.isArray(errorData.details) && errorData.details.length > 0) {
          errorMessage = errorData.details[0].message || errorMessage;
        }
      }
      
      setAddParticipantError(errorMessage);
    } finally {
      setIsAddingParticipant(false);
    }
  };

  const handleCsvUpload = async () => {
    setCsvError('');
    setIsUploading(true);
    const results: any[] = [];
    
    if (!poll?.id) return;
    
    try {
      const lines = csvData.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      const requiredHeaders = ['email'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        setCsvError(`Missing required headers: ${missingHeaders.join(', ')}`);
        setIsUploading(false);
        return;
      }

      const addedParticipants = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        const rowResult = {
          rowNumber: i + 1,
          name: row.name || row.email || '',
          originalName: row.name || row.email || '', // Keep track of original name
          email: row.email || '',
          isUser: 'Auto-detected', // Will be determined by backend
          voteWeight: parseFloat(row.vote_weight) || 1.0,
          token: '',
          status: '',
          message: '',
          success: false,
          systemNameUsed: false
        };

        if (!row.email) {
          rowResult.status = 'Error';
          rowResult.message = 'Email is required';
          results.push(rowResult);
          continue;
        }

        // Only include isUser if explicitly provided in the CSV
        const voteWeight = parseFloat(row.vote_weight) || 1.0;
        const token = row.token || undefined;
        rowResult.token = token || 'Auto-generated if needed';

        try {
          const participantData: any = {
            name: row.name || row.email,
            email: row.email,
            voteWeight
          };
          
          // Only include token if explicitly provided
          if (token) {
            participantData.token = token;
          }
          
          const response = await pollApi.addParticipant(poll.id, participantData);
          
          addedParticipants.push(response.data.participant);
          rowResult.status = 'Success';
          rowResult.message = 'Participant added successfully';
          rowResult.success = true;
          rowResult.isUser = response.data.participant.isUser ? 'Yes (Registered User)' : 'No (External)';
          rowResult.token = response.data.participant.token || 'N/A';
          
          // Handle system name usage
          if (response.data.systemNameUsed) {
            rowResult.systemNameUsed = true;
            // Keep the original name for display, but note that system name was used
            rowResult.message = `User already exists, system name '${response.data.participant.name}' will be used`;
          }
        } catch (error: any) {
          rowResult.status = 'Error';
          rowResult.message = error.response?.data?.message || error.response?.data?.error || 'Failed to add participant';
        }
        
        results.push(rowResult);
      }

      // Update participants list with successfully added ones
      if (addedParticipants.length > 0) {
        setParticipants([...participants, ...addedParticipants]);
      }
      
      setUploadResults(results);
      setShowResults(true);
      
    } catch (error) {
      setCsvError('Invalid CSV format. Please check your data.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!poll?.id) return;
    
    try {
      await pollApi.removeParticipant(poll.id, participantId);
      setParticipants(participants.filter(p => p.id !== participantId));
    } catch (error: any) {
      console.error('Failed to remove participant:', error);
      alert(error.response?.data?.error || 'Failed to remove participant');
    }
  };

  const handleUpdateWeight = async (participantId: string, newWeight: number) => {
    if (!poll?.id) return;
    
    try {
      await pollApi.updateParticipant(poll.id, participantId, { voteWeight: newWeight });
      setParticipants(participants.map(p => 
        p.id === participantId ? { ...p, voteWeight: newWeight } : p
      ));
    } catch (error: any) {
      console.error('Failed to update participant weight:', error);
      alert(error.response?.data?.error || 'Failed to update participant weight');
    }
  };

  const handleRegenerateToken = async (participantId: string) => {
    if (!poll?.id) return;
    
    try {
      const newToken = `tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await pollApi.updateParticipant(poll.id, participantId, { token: newToken });
      setParticipants(participants.map(p => 
        p.id === participantId ? { ...p, token: newToken } : p
      ));
    } catch (error: any) {
      console.error('Failed to regenerate token:', error);
      alert(error.response?.data?.error || 'Failed to regenerate token');
    }
  };

  const toggleTokenVisibility = (participantId: string) => {
    setVisibleTokens(prev => {
      const newSet = new Set(prev);
      if (newSet.has(participantId)) {
        newSet.delete(participantId);
      } else {
        newSet.add(participantId);
      }
      return newSet;
    });
  };

  const downloadCsvTemplate = () => {
    const csvTemplate = `email,name,vote_weight,token
john@example.com,John Doe,1.0,
jane@external.com,,1.5,custom_token_123
bob@example.com,Bob Wilson,2.0,
sarah@external.com,Sarah Connor,1.0,sarah_token_456`;
    
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'participants_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Participants Management</h3>
        {permissions.canManageParticipants && (
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowAddModal(true);
                setAddParticipantError('');
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Participant
            </button>
            <button
              onClick={() => setShowCsvModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
            >
              Upload File
            </button>
          </div>
        )}
      </div>

      {/* Participants Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Total Participants</p>
              <p className="text-lg font-semibold text-blue-900">{participants.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Registered Users</p>
              <p className="text-lg font-semibold text-green-900">{participants.filter(p => p.isUser).length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-600">External Participants</p>
              <p className="text-lg font-semibold text-yellow-900">{participants.filter(p => !p.isUser).length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600">Voted</p>
              <p className="text-lg font-semibold text-purple-900">{participants.filter(p => p.hasVoted).length}</p>
            </div>
          </div>
        </div>
      </div>

      {participants.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No participants yet</h3>
          <p className="text-gray-500 mb-4">
            {permissions.canManageParticipants 
              ? "Add participants who can vote in this poll. You can add them individually or upload a CSV file."
              : "No participants have been added to this poll yet."
            }
          </p>
          {permissions.canManageParticipants && (
            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => {
                  setShowAddModal(true);
                  setAddParticipantError('');
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
              >
                Add Individual Participant
              </button>
              <button
                onClick={() => setShowCsvModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
              >
                Upload File
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vote Weight
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Voted
                    </th>
                    <th className="px-18 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Token/Access
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {participants.map((participant) => (
                    <tr key={participant.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{participant.name}</div>
                          <div className="text-sm text-gray-500">{participant.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          participant.isUser 
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {participant.isUser ? 'Registered User' : 'External'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          participant.status === 'approved' 
                            ? 'bg-green-100 text-green-800'
                            : participant.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {participant.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {poll.settings.voteWeightEnabled ? (
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={participant.voteWeight}
                            onChange={(e) => handleUpdateWeight(participant.id, parseFloat(e.target.value))}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-sm text-gray-900">{participant.voteWeight}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {participant.hasVoted ? (
                            <>
                              <svg className="w-4 h-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm text-green-600">Yes</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 text-gray-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm text-gray-500">No</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {participant.isUser ? (
                          <span className="text-green-600 font-medium">System Login</span>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded flex-1">
                                {visibleTokens.has(participant.id) ? (
                                  participant.token
                                ) : (
                                  '••••••••••••'
                                )}
                              </div>
                              <button
                                onClick={() => toggleTokenVisibility(participant.id)}
                                className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
                                title={visibleTokens.has(participant.id) ? 'Hide token' : 'Show token'}
                              >
                                {visibleTokens.has(participant.id) ? (
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </button>
                            </div>
                            {permissions.canManageParticipants && (
                              <button
                                onClick={() => handleRegenerateToken(participant.id)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Regenerate Token
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {permissions.canManageParticipants && (
                          <button
                            onClick={() => handleRemoveParticipant(participant.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Participant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 backdrop-filter backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add Participant</h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setAddParticipantError('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAddParticipant} className="space-y-4">
                {addParticipantError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{addParticipantError}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-gray-500 text-xs">(optional, defaults to email)</span>
                  </label>
                  <input
                    type="text"
                    value={newParticipant.name}
                    onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Leave blank to use email as name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newParticipant.email}
                    onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Participant Type
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="autoDetect"
                        name="userType"
                        checked={newParticipant.isUser === undefined}
                        onChange={() => setNewParticipant({ ...newParticipant, isUser: undefined })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor="autoDetect" className="ml-2 block text-sm text-gray-900">
                        Auto-detect (check if email exists in system)
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="forceUser"
                        name="userType"
                        checked={newParticipant.isUser === true}
                        onChange={() => setNewParticipant({ ...newParticipant, isUser: true })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor="forceUser" className="ml-2 block text-sm text-gray-900">
                        Force as registered user
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="forceExternal"
                        name="userType"
                        checked={newParticipant.isUser === false}
                        onChange={() => setNewParticipant({ ...newParticipant, isUser: false })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor="forceExternal" className="ml-2 block text-sm text-gray-900">
                        Force as external participant
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vote Weight
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={newParticipant.voteWeight}
                    onChange={(e) => setNewParticipant({ ...newParticipant, voteWeight: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {(newParticipant.isUser === false || newParticipant.isUser === undefined) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Token (Optional)
                    </label>
                    <input
                      type="text"
                      value={newParticipant.token}
                      onChange={(e) => setNewParticipant({ ...newParticipant, token: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Leave empty to generate automatically"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {newParticipant.isUser === undefined 
                        ? "Token will be generated only if participant is external"
                        : "Token will be generated for external participant"
                      }
                    </p>
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setAddParticipantError('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingParticipant}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isAddingParticipant ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Adding...
                      </>
                    ) : (
                      'Add Participant'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 backdrop-filter backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {showResults ? 'Upload Results' : 'Upload Participants'}
                </h3>
                <button
                  onClick={handleCloseUploadModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {showResults ? (
                /* Results Table */
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <h4 className="font-medium text-blue-900">Upload Complete</h4>
                        <p className="text-sm text-blue-700">
                          {uploadResults.filter(r => r.success).length} out of {uploadResults.length} participants added successfully.
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Green Card: Success Summary */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold text-green-800">Success</span>
                      </div>
                      <ul className="text-sm text-green-700 list-disc ml-6">
                        <li>Registered-user participants added: {uploadResults.filter(r => r.success && r.isUser && r.isUser.includes('Registered User')).length}</li>
                        <li>External participants added: {uploadResults.filter(r => r.success && r.isUser && r.isUser.includes('External')).length}</li>
                        <li>Total participants added: {uploadResults.filter(r => r.success).length}</li>
                      </ul>
                    </div>
                    {/* Yellow Card: Alerts */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold text-yellow-800">Alerts</span>
                      </div>
                      <ul className="text-sm text-yellow-700 list-disc ml-6">
                        <li>System name used for {uploadResults.filter(r => r.success && r.systemNameUsed).length} user(s)</li>
                      </ul>
                    </div>
                    {/* Red Card: Errors */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold text-red-800">Errors</span>
                      </div>
                      <ul className="text-sm text-red-700 list-disc ml-6">
                        {(() => {
                          // Error breakdown
                          const errorGroups: Record<string, number> = {};
                          uploadResults.filter(r => !r.success).forEach(r => {
                            const msg = r.message || 'Unknown error';
                            errorGroups[msg] = (errorGroups[msg] || 0) + 1;
                          });
                          return (Object.entries(errorGroups) as [string, number][]).map(([msg, count], idx) => (
                            <li key={idx}>{count} {msg} (not added)</li>
                          ));
                        })()}
                      </ul>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Row
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Vote Weight
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Token
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {uploadResults.map((result, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {result.rowNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={result.systemNameUsed ? 'text-yellow-600 font-medium' : 'text-gray-900'}>
                                {result.originalName || result.name}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {result.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                result.isUser && result.isUser.includes('Registered User')
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {result.isUser && result.isUser.includes('Registered User') ? 'Registered User' : 'External'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {result.voteWeight}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                              {result.token}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {result.success ? (
                                result.systemNameUsed ? (
                                  <div className="flex items-start">
                                    <svg className="w-4 h-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <div>
                                      <span className="text-sm text-yellow-600 font-medium">Success (System Name Used)</span>
                                      <p className="text-xs text-yellow-500 mt-1">{result.message}</p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm text-green-600 font-medium">Success</span>
                                  </div>
                                )
                              ) : (
                                <div className="flex items-start">
                                  <svg className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                  <div>
                                    <span className="text-sm text-red-600 font-medium">Error</span>
                                    <p className="text-xs text-red-500 mt-1">{result.message}</p>
                                  </div>
                                </div>
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
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
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
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
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
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
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
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">File input requirements:</h3>
                        <p className="mt-1 text-sm text-blue-700">
                          <strong>Only email is required</strong> - name, vote_weight and token are optional. <br></br><br></br>
                          User type is automatically detected! If an email exists in the system, the participant will be marked as a registered user.<br></br>
                          If the email does not exist, the participant will be marked as an external participant.<br></br>
                          For external participants, you can optionally provide a custom token.<br></br>
                          If no token is provided, one will be generated automatically.<br></br>
                          You can optionally add vote_weight to any user, otherwise the default value (1) will be used.<br></br>
                          You can optionally add the name, otherwise the email will be displayed as participant's name.
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <button
                        onClick={downloadCsvTemplate}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        disabled={isUploading}
                      >
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Download CSV Template
                      </button>
                    </div>
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
                          placeholder="name,email,vote_weight,token&#10;John Doe,john@example.com,1.0,&#10;Jane Smith,jane@external.com,1.5,custom_token_123&#10;Bob Wilson,bob@example.com,2.0,"
                          disabled={isUploading}
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Required columns: email. Optional: name (falls back to email if not provided), vote_weight (default 1.0), token (for external participants). User type will be auto-detected from email.
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
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      disabled={isUploading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={uploadMode === 'file' ? handleFileUpload : handleCsvUpload}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isUploading || (uploadMode === 'file' ? !selectedFile : !csvData.trim())}
                    >
                      {isUploading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </div>
                      ) : (
                        'Upload Participants'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantsTab;
