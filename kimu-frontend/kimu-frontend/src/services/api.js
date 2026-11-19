import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'kimu_token';
let pendingRequests = 0;
let loadingTimer;

function startNetworkLoading() {
  pendingRequests += 1;
  if (pendingRequests === 1) {
    loadingTimer = window.setTimeout(() => {
      if (pendingRequests > 0) {
        window.dispatchEvent(new CustomEvent('kimu:network-loading', { detail: { visible: true } }));
      }
    }, 350);
  }
}

function stopNetworkLoading() {
  pendingRequests = Math.max(0, pendingRequests - 1);
  if (pendingRequests === 0) {
    window.clearTimeout(loadingTimer);
    window.dispatchEvent(new CustomEvent('kimu:network-loading', { detail: { visible: false } }));
  }
}

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
  startNetworkLoading();
  return config;
});

// Normalize errors and handle expired/invalid sessions globally.
api.interceptors.response.use(
  (response) => {
    stopNetworkLoading();
    return response;
  },
  (error) => {
    stopNetworkLoading();
    if (!error.response) {
      // Network error - backend unreachable
      return Promise.reject({
        message: 'Cannot reach the METRIZE server. Check your connection and try again.',
      });
    }

    if (error.response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('kimu_user');
      if (error.config?.url !== '/auth/logout' && window.location.pathname !== '/login') {
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

export const contactApi = {
  submit: (payload) => api.post('/contacts', payload),
  list: (params) => api.get('/contacts', { params }),
};

export const testimonialApi = {
  listPublished: () => api.get('/testimonials'),
  listForManagement: () => api.get('/testimonials/manage'),
  create: (payload) => api.post('/testimonials', payload),
  remove: (id) => api.delete(`/testimonials/${id}`),
};

export const taxiDriverApi = {
  listPublished: () => api.get('/taxi-drivers'),
  getPublished: (id) => api.get(`/taxi-drivers/${id}`),
  listForManagement: () => api.get('/taxi-drivers/manage'),
  create: (payload) => api.post('/taxi-drivers', payload),
  update: (id, payload) => api.put(`/taxi-drivers/${id}`, payload),
  remove: (id) => api.delete(`/taxi-drivers/${id}`),
};

export { TOKEN_KEY };
export default api;
