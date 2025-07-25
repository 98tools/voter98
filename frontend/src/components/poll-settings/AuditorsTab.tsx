import React, { useState, useEffect } from 'react';
import type { Poll, PollPermissions } from '../../types';
import { pollApi } from '../../utils/api';

interface AuditorsTabProps {
  poll: Poll;
  permissions: PollPermissions;
  onSave: (updates: Partial<Poll>) => void;
  saving: boolean;
}

const AuditorsTab: React.FC<AuditorsTabProps> = ({ poll, permissions }) => {
  const [auditors, setAuditors] = useState<any[]>([]);
  const [editors, setEditors] = useState<any[]>([]);
  const [availableSubAdmins, setAvailableSubAdmins] = useState<any[]>([]);
  const [pollManager, setPollManager] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSubAdmins, setLoadingSubAdmins] = useState(false);
  const [showAddAuditorModal, setShowAddAuditorModal] = useState(false);
  const [showAddEditorModal, setShowAddEditorModal] = useState(false);
  const [addingAuditor, setAddingAuditor] = useState(false);
  const [addingEditor, setAddingEditor] = useState(false);
  const [selectedAuditorId, setSelectedAuditorId] = useState('');
  const [selectedEditorId, setSelectedEditorId] = useState('');

  useEffect(() => {
    loadAuditorsAndEditors();
  }, [poll.id]);

  const loadAuditorsAndEditors = async () => {
    try {
      setLoading(true);
      const response = await pollApi.getAuditorsAndEditors(poll.id);
      setPollManager(response.data.manager);
      setAuditors(response.data.auditors);
      setEditors(response.data.editors);
    } catch (error) {
      console.error('Error loading auditors and editors:', error);
      // Keep empty arrays on error
      setPollManager(null);
      setAuditors([]);
      setEditors([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSubAdmins = async () => {
    try {
      setLoadingSubAdmins(true);
      const response = await pollApi.getAvailableSubAdmins(poll.id);
      setAvailableSubAdmins(response.data.availableSubAdmins);
    } catch (error) {
      console.error('Error loading available sub-admins:', error);
      setAvailableSubAdmins([]);
    } finally {
      setLoadingSubAdmins(false);
    }
  };

  const handleAddAuditor = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAuditorId) {
      alert('Please select a sub-admin to add as auditor');
      return;
    }
    
    try {
      setAddingAuditor(true);
      const response = await pollApi.addAuditor(poll.id, {
        userId: selectedAuditorId
      });
      
      // Add the new auditor to the list
      setAuditors([...auditors, response.data.auditor]);
      
      // Reset form
      setSelectedAuditorId('');
      setShowAddAuditorModal(false);
      
      // Reload available sub-admins
      loadAvailableSubAdmins();
    } catch (error: any) {
      console.error('Error adding auditor:', error);
      alert(error.response?.data?.error || 'Failed to add auditor');
    } finally {
      setAddingAuditor(false);
    }
  };

  const handleAddEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEditorId) {
      alert('Please select a sub-admin to add as editor');
      return;
    }
    
    try {
      setAddingEditor(true);
      const response = await pollApi.addEditor(poll.id, {
        userId: selectedEditorId
      });
      
      // Add the new editor to the list
      setEditors([...editors, response.data.editor]);
      
      // Reset form
      setSelectedEditorId('');
      setShowAddEditorModal(false);
      
      // Reload available sub-admins
      loadAvailableSubAdmins();
    } catch (error: any) {
      console.error('Error adding editor:', error);
      alert(error.response?.data?.error || 'Failed to add editor');
    } finally {
      setAddingEditor(false);
    }
  };

  const handleRemoveAuditor = async (auditorId: string) => {
    try {
      await pollApi.removeAuditor(poll.id, auditorId);
      setAuditors(auditors.filter(a => a.id !== auditorId));
    } catch (error: any) {
      console.error('Error removing auditor:', error);
      alert(error.response?.data?.error || 'Failed to remove auditor');
    }
  };

  const handleRemoveEditor = async (editorId: string) => {
    try {
      await pollApi.removeEditor(poll.id, editorId);
      setEditors(editors.filter(e => e.id !== editorId));
    } catch (error: any) {
      console.error('Error removing editor:', error);
      alert(error.response?.data?.error || 'Failed to remove editor');
    }
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
      {/* Poll Manager Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Poll Manager</h3>
            <p className="text-sm text-gray-500">User responsible for managing this poll</p>
          </div>
        </div>

        {pollManager ? (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{pollManager.name}</p>
                      <p className="text-sm text-gray-500">{pollManager.email}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        Manager
                      </span>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Assigned</p>
                        <p className="text-xs text-gray-900">{pollManager.assignedAt}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Last Access</p>
                        <p className="text-xs text-gray-900">{pollManager.lastAccess}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(pollManager.permissions)
                        .filter(([, value]) => value)
                        .map(([key]) => (
                          <span key={key} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-sm text-gray-500">No manager assigned</div>
          </div>
        )}
      </div>

      {/* Auditors Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Poll Auditors</h3>
            <p className="text-sm text-gray-500">Users who can monitor and audit poll activity</p>
          </div>
          {permissions.canManage && (
            <button
              onClick={() => {
                setShowAddAuditorModal(true);
                loadAvailableSubAdmins();
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors duration-200 cursor-pointer"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Auditor
            </button>
          )}
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
                                  disabled={true}
                                  className="h-3 w-3 text-green-600 focus:ring-green-500 border-gray-300 rounded mr-2 opacity-50 cursor-not-allowed"
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
                          {permissions.canManage && (
                            <button
                              onClick={() => handleRemoveAuditor(auditor.id)}
                              className="text-red-600 hover:text-red-900 cursor-pointer"
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
      </div>

      {/* Editors Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Poll Editors</h3>
            <p className="text-sm text-gray-500">Users who can modify poll content and settings</p>
          </div>
          {permissions.canManage && (
            <button
              onClick={() => {
                setShowAddEditorModal(true);
                loadAvailableSubAdmins();
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 transition-colors duration-200 cursor-pointer"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Editor
            </button>
          )}
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
                                  disabled={true}
                                  className="h-3 w-3 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mr-2 opacity-50 cursor-not-allowed"
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
                          {permissions.canManage && (
                            <button
                              onClick={() => handleRemoveEditor(editor.id)}
                              className="text-red-600 hover:text-red-900 cursor-pointer"
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
      </div>

      {/* Add Auditor Modal */}
      {showAddAuditorModal && (
        <div className="fixed inset-0 backdrop-filter backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add Auditor</h3>
                <button
                  onClick={() => setShowAddAuditorModal(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAddAuditor} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Sub-Admin
                  </label>
                  {loadingSubAdmins ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-center">
                      Loading sub-admins...
                    </div>
                  ) : availableSubAdmins.length === 0 ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                      No available sub-admins
                    </div>
                  ) : (
                    <select
                      value={selectedAuditorId}
                      onChange={(e) => setSelectedAuditorId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Choose a sub-admin...</option>
                      {availableSubAdmins.map((subAdmin) => (
                        <option key={subAdmin.id} value={subAdmin.id}>
                          {subAdmin.name} ({subAdmin.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                  <strong>Auditor Permissions:</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>View Results</li>
                    <li>View Participants</li>
                    <li>View Audit Log</li>
                    <li>Download Results</li>
                  </ul>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddAuditorModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingAuditor}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {addingAuditor ? 'Adding...' : 'Add Auditor'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Editor Modal */}
      {showAddEditorModal && (
        <div className="fixed inset-0 backdrop-filter backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add Editor</h3>
                <button
                  onClick={() => setShowAddEditorModal(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAddEditor} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Sub-Admin
                  </label>
                  {loadingSubAdmins ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-center">
                      Loading sub-admins...
                    </div>
                  ) : availableSubAdmins.length === 0 ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                      No available sub-admins
                    </div>
                  ) : (
                    <select
                      value={selectedEditorId}
                      onChange={(e) => setSelectedEditorId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="">Choose a sub-admin...</option>
                      {availableSubAdmins.map((subAdmin) => (
                        <option key={subAdmin.id} value={subAdmin.id}>
                          {subAdmin.name} ({subAdmin.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                  <strong>Editor Permissions:</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Edit Questions</li>
                    <li>Edit Settings</li>
                    <li>Manage Poll (limited)</li>
                    <li>Delete Questions (limited)</li>
                  </ul>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddEditorModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingEditor}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {addingEditor ? 'Adding...' : 'Add Editor'}
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
