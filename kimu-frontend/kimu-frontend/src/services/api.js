import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'kimu_token';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the auth token to every outgoing request, if present.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize errors and handle expired/invalid sessions globally.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Network error - backend unreachable
      return Promise.reject({
        message: 'Cannot reach the METRIZE server. Check your connection and try again.',
      });
    }

    if (error.response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('kimu_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    const message = error.response.data?.message || 'Something went wrong. Please try again.';
    return Promise.reject({ message, status: error.response.status });
  }
);

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  updateSettings: (payload) => api.patch('/auth/settings', payload),
  changePassword: (payload) => api.patch('/auth/password', payload),
};

export const notificationApi = {
  list: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  remove: (id) => api.delete(`/notifications/${id}`),
};

export const adminApi = {
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (payload) => api.put('/admin/settings', payload),
  auditLog: () => api.get('/admin/audit-log'),
  users: () => api.get('/users'),
  addUser: (payload) => api.post('/users', payload),
  updateUser: (id, payload) => api.put(`/users/${id}`, payload),
};

export const dashboardApi = {
  summary: () => api.get('/dashboard/summary'),
};

export { TOKEN_KEY };
export default api;
