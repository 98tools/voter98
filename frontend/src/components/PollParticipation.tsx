import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { publicPollApi } from '../utils/api';
import type { Poll as PollType, PollResults } from '../types';
import { formatDateTime, getTimezoneDisplay } from '../utils/timezone';

const PollParticipation: React.FC = () => {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Poll data
  const [poll, setPoll] = useState<PollType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [participantToken, setParticipantToken] = useState('');
  const [participant, setParticipant] = useState<any>(null);
  
  // Authentication form
  const [authMethod, setAuthMethod] = useState<'login' | 'token'>('token'); // Changed default to 'token'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  
  // Voting state
  const [votes, setVotes] = useState<Record<string, string[]>>({});
  const [hasVoted, setHasVoted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [allowVoteChanges, setAllowVoteChanges] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<PollResults | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  // Timing state for countdown
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [timeUntilStart, setTimeUntilStart] = useState<string>('');
  const [timeUntilEnd, setTimeUntilEnd] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [pollStatus, setPollStatus] = useState<'upcoming' | 'active' | 'ended' | 'not-started'>('not-started');

  // Update current time every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate poll status and countdowns
  useEffect(() => {
    if (poll) {
      const now = currentTime;
      const start = poll.startDate;
      const end = poll.endDate;

      if (now < start) {
        setPollStatus('upcoming');
        setTimeUntilStart(calculateTimeRemaining(start - now));
      } else if (now >= start && now <= end) {
        setPollStatus('active');
        setTimeUntilEnd(calculateTimeRemaining(end - now));
      } else {
        setPollStatus('ended');
      }

      // Calculate duration
      const diff = end - start;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      let durationStr = '';
      if (days > 0) durationStr += `${days}d `;
      if (hours > 0) durationStr += `${hours}h `;
      if (minutes > 0 || durationStr === '') durationStr += `${minutes}m`;
      setDuration(durationStr.trim());
    }
  }, [poll, currentTime]);

  const calculateTimeRemaining = (ms: number): string => {
    if (ms <= 0) return '0m';
    
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    if (days === 0 && seconds >= 0) result += `${seconds}s`;
    
    return result.trim();
  };

  useEffect(() => {
    if (pollId) {
      loadPoll();
      
      // Check for token in URL query parameter
      const urlToken = searchParams.get('token');
      if (urlToken) {
        setToken(urlToken);
        setAuthMethod('token');
        // Auto-authenticate if token is present
        setTimeout(() => {
          handleAuthenticationWithToken(urlToken);
        }, 500);
      }
    }
  }, [pollId, searchParams]);

  const handleAuthenticationWithToken = async (tokenValue: string) => {
    if (!pollId || !tokenValue) return;
    
    setAuthLoading(true);
    setError('');

    try {
      const response = await publicPollApi.validateAccess(pollId, { token: tokenValue });
      
      if ((response.data as any).hasVoted) {
        setParticipant((response.data as any).participant);
        setHasVoted(true);
        setAllowVoteChanges((response.data as any).allowVoteChanges || false);
        setIsAuthenticated(true);
        setParticipantToken(response.data.participantToken);
      } else {
        setIsAuthenticated(true);
        setParticipantToken(response.data.participantToken);
        setParticipant(response.data.participant);
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Invalid access token');
    } finally {
      setAuthLoading(false);
    }
  };

  const loadPoll = async () => {
    if (!pollId) return;
    
    try {
      const response = await publicPollApi.getPoll(pollId);
      setPoll(response.data.poll);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Poll not found or not accessible');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthentication = async () => {
    if (!pollId) return;
    
    setAuthLoading(true);
    setError('');

    try {
      const credentials = authMethod === 'login' 
        ? { email: email.toLowerCase().trim(), password }
        : { token };

      const response = await publicPollApi.validateAccess(pollId, credentials);
      
      if ((response.data as any).hasVoted) {
        // User has already voted
        setParticipant((response.data as any).participant);
        setHasVoted(true);
        setAllowVoteChanges((response.data as any).allowVoteChanges || false);
        setIsAuthenticated(true);
        setParticipantToken(response.data.participantToken);
      } else {
        // User can vote
        setIsAuthenticated(true);
        setParticipantToken(response.data.participantToken);
        setParticipant(response.data.participant);
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOptionChange = (questionId: string, optionId: string, isChecked: boolean) => {
    const question = poll?.ballot.find(q => q.id === questionId);
    if (!question) return;

    setVotes(prev => {
      const currentVotes = prev[questionId] || [];
      
      if (question.maxSelection === 1) {
        // Single selection - replace current vote
        return { ...prev, [questionId]: isChecked ? [optionId] : [] };
      } else {
        // Multiple selection
        if (isChecked) {
          // Add option if under max limit
          if (currentVotes.length < question.maxSelection!) {
            return { ...prev, [questionId]: [...currentVotes, optionId] };
          }
          return prev; // Don't allow more than max
        } else {
          // Remove option
          return { ...prev, [questionId]: currentVotes.filter(id => id !== optionId) };
        }
      }
    });
  };

  const handleSubmitVote = async () => {
    if (!poll || !pollId || !participantToken) return;

    // Check if poll has ended
    if (isPollCompleted()) {
      setError('This poll has ended. Voting is no longer allowed.');
      return;
    }

    // Validate minimum selections
    for (const question of poll.ballot) {
      const questionVotes = votes[question.id] || [];
      if (questionVotes.length < (question.minSelection || 1)) {
        setError(`Please select at least ${question.minSelection || 1} option(s) for "${question.title}"`);
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      await publicPollApi.submitVote(pollId, participantToken, votes);
      setHasVoted(true);
      setShowResults(false); // Hide results after voting
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to submit vote');
    } finally {
      setSubmitting(false);
    }
  };

  const loadResults = async () => {
    if (!pollId || !participantToken) return;

    setLoadingResults(true);
    try {
      const response = await publicPollApi.getResults(pollId, participantToken);
      setResults(response.data.results);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load results');
    } finally {
      setLoadingResults(false);
    }
  };

  const handleChangeVote = () => {
    setHasVoted(false);
    setVotes({});
    setShowResults(false);
    setError('');
    setAcceptedPrivacy(false);
  };

  const isVoteValid = () => {
    if (!poll) return false;
    
    return poll.ballot.every(question => {
      const questionVotes = votes[question.id] || [];
      return questionVotes.length >= (question.minSelection || 1) && 
             questionVotes.length <= (question.maxSelection || 1);
    });
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const isPollCompleted = () => {
    if (!poll) return false;
    const now = Date.now();
    return poll.endDate < now;
  };

  const getEffectiveStatus = () => {
    if (!poll) return '';
    if (isPollCompleted()) {
      return 'completed';
    }
    return poll.status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading poll...</p>
        </div>
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <svg className="mx-auto h-16 w-16 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Poll</h3>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (hasVoted && isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{poll?.title}</h1>
              {poll?.description && (
                <p className="text-gray-600 mb-4">{poll.description}</p>
              )}
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(getEffectiveStatus())}`}>
                  {getEffectiveStatus().toUpperCase()}
                </span>
                <span>Ends: {poll && formatDate(poll.endDate)}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Vote Status Banner */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <svg className="w-8 h-8 text-green-400 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-green-900">Vote Submitted Successfully!</h3>
                <p className="text-green-700 mt-1">Thank you for participating in "{poll?.title}". Your vote has been recorded.</p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              {allowVoteChanges && !isPollCompleted() && (
                <button
                  onClick={handleChangeVote}
                  className="inline-flex items-center px-4 py-2 border border-orange-300 text-sm font-medium rounded-lg text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Change Vote
                </button>
              )}
              
              {poll?.settings.allowResultsView && (
                <button
                  onClick={() => {
                    setShowResults(!showResults);
                    if (!showResults && !results) {
                      loadResults();
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {showResults ? 'Hide Results' : 'View Results'}
                </button>
              )}
              
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Go Home
              </button>
            </div>
          </div>

          {/* Results Section */}
          {showResults && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Poll Results</h2>
                <button
                  onClick={() => setShowResults(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              {loadingResults ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading results...</p>
                </div>
              ) : results ? (
                <div className="space-y-6">
                  {/* Poll Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-blue-600">Total Participants</p>
                          <p className="text-lg font-semibold text-blue-900">{results.statistics.totalParticipants}</p>
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
                          <p className="text-sm font-medium text-green-600">Voted</p>
                          <p className="text-lg font-semibold text-green-900">{results.statistics.votedParticipants}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-purple-600">Participation Rate</p>
                          <p className="text-lg font-semibold text-purple-900">{formatPercentage(results.statistics.participationRate)}</p>
                        </div>
                      </div>
                    </div>

                    {results.poll.voteWeightEnabled && results.statistics.totalVoteWeight && (
                      <div className="bg-orange-50 rounded-lg p-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-orange-600">Total Vote Weight</p>
                            <p className="text-lg font-semibold text-orange-900">{results.statistics.totalVoteWeight}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Question Results */}
                  {results.permissions.canViewResultsBreakdown && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900">Results by Question</h3>
                      
                      {results.questions.map((question, questionIndex) => (
                        <div key={question.questionId} className="bg-gray-50 rounded-lg p-6">
                          <div className="mb-6">
                            <h4 className="text-base font-medium text-gray-900 mb-2">
                              {questionIndex + 1}. {question.title}
                            </h4>
                            
                            {results.permissions.canViewVoteCounts && (
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span>Total Votes: {question.totalVotes}</span>
                                {results.poll.voteWeightEnabled && question.totalWeightedVotes && (
                                  <span>Weighted Votes: {question.totalWeightedVotes}</span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="space-y-4">
                            {question.options.map((option) => (
                              <div key={option.optionId} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-900">{option.title}</span>
                                  <div className="flex items-center space-x-3 text-sm text-gray-600">
                                    {results.permissions.canViewVoteCounts && (
                                      <span>{option.voteCount} votes</span>
                                    )}
                                    <span className="font-medium">{formatPercentage(option.percentage)}</span>
                                  </div>
                                </div>
                                
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.max(option.percentage, 2)}%` }}
                                  ></div>
                                </div>
                                
                                {results.poll.voteWeightEnabled && (
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>Weighted: {option.weightedVoteCount}</span>
                                    <span>{formatPercentage(option.weightedPercentage)}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Participants List */}
                  {results.participants.length > 0 && results.permissions.canViewParticipantNames && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6">Participants</h3>
                      
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
                              {results.poll.voteWeightEnabled && results.permissions.canViewVoteWeights && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Vote Weight
                                </th>
                              )}
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Voted At
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {results.participants.map((participant, index) => (
                              <tr key={participant.id || index}>
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
                                {results.poll.voteWeightEnabled && results.permissions.canViewVoteWeights && typeof participant.voteWeight !== 'undefined' && (
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {participant.voteWeight}
                                  </td>
                                )}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                    Voted
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {participant.votedAt ? formatDate(participant.votedAt) : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Access Notice */}
                  {!results.permissions.canViewResultsBreakdown && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-yellow-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <h4 className="text-sm font-medium text-yellow-800">Limited Results View</h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            {poll?.status === 'active' 
                              ? "Full poll results will be available when the poll ends."
                              : "The poll manager has chosen to hide detailed results until the poll ends."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-600">
                  <p>Click "View Results" to load the poll results</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Authentication screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">{poll?.title}</h1>
              {poll?.description && (
                <p className="text-lg text-gray-600 mb-6 max-w-3xl mx-auto">{poll.description}</p>
              )}
              <div className="flex items-center justify-center space-x-6">
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium shadow-sm ${
                  pollStatus === 'active' ? 'bg-green-100 text-green-800 border border-green-200' :
                  pollStatus === 'upcoming' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                  'bg-gray-100 text-gray-800 border border-gray-200'
                }`}>
                  {pollStatus === 'active' && (
                    <svg className="w-4 h-4 mr-2 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  {pollStatus === 'active' ? 'ACTIVE NOW' : pollStatus === 'upcoming' ? 'UPCOMING' : 'ENDED'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Timezone Banner */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="bg-primary-50 border-l-4 border-primary-500 p-4 rounded-r-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-primary-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-primary-900">
                  System Timezone: <span className="font-bold">{getTimezoneDisplay()}</span>
                </p>
                <p className="text-xs text-primary-700 mt-1">
                  All times are displayed in this timezone
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Poll Status Cards */}
        {poll && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Duration Card */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Duration</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{duration}</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Countdown Card */}
              {pollStatus === 'upcoming' && (
                <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Starts In</p>
                      <p className="text-2xl font-bold text-blue-900 mt-2">{timeUntilStart}</p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {pollStatus === 'active' && (
                <div className="bg-white border border-green-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Ends In</p>
                      <p className="text-2xl font-bold text-green-900 mt-2">{timeUntilEnd}</p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-lg">
                      <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Start Date Card */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Starts</p>
                  <p className="text-sm font-medium text-gray-900">{formatDateTime(poll.startDate, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              {/* End Date Card */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ends</p>
                  <p className="text-sm font-medium text-gray-900">{formatDateTime(poll.endDate, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Authentication Form */}
        <main className="max-w-md mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Access Poll</h2>
              <p className="text-gray-600 mt-2">
                {isPollCompleted() 
                  ? 'This poll has ended. You can view results if available.' 
                  : 'Please authenticate to participate in this poll'}
              </p>
            </div>

            {/* Poll Ended Warning */}
            {isPollCompleted() && (
              <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-blue-700 font-medium">The voting period for this poll has ended.</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-700 font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Auth Method Selection - SWAPPED ORDER */}
            <div className="mb-6">
              <div className="flex border-2 border-gray-300 rounded-lg p-1.5 bg-gray-50">
                <button
                  onClick={() => setAuthMethod('token')}
                  className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-md transition-all ${
                    authMethod === 'token'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  🎫 Access Token
                </button>
                <button
                  onClick={() => setAuthMethod('login')}
                  className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-md transition-all ${
                    authMethod === 'login'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  👤 User Login
                </button>
              </div>
            </div>

            {/* Authentication Form */}
            {authMethod === 'token' ? (
              <div>
                <label htmlFor="token" className="block text-sm font-semibold text-gray-700 mb-2">
                  Access Token
                </label>
                <input
                  type="text"
                  id="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter your access token"
                  required
                />
                <p className="text-xs text-gray-500 mt-2 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Use the token provided in your invitation email
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleAuthentication}
              disabled={authLoading || (authMethod === 'login' ? !email || !password : !token)}
              className="w-full mt-6 py-3.5 px-4 border border-transparent text-base font-semibold rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              {authLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2 inline-block"></div>
                  Authenticating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2 inline-block" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Access Poll
                </>
              )}
            </button>
          </div>

          {/* Back to Home */}
          <div className="text-center mt-6">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Home
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Voting screen - authenticated user can now vote
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{poll?.title}</h1>
            {poll?.description && (
              <p className="text-gray-600 mb-4">{poll.description}</p>
            )}
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(getEffectiveStatus())}`}>
                {getEffectiveStatus().toUpperCase()}
              </span>
              <span>Ends: {formatDate(poll?.endDate)}</span>
            </div>
            {participant && (
              <div className="mt-2 text-sm text-gray-600">
                Voting as: <span className="font-medium">{participant.name}</span>
                {participant.voteWeight !== 1 && (
                  <span className="ml-2 text-xs text-blue-600">(Vote weight: {participant.voteWeight})</span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
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

      {/* Poll Ended Message */}
      {isPollCompleted() && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-8 h-8 text-blue-500 mr-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-blue-900">This Poll Has Ended</h3>
                <p className="text-blue-700 mt-1">The voting period for this poll ended on {formatDate(poll?.endDate)}. Voting is no longer allowed.</p>
              </div>
            </div>
            {poll?.settings.allowResultsView && (
              <div className="mt-4">
                <button
                  onClick={() => {
                    setShowResults(!showResults);
                    if (!showResults && !results) {
                      loadResults();
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {showResults ? 'Hide Results' : 'View Results'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {poll?.ballot.map((question, questionIndex) => (
            <div key={question.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {questionIndex + 1}. {question.title}
                </h2>
                {question.description && (
                  <p className="text-gray-600 mb-4">{question.description}</p>
                )}
                
                {/* Question Image */}
                {question.image && (
                  <div className="mb-4">
                    <img
                      src={question.image}
                      alt="Question"
                      className="max-w-full max-h-96 object-contain rounded border border-gray-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  <span>
                    Select {question.minSelection === question.maxSelection 
                      ? `${question.minSelection}` 
                      : `${question.minSelection}-${question.maxSelection}`} option(s)
                  </span>
                  {question.randomizedOrder && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Randomized Order
                    </span>
                  )}
                </div>

                {/* Attachments */}
                {question.attachments && question.attachments.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Attachments:</p>
                    <div className="space-y-2">
                      {question.attachments.filter(att => att.trim()).map((attachment, idx) => (
                        <a
                          key={idx}
                          href={attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-2 border border-gray-200 rounded-lg text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 mr-2 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                          </svg>
                          {attachment.split('/').pop() || `Attachment ${idx + 1}`}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="space-y-4">
                {question.options.map((option) => {
                  const isSelected = (votes[question.id] || []).includes(option.id);
                  const inputType = question.maxSelection === 1 ? 'radio' : 'checkbox';
                  
                  return (
                    <div key={option.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200">
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center mt-1">
                          <input
                            type={inputType}
                            name={`question-${question.id}`}
                            id={`option-${option.id}`}
                            checked={isSelected}
                            onChange={(e) => handleOptionChange(question.id, option.id, e.target.checked)}
                            disabled={isPollCompleted()}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <label htmlFor={`option-${option.id}`} className="text-base font-medium text-gray-900 cursor-pointer">
                                {option.title}
                              </label>
                              {option.shortDescription && (
                                <p className="text-sm text-gray-600 mt-1">{option.shortDescription}</p>
                              )}
                              {option.longDescription && (
                                <p className="text-sm text-gray-500 mt-2">{option.longDescription}</p>
                              )}
                              {option.link && (
                                <div className="mt-2">
                                  <a
                                    href={option.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                                  >
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                                    </svg>
                                    Learn More
                                  </a>
                                </div>
                              )}
                            </div>
                            {option.image && (
                              <div className="ml-4 flex-shrink-0">
                                <img
                                  src={option.image}
                                  alt={option.title}
                                  className="w-20 h-20 object-cover rounded border border-gray-300"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Privacy Policy Acceptance and Submit Button */}
          {!isPollCompleted() && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="space-y-4">
                {/* Privacy Policy Checkbox */}
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="privacy-policy"
                      type="checkbox"
                      checked={acceptedPrivacy}
                      onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="privacy-policy" className="font-medium text-gray-700">
                      I accept the{' '}
                      <a
                        href="/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Privacy Policy
                      </a>
                    </label>
                    <p className="text-gray-500 mt-1">
                      By submitting your vote, you agree to our privacy policy.
                    </p>
                  </div>
                </div>

                {/* Submit Section */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-sm text-gray-600">
                    Please review your selections before submitting your vote.
                  </div>
                  <button
                    onClick={handleSubmitVote}
                    disabled={!isVoteValid() || !acceptedPrivacy || submitting}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting Vote...
                      </>
                    ) : (
                      'Submit Vote'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PollParticipation;
