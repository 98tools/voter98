import React, { useState, useEffect } from 'react';
import { pollApi } from '../../utils/api';
import type { Poll, PollPermissions } from '../../types';

interface AuditEvent {
  id: string;
  eventType: string;
  actorName: string;
  participantName?: string;
  meta?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: number;
}

const EventsTab: React.FC<{ poll: Poll; permissions: PollPermissions }> = ({ poll }) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadEvents();
  }, [poll.id]);

  const loadEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await pollApi.getPollAuditEvents(poll.id);
      setEvents(response.data.events);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    const iconMap: { [key: string]: { icon: string; color: string } } = {
      'TOKEN_VIEWED': { icon: '👁️', color: 'text-yellow-600' },
      'TOKEN_REVOKED': { icon: '🔒', color: 'text-red-600' },
      'PARTICIPANT_APPROVED': { icon: '✓', color: 'text-green-600' },
      'PARTICIPANT_REJECTED': { icon: '✗', color: 'text-red-600' },
      'VOTE_CAST': { icon: '🗳️', color: 'text-blue-600' },
      'LOGIN_FAILED': { icon: '⚠️', color: 'text-red-600' },
      'MARKED_AS_IN_PERSON_VOTED': { icon: '🎯', color: 'text-purple-600' },
      'IN_PERSON_VOTE_CAST': { icon: '🗳️', color: 'text-purple-600' },
      'EMAIL_SENT': { icon: '✉️', color: 'text-blue-600' },
      'ADMIN_IP_LOGGED': { icon: '🌐', color: 'text-gray-600' },
    };

    return iconMap[eventType] || { icon: '•', color: 'text-gray-600' };
  };

  const getEventLabel = (eventType: string) => {
    const labelMap: { [key: string]: string } = {
      'TOKEN_VIEWED': 'Token Viewed',
      'TOKEN_REVOKED': 'Token Revoked',
      'PARTICIPANT_APPROVED': 'Participant Approved',
      'PARTICIPANT_REJECTED': 'Participant Rejected',
      'VOTE_CAST': 'Vote Cast',
      'LOGIN_FAILED': 'Login Failed',
      'MARKED_AS_IN_PERSON_VOTED': 'Marked as Voted',
      'IN_PERSON_VOTE_CAST': 'Vote Recorded',
      'EMAIL_SENT': 'Email Sent',
      'ADMIN_IP_LOGGED': 'Admin Activity',
    };

    return labelMap[eventType] || eventType;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-CA');
  };

  const filteredEvents = filterType === 'all' ? events : events.filter(e => e.eventType === filterType);

  const eventTypes = Array.from(new Set(events.map(e => e.eventType)));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Poll Events</h2>
        <p className="text-sm text-gray-600">All audit events recorded for this poll, including participant activity and administrative actions.</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Filter */}
      {eventTypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            All ({events.length})
          </button>
          {eventTypes.map((type) => {
            const count = events.filter(e => e.eventType === type).length;
            const { icon } = getEventIcon(type);
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                  filterType === type
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                <span>{icon}</span>
                <span>{getEventLabel(type)} ({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-500">
            {filterType === 'all' 
              ? 'No audit events have been recorded for this poll yet.'
              : `No events of type "${getEventLabel(filterType)}" found.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEvents.map((event) => {
            const { icon, color } = getEventIcon(event.eventType);
            const isExpanded = expandedEventId === event.id;

            return (
              <div key={event.id} className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
                {/* Event Row */}
                <button
                  onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                  className="w-full px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <span className={`text-xl ${color}`}>{icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{getEventLabel(event.eventType)}</h4>
                        {event.participantName && (
                          <span className="text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            {event.participantName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span>Actor: {event.actorName}</span>
                        <span>•</span>
                        <span>{formatDate(event.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="space-y-2 text-sm">
                      {event.ipAddress && (
                        <div>
                          <span className="font-medium text-gray-700">IP Address:</span>
                          <span className="ml-2 text-gray-600 font-mono">{event.ipAddress}</span>
                        </div>
                      )}
                      {event.userAgent && (
                        <div>
                          <span className="font-medium text-gray-700">User Agent:</span>
                          <span className="ml-2 text-gray-600 text-xs break-words">{event.userAgent}</span>
                        </div>
                      )}
                      {event.meta && Object.keys(event.meta).length > 0 && (
                        <div>
                          <span className="font-medium text-gray-700">Details:</span>
                          <div className="ml-2 mt-1 bg-white p-2 rounded border border-gray-200 font-mono text-xs overflow-auto max-h-32">
                            {JSON.stringify(event.meta, null, 2)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      {events.length > 0 && (
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-3">Event Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-blue-700">Total Events</p>
              <p className="text-2xl font-bold text-blue-900">{events.length}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Event Types</p>
              <p className="text-2xl font-bold text-blue-900">{eventTypes.length}</p>
            </div>
            {events.filter(e => e.eventType === 'VOTE_CAST').length > 0 && (
              <div>
                <p className="text-sm text-blue-700">Votes Cast</p>
                <p className="text-2xl font-bold text-blue-900">{events.filter(e => e.eventType === 'VOTE_CAST').length}</p>
              </div>
            )}
            {events.filter(e => e.eventType.includes('IN_PERSON')).length > 0 && (
              <div>
                <p className="text-sm text-blue-700">In-Person Votes</p>
                <p className="text-2xl font-bold text-blue-900">{events.filter(e => e.eventType.includes('IN_PERSON')).length}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsTab;
