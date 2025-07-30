import axios from 'axios';
import type { AuthResponse, User, Poll, PollPermissions } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  login: (email: string, password: string) => 
    api.post<AuthResponse>('/auth/login', { email, password }),
  register: (email: string, password: string, name: string, adminKey?: string) => 
    api.post<AuthResponse>('/auth/register', { email, password, name, adminKey }),
};

// User API
export const userApi = {
  getProfile: () => api.get<{ user: User }>('/users/profile'),
  getAllUsers: () => api.get<{ users: User[] }>('/users/all'),
  getSubAdmins: () => api.get<{ subAdmins: User[] }>('/users/sub-admins'),
  createSubAdmin: (email: string, password: string, name: string) => 
    api.post<{ message: string; user: User }>('/users/sub-admin', { email, password, name }),
  createUser: (userData: { name: string; email: string; password: string; role: string }) => 
    api.post<{ message: string; user: User }>('/users/create', userData),
  updateUser: (id: string, userData: { name?: string; email?: string; password?: string; role?: string }) => 
    api.put<{ message: string; user: User }>(`/users/${id}`, userData),
  deleteUser: (id: string) => api.delete<{ message: string }>(`/users/${id}`),
};

// Poll API
export const pollApi = {
  getPolls: () => api.get<{ polls: Poll[] }>('/polls'),
  getOtherPolls: () => api.get<{ polls: Poll[] }>('/polls/other'),
  getPoll: (id: string) => api.get<{ poll: Poll }>(`/polls/${id}`),
  createPoll: (pollData: { title: string; managerId: string; description?: string }) => 
    api.post<{ message: string; poll: Poll }>('/polls', pollData),
  updatePoll: (id: string, pollData: Partial<Poll>) => 
    api.put<{ message: string; poll: Poll }>(`/polls/${id}`, pollData),
  deletePoll: (id: string) => api.delete<{ message: string }>(`/polls/${id}`),  
  // Participant management
  getParticipants: (pollId: string) => 
    api.get<{ participants: any[] }>(`/polls/${pollId}/participants`),
  addParticipant: (pollId: string, participantData: {
    email: string;
    name: string;
    isUser?: boolean;
    voteWeight?: number;
    token?: string;
  }) => 
    api.post<{ message: string; participant: any; systemNameUsed?: boolean }>(`/polls/${pollId}/participants`, participantData),
  removeParticipant: (pollId: string, participantId: string) =>
    api.delete<{ message: string }>(`/polls/${pollId}/participants/${participantId}`),
  updateParticipant: (pollId: string, participantId: string, updateData: {
    voteWeight?: number;
    token?: string;
    name?: string;
  }) =>
    api.put<{ message: string; participant: any }>(`/polls/${pollId}/participants/${participantId}`, updateData),
  sendEmailToParticipant: (pollId: string, participantId: string) =>
    api.post<{ message: string; lastEmailSentAt: number }>(`/polls/${pollId}/participants/${participantId}/send-email`),
  toggleEmailSending: (pollId: string) =>
    api.patch<{ message: string; poll: Poll }>(`/polls/${pollId}/toggle-emails`),
  
  // Results API
  getResults: (pollId: string) => 
    api.get<{ results: any }>(`/polls/${pollId}/results`),
  
  // Auditors and Editors API
  getAuditorsAndEditors: (pollId: string) =>
    api.get<{ manager: any; auditors: any[]; editors: any[] }>(`/polls/${pollId}/auditors-editors`),
  getAvailableSubAdmins: (pollId: string) =>
    api.get<{ availableSubAdmins: any[] }>(`/polls/${pollId}/available-subadmins`),
  addAuditor: (pollId: string, auditorData: { userId: string }) =>
    api.post<{ message: string; auditor: any }>(`/polls/${pollId}/auditors`, auditorData),
  addEditor: (pollId: string, editorData: { userId: string }) =>
    api.post<{ message: string; editor: any }>(`/polls/${pollId}/editors`, editorData),
  removeAuditor: (pollId: string, auditorId: string) =>
    api.delete<{ message: string }>(`/polls/${pollId}/auditors/${auditorId}`),
  removeEditor: (pollId: string, editorId: string) =>
    api.delete<{ message: string }>(`/polls/${pollId}/editors/${editorId}`),
  
  // Permissions API
  getUserPollPermissions: (pollId: string) =>
    api.get<{ permissions: PollPermissions }>(`/polls/${pollId}/permissions`),
};

// Public Poll API (no authentication required)
export const publicPollApi = {
  getPoll: (id: string) => 
    axios.get<{ poll: Poll }>(`${API_BASE_URL}/poll/${id}/public`),
  validateAccess: (id: string, credentials: { email?: string; password?: string; token?: string }) =>
    axios.post<{ success: boolean; sessionToken: string; participant: any }>(`${API_BASE_URL}/poll/${id}/validate-access`, credentials),
  submitVote: (id: string, sessionToken: string, votes: Record<string, string[]>) =>
    axios.post<{ success: boolean; message: string }>(`${API_BASE_URL}/poll/${id}/vote`, { sessionToken, votes }),
  getVoteStatus: (id: string, sessionToken: string) =>
    axios.get<{ hasVoted: boolean; participant: any }>(`${API_BASE_URL}/poll/${id}/vote-status/${sessionToken}`),
  getResults: (id: string, sessionToken?: string) =>
    axios.get<{ results: any }>(`${API_BASE_URL}/poll/${id}/results${sessionToken ? `/${sessionToken}` : ''}`),
};

// SMTP API
export const smtpApi = {
  getAll: () => api.get<{ configs: any[] }>('/smtp'),
  create: (data: any) => api.post<{ message: string; config: any }>('/smtp', data),
  update: (id: string, data: any) => api.put<{ message: string; config: any }>(`/smtp/${id}`, data),
  delete: (id: string) => api.delete<{ message: string }>(`/smtp/${id}`),
  patchOrder: (updates: { id: string; order: number }[]) => api.patch<{ message: string }>('/smtp/order', updates),
  sendEmail: (data: { to: string; subject: string; body: string; smtpId: string }) => 
    api.post<{ message: string }>('/smtp/send', data),
  sendEmailNextAvailable: (data: { to: string; subject: string; body: string; html?: string }) => 
    api.post<{ message: string; smtpConfig: { id: string; host: string; order: number } }>('/smtp/send/next-available', data),
};

export default api;
