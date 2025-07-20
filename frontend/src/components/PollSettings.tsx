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
              {poll.status === 'draft' && (
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Poll Settings</h3>
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Visibility Settings */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-base font-medium text-gray-900 mb-4">Visibility & Privacy</h4>
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
                  <p className="text-gray-500">Display the names of participants who have voted</p>
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
                    Show vote weights
                  </label>
                  <p className="text-gray-500">Display the weight of each vote in results</p>
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
                    Show vote counts
                  </label>
                  <p className="text-gray-500">Display the number of votes for each option</p>
                </div>
              </div>
            </div>
          </div>

          {/* Results Settings */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-base font-medium text-gray-900 mb-4">Results & Access</h4>
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
                    Show results before poll ends
                  </label>
                  <p className="text-gray-500">Allow participants to see results while voting is still open</p>
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
                    Allow results viewing
                  </label>
                  <p className="text-gray-500">Enable participants to view poll results after voting</p>
                </div>
              </div>
            </div>
          </div>

          {/* Voting Settings */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-base font-medium text-gray-900 mb-4">Voting Options</h4>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="voteWeightEnabled"
                    type="checkbox"
                    checked={settings.voteWeightEnabled || false}
                    onChange={(e) => handleSettingChange('voteWeightEnabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="voteWeightEnabled" className="font-medium text-gray-700">
                    Enable vote weighting
                  </label>
                  <p className="text-gray-500">Allow different participants to have different vote weights</p>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Settings Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-blue-700 text-sm">
                <p className="font-medium mb-1">Settings Information</p>
                <p>These settings control how participants interact with your poll and view results. Changes can be made even after the poll is active, but some restrictions may apply.</p>
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
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    email: '',
    voteWeight: 1.0
  });

  useEffect(() => {
    loadParticipants();
  }, []);

  const loadParticipants = async () => {
    // TODO: Implement API call to fetch participants
    // For now, using mock data
    setParticipants([
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        voteWeight: 1.0,
        status: 'approved',
        hasVoted: false
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        voteWeight: 1.5,
        status: 'approved',
        hasVoted: true
      }
    ]);
    setLoading(false);
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement API call to add participant
    const newPart = {
      id: Date.now().toString(),
      ...newParticipant,
      status: 'approved',
      hasVoted: false
    };
    setParticipants([...participants, newPart]);
    setNewParticipant({ name: '', email: '', voteWeight: 1.0 });
    setShowAddModal(false);
  };

  const handleRemoveParticipant = (participantId: string) => {
    setParticipants(participants.filter(p => p.id !== participantId));
  };

  const handleUpdateWeight = (participantId: string, newWeight: number) => {
    setParticipants(participants.map(p => 
      p.id === participantId ? { ...p, voteWeight: newWeight } : p
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Participants</h3>
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

      {participants.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No participants yet</h3>
          <p className="text-gray-500 mb-4">Add participants who can vote in this poll.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
          >
            Add First Participant
          </button>
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
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vote Weight
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Voted
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
                    <input
                      type="text"
                      value={option.title}
                      onChange={(e) => onUpdateOption(option.id, { title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Option title"
                    />
                    <input
                      type="text"
                      value={option.shortDescription || ''}
                      onChange={(e) => onUpdateOption(option.id, { shortDescription: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Short description (optional)"
                    />
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
              <div className="space-y-1">
                {question.options.map((option, idx) => (
                  <div key={option.id} className="text-sm text-gray-600">
                    {idx + 1}. {option.title}
                    {option.shortDescription && (
                      <span className="text-gray-500 ml-2">- {option.shortDescription}</span>
                    )}
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

export default PollSettings;
