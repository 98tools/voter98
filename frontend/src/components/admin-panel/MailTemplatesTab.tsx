import React, { useState, useEffect } from 'react';
import { mailTemplateApi } from '../../utils/api';
import type { MailTemplate } from '../../types';

const MailTemplatesTab: React.FC = () => {
  const [templates, setTemplates] = useState<MailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MailTemplate | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    htmlBody: '',
    isDefault: false,
  });

  const availableVariables = [
    { name: 'participantName', description: 'Participant\'s name' },
    { name: 'pollTitle', description: 'Poll title' },
    { name: 'pollDescription', description: 'Poll description' },
    { name: 'pollUrl', description: 'Voting link URL' },
    { name: 'pollStartDate', description: 'Poll start date' },
    { name: 'pollEndDate', description: 'Poll end date' },
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await mailTemplateApi.getAll();
      setTemplates(response.data.templates || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingTemplate) {
        await mailTemplateApi.update(editingTemplate.id, formData);
        setSuccess('Template updated successfully');
      } else {
        await mailTemplateApi.create(formData);
        setSuccess('Template created successfully');
      }
      
      resetForm();
      loadTemplates();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save template');
    }
  };

  const handleEdit = (template: MailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      htmlBody: template.htmlBody || '',
      isDefault: template.isDefault,
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await mailTemplateApi.delete(id);
      setSuccess('Template deleted successfully');
      loadTemplates();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete template');
    }
  };

  const insertVariable = (variable: string, field: 'subject' | 'body' | 'htmlBody') => {
    const variableText = `{{${variable}}}`;
    setFormData(prev => ({
      ...prev,
      [field]: prev[field] + variableText,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      body: '',
      htmlBody: '',
      isDefault: false,
    });
    setEditingTemplate(null);
    setShowCreateForm(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Mail Templates</h3>
          <p className="text-sm text-gray-600 mt-1">
            Create and manage email templates for poll invitations
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 hover-lift cursor-pointer"
        >
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Create Template
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            {editingTemplate ? 'Edit Template' : 'Create New Template'}
          </h4>
          
          {/* Available Variables Info */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h5 className="text-sm font-semibold text-blue-900 mb-2">Available Variables:</h5>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {availableVariables.map((v) => (
                <div key={v.name} className="text-blue-800">
                  <code className="bg-white px-2 py-1 rounded">{`{{${v.name}}}`}</code>
                  <span className="ml-2 text-xs text-blue-600">{v.description}</span>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  placeholder="e.g., Default Invitation"
                />
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Set as Default Template</span>
                </label>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Email Subject *</label>
                <div className="flex gap-1">
                  {availableVariables.slice(0, 2).map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => insertVariable(v.name, 'subject')}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      title={`Insert ${v.description}`}
                    >
                      {`{{${v.name}}}`}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                placeholder="e.g., Voting Invitation: {{pollTitle}}"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Plain Text Body *</label>
                <div className="flex gap-1">
                  {availableVariables.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => insertVariable(v.name, 'body')}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      title={`Insert ${v.description}`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                required
                rows={8}
                placeholder="Hello {{participantName}},&#10;&#10;You are invited to vote in: {{pollTitle}}&#10;&#10;Click here to vote: {{pollUrl}}"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">HTML Body (Optional)</label>
                <div className="flex gap-1">
                  {availableVariables.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => insertVariable(v.name, 'htmlBody')}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      title={`Insert ${v.description}`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={formData.htmlBody}
                onChange={(e) => setFormData({ ...formData, htmlBody: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                rows={10}
                placeholder="<h2>Hello {{participantName}}</h2>&#10;<p>You are invited to vote in: <strong>{{pollTitle}}</strong></p>"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-primary-600 to-blue-600 text-white font-medium py-3 px-6 rounded-lg hover:from-primary-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 hover-lift cursor-pointer"
              >
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-gray-300 text-gray-700 font-medium py-3 px-6 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Templates List */}
      <div className="space-y-4">
        {templates.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 text-lg">No templates created yet</p>
            <p className="text-gray-500 text-sm mt-2">Create your first email template to get started</p>
          </div>
        ) : (
          templates.map((template) => (
            <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">{template.name}</h4>
                    {template.isDefault && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Subject:</p>
                      <p className="text-sm text-gray-800">{template.subject}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Body Preview:</p>
                      <p className="text-sm text-gray-800 line-clamp-3">{template.body}</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Last updated: {new Date(template.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(template)}
                    className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    disabled={template.isDefault}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MailTemplatesTab;
