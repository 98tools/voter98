import React, { useState, useEffect } from 'react';
import type { Poll, PollPermissions } from '../../types';
import { pollApi } from '../../utils/api';

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
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set());
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    email: '',
    isUser: false,
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

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!poll?.id) return;
    
    try {
      const response = await pollApi.addParticipant(poll.id, {
        name: newParticipant.name,
        email: newParticipant.email,
        isUser: newParticipant.isUser,
        voteWeight: newParticipant.voteWeight,
        token: newParticipant.token || undefined
      });
      
      setParticipants([...participants, response.data.participant]);
      setNewParticipant({ name: '', email: '', isUser: false, voteWeight: 1.0, token: '' });
      setShowAddModal(false);
    } catch (error: any) {
      console.error('Failed to add participant:', error);
      alert(error.response?.data?.error || 'Failed to add participant');
    }
  };

  const handleCsvUpload = async () => {
    setCsvError('');
    
    if (!poll?.id) return;
    
    try {
      const lines = csvData.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      const requiredHeaders = ['name', 'email', 'is_user'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        setCsvError(`Missing required headers: ${missingHeaders.join(', ')}`);
        return;
      }

      const newParticipants = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        if (!row.name || !row.email) {
          setCsvError(`Row ${i + 1}: Name and email are required`);
          return;
        }

        const isUser = row.is_user === 'true' || row.is_user === '1';
        const voteWeight = parseFloat(row.vote_weight) || 1.0;
        const token = !isUser ? row.token || undefined : undefined;

        try {
          const response = await pollApi.addParticipant(poll.id, {
            name: row.name,
            email: row.email,
            isUser,
            voteWeight,
            token
          });
          
          newParticipants.push(response.data.participant);
        } catch (error: any) {
          setCsvError(`Row ${i + 1}: ${error.response?.data?.error || 'Failed to add participant'}`);
          return;
        }
      }

      setParticipants([...participants, ...newParticipants]);
      setCsvData('');
      setShowCsvModal(false);
      
    } catch (error) {
      setCsvError('Invalid CSV format. Please check your data.');
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
    const csvTemplate = `name,email,is_user,vote_weight,token
John Doe,john@example.com,true,1.0,
Jane Smith External,jane@external.com,false,1.5,custom_token_123
Bob Wilson,bob@example.com,true,2.0,`;
    
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
              onClick={() => setShowAddModal(true)}
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
              Upload CSV
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
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
              >
                Add Individual Participant
              </button>
              <button
                onClick={() => setShowCsvModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
              >
                Upload CSV File
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add Participant</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAddParticipant} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newParticipant.name}
                    onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
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

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isUser"
                    checked={newParticipant.isUser}
                    onChange={(e) => setNewParticipant({ ...newParticipant, isUser: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isUser" className="ml-2 block text-sm text-gray-900">
                    Registered system user
                  </label>
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

                {!newParticipant.isUser && (
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
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Participant
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Upload CSV File</h3>
                <button
                  onClick={() => setShowCsvModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <button
                    onClick={downloadCsvTemplate}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Download CSV Template
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CSV Data
                  </label>
                  <textarea
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="name,email,is_user,vote_weight,token&#10;John Doe,john@example.com,true,1.0,&#10;Jane Smith,jane@external.com,false,1.5,custom_token_123"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Required columns: name, email, is_user. Optional: vote_weight (default 1.0), token (for external users)
                  </p>
                </div>

                {csvError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {csvError}
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCsvModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCsvUpload}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    disabled={!csvData.trim()}
                  >
                    Upload Participants
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantsTab;
