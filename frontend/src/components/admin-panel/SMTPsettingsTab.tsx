import React, { useEffect, useState } from 'react';
import { smtpApi } from '../../utils/api';

const SMTPsettingsTab: React.FC = () => {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editConfig, setEditConfig] = useState<any | null>(null);
  const [form, setForm] = useState({
    host: '',
    port: 587,
    user: '',
    password: '',
    secure: false,
    dailyLimit: 100,
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res = await smtpApi.getAll();
      setConfigs(res.data.configs);
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Host</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Port</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Secure</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Limit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {configs.map((cfg) => (
                <tr key={cfg.id} className="hover:bg-gray-50 transition-colors duration-200">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 animate-fade-in">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                <input
                  name="host"
                  value={form.host}
                  onChange={handleChange}
                  placeholder="Host"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                <input
                  name="port"
                  type="number"
                  value={form.port}
                  onChange={handleChange}
                  placeholder="Port"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
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
