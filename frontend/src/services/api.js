import axios from 'axios';

// Detect subdomain: prod = negocio.gestix.app → "negocio"; dev = from localStorage
export const getSubdomain = () => {
  const host = window.location.hostname;
  const parts = host.split('.');
  if (parts.length >= 3 && !host.includes('localhost')) {
    return parts[0];
  }
  return localStorage.getItem('gestix_subdomain') || 'demo';
};

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pos_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Tenant'] = getSubdomain();
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_user');
      localStorage.removeItem('pos_tenant');
      window.location.href = '/login';
    }
    return Promise.reject(err.response?.data || err);
  }
);

// Public API — no auth, no X-Tenant needed
const publicApi = axios.create({ baseURL: '/api/public' });
publicApi.interceptors.response.use((res) => res.data, (err) => Promise.reject(err.response?.data || err));

// Super-admin API
const adminAxios = axios.create({ baseURL: '/api/admin' });
adminAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
adminAxios.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(err.response?.data || err);
  }
);

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

export const productsApi = {
  list: (params) => api.get('/products', { params }),
  get: (id) => api.get(`/products/${id}`),
  getByCode: (code) => api.get(`/products/code/${code}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  adjustStock: (id, data) => api.patch(`/products/${id}/stock`, data),
  lowStock: () => api.get('/products/low-stock'),
  stockHistory: (id) => api.get(`/products/${id}/stock-history`),
};

export const categoriesApi = {
  list: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const customersApi = {
  list: (search) => api.get('/customers', { params: { search } }),
  get: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  salesHistory: (id) => api.get(`/customers/${id}/sales`),
  paymentsHistory: (id) => api.get(`/customers/${id}/payments`),
  accountSummary: (id) => api.get(`/customers/${id}/account`),
};

export const salesApi = {
  list: (params) => api.get('/sales', { params }),
  get: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post('/sales', data),
  cancel: (id) => api.patch(`/sales/${id}/cancel`),
  summary: (date) => api.get('/sales/summary', { params: { date } }),
};

export const cashRegisterApi = {
  current: () => api.get('/cash-register/current'),
  open: (data) => api.post('/cash-register/open', data),
  close: (id, data) => api.post(`/cash-register/${id}/close`, data),
  addMovement: (data) => api.post('/cash-register/movement', data),
  summary: (id) => api.get(`/cash-register/${id}/summary`),
};

export const suppliersApi = {
  list: (search) => api.get('/suppliers', { params: { search } }),
  get: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
};

export const usersApi = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  resetPassword: (id, data) => api.put(`/users/${id}/reset-password`, data),
};

export const paymentsApi = {
  receivables: (params) => api.get('/payments/receivables', { params }),
  list: (params) => api.get('/payments', { params }),
  byCustomer: (customer_id) => api.get(`/payments/customer/${customer_id}`),
  create: (data) => api.post('/payments', data),
};

export const expensesApi = {
  list: (params) => api.get('/expenses', { params }),
  summary: () => api.get('/expenses/summary'),
  categories: () => api.get('/expenses/categories'),
  get: (id) => api.get(`/expenses/${id}`),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  markPaid: (id) => api.patch(`/expenses/${id}/pay`),
  delete: (id) => api.delete(`/expenses/${id}`),
};

export const cashFlowApi = {
  list: (params) => api.get('/cash-flow', { params }),
  daily: (date) => api.get('/cash-flow/daily', { params: { date } }),
  period: (params) => api.get('/cash-flow/period', { params }),
  categories: (params) => api.get('/cash-flow/categories', { params }),
  create: (data) => api.post('/cash-flow', data),
  delete: (id) => api.delete(`/cash-flow/${id}`),
};

export const reportsApi = {
  dashboard: () => api.get('/reports/dashboard'),
  salesByPeriod: (params) => api.get('/reports/sales/period', { params }),
  salesByPaymentMethod: (params) => api.get('/reports/sales/payment-method', { params }),
  salesBySeller: (params) => api.get('/reports/sales/seller', { params }),
  salesByCategory: (params) => api.get('/reports/sales/category', { params }),
  topProducts: (params) => api.get('/reports/products/top', { params }),
  topCustomers: (params) => api.get('/reports/customers/top', { params }),
  inventoryValue: () => api.get('/reports/inventory/value'),
};

export const settingsApi = {
  getAll: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

export const publicRegistryApi = {
  plans: () => publicApi.get('/plans'),
  register: (data) => publicApi.post('/register', data),
  checkSubdomain: (subdomain) => publicApi.get(`/check-subdomain/${subdomain}`),
};

export const superAdminApi = {
  login: (data) => adminAxios.post('/login', data),
  tenants: () => adminAxios.get('/tenants'),
  tenant: (id) => adminAxios.get(`/tenants/${id}`),
  updateTenant: (id, data) => adminAxios.put(`/tenants/${id}`, data),
  stats: () => adminAxios.get('/stats'),
  plans: () => adminAxios.get('/plans'),
  checkTrials: () => adminAxios.post('/check-trials'),
};

export default api;
