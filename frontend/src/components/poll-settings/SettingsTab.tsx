import React, { useState, useEffect } from 'react';
import type { Poll, PollPermissions } from '../../types';

interface SettingsTabProps {
  poll: Poll;
  permissions: PollPermissions;
  onSave: (updates: Partial<Poll>) => void;
  saving: boolean;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ poll, permissions, onSave, saving }) => {
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
                    disabled={!permissions.canEditSettings}
                    className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                      !permissions.canEditSettings ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
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
                    disabled={!permissions.canEditSettings}
                    className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                      !permissions.canEditSettings ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
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
                    disabled={!permissions.canEditSettings}
                    className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                      !permissions.canEditSettings ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
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
                    disabled={!permissions.canEditSettings}
                    className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                      !permissions.canEditSettings ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
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
                    disabled={!permissions.canEditSettings}
                    className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                      !permissions.canEditSettings ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
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
                    disabled={!permissions.canEditSettings || isPollActive}
                    className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                      !permissions.canEditSettings ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
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
                    disabled={!permissions.canEditSettings}
                    className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                      !permissions.canEditSettings ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
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
            {permissions.canEditSettings && (
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsTab;
