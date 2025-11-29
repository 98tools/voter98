import React, { useState, useEffect } from 'react';
import type { Poll, PollPermissions } from '../../types';
import { formatForDateTimeLocal, parseDateTimeLocal, getTimezoneDisplay, formatDateTime } from '../../utils/timezone';

interface ScheduleTabProps {
  poll: Poll;
  permissions: PollPermissions;
  onSave: (updates: Partial<Poll>) => void;
  saving: boolean;
}

const ScheduleTab: React.FC<ScheduleTabProps> = ({ poll, permissions, onSave, saving }) => {
  const [formData, setFormData] = useState({
    startDate: poll.startDate ? formatForDateTimeLocal(poll.startDate) : '',
    endDate: poll.endDate ? formatForDateTimeLocal(poll.endDate) : '',
  });

  const [duration, setDuration] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [timeUntilStart, setTimeUntilStart] = useState<string>('');
  const [timeUntilEnd, setTimeUntilEnd] = useState<string>('');
  const [pollStatus, setPollStatus] = useState<'upcoming' | 'active' | 'ended' | 'not-set'>('not-set');
  const [hasChanges, setHasChanges] = useState(false);

  // Check if form data has changed from original poll data
  useEffect(() => {
    const originalStart = poll.startDate ? formatForDateTimeLocal(poll.startDate) : '';
    const originalEnd = poll.endDate ? formatForDateTimeLocal(poll.endDate) : '';
    
    const changed = formData.startDate !== originalStart || formData.endDate !== originalEnd;
    setHasChanges(changed);
  }, [formData, poll.startDate, poll.endDate]);

  // Update current time every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate duration, status, and countdowns
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = parseDateTimeLocal(formData.startDate);
      const end = parseDateTimeLocal(formData.endDate);
      const diff = end - start;

      // Calculate duration
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      let durationStr = '';
      if (days > 0) durationStr += `${days}d `;
      if (hours > 0) durationStr += `${hours}h `;
      if (minutes > 0 || durationStr === '') durationStr += `${minutes}m`;
      setDuration(durationStr.trim());

      // Determine poll status
      if (currentTime < start) {
        setPollStatus('upcoming');
        setTimeUntilStart(calculateTimeRemaining(start - currentTime));
      } else if (currentTime >= start && currentTime <= end) {
        setPollStatus('active');
        setTimeUntilEnd(calculateTimeRemaining(end - currentTime));
      } else {
        setPollStatus('ended');
      }
    } else {
      setPollStatus('not-set');
      setDuration('');
    }
  }, [formData.startDate, formData.endDate, currentTime]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const start = parseDateTimeLocal(formData.startDate);
    const end = parseDateTimeLocal(formData.endDate);
    
    if (end <= start) {
      alert('End date must be after start date');
      return;
    }
    
    onSave({
      startDate: start,
      endDate: end,
    });
    
    // Reset hasChanges after successful save
    setHasChanges(false);
  };

  const handleQuickDuration = (hours: number) => {
    if (!formData.startDate) {
      alert('Please set a start date first');
      return;
    }
    const start = parseDateTimeLocal(formData.startDate);
    const end = start + (hours * 60 * 60 * 1000);
    setFormData({ ...formData, endDate: formatForDateTimeLocal(end) });
  };

  const setToNow = () => {
    setFormData({ ...formData, startDate: formatForDateTimeLocal(Date.now()) });
  };

  const getStatusBadge = () => {
    switch (pollStatus) {
      case 'upcoming':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Upcoming
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 animate-pulse">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Active Now
          </span>
        );
      case 'ended':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            Ended
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Poll Schedule</h3>
          <p className="text-sm text-gray-500 mt-1">
            Configure when your poll will be active for voting
          </p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Timezone Info Banner */}
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
              All times are displayed and stored in this timezone
            </p>
          </div>
        </div>
      </div>

      {/* Live Status Cards */}
      {pollStatus !== 'not-set' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Duration Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Duration</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{duration}</p>
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
            <div className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Starts In</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{timeUntilStart}</p>
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
            <div className="bg-white border border-green-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Ends In</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">{timeUntilEnd}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Current Time Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Time</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {formatDateTime(currentTime, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
              <div className="bg-gray-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Start Date */}
            <div className="space-y-2">
              <label htmlFor="startDate" className="block text-sm font-semibold text-gray-900">
                Start Date & Time
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  id="startDate"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    !permissions.canEdit ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
                  }`}
                  disabled={!permissions.canEdit}
                  required
                />
              </div>
              {permissions.canEdit && (
                <button
                  type="button"
                  onClick={setToNow}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center mt-2"
                >
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Set to current time
                </button>
              )}
              {formData.startDate && (
                <p className="text-xs text-gray-600 mt-2">
                  📅 {formatDateTime(parseDateTimeLocal(formData.startDate))}
                </p>
              )}
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label htmlFor="endDate" className="block text-sm font-semibold text-gray-900">
                End Date & Time
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  id="endDate"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    !permissions.canEdit ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
                  }`}
                  disabled={!permissions.canEdit}
                  required
                />
              </div>
              {formData.endDate && (
                <p className="text-xs text-gray-600 mt-2">
                  📅 {formatDateTime(parseDateTimeLocal(formData.endDate))}
                </p>
              )}
            </div>
          </div>

          {/* Quick Duration Buttons */}
          {permissions.canEdit && formData.startDate && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">Quick Duration Presets:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '1 Hour', hours: 1 },
                  { label: '6 Hours', hours: 6 },
                  { label: '12 Hours', hours: 12 },
                  { label: '1 Day', hours: 24 },
                  { label: '3 Days', hours: 72 },
                  { label: '1 Week', hours: 168 },
                  { label: '2 Weeks', hours: 336 },
                  { label: '1 Month', hours: 720 },
                ].map((preset) => (
                  <button
                    key={preset.hours}
                    type="button"
                    onClick={() => handleQuickDuration(preset.hours)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Validation Warnings */}
        {formData.startDate && formData.endDate && parseDateTimeLocal(formData.endDate) <= parseDateTimeLocal(formData.startDate) && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-900">Invalid Schedule</p>
                <p className="text-sm text-red-700 mt-1">End date must be after start date</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {saving ? (
              <span className="flex items-center text-primary-600">
                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving changes...
              </span>
            ) : hasChanges ? (
              <span className="text-orange-600 font-medium">⚠️ You have unsaved changes</span>
            ) : (
              <span>💡 Tip: Use quick presets to set common poll durations</span>
            )}
          </div>
          {permissions.canEdit && (
            <button
              type="submit"
              disabled={saving || !hasChanges || Boolean(formData.startDate && formData.endDate && parseDateTimeLocal(formData.endDate) <= parseDateTimeLocal(formData.startDate))}
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                  </svg>
                  Save Schedule
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ScheduleTab;
