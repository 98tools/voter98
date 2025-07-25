import React, { useState } from 'react';
import type { Poll, PollPermissions } from '../../types';

interface ScheduleTabProps {
  poll: Poll;
  permissions: PollPermissions;
  onSave: (updates: Partial<Poll>) => void;
  saving: boolean;
}

const ScheduleTab: React.FC<ScheduleTabProps> = ({ poll, permissions, onSave, saving }) => {
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 disabled:opacity-50 cursor-pointer"
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
