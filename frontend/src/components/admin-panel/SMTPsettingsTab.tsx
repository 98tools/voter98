import React, { useEffect, useState } from 'react';
import { smtpApi } from '../../utils/api';

const SMTPsettingsTab: React.FC = () => {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editConfig, setEditConfig] = useState<any | null>(null);
  const [showHostSuggestions, setShowHostSuggestions] = useState(false);
  const [showPortSuggestions, setShowPortSuggestions] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [form, setForm] = useState({
    host: '',
    port: 587,
    user: '',
    password: '',
    secure: false,
    dailyLimit: 100,
  });
  const [reordering, setReordering] = useState(false);

  // Common SMTP hosts with their default ports and security settings
  const smtpHosts = [
    { host: 'smtp.protonmail.ch', port: 587, secure: false, name: 'Proton Mail' },
    { host: 'smtp.protonmail.ch', port: 465, secure: true, name: 'Proton Mail (SSL)' },
    { host: 'smtp.gmail.com', port: 587, secure: false, name: 'Gmail' },
    { host: 'smtp.gmail.com', port: 465, secure: true, name: 'Gmail (SSL)' },
    { host: 'smtp-mail.outlook.com', port: 587, secure: false, name: 'Outlook/Hotmail' },
    { host: 'smtp-mail.outlook.com', port: 465, secure: true, name: 'Outlook/Hotmail (SSL)' },
    { host: 'smtp.office365.com', port: 587, secure: false, name: 'Office 365' },
    { host: 'smtp.office365.com', port: 465, secure: true, name: 'Office 365 (SSL)' },
    { host: 'smtp.zoho.com', port: 587, secure: false, name: 'Zoho Mail' },
    { host: 'smtp.zoho.com', port: 465, secure: true, name: 'Zoho Mail (SSL)' },
  ];

  // Common SMTP ports with descriptions
  const smtpPorts = [
    { port: 587, description: 'SMTP with STARTTLS', secure: false },
    { port: 465, description: 'SMTPS (SSL/TLS)', secure: true },
    { port: 25, description: 'SMTP (Unencrypted)', secure: false },
    { port: 2525, description: 'Alternative SMTP', secure: false },
    { port: 8025, description: 'Alternative SMTP', secure: false },
  ];

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res = await smtpApi.getAll();
      // Map snake_case to camelCase for frontend
      const configs = res.data.configs.map((cfg: any) => ({
        ...cfg,
        dailyLimit: cfg.dailyLimit,
        dailySent: cfg.daily_sent,
        createdAt: cfg.created_at,
        updatedAt: cfg.updated_at,
        order: cfg.order,
      }));
      setConfigs(configs);
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load SMTP configs');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (config?: any) => {
    if (config) {
      setEditConfig(config);
      setForm({ ...config });
    } else {
      setEditConfig(null);
      setForm({ host: '', port: 587, user: '', password: '', secure: false, dailyLimit: 100 });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditConfig(null);
    setForm({ host: '', port: 587, user: '', password: '', secure: false, dailyLimit: 100 });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let newValue: any = value;
    if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
      newValue = e.target.checked;
    }
    setForm((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleHostFocus = () => {
    setShowHostSuggestions(true);
  };

  const handleHostBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => setShowHostSuggestions(false), 200);
  };

  const handleHostSuggestionClick = (suggestion: any) => {
    setForm((prev) => ({
      ...prev,
      host: suggestion.host,
      port: suggestion.port,
      secure: suggestion.secure,
    }));
    setSelectedProvider(suggestion.name);
    setShowHostSuggestions(false);
  };

  const handlePortFocus = () => {
    setShowPortSuggestions(true);
  };

  const handlePortBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => setShowPortSuggestions(false), 200);
  };

  const handlePortSuggestionClick = (suggestion: any) => {
    setForm((prev) => ({
      ...prev,
      port: suggestion.port,
      secure: suggestion.secure,
    }));
    setShowPortSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editConfig) {
        await smtpApi.update(editConfig.id, form);
      } else {
        await smtpApi.create(form);
      }
      loadConfigs();
      handleCloseModal();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to save SMTP config');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this SMTP config?')) return;
    try {
      await smtpApi.delete(id);
      loadConfigs();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to delete SMTP config');
    }
  };

  // Move config up or down
  const moveConfig = async (index: number, direction: 'up' | 'down') => {
    if (reordering) return;
    setReordering(true);
    const newConfigs = [...configs];
    if (direction === 'up' && index > 0) {
      [newConfigs[index - 1], newConfigs[index]] = [newConfigs[index], newConfigs[index - 1]];
    } else if (direction === 'down' && index < newConfigs.length - 1) {
      [newConfigs[index], newConfigs[index + 1]] = [newConfigs[index + 1], newConfigs[index]];
    } else {
      setReordering(false);
      return;
    }
    // Update order field based on new position
    const updates = newConfigs.map((cfg, i) => ({ id: cfg.id, order: i + 1 }));
    try {
      await smtpApi.patchOrder(updates);
      await loadConfigs();
    } catch (e) {
      setError('Failed to update order');
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center">
          <span className="mr-2">📧</span> SMTP Management
        </h3>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 hover-lift cursor-pointer"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add SMTP Config
        </button>
      </div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 animate-slide-in-right">
          {error}
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : configs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No SMTP configs found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Host</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Port</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Secure</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Limit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {configs.map((cfg, idx) => (
                <tr key={cfg.id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-4 py-4 whitespace-nowrap font-bold flex items-center gap-1">
                    {cfg.order}
                    <button
                      className="ml-1 text-xs text-gray-500 hover:text-blue-600 disabled:opacity-30"
                      onClick={() => moveConfig(idx, 'up')}
                      disabled={idx === 0 || reordering}
                      title="Move up"
                    >▲</button>
                    <button
                      className="ml-1 text-xs text-gray-500 hover:text-blue-600 disabled:opacity-30"
                      onClick={() => moveConfig(idx, 'down')}
                      disabled={idx === configs.length - 1 || reordering}
                      title="Move down"
                    >▼</button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{cfg.host}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{cfg.port}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{cfg.user}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{cfg.secure ? <span className="text-green-600 font-semibold">Yes</span> : <span className="text-gray-400">No</span>}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{cfg.dailyLimit}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      className="text-blue-600 hover:text-blue-900 font-medium mr-2 transition-colors duration-200 cursor-pointer"
                      onClick={() => handleOpenModal(cfg)}
                      title="Edit"
                    >
                      <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m-2 2h6" />
                      </svg>
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900 font-medium transition-colors duration-200 cursor-pointer"
                      onClick={() => handleDelete(cfg.id)}
                      title="Delete"
                    >
                      <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showModal && (
        <div className="fixed inset-0 backdrop-filter backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 relative animate-slide-in-right">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h4 className="text-lg font-semibold text-gray-900 mb-6">{editConfig ? 'Edit SMTP Config' : 'Add SMTP Config'}</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                <input
                  name="host"
                  value={form.host}
                  onChange={handleChange}
                  onFocus={handleHostFocus}
                  onBlur={handleHostBlur}
                  placeholder="Host"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                {showHostSuggestions && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {smtpHosts.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleHostSuggestionClick(suggestion)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{suggestion.name}</div>
                        <div className="text-sm text-gray-500">{suggestion.host} (Port: {suggestion.port}, {suggestion.secure ? 'SSL' : 'TLS'})</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                <input
                  name="port"
                  type="number"
                  value={form.port}
                  onChange={handleChange}
                  onFocus={handlePortFocus}
                  onBlur={handlePortBlur}
                  placeholder="Port"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                {showPortSuggestions && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {smtpPorts.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handlePortSuggestionClick(suggestion)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">Port {suggestion.port}</div>
                        <div className="text-sm text-gray-500">{suggestion.description} {suggestion.secure ? '(Secure)' : '(Unencrypted)'}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                <input
                  name="user"
                  value={form.user}
                  onChange={handleChange}
                  placeholder="User"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  Password
                  <div className="relative ml-2 group">
                    <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-80 z-20">
                      <div className="relative">
                        <div className="font-semibold mb-2">SMTP Password Requirements:</div>
                        <div className="space-y-2 text-xs">
                          {selectedProvider && (
                            <div className="bg-blue-900/50 p-2 rounded border-l-2 border-blue-400 mb-2">
                              <div className="font-medium text-blue-300">Selected: {selectedProvider}</div>
                              {selectedProvider.includes('Gmail') && (
                                <div className="mt-1">
                                  <span className="text-yellow-300">⚠️ Important:</span> You must create an App Password. 
                                  <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline ml-1">
                                    Learn how →
                                  </a>
                                </div>
                              )}
                              {selectedProvider.includes('Outlook') && (
                                <div className="mt-1">
                                  <span className="text-yellow-300">⚠️ Important:</span> Enable 2FA and generate an App Password in Account Settings.
                                </div>
                              )}
                              {selectedProvider.includes('Proton') && (
                                <div className="mt-1">
                                  <span className="text-yellow-300">⚠️ Important:</span> Use your Bridge password or create a dedicated SMTP password in Settings.
                                </div>
                              )}
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-yellow-300">Proton Mail:</span> Use Bridge password or create SMTP password
                          </div>
                          <div>
                            <span className="font-medium text-yellow-300">Gmail:</span> Create an App Password 
                            <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline ml-1">
                              (Guide)
                            </a>
                          </div>
                          <div>
                            <span className="font-medium text-yellow-300">Outlook/Hotmail:</span> Enable 2FA → Generate App Password
                          </div>
                          <div>
                            <span className="font-medium text-yellow-300">Office 365:</span> Enable 2FA → Generate App Password
                          </div>
                          <div className="text-gray-300 mt-2 border-t border-gray-700 pt-2">
                            <strong>💡 Tip:</strong> Regular account passwords usually won't work for SMTP. Most providers require App Passwords or SMTP-specific passwords for security.
                          </div>
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                </label>
                <input
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Password"
                  required
                  type="password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <div className="flex items-center space-x-3">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <input
                    name="secure"
                    type="checkbox"
                    checked={form.secure}
                    onChange={handleChange}
                    className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  Secure (SSL)
                </label>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily Limit</label>
                  <input
                    name="dailyLimit"
                    type="number"
                    value={form.dailyLimit}
                    onChange={handleChange}
                    placeholder="Daily Limit"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 hover-lift cursor-pointer"
                >
                  {editConfig ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-300 text-gray-700 font-medium py-3 px-6 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SMTPsettingsTab;
