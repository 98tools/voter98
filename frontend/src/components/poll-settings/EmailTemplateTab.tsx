import React, { useState, useEffect } from 'react';
import { mailTemplateApi } from '../../utils/api';
import type { Poll, PollPermissions, MailTemplate } from '../../types';

interface EmailTemplateTabProps {
  poll: Poll;
  permissions: PollPermissions;
  onSave: (updates: Partial<Poll>) => void;
  saving: boolean;
}

const EmailTemplateTab: React.FC<EmailTemplateTabProps> = ({ poll, permissions, onSave, saving }) => {
  const [templates, setTemplates] = useState<MailTemplate[]>([]);
  const [defaultTemplate, setDefaultTemplate] = useState<MailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(poll.settings.mailTemplateId || '');

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    setSelectedTemplateId(poll.settings.mailTemplateId || '');
  }, [poll.settings.mailTemplateId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const [templatesResponse, defaultResponse] = await Promise.all([
        mailTemplateApi.getAll(),
        mailTemplateApi.getDefault(),
      ]);
      
      setTemplates(templatesResponse.data.templates || []);
      setDefaultTemplate(defaultResponse.data.template);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    onSave({
      settings: {
        ...poll.settings,
        mailTemplateId: selectedTemplateId || undefined,
      },
    });
  };

  const availableVariables = [
    { name: 'participantName', description: 'Participant\'s name' },
    { name: 'pollTitle', description: 'Poll title' },
    { name: 'pollDescription', description: 'Poll description' },
    { name: 'pollUrl', description: 'Voting link URL' },
    { name: 'pollStartDate', description: 'Poll start date' },
    { name: 'pollEndDate', description: 'Poll end date' },
  ];

  const selectedTemplate = selectedTemplateId 
    ? templates.find(t => t.id === selectedTemplateId) 
    : defaultTemplate;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Template</h3>
        <p className="text-sm text-gray-600">
          Choose an email template that will be used for sending invitations to participants in this poll.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Available Variables Info */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h5 className="text-sm font-semibold text-blue-900 mb-2">Available Variables:</h5>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          {availableVariables.map((v) => (
            <div key={v.name} className="text-blue-800">
              <code className="bg-white px-2 py-1 rounded text-xs">{`{{${v.name}}}`}</code>
              <span className="ml-2 text-xs text-blue-600">{v.description}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-blue-700 mt-2">
          💡 These variables will be automatically replaced with actual values when emails are sent.
        </p>
      </div>

      {/* Template Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Email Template
        </label>
        <select
          value={selectedTemplateId}
          onChange={(e) => setSelectedTemplateId(e.target.value)}
          disabled={!permissions.canEditSettings || saving}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Use Default Template</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} {template.isDefault ? '(System Default)' : ''}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {selectedTemplateId 
            ? 'Using custom template for this poll' 
            : defaultTemplate 
              ? 'Using the system default template'
              : 'No default template set - emails will use built-in template'}
        </p>
      </div>

      {/* Template Preview */}
      {selectedTemplate && (
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Template Preview</h4>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Template Name:</p>
              <p className="text-sm text-gray-800">{selectedTemplate.name}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Subject:</p>
              <div className="bg-white p-3 rounded border border-gray-200">
                <p className="text-sm text-gray-800 font-mono">{selectedTemplate.subject}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Plain Text Body:</p>
              <div className="bg-white p-3 rounded border border-gray-200 max-h-64 overflow-y-auto">
                <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">{selectedTemplate.body}</pre>
              </div>
            </div>

            {selectedTemplate.htmlBody && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">HTML Body:</p>
                <div className="bg-white p-3 rounded border border-gray-200 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">{selectedTemplate.htmlBody}</pre>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Last updated: {new Date(selectedTemplate.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      {permissions.canEditSettings && (
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving || selectedTemplateId === (poll.settings.mailTemplateId || '')}
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                </svg>
                Save Template Settings
              </>
            )}
          </button>
        </div>
      )}

      {!permissions.canEditSettings && (
        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
          <p className="text-yellow-700 text-sm">
            You don't have permission to modify email template settings for this poll.
          </p>
        </div>
      )}
    </div>
  );
};

export default EmailTemplateTab;
