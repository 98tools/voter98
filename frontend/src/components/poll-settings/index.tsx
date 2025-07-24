import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pollApi } from '../../utils/api';
import type { Poll, PollPermissions } from '../../types';
import BasicInfoTab from './BasicInfoTab';
import ScheduleTab from './ScheduleTab';
import QuestionsTab from './QuestionsTab';
import SettingsTab from './SettingsTab';
import ParticipantsTab from './ParticipantsTab';
import AuditorsTab from './AuditorsTab';
import ResultsTab from './ResultsTab';
import PollUrlDisplay from './PollUrlDisplay';

const PollSettings: React.FC = () => {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [permissions, setPermissions] = useState<PollPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (pollId) {
      loadPollAndPermissions();
    }
  }, [pollId]);

  const loadPollAndPermissions = async () => {
    if (!pollId) return;
    
    try {
      const [pollResponse, permissionsResponse] = await Promise.all([
        pollApi.getPoll(pollId),
        pollApi.getUserPollPermissions(pollId)
      ]);
      setPoll(pollResponse.data.poll);
      setPermissions(permissionsResponse.data.permissions);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load poll');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updates: Partial<Poll>) => {
    if (!pollId || !poll) return;

    setSaving(true);
    setError('');

    try {
      const response = await pollApi.updatePoll(pollId, updates);
      setPoll(response.data.poll);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to update poll');
    } finally {
      setSaving(false);
    }
  };

  const handleLaunchPoll = async () => {
    if (!poll) return;

    // Validate required fields before launching
    if (!poll.startDate || !poll.endDate) {
      setError('Please set start and end dates before launching the poll');
      setActiveTab('schedule');
      return;
    }

    if (poll.ballot.length === 0) {
      setError('Please add at least one question before launching the poll');
      setActiveTab('questions');
      return;
    }

    // Check if all questions have at least 2 options
    const invalidQuestions = poll.ballot.filter(q => q.options.length < 2);
    if (invalidQuestions.length > 0) {
      setError('All questions must have at least 2 options before launching the poll');
      setActiveTab('questions');
      return;
    }

    // Check if start date is in the future or current time
    if (poll.startDate < Date.now()) {
      setError('Start date must be in the future or current time');
      setActiveTab('schedule');
      return;
    }

    // Check if end date is after start date
    if (poll.endDate <= poll.startDate) {
      setError('End date must be after start date');
      setActiveTab('schedule');
      return;
    }

    await handleSave({ status: 'active' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading poll settings...</p>
        </div>
      </div>
    );
  }

  if (!poll || !permissions) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Poll not found</h3>
          <p className="text-gray-500 mb-6">The poll you're looking for doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Check permissions using the new permission system
  if (!permissions.canView) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-16 w-16 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500 mb-6">You don't have permission to view this poll.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      active: 'bg-green-100 text-green-800 border-green-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    };
    return badges[status as keyof typeof badges] || badges.draft;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{poll.title}</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(poll.status)}`}>
                    {poll.status.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-500">Poll Settings</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {poll.status === 'draft' && permissions.canManage && (
                <button
                  onClick={handleLaunchPoll}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 disabled:opacity-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Launch Poll
                </button>
              )}
              {(poll.status === 'active' || poll.status === 'completed') && (
                <PollUrlDisplay pollId={poll.id} />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-700 font-medium">{error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Info */}
      {(!permissions.canEdit || !permissions.canManage) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="text-blue-700 font-medium">
                {permissions.canEdit && !permissions.canManage ? 'You are viewing as an Editor - You can modify poll content and settings' : 
                 !permissions.canEdit && permissions.canAudit ? 'You are viewing as an Auditor - You have read-only access' :
                 'You have limited access to this poll'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6 pt-6">
              {[
                { id: 'basic', label: 'Basic Info', icon: 'info' },
                { id: 'schedule', label: 'Schedule', icon: 'calendar' },
                { id: 'questions', label: 'Questions', icon: 'question' },
                { id: 'settings', label: 'Settings', icon: 'cog' },
                { id: 'participants', label: 'Participants', icon: 'users' },
                { id: 'auditors', label: 'Auditors & Editors', icon: 'shield' },
                { id: 'results', label: 'Results', icon: 'chart' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'basic' && (
              <BasicInfoTab poll={poll} permissions={permissions} onSave={permissions.canEdit ? handleSave : () => {}} saving={saving} />
            )}
            {activeTab === 'schedule' && (
              <ScheduleTab poll={poll} permissions={permissions} onSave={permissions.canEdit ? handleSave : () => {}} saving={saving} />
            )}
            {activeTab === 'questions' && (
              <QuestionsTab poll={poll} permissions={permissions} onSave={permissions.canEdit ? handleSave : () => {}} saving={saving} />
            )}
            {activeTab === 'settings' && (
              <SettingsTab poll={poll} permissions={permissions} onSave={permissions.canEditSettings ? handleSave : () => {}} saving={saving} />
            )}
            {activeTab === 'participants' && (
              <ParticipantsTab poll={poll} permissions={permissions} onSave={permissions.canManageParticipants ? handleSave : () => {}} saving={saving} />
            )}
            {activeTab === 'auditors' && (
              <AuditorsTab poll={poll} permissions={permissions} onSave={permissions.canManage ? handleSave : () => {}} saving={saving} />
            )}
            {activeTab === 'results' && (
              <ResultsTab poll={poll} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PollSettings;
