import axios from 'axios';
import type { AuthResponse, User, Poll } from '../types';

const API_BASE_URL = 'http://localhost:8787/api';

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
};

// Poll API
export const pollApi = {
  getPolls: () => api.get<{ polls: Poll[] }>('/polls'),
  getPoll: (id: string) => api.get<{ poll: Poll }>(`/polls/${id}`),
  createPoll: (pollData: { title: string; managerId: string; description?: string }) => 
    api.post<{ message: string; poll: Poll }>('/polls', pollData),
  updatePoll: (id: string, pollData: Partial<Poll>) => 
    api.put<{ message: string; poll: Poll }>(`/polls/${id}`, pollData),
  deletePoll: (id: string) => api.delete<{ message: string }>(`/polls/${id}`),
};

export default api;
