import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { pollApi } from '../utils/api';
import type { Poll, BallotQuestion, BallotOption } from '../types';

const PollSettings: React.FC = () => {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (pollId) {
      loadPoll();
    }
  }, [pollId]);

  const loadPoll = async () => {
    if (!pollId) return;
    
    try {
      const response = await pollApi.getPoll(pollId);
      setPoll(response.data.poll);
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

  if (!poll) {
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

  // Check permissions
  const canEdit = user?.role === 'admin' || poll.managerId === user?.id;
  if (!canEdit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-16 w-16 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500 mb-6">You don't have permission to edit this poll.</p>
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
              {poll.status === 'draft' ? (
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
              ) : (poll.status === 'active' || poll.status === 'completed') && (
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
              <BasicInfoTab poll={poll} onSave={handleSave} saving={saving} />
            )}
            {activeTab === 'schedule' && (
              <ScheduleTab poll={poll} onSave={handleSave} saving={saving} />
            )}
            {activeTab === 'questions' && (
              <QuestionsTab poll={poll} onSave={handleSave} saving={saving} />
            )}
            {activeTab === 'settings' && (
              <SettingsTab poll={poll} onSave={handleSave} saving={saving} />
            )}
            {activeTab === 'participants' && (
              <ParticipantsTab poll={poll} onSave={handleSave} saving={saving} />
            )}
            {activeTab === 'auditors' && (
              <AuditorsTab poll={poll} onSave={handleSave} saving={saving} />
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

// Basic Info Tab Component
const BasicInfoTab: React.FC<{ poll: Poll; onSave: (updates: Partial<Poll>) => void; saving: boolean }> = ({ poll, onSave, saving }) => {
  const [formData, setFormData] = useState({
    title: poll.title,
    description: poll.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: formData.title,
      description: formData.description || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Poll Title
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Provide a detailed description of your poll"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Schedule Tab Component  
const ScheduleTab: React.FC<{ poll: Poll; onSave: (updates: Partial<Poll>) => void; saving: boolean }> = ({ poll, onSave, saving }) => {
  const [formData, setFormData] = useState({
    startDate: poll.startDate ? new Date(poll.startDate).toISOString().slice(0, 16) : '',
    endDate: poll.endDate ? new Date(poll.endDate).toISOString().slice(0, 16) : '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      startDate: new Date(formData.startDate).getTime(),
      endDate: new Date(formData.endDate).getTime(),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Poll Schedule</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                id="startDate"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                End Date & Time
              </label>
              <input
                type="datetime-local"
                id="endDate"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Questions Tab Component
const QuestionsTab: React.FC<{ poll: Poll; onSave: (updates: Partial<Poll>) => void; saving: boolean }> = ({ poll, onSave, saving }) => {
  const [questions, setQuestions] = useState(poll.ballot);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);

  // Update questions when poll changes
  useEffect(() => {
    setQuestions(poll.ballot);
  }, [poll.ballot]);

  const handleAddQuestion = () => {
    const newQuestion = {
      id: `q_${Date.now()}`,
      title: 'New Question',
      description: '',
      randomizedOrder: false,
      minSelection: 1,
      maxSelection: 1,
      attachments: [],
      options: []
    };
    const updatedQuestions = [...questions, newQuestion];
    setQuestions(updatedQuestions);
    setEditingQuestion(newQuestion.id);
  };

  const handleDeleteQuestion = (questionId: string) => {
    const updatedQuestions = questions.filter(q => q.id !== questionId);
    setQuestions(updatedQuestions);
    onSave({ ballot: updatedQuestions });
  };

  const handleUpdateQuestion = (questionId: string, updates: Partial<typeof questions[0]>) => {
    const updatedQuestions = questions.map(q => 
      q.id === questionId ? { ...q, ...updates } : q
    );
    setQuestions(updatedQuestions);
  };

  const handleSaveQuestions = () => {
    onSave({ ballot: questions });
    setEditingQuestion(null);
  };

  const handleAddOption = (questionId: string) => {
    const newOption = {
      id: `opt_${Date.now()}`,
      title: 'New Option',
      shortDescription: '',
      longDescription: '',
      link: '',
      image: ''
    };
    
    const updatedQuestions = questions.map(q => 
      q.id === questionId 
        ? { ...q, options: [...q.options, newOption] }
        : q
    );
    setQuestions(updatedQuestions);
  };

  const handleDeleteOption = (questionId: string, optionId: string) => {
    const updatedQuestions = questions.map(q => 
      q.id === questionId 
        ? { ...q, options: q.options.filter(opt => opt.id !== optionId) }
        : q
    );
    setQuestions(updatedQuestions);
  };

  const handleUpdateOption = (questionId: string, optionId: string, updates: Partial<typeof questions[0]['options'][0]>) => {
    const updatedQuestions = questions.map(q => 
      q.id === questionId 
        ? { 
            ...q, 
            options: q.options.map(opt => 
              opt.id === optionId ? { ...opt, ...updates } : opt
            ) 
          }
        : q
    );
    setQuestions(updatedQuestions);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Poll Questions</h3>
        <div className="flex space-x-3">
          <button
            onClick={handleAddQuestion}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Question
          </button>
          {editingQuestion && (
            <button
              onClick={handleSaveQuestions}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors duration-200 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No questions yet</h3>
          <p className="text-gray-500 mb-4">Add your first question to get started.</p>
          <button
            onClick={handleAddQuestion}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
          >
            Add Question
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {questions.map((question, index) => (
            <QuestionEditor
              key={question.id}
              question={question}
              index={index}
              isEditing={editingQuestion === question.id}
              onEdit={() => setEditingQuestion(question.id)}
              onDelete={() => handleDeleteQuestion(question.id)}
              onUpdate={(updates: Partial<BallotQuestion>) => handleUpdateQuestion(question.id, updates)}
              onAddOption={() => handleAddOption(question.id)}
              onDeleteOption={(optionId: string) => handleDeleteOption(question.id, optionId)}
              onUpdateOption={(optionId: string, updates: Partial<BallotOption>) => handleUpdateOption(question.id, optionId, updates)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SettingsTab: React.FC<{ poll: Poll; onSave: (updates: Partial<Poll>) => void; saving: boolean }> = ({ poll, onSave, saving }) => {
  const [settings, setSettings] = useState(poll.settings);

  // Update settings when poll changes
  useEffect(() => {
    setSettings(poll.settings);
  }, [poll.settings]);

  const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ settings });
  };

  const isPollActive = poll.status === 'active' || poll.status === 'completed';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Poll Settings</h3>
        
        {isPollActive && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-yellow-700 text-sm">
                <p className="font-medium mb-1">Poll is Active</p>
                <p>Some settings cannot be changed after the poll has started. Visibility and privacy settings can still be modified.</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Transparency & Visibility Settings */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-base font-medium text-gray-900 mb-4">Transparency & Visibility</h4>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="showParticipantNames"
                    type="checkbox"
                    checked={settings.showParticipantNames || false}
                    onChange={(e) => handleSettingChange('showParticipantNames', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="showParticipantNames" className="font-medium text-gray-700">
                    Show participant names
                  </label>
                  <p className="text-gray-500">Display the names of participants who have voted. When disabled, participants remain anonymous.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="showVoteWeights"
                    type="checkbox"
                    checked={settings.showVoteWeights || false}
                    onChange={(e) => handleSettingChange('showVoteWeights', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="showVoteWeights" className="font-medium text-gray-700">
                    Show vote weights by name
                  </label>
                  <p className="text-gray-500">Display the weight of each vote with participant names. Anonymous vote weights are always shown if vote weighting is enabled.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="showVoteCounts"
                    type="checkbox"
                    checked={settings.showVoteCounts || false}
                    onChange={(e) => handleSettingChange('showVoteCounts', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="showVoteCounts" className="font-medium text-gray-700">
                    Show total vote counts during voting
                  </label>
                  <p className="text-gray-500">Display the total number of votes cast while the poll is active. Always shown after poll ends.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Results Access Settings */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-base font-medium text-gray-900 mb-4">Results Access</h4>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="showResultsBeforeEnd"
                    type="checkbox"
                    checked={settings.showResultsBeforeEnd || false}
                    onChange={(e) => handleSettingChange('showResultsBeforeEnd', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="showResultsBeforeEnd" className="font-medium text-gray-700">
                    Show vote breakdown before poll ends
                  </label>
                  <p className="text-gray-500">Allow participants to see vote distribution by option while voting is still open. Results always appear after poll ends.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="allowResultsView"
                    type="checkbox"
                    checked={settings.allowResultsView !== false}
                    onChange={(e) => handleSettingChange('allowResultsView', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="allowResultsView" className="font-medium text-gray-700">
                    Allow participants to view results
                  </label>
                  <p className="text-gray-500">Enable participants to access poll results after voting. Disable to restrict result viewing to managers and auditors only.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Voting System Settings */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-base font-medium text-gray-900 mb-4">Voting System</h4>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="voteWeightEnabled"
                    type="checkbox"
                    checked={settings.voteWeightEnabled || false}
                    onChange={(e) => handleSettingChange('voteWeightEnabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isPollActive}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="voteWeightEnabled" className="font-medium text-gray-700">
                    Enable weighted voting
                  </label>
                  <p className="text-gray-500">
                    Allow different participants to have different vote weights. When enabled, anonymous vote weights will always be visible.
                    {isPollActive && <span className="block text-yellow-600 font-medium mt-1">Cannot be changed after poll starts</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="allowVoteChanges"
                    type="checkbox"
                    checked={settings.allowVoteChanges || false}
                    onChange={(e) => handleSettingChange('allowVoteChanges', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="allowVoteChanges" className="font-medium text-gray-700">
                    Allow participants to change their votes
                  </label>
                  <p className="text-gray-500">
                    When enabled, participants can revote and change their selections while the poll is active. Previous votes will be replaced.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Information Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-blue-700 text-sm">
                <p className="font-medium mb-2">Always Visible to Participants:</p>
                <ul className="space-y-1 text-blue-600">
                  <li>• Poll title, description, and dates</li>
                  <li>• Ballot questions and options</li>
                  <li>• Manager and auditor names</li>
                  <li>• Total number of participants</li>
                  <li>• Whether vote weighting is enabled</li>
                  <li>• Anonymous vote weights (numbers only)</li>
                </ul>
                <p className="mt-3 text-blue-700">Transparency settings above control additional information visibility.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ParticipantsTab: React.FC<{ poll: Poll; onSave: (updates: Partial<Poll>) => void; saving: boolean }> = ({ poll }) => {
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
      setParticipants([]); // fallback to empty array on error
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
      
      // Add the new participant to the local state
      setParticipants([...participants, response.data.participant]);
      setNewParticipant({ name: '', email: '', isUser: false, voteWeight: 1.0, token: '' });
      setShowAddModal(false);
    } catch (error: any) {
      console.error('Failed to add participant:', error);
      // You might want to show an error message to the user here
      alert(error.response?.data?.error || 'Failed to add participant');
    }
  };

  const handleCsvUpload = async () => {
    setCsvError('');
    
    if (!poll?.id) return;
    
    try {
      const lines = csvData.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      // Validate required headers
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

        // Validate and process row
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
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCsvModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Upload CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Participant
          </button>
        </div>
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
          <p className="text-gray-500 mb-4">Add participants who can vote in this poll. You can add them individually or upload a CSV file.</p>
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
                            <button
                              onClick={() => handleRegenerateToken(participant.id)}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              Regenerate
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleRemoveParticipant(participant.id)}
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
                    id="isUser"
                    type="checkbox"
                    checked={newParticipant.isUser}
                    onChange={(e) => setNewParticipant({ ...newParticipant, isUser: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isUser" className="ml-2 block text-sm text-gray-900">
                    Registered system user
                  </label>
                </div>

                {poll.settings.voteWeightEnabled && (
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
                )}

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
                      placeholder="Leave empty to auto-generate"
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
                <h3 className="text-lg font-medium text-gray-900">Upload Participants CSV</h3>
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>name</strong>: Participant's full name (required)</li>
                    <li>• <strong>email</strong>: Participant's email address (required)</li>
                    <li>• <strong>is_user</strong>: true/false - whether participant is a registered user (required)</li>
                    <li>• <strong>vote_weight</strong>: Numeric value, defaults to 1.0 (optional)</li>
                    <li>• <strong>token</strong>: Custom token for non-users, auto-generated if empty (optional)</li>
                  </ul>
                  <button
                    onClick={downloadCsvTemplate}
                    className="mt-3 inline-flex items-center px-3 py-1 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                  >
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Download Template
                  </button>
                </div>

                {csvError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-700 text-sm">{csvError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CSV Data
                  </label>
                  <textarea
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="name,email,is_user,vote_weight,token&#10;John Doe,john@example.com,true,1.0,&#10;Jane External,jane@external.com,false,1.5,custom_token"
                  />
                </div>

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
                    disabled={!csvData.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

// Question Editor Component
interface QuestionEditorProps {
  question: BallotQuestion;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<BallotQuestion>) => void;
  onAddOption: () => void;
  onDeleteOption: (optionId: string) => void;
  onUpdateOption: (optionId: string, updates: Partial<BallotOption>) => void;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  index,
  isEditing,
  onEdit,
  onDelete,
  onUpdate,
  onAddOption,
  onDeleteOption,
  onUpdateOption
}) => {
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-medium text-gray-900">
          Question {index + 1}
        </h4>
        <div className="flex space-x-2">
          {!isEditing ? (
            <button
              onClick={onEdit}
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Edit
            </button>
          ) : (
            <button
              onClick={() => onEdit()}
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Done
            </button>
          )}
          <button
            onClick={onDelete}
            className="inline-flex items-center px-3 py-1 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
          >
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M4 5a1 1 0 011-1h10a1 1 0 011 1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 112 0v6a1 1 0 11-2 0V9zm4 0a1 1 0 112 0v6a1 1 0 11-2 0V9z" clipRule="evenodd" />
            </svg>
            Delete
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Title
            </label>
            <input
              type="text"
              value={question.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter question title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={question.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Provide additional context for this question"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attachments (Optional)
            </label>
            <div className="space-y-2">
              {(question.attachments || []).map((attachment, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="url"
                    value={attachment}
                    onChange={(e) => {
                      const newAttachments = [...(question.attachments || [])];
                      newAttachments[index] = e.target.value;
                      onUpdate({ attachments: newAttachments });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter attachment URL"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newAttachments = (question.attachments || []).filter((_, i) => i !== index);
                      onUpdate({ attachments: newAttachments });
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const newAttachments = [...(question.attachments || []), ''];
                  onUpdate({ attachments: newAttachments });
                }}
                className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Attachment
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Selection
              </label>
              <input
                type="number"
                min="1"
                value={question.minSelection}
                onChange={(e) => onUpdate({ minSelection: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Selection
              </label>
              <input
                type="number"
                min="1"
                value={question.maxSelection}
                onChange={(e) => onUpdate({ maxSelection: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              id={`randomized-${question.id}`}
              type="checkbox"
              checked={question.randomizedOrder}
              onChange={(e) => onUpdate({ randomizedOrder: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor={`randomized-${question.id}`} className="ml-2 block text-sm text-gray-900">
              Randomize option order for each participant
            </label>
          </div>

          {/* Options */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Options
              </label>
              <button
                onClick={onAddOption}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Option
              </button>
            </div>
            
            <div className="space-y-3">
              {question.options.map((option, optIndex) => (
                <div key={option.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Option {optIndex + 1}</span>
                    <button
                      onClick={() => onDeleteOption(option.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Option Title *
                      </label>
                      <input
                        type="text"
                        value={option.title}
                        onChange={(e) => onUpdateOption(option.id, { title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Option title"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Short Description (Optional)
                      </label>
                      <input
                        type="text"
                        value={option.shortDescription || ''}
                        onChange={(e) => onUpdateOption(option.id, { shortDescription: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Brief description shown in summary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Long Description (Optional)
                      </label>
                      <textarea
                        value={option.longDescription || ''}
                        onChange={(e) => onUpdateOption(option.id, { longDescription: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Detailed description for this option"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        External Link (Optional)
                      </label>
                      <input
                        type="url"
                        value={option.link || ''}
                        onChange={(e) => onUpdateOption(option.id, { link: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Image URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={option.image || ''}
                        onChange={(e) => onUpdateOption(option.id, { image: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://example.com/image.jpg"
                      />
                      {option.image && (
                        <div className="mt-2">
                          <img
                            src={option.image}
                            alt="Option preview"
                            className="max-w-32 max-h-32 object-cover rounded border border-gray-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {question.options.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 text-sm">No options added yet. Click "Add Option" to get started.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <h5 className="font-medium text-gray-900">{question.title}</h5>
            {question.description && (
              <p className="text-gray-600 text-sm mt-1">{question.description}</p>
            )}
            {question.attachments && question.attachments.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-700 mb-1">Attachments:</p>
                <div className="space-y-1">
                  {question.attachments.filter(att => att.trim()).map((attachment, idx) => (
                    <a
                      key={idx}
                      href={attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
                    >
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                      </svg>
                      Attachment {idx + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>Min: {question.minSelection}</span>
            <span>Max: {question.maxSelection}</span>
            <span>{question.options.length} options</span>
            {question.randomizedOrder && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Randomized
              </span>
            )}
          </div>
          
          {question.options.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Options:</p>
              <div className="space-y-3">
                {question.options.map((option, idx) => (
                  <div key={option.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h6 className="text-sm font-medium text-gray-900">
                          {idx + 1}. {option.title}
                        </h6>
                        {option.shortDescription && (
                          <p className="text-xs text-gray-600 mt-1">{option.shortDescription}</p>
                        )}
                        {option.longDescription && (
                          <p className="text-xs text-gray-500 mt-2">{option.longDescription}</p>
                        )}
                        <div className="flex items-center space-x-3 mt-2">
                          {option.link && (
                            <a
                              href={option.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
                            >
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                              </svg>
                              View Link
                            </a>
                          )}
                        </div>
                      </div>
                      {option.image && (
                        <div className="ml-3 flex-shrink-0">
                          <img
                            src={option.image}
                            alt={`Option ${idx + 1}`}
                            className="w-16 h-16 object-cover rounded border border-gray-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// const AuditorsTab: React.FC<{ poll: Poll; onSave: (updates: Partial<Poll>) => void; saving: boolean }> = ({ poll, onSave, saving }) => {
const AuditorsTab: React.FC<{ poll: Poll; onSave: (updates: Partial<Poll>) => void; saving: boolean }> = () => {
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

// Poll URL Display Component
const PollUrlDisplay: React.FC<{ pollId: string }> = ({ pollId }) => {
  const [copied, setCopied] = useState(false);
  
  // Generate the poll participation URL
  const pollUrl = `${window.location.origin}/poll/${pollId}`;
  
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(pollUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = pollUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center space-x-2 bg-gray-100 border border-gray-300 rounded-lg px-3 py-2">
      <span className="text-sm text-gray-700 font-medium">Poll URL:</span>
      <div className="flex items-center space-x-2">
        <code className="text-sm text-gray-800 bg-white px-2 py-1 rounded border border-gray-200 font-mono">
          {pollUrl}
        </code>
        <button
          onClick={handleCopyUrl}
          className="inline-flex items-center p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded transition-colors duration-200"
          title="Copy URL"
        >
          {copied ? (
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
              <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11.586l-3-3a1 1 0 00-1.414 0L9 10.172V13h2.586l-1.293 1.293a1 1 0 101.414 1.414l3-3z" />
            </svg>
          )}
        </button>
      </div>
      {copied && (
        <span className="text-xs text-green-600 font-medium">Copied!</span>
      )}
    </div>
  );
};

// Results Tab Component
const ResultsTab: React.FC<{ poll: Poll }> = ({ poll }) => {
  return (
    <div className="space-y-6">
      <div className="text-center py-12">
        <svg className="mx-auto h-16 w-16 text-blue-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Poll Results</h3>
        <p className="text-gray-500 mb-6">
          Poll results are now integrated into the poll participation page. Participants can view results directly after voting.
        </p>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            To view poll results as an administrator, access the full results through your poll management interface or visit the poll participation page.
          </p>
          
          {poll.status === 'active' && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-blue-800">Live Results</h4>
                  <p className="text-sm text-blue-600 mt-1">
                    Results are updated in real-time as participants vote. The visibility of results is controlled by your poll settings.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PollSettings;
