import React, { useState, useEffect } from 'react';
import type { Poll, PollResults } from '../../types';
import { pollApi } from '../../utils/api';

interface ResultsTabProps {
  poll: Poll;
}

const ResultsTab: React.FC<ResultsTabProps> = ({ poll }) => {
  const [results, setResults] = useState<PollResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadResults();
  }, [poll.id]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const response = await pollApi.getResults(poll.id);
      setResults(response.data.results);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load results');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-16 w-16 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Results</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <button
          onClick={loadResults}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200 cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No results available</p>
      </div>
    );
  }

  // Additional safety check for essential data structure
  if (!results.poll || !results.statistics) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-16 w-16 text-yellow-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Incomplete Results Data</h3>
        <p className="text-gray-500 mb-4">The results data is incomplete or malformed.</p>
        <button
          onClick={loadResults}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200 cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Poll Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Poll Information</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Status: </span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  results.poll?.status === 'active' ? 'bg-green-100 text-green-800' :
                  results.poll?.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  results.poll?.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {results.poll?.status?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Start Date: </span>
                <span className="text-gray-600">{results.poll?.startDate ? formatDate(results.poll.startDate) : 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">End Date: </span>
                <span className="text-gray-600">{results.poll?.endDate ? formatDate(results.poll.endDate) : 'N/A'}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Management</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Manager: </span>
                <span className="text-gray-600">{results.poll?.manager?.name || 'N/A'}</span>
              </div>
              {results.poll?.auditors && results.poll.auditors.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Auditors: </span>
                  <span className="text-gray-600">{results.poll.auditors.length} assigned</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Total Participants</p>
              <p className="text-lg font-semibold text-blue-900">{results.statistics?.totalParticipants || 0}</p>
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
              <p className="text-lg font-semibold text-green-900">{results.statistics?.votedParticipants || 0}</p>
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
              <p className="text-lg font-semibold text-purple-900">{formatPercentage(results.statistics?.participationRate || 0)}</p>
            </div>
          </div>
        </div>

        {results.poll && results.poll.voteWeightEnabled && results.statistics && results.statistics.totalVoteWeight && (
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-orange-600">Total Vote Weight</p>
                <p className="text-lg font-semibold text-orange-900">{results.statistics?.totalVoteWeight || 0}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Question Results */}
      {results.questions && results.questions.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Results by Question</h2>
          
          {results.questions.map((question, questionIndex) => (
            <div key={question.questionId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {questionIndex + 1}. {question.title}
                </h3>
                
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>Total Votes: {question.totalVotes || 0}</span>
                  {results.poll && results.poll.voteWeightEnabled && question.totalWeightedVotes && (
                    <span>Weighted Votes: {question.totalWeightedVotes}</span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {question.options && question.options.map((option) => (
                  <div key={option.optionId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{option.title}</span>
                      <div className="flex items-center space-x-3 text-sm text-gray-600">
                        <span>{option.voteCount || 0} votes</span>
                        <span className="font-medium">{formatPercentage(option.percentage || 0)}</span>
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(option.percentage || 0, 2)}%` }}
                      ></div>
                    </div>
                    
                    {results.poll && results.poll.voteWeightEnabled && (
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Weighted: {option.weightedVoteCount || 0}</span>
                        <span>{formatPercentage(option.weightedPercentage || 0)}</span>
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
      {results.participants && results.participants.length > 0 && results.permissions && results.permissions.canViewFullResults && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Participants</h2>
          
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
                  {results.poll && results.poll.voteWeightEnabled && (
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
                        <div className="text-sm font-medium text-gray-900">{participant.name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{participant.email || 'N/A'}</div>
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
                    {results.poll && results.poll.voteWeightEnabled && typeof participant.voteWeight !== 'undefined' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {participant.voteWeight || 0}
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
    </div>
  );
};

export default ResultsTab;
