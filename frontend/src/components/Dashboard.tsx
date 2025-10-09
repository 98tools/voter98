import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { pollApi } from '../utils/api';
import type { Poll, PollPermissions } from '../types';
import CreatePollModal from './CreatePollModal';
import newLogo from '../assets/new-logo.png';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [otherPolls, setOtherPolls] = useState<Poll[]>([]);
  const [pollPermissions, setPollPermissions] = useState<Record<string, PollPermissions>>({});
  const [loading, setLoading] = useState(true);
  const [loadingOther, setLoadingOther] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [activeOtherTab, setActiveOtherTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadPolls();
    loadOtherPolls();
  }, []);

  const loadPolls = async () => {
    try {
      const response = await pollApi.getPolls();
      const pollsData = response.data.polls;
      setPolls(pollsData);
      
      // Load permissions for each poll
      const permissionsPromises = pollsData.map(poll =>
        pollApi.getUserPollPermissions(poll.id).then(res => ({
          pollId: poll.id,
          permissions: res.data.permissions
        }))
      );
      
      const permissionsResults = await Promise.all(permissionsPromises);
      const permissionsMap = permissionsResults.reduce((acc, { pollId, permissions }) => {
        acc[pollId] = permissions;
        return acc;
      }, {} as Record<string, PollPermissions>);
      
      setPollPermissions(permissionsMap);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load polls');
    } finally {
      setLoading(false);
    }
  };

  const loadOtherPolls = async () => {
    try {
      setLoadingOther(true);
      const response = await pollApi.getOtherPolls();
      setOtherPolls(response.data.polls);
    } catch (error: any) {
      console.error('Failed to load other polls:', error);
    } finally {
      setLoadingOther(false);
    }
  };

  const handlePollCreated = (pollId: string) => {
    // Reload polls and navigate to poll settings
    loadPolls();
    navigate(`/polls/${pollId}/settings`);
  };

  const handlePollClick = (poll: Poll) => {
    // Navigate to poll settings if user can view/edit, otherwise to poll participation
    const permissions = pollPermissions[poll.id];
    if (permissions?.canView) {
      navigate(`/polls/${poll.id}/settings`);
    } else {
      // Navigate to poll participation for regular users
      navigate(`/poll/${poll.id}`);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      active: 'bg-green-100 text-green-800 border-green-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    };
    return badges[status as keyof typeof badges] || badges.draft;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'draft':
        return (
          <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-purple-600 bg-purple-100';
      case 'sub-admin': return 'text-blue-600 bg-blue-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--brand-background)'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4" style={{borderBottomColor: 'var(--brand-primary)'}}></div>
          <p className="brand-text text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{background: 'var(--brand-background)'}}>
      {/* Navigation Header */}
      <header className="border-b" style={{backgroundColor: 'var(--brand-surface)', boxShadow: 'var(--brand-shadow-md)', borderBottomColor: 'var(--brand-sand-dark)'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center p-1" style={{background: 'var(--brand-gradient-primary)'}}>
                  <img src={newLogo} alt="منظومة اقتراع Logo" className="w-full h-full object-contain" />
                </div>
                <h1 className="text-xl font-bold brand-heading">منظومة اقتراع</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium brand-text">{user?.name}</p>
                  <p className={`text-xs px-2 py-1 rounded-full font-medium ${getRoleColor(user?.role || 'user')}`}>
                    {user?.role?.toUpperCase()}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background: 'var(--brand-gradient-primary)'}}>
                  <span className="text-white font-semibold text-sm">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="brand-button inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg hover-lift"
                  style={{background: 'var(--brand-gradient-primary)', color: 'var(--brand-carbon)', transition: 'var(--brand-transition)'}}
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  Admin Panel
                </Link>
              )}
              
              <button
                onClick={logout}
                className="inline-flex items-center px-4 py-2 border text-sm font-medium rounded-lg cursor-pointer brand-text"
                style={{borderColor: 'var(--brand-sand-dark)', backgroundColor: 'var(--brand-surface)', transition: 'var(--brand-transition)'}}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--brand-sand)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--brand-surface)';
                }}
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
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <div className="relative overflow-hidden rounded-2xl p-8 text-white shadow-xl" style={{
            background: 'var(--brand-gradient-primary)',
            boxShadow: 'var(--brand-shadow-xl)'
          }}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full" style={{
                background: 'var(--brand-sand)'
              }}></div>
              <div className="absolute top-8 -left-8 w-32 h-32 rounded-full" style={{
                background: 'var(--brand-rich-gold)'
              }}></div>
              <div className="absolute -bottom-6 right-12 w-20 h-20 rounded-full" style={{
                background: 'var(--brand-deep-green)'
              }}></div>
            </div>
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-4">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center mr-4" style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-4xl font-bold mb-2 brand-heading" style={{
                      color: 'var(--brand-carbon)',
                      textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}>
                      Welcome back, {user?.name}! 👋
                    </h2>
                    <div className="flex items-center space-x-3">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium" style={{
                        background: 'var(--brand-deep-green)',
                        color: 'white'
                      }}>
                        {user?.role?.toUpperCase()}
                      </span>
                      <span className="text-sm opacity-75">
                        Dashboard Active
                      </span>
                    </div>
                  </div>
                </div>
                
                <p className="text-lg mb-4 leading-relaxed brand-text" style={{
                  color: 'var(--brand-carbon)',
                  opacity: 0.9
                }}>
                  {user?.role === 'admin' 
                    ? '🎯 Manage polls, users, and oversee the entire voting platform with full administrative control.' 
                    : user?.role === 'sub-admin'
                    ? '📊 Manage your assigned polls and participate in the democratic voting process.'
                    : '🗳️ Participate in polls, cast your votes, and view your comprehensive voting history.'}
                </p>
                
                {/* Quick Stats */}
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{background: 'var(--brand-deep-green)'}}></div>
                    <span className="brand-text" style={{color: 'var(--brand-carbon)'}}>
                      {polls.length} {user?.role === 'admin' ? 'Total' : user?.role === 'sub-admin' ? 'My' : 'Available'} Polls
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{background: 'var(--brand-rich-gold)'}}></div>
                    <span className="brand-text" style={{color: 'var(--brand-carbon)'}}>
                      {polls.filter(p => p.status === 'active').length} Active Now
                    </span>
                  </div>
                </div>
              </div>
              
              {(user?.role === 'admin') && (
                <div className="ml-8">
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="brand-button-secondary relative overflow-hidden group"
                    style={{
                      background: 'var(--brand-deep-green)',
                      color: 'white',
                      padding: '16px 32px',
                      borderRadius: '12px',
                      fontWeight: '600',
                      fontSize: '16px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'var(--brand-transition)',
                      boxShadow: 'var(--brand-shadow-md)',
                      transform: 'translateY(0)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = 'var(--brand-shadow-lg)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'var(--brand-shadow-md)';
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      <span>Create New Poll</span>
                    </div>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300" style={{
                      background: 'var(--brand-rich-gold)'
                    }}></div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-lg animate-slide-in-right" style={{backgroundColor: 'rgba(220, 181, 87, 0.1)', borderLeft: '4px solid var(--brand-primary)'}}>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="var(--brand-primary)" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="brand-text font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Polls Section */}
        <div className="brand-card rounded-2xl" style={{backgroundColor: 'var(--brand-surface)', boxShadow: 'var(--brand-shadow-md)', border: '1px solid var(--brand-sand-dark)'}}>
          <div className="p-6 border-b" style={{borderBottomColor: 'var(--brand-sand-dark)'}}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold brand-heading">
                {user?.role === 'admin' ? 'All Polls' : 
                 user?.role === 'sub-admin' ? 'My Polls' : 
                 'Available Polls'}
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm brand-text" style={{opacity: 0.7}}>{polls.length} total</span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 p-1 rounded-lg" style={{backgroundColor: 'var(--brand-sand)'}}>
              {['all', 'active', 'draft', 'completed'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    activeTab === tab
                      ? 'brand-text'
                      : 'brand-text'
                  }`}
                  style={{
                    backgroundColor: activeTab === tab ? 'var(--brand-surface)' : 'transparent',
                    color: activeTab === tab ? 'var(--brand-primary)' : 'var(--brand-carbon)',
                    opacity: activeTab === tab ? 1 : 0.7,
                    boxShadow: activeTab === tab ? 'var(--brand-shadow-sm)' : 'none',
                    transition: 'var(--brand-transition)'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab) {
                      e.currentTarget.style.opacity = '1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab) {
                      e.currentTarget.style.opacity = '0.7';
                    }
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {polls.length === 0 ? (
              <div className="text-center py-12 animate-fade-in">
                <svg className="mx-auto h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="var(--brand-primary)" style={{opacity: 0.6}}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <h3 className="text-lg font-medium brand-heading mb-2">No polls found</h3>
                <p className="brand-text mb-6" style={{opacity: 0.7}}>
                  {user?.role === 'admin' || user?.role === 'sub-admin'
                    ? 'Get started by creating your first poll.'
                    : 'No polls are available for you to participate in yet.'}
                </p>
                {(user?.role === 'admin' || user?.role === 'sub-admin') && (
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="brand-button-secondary inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg"
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Create Your First Poll
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {polls
                  .filter(poll => activeTab === 'all' || poll.status === activeTab)
                  .map((poll, index) => (
                    <div
                      key={poll.id}
                      className="brand-card rounded-xl p-6 hover-lift animate-fade-in"
                      style={{ animationDelay: `${index * 0.1}s`, backgroundColor: 'var(--brand-surface)', border: '1px solid var(--brand-sand-dark)', boxShadow: 'var(--brand-shadow-sm)', transition: 'var(--brand-transition)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = 'var(--brand-shadow-lg)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'var(--brand-shadow-sm)';
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <h4 className="text-lg font-semibold brand-heading leading-tight">
                          {poll.title}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(poll.status)}`}>
                          {getStatusIcon(poll.status)}
                          <span className="ml-1">{poll.status}</span>
                        </span>
                      </div>
                      
                      {poll.description && (
                        <p className="brand-text text-sm mb-4 line-clamp-2" style={{opacity: 0.8}}>
                          {poll.description}
                        </p>
                      )}
                      
                      <div className="space-y-2 text-sm mb-4" style={{color: 'var(--brand-carbon)', opacity: 0.7}}>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          <span>{formatDate(poll.startDate)} - {formatDate(poll.endDate)}</span>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{poll.ballot.length} question{poll.ballot.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handlePollClick(poll)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 border text-sm font-medium rounded-lg cursor-pointer brand-text"
                          style={{borderColor: 'var(--brand-sand-dark)', backgroundColor: 'var(--brand-surface)', transition: 'var(--brand-transition)'}}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--brand-sand)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--brand-surface)';
                          }}
                        >
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          {pollPermissions[poll.id]?.canView ? 'Settings' : 'View'}
                        </button>
                        {/* Participate button for users */}
                        {user?.role === 'user' && (poll.status === 'completed' || poll.status === 'active') && (
                          <button 
                            onClick={() => navigate(`/poll/${poll.id}`)}
                            className="brand-button-secondary flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg"
                          >
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                            </svg>
                            Participate
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Other Polls Section */}
        {(user?.role === 'sub-admin' || user?.role === 'user') && otherPolls.length > 0 && (
          <div className="mt-8 brand-card rounded-2xl" style={{backgroundColor: 'var(--brand-surface)', boxShadow: 'var(--brand-shadow-md)', border: '1px solid var(--brand-sand-dark)'}}>
            <div className="p-6 border-b" style={{borderBottomColor: 'var(--brand-sand-dark)'}}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold brand-heading">
                  {user?.role === 'sub-admin' ? 'Other Polls' : 'All Polls'}
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm brand-text" style={{opacity: 0.7}}>{otherPolls.length} available</span>
                </div>
              </div>

              {/* Tab Navigation for Other Polls */}
              <div className="flex space-x-1 p-1 rounded-lg" style={{backgroundColor: 'var(--brand-sand)'}}>
                {['all', 'active', 'draft', 'completed'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveOtherTab(tab)}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      activeOtherTab === tab
                        ? 'brand-text'
                        : 'brand-text'
                    }`}
                    style={{
                      backgroundColor: activeOtherTab === tab ? 'var(--brand-surface)' : 'transparent',
                      color: activeOtherTab === tab ? 'var(--brand-primary)' : 'var(--brand-carbon)',
                      opacity: activeOtherTab === tab ? 1 : 0.7,
                      boxShadow: activeOtherTab === tab ? 'var(--brand-shadow-sm)' : 'none',
                      transition: 'var(--brand-transition)'
                    }}
                    onMouseEnter={(e) => {
                      if (activeOtherTab !== tab) {
                        e.currentTarget.style.opacity = '1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeOtherTab !== tab) {
                        e.currentTarget.style.opacity = '0.7';
                      }
                    }}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {loadingOther ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{borderBottomColor: 'var(--brand-primary)'}}></div>
                  <p className="brand-text">Loading other polls...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {otherPolls
                    .filter(poll => activeOtherTab === 'all' || poll.status === activeOtherTab)
                    .map((poll, index) => (
                      <div
                        key={poll.id}
                        className="bg-white border border-gray-200 rounded-xl p-6 hover-lift animate-fade-in"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h4 className="text-lg font-semibold text-gray-900 leading-tight">
                            {poll.title}
                          </h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(poll.status)}`}>
                            {getStatusIcon(poll.status)}
                            <span className="ml-1">{poll.status}</span>
                          </span>
                        </div>
                        
                        {poll.description && (
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {poll.description}
                          </p>
                        )}
                        
                        <div className="space-y-2 text-sm text-gray-500 mb-4">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            <span>{formatDate(poll.startDate)} - {formatDate(poll.endDate)}</span>
                          </div>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{poll.ballot.length} question{poll.ballot.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Create Poll Modal */}
      <CreatePollModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPollCreated={handlePollCreated}
      />
    </div>
  );
};

export default Dashboard;
