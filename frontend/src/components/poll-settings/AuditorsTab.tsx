import React, { useState, useEffect } from 'react';
import type { Poll } from '../../types';

interface AuditorsTabProps {
  poll: Poll;
  onSave: (updates: Partial<Poll>) => void;
  saving: boolean;
}

const AuditorsTab: React.FC<AuditorsTabProps> = () => {
  const [auditors, setAuditors] = useState<any[]>([]);
  const [editors, setEditors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAuditorModal, setShowAddAuditorModal] = useState(false);
  const [showAddEditorModal, setShowAddEditorModal] = useState(false);
  const [newAuditor, setNewAuditor] = useState({
    name: '',
    email: '',
    permissions: {
      viewResults: true,
      viewParticipants: true,
      viewAuditLog: true,
      downloadResults: false
    }
  });
  const [newEditor, setNewEditor] = useState({
    name: '',
    email: '',
    permissions: {
      editQuestions: true,
      editSettings: true,
      managePoll: false,
      deleteQuestions: false
    }
  });

  useEffect(() => {
    loadAuditorsAndEditors();
  }, []);

  const loadAuditorsAndEditors = async () => {
    // TODO: Implement API call to fetch auditors and editors
    // For now, using mock data
    setAuditors([
      {
        id: '1',
        name: 'Alice Johnson',
        email: 'alice@company.com',
        role: 'auditor',
        status: 'active',
        permissions: {
          viewResults: true,
          viewParticipants: true,
          viewAuditLog: true,
          downloadResults: true
        },
        addedAt: '2024-01-15',
        lastAccess: '2024-01-20'
      }
    ]);
    
    setEditors([
      {
        id: '1',
        name: 'Bob Chen',
        email: 'bob@company.com',
        role: 'editor',
        status: 'active',
        permissions: {
          editQuestions: true,
          editSettings: true,
          managePoll: false,
          deleteQuestions: false
        },
        addedAt: '2024-01-16',
        lastAccess: '2024-01-19'
      }
    ]);
    
    setLoading(false);
  };

  const handleAddAuditor = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const auditor = {
      id: Date.now().toString(),
      ...newAuditor,
      role: 'auditor',
      status: 'active',
      addedAt: new Date().toISOString().split('T')[0],
      lastAccess: null
    };
    
    setAuditors([...auditors, auditor]);
    setNewAuditor({
      name: '',
      email: '',
      permissions: {
        viewResults: true,
        viewParticipants: true,
        viewAuditLog: true,
        downloadResults: false
      }
    });
    setShowAddAuditorModal(false);
  };

  const handleAddEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const editor = {
      id: Date.now().toString(),
      ...newEditor,
      role: 'editor',
      status: 'active',
      addedAt: new Date().toISOString().split('T')[0],
      lastAccess: null
    };
    
    setEditors([...editors, editor]);
    setNewEditor({
      name: '',
      email: '',
      permissions: {
        editQuestions: true,
        editSettings: true,
        managePoll: false,
        deleteQuestions: false
      }
    });
    setShowAddEditorModal(false);
  };

  const handleRemoveAuditor = (auditorId: string) => {
    setAuditors(auditors.filter(a => a.id !== auditorId));
  };

  const handleRemoveEditor = (editorId: string) => {
    setEditors(editors.filter(e => e.id !== editorId));
  };

  const handleUpdateAuditorPermissions = (auditorId: string, permission: string, value: boolean) => {
    setAuditors(auditors.map(a => 
      a.id === auditorId 
        ? { ...a, permissions: { ...a.permissions, [permission]: value } }
        : a
    ));
  };

  const handleUpdateEditorPermissions = (editorId: string, permission: string, value: boolean) => {
    setEditors(editors.map(e => 
      e.id === editorId 
        ? { ...e, permissions: { ...e.permissions, [permission]: value } }
        : e
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Auditors Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Poll Auditors</h3>
            <p className="text-sm text-gray-500">Users who can monitor and audit poll activity</p>
          </div>
          <button
            onClick={() => setShowAddAuditorModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Auditor
          </button>
        </div>

        {auditors.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <h4 className="text-sm font-medium text-gray-900 mb-1">No auditors assigned</h4>
            <p className="text-sm text-gray-500">Add auditors to monitor poll activity and ensure transparency.</p>
          </div>
        ) : (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Auditor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Permissions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Access
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {auditors.map((auditor) => (
                      <tr key={auditor.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{auditor.name}</div>
                            <div className="text-sm text-gray-500">{auditor.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {Object.entries(auditor.permissions).map(([key, value]) => (
                              <label key={key} className="flex items-center text-sm">
                                <input
                                  type="checkbox"
                                  checked={value as boolean}
                                  onChange={(e) => handleUpdateAuditorPermissions(auditor.id, key, e.target.checked)}
                                  className="h-3 w-3 text-green-600 focus:ring-green-500 border-gray-300 rounded mr-2"
                                />
                                <span className="text-gray-700">
                                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                </span>
                              </label>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            auditor.status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {auditor.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {auditor.lastAccess || 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleRemoveAuditor(auditor.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
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
      </div>

      {/* Editors Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Poll Editors</h3>
            <p className="text-sm text-gray-500">Users who can modify poll content and settings</p>
          </div>
          <button
            onClick={() => setShowAddEditorModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Editor
          </button>
        </div>

        {editors.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <h4 className="text-sm font-medium text-gray-900 mb-1">No editors assigned</h4>
            <p className="text-sm text-gray-500">Add editors to allow collaborative poll management.</p>
          </div>
        ) : (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Editor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Permissions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Access
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {editors.map((editor) => (
                      <tr key={editor.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{editor.name}</div>
                            <div className="text-sm text-gray-500">{editor.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {Object.entries(editor.permissions).map(([key, value]) => (
                              <label key={key} className="flex items-center text-sm">
                                <input
                                  type="checkbox"
                                  checked={value as boolean}
                                  onChange={(e) => handleUpdateEditorPermissions(editor.id, key, e.target.checked)}
                                  className="h-3 w-3 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mr-2"
                                />
                                <span className="text-gray-700">
                                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                </span>
                              </label>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            editor.status === 'active' 
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {editor.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {editor.lastAccess || 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleRemoveEditor(editor.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
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
      </div>

      {/* Add Auditor Modal */}
      {showAddAuditorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add Auditor</h3>
                <button
                  onClick={() => setShowAddAuditorModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAddAuditor} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newAuditor.name}
                    onChange={(e) => setNewAuditor({ ...newAuditor, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newAuditor.email}
                    onChange={(e) => setNewAuditor({ ...newAuditor, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permissions
                  </label>
                  <div className="space-y-2">
                    {Object.entries(newAuditor.permissions).map(([key, value]) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setNewAuditor({
                            ...newAuditor,
                            permissions: { ...newAuditor.permissions, [key]: e.target.checked }
                          })}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddAuditorModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Add Auditor
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Editor Modal */}
      {showAddEditorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add Editor</h3>
                <button
                  onClick={() => setShowAddEditorModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAddEditor} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newEditor.name}
                    onChange={(e) => setNewEditor({ ...newEditor, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newEditor.email}
                    onChange={(e) => setNewEditor({ ...newEditor, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permissions
                  </label>
                  <div className="space-y-2">
                    {Object.entries(newEditor.permissions).map(([key, value]) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setNewEditor({
                            ...newEditor,
                            permissions: { ...newEditor.permissions, [key]: e.target.checked }
                          })}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddEditorModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Add Editor
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditorsTab;
