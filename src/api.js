import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401/403 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getUsers: () => api.get('/auth/users'),
  toggleUser: (id) => api.patch(`/auth/users/${id}/toggle`),
  getSaleUsers: () => api.get('/auth/users/sales'),
};

// Dashboard APIs
export const dashboardApi = {
  getStats: (params) => api.get('/dashboard/stats', { params }),
  getRevenueMonthly: () => api.get('/dashboard/revenue-monthly'),
  getOrdersDaily: () => api.get('/dashboard/orders-daily'),
  getOrderStatus: () => api.get('/dashboard/order-status'),
  getRecentOrders: () => api.get('/dashboard/recent-orders'),
  getAnalytics: (params) => api.get('/dashboard/analytics', { params }),
  getSaleDashboard: (params) => api.get('/dashboard/sale-dashboard', { params }),
};

// Don Hang (Orders) APIs
export const donHangApi = {
  getAll: (params) => api.get('/don-hang', { params }),
  getById: (id) => api.get(`/don-hang/${id}`),
  create: (data) => api.post('/don-hang', data),
  update: (id, data) => api.put(`/don-hang/${id}`, data),
  updateStatus: (id, tinhTrang) => api.patch(`/don-hang/${id}/status`, { tinhTrang }),
  delete: (id) => api.delete(`/don-hang/${id}`),
  getSales: () => api.get('/don-hang/sales'),
  getPages: () => api.get('/don-hang/pages'),
  export: (params) => api.get('/don-hang/export', { params, responseType: 'blob' }),
};

// Khach Hang (Customers) APIs
export const khachHangApi = {
  getAll: (params) => api.get('/khach-hang', { params }),
  getById: (id) => api.get(`/khach-hang/${id}`),
  create: (data) => api.post('/khach-hang', data),
  update: (id, data) => api.put(`/khach-hang/${id}`, data),
  updateStatus: (id, status) => api.patch(`/khach-hang/${id}/status`, { status }),
  delete: (id) => api.delete(`/khach-hang/${id}`),
  search: (keyword) => api.get('/khach-hang/search', { params: { keyword } }),
  getPages: () => api.get('/khach-hang/pages'),
  getSales: () => api.get('/khach-hang/sales'),
  transferSale: (id, sale) => api.patch(`/khach-hang/${id}/transfer`, { sale }),
  updateNotes: (id, notes) => api.patch(`/khach-hang/${id}/notes`, { notes }),
};

export default api;
