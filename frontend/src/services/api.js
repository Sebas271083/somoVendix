import axios from 'axios';
import toast from 'react-hot-toast';

// Detect subdomain for multi-tenant routing.
// VITE_TENANT env var overrides everything (use for custom domains like somosvendix.com.ar).
export const getSubdomain = () => {
  if (import.meta.env.VITE_TENANT) return import.meta.env.VITE_TENANT;

  const host = window.location.hostname;
  if (host.includes('localhost')) {
    return localStorage.getItem('gestix_subdomain') || 'demo';
  }

  const parts = host.split('.');
  // Country-code TLDs (ar, uk, br, au…) are 2 chars — need 4+ parts for a real subdomain.
  // Generic TLDs (com, app, net…) are 3+ chars — need 3+ parts.
  const tld = parts[parts.length - 1];
  const minParts = tld.length <= 2 ? 4 : 3;

  if (parts.length >= minParts) return parts[0];

  return localStorage.getItem('gestix_subdomain') || 'demo';
};

// VITE_API_URL allows pointing to a separate backend in production.
// In dev, the Vite proxy handles /api → localhost:3008, so leave it as '/api'.
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

const api = axios.create({ baseURL: API_BASE });

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
    if (err.response?.data?.upgrade_required) {
      toast.error(err.response.data.error || 'Módulo no disponible en tu plan actual', {
        duration: 5000,
        icon: '🔒',
      });
    }
    return Promise.reject(err.response?.data || err);
  }
);

// Public API — no auth, no X-Tenant needed
const publicApi = axios.create({ baseURL: `${API_BASE}/public` });
publicApi.interceptors.response.use((res) => res.data, (err) => Promise.reject(err.response?.data || err));

// Super-admin API
const adminAxios = axios.create({ baseURL: `${API_BASE}/admin` });
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
  priceHistory: (id) => api.get(`/products/${id}/price-history`),
  importCSV: (products) => api.post('/products/import', { products }),
  getVariants: (id) => api.get(`/products/${id}/variants`),
  saveVariants: (id, data) => api.post(`/products/${id}/variants`, data),
  adjustVariantStock: (id, variantId, data) => api.patch(`/products/${id}/variants/${variantId}/stock`, data),
  uploadImage: (id, file) => {
    const form = new FormData();
    form.append('image', file);
    return api.post(`/products/${id}/image`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
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
  metrics: (id) => api.get(`/customers/${id}/metrics`),
  interactions: (id) => api.get(`/customers/${id}/interactions`),
  createInteraction: (id, data) => api.post(`/customers/${id}/interactions`, data),
  deleteInteraction: (id, intId) => api.delete(`/customers/${id}/interactions/${intId}`),
  loyaltyHistory: (id) => api.get(`/customers/${id}/loyalty`),
  loyaltyPreview: (id, points) => api.post(`/customers/${id}/loyalty/preview`, { points }),
  loyaltyAdjust: (id, data) => api.patch(`/customers/${id}/loyalty/adjust`, data),
  getPriceLists: () => api.get('/customers/price-lists'),
  updatePriceList: (segment, discount_pct) => api.patch(`/customers/price-lists/${segment}`, { discount_pct }),
  importCSV: (customers) => api.post('/customers/import', { customers }),
  deactivate: (id) => api.patch(`/customers/${id}/deactivate`),
};

export const salesApi = {
  list: (params) => api.get('/sales', { params }),
  get: (id) => api.get(`/sales/${id}`),
  findByTicket: (ticket_number) => api.get('/sales', { params: { ticket_number } }),
  create: (data) => api.post('/sales', data),
  cancel: (id) => api.patch(`/sales/${id}/cancel`),
  summary: (date) => api.get('/sales/summary', { params: { date } }),
};

export const returnsApi = {
  list: (params) => api.get('/returns', { params }),
  create: (data) => api.post('/returns', data),
  bySale: (sale_id) => api.get(`/returns/sale/${sale_id}`),
};

export const quotesApi = {
  list: (params) => api.get('/quotes', { params }),
  get: (id) => api.get(`/quotes/${id}`),
  create: (data) => api.post('/quotes', data),
  update: (id, data) => api.put(`/quotes/${id}`, data),
  delete: (id) => api.delete(`/quotes/${id}`),
};

export const installmentsApi = {
  plans: (params) => api.get('/installments/plans', { params }),
  getInstallments: (plan_id) => api.get(`/installments/plans/${plan_id}`),
  markPaid: (id, data) => api.patch(`/installments/${id}/pay`, data),
};

export const cashRegisterApi = {
  current: () => api.get('/cash-register/current'),
  allOpen: () => api.get('/cash-register/all-open'),
  history: () => api.get('/cash-register/history'),
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
  uploadReceipt: (id, file) => {
    const form = new FormData();
    form.append('receipt', file);
    return api.post(`/expenses/${id}/upload-receipt`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  approve: (id) => api.patch(`/expenses/${id}/approve`),
  reject: (id, notes) => api.patch(`/expenses/${id}/reject`, { notes }),
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
  returnsSummary: (params) => api.get('/reports/returns/summary', { params }),
  incomeStatement: (params) => api.get('/reports/income-statement', { params }),
  comparison: (params) => api.get('/reports/comparison', { params }),
  projection: () => api.get('/reports/projection'),
};

export const purchaseOrdersApi = {
  list: (params) => api.get('/purchase-orders', { params }),
  get: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post('/purchase-orders', data),
  receive: (id) => api.patch(`/purchase-orders/${id}/receive`),
  cancel: (id) => api.patch(`/purchase-orders/${id}/cancel`),
};

export const settingsApi = {
  getAll: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

export const billingApi = {
  plans: () => api.get('/billing/plans'),
  checkout: (plan_id) => api.post('/billing/checkout', { plan_id }),
  status: () => api.get('/billing/status'),
};

export const locationsApi = {
  list: () => api.get('/locations'),
  create: (data) => api.post('/locations', data),
  update: (id, data) => api.put(`/locations/${id}`, data),
  getStock: (id) => api.get(`/locations/${id}/stock`),
  transfer: (id, data) => api.post(`/locations/${id}/transfer`, data),
};

export const stocktakeApi = {
  list: () => api.get('/stocktake'),
  get: (id) => api.get(`/stocktake/${id}`),
  create: (data) => api.post('/stocktake', data),
  updateItem: (sessionId, itemId, counted_qty) => api.patch(`/stocktake/${sessionId}/items/${itemId}`, { counted_qty }),
  close: (id) => api.post(`/stocktake/${id}/close`),
};

export const campaignsApi = {
  list: () => api.get('/campaigns'),
  get: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  delete: (id) => api.delete(`/campaigns/${id}`),
  send: (id) => api.post(`/campaigns/${id}/send`),
  whatsappLinks: (id) => api.get(`/campaigns/${id}/whatsapp-links`),
};

export const afipApi = {
  getSettings: () => api.get('/afip/settings'),
  saveSettings: (data) => api.put('/afip/settings', data),
  testConnection: () => api.post('/afip/test'),
  getSaleQR: (saleId) => api.get(`/afip/sale/${saleId}/qr`),
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
