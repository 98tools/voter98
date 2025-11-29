import React, { useState } from 'react';
import type { Poll, PollPermissions } from '../../types';
import { formatForDateTimeLocal, parseDateTimeLocal, getTimezoneDisplay } from '../../utils/timezone';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      startDate: parseDateTimeLocal(formData.startDate),
      endDate: parseDateTimeLocal(formData.endDate),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Poll Schedule</h3>
        <p className="text-sm text-gray-600 mb-4">
          System Timezone: <span className="font-semibold text-primary-600">{getTimezoneDisplay()}</span>
        </p>
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
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  !permissions.canEdit ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                disabled={!permissions.canEdit}
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
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  !permissions.canEdit ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                disabled={!permissions.canEdit}
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            {permissions.canEdit && (
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save Schedule'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleTab;
