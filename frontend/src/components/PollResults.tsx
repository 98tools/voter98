import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pollApi, publicPollApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import type { PollResults as PollResultsType } from '../types';

interface PollResultsProps {
  sessionToken?: string; // For public access
}

const PollResults: React.FC<PollResultsProps> = ({ sessionToken }) => {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [results, setResults] = useState<PollResultsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (pollId) {
      loadResults();
    }
  }, [pollId, sessionToken]);

  const loadResults = async () => {
    if (!pollId) return;
    
    try {
      setLoading(true);
      let response;
      
      if (sessionToken) {
        // Public access with session token
        response = await publicPollApi.getResults(pollId, sessionToken);
      } else if (user) {
        // Authenticated access
        response = await pollApi.getResults(pollId);
      } else {
        throw new Error('No access credentials provided');
      }
      
      setResults(response.data.results);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load poll results');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100 border-green-200';
      case 'completed': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'cancelled': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const isPollEnded = () => {
    if (!results) return false;
    return Date.now() > results.poll.endDate || results.poll.status === 'completed';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <svg className="mx-auto h-16 w-16 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Results</h3>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{results.poll.title} - Results</h1>
              {results.poll.description && (
                <p className="text-gray-600 mb-4">{results.poll.description}</p>
              )}
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(results.poll.status)}`}>
                  {results.poll.status.toUpperCase()}
                </span>
                <span>Started: {formatDate(results.poll.startDate)}</span>
                <span>Ends: {formatDate(results.poll.endDate)}</span>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to Dashboard
              </button>
              {user && results.permissions.canViewFullResults && (
                <button
                  onClick={() => navigate(`/polls/${pollId}/settings`)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Poll Settings
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Statistics Overview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Poll Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
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
                      <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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

            {/* Poll Management Info */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Poll Manager</h3>
                  <div className="text-sm text-gray-600">
                    {results.poll.manager.name && (
                      <p>{results.poll.manager.name}</p>
                    )}
                    {results.poll.manager.email && (
                      <p className="text-gray-500">{results.poll.manager.email}</p>
                    )}
                  </div>
                </div>
                
                {results.poll.auditors.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Auditors</h3>
                    <div className="space-y-1">
                      {results.poll.auditors.map((auditor) => (
                        <div key={auditor.id} className="text-sm text-gray-600">
                          <p>{auditor.name}</p>
                          <p className="text-gray-500">{auditor.email}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Access Notice */}
          {!results.permissions.canViewResultsBreakdown && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Limited Results View</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    {isPollEnded() 
                      ? "Full poll results will be available when the poll ends."
                      : "The poll manager has chosen to hide detailed results until the poll ends."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Question Results */}
          {results.permissions.canViewResultsBreakdown && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Results by Question</h2>
              
              {results.questions.map((question, questionIndex) => (
                <div key={question.questionId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {questionIndex + 1}. {question.title}
                    </h3>
                    
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
          {results.participants.length > 0 && (results.permissions.canViewParticipantNames || results.permissions.canViewFullResults) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Participants</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {results.permissions.canViewFullResults && (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Participant
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                        </>
                      )}
                      {(results.permissions.canViewParticipantNames || results.permissions.canViewFullResults) && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                      )}
                      {results.poll.voteWeightEnabled && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vote Weight
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      {results.permissions.canViewFullResults && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Voted At
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.participants.map((participant, index) => (
                      <tr key={participant.id || index}>
                        {results.permissions.canViewFullResults && (
                          <>
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
                          </>
                        )}
                        {(results.permissions.canViewParticipantNames || results.permissions.canViewFullResults) && participant.name && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {participant.name}
                          </td>
                        )}
                        {results.poll.voteWeightEnabled && typeof participant.voteWeight !== 'undefined' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {participant.voteWeight}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Voted
                          </span>
                        </td>
                        {results.permissions.canViewFullResults && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {participant.votedAt ? formatDate(participant.votedAt) : 'N/A'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Anonymous Vote Weights */}
          {!results.permissions.canViewParticipantNames && results.poll.voteWeightEnabled && 
           results.participants.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Vote Weights (Anonymous)</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {results.participants
                  .filter(p => typeof p.voteWeight !== 'undefined')
                  .map((participant, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 text-center">
                      <span className="text-lg font-medium text-gray-900">{participant.voteWeight}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PollResults;
