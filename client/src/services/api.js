import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach Firebase token to every request
api.interceptors.request.use(async (config) => {
    const { auth } = await import('../config/firebase');
    const user = auth.currentUser;
    if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor — preserves validation errors array for the UI
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const data = error.response?.data;
        const message = data?.message || 'Something went wrong';
        const err = new Error(message);
        // Attach server-side validation errors so pages can display per-field errors
        if (data?.errors) err.errors = data.errors;
        err.status = error.response?.status;
        return Promise.reject(err);
    }
);

// -------- User API --------
export const userAPI = {
    sync: () => api.post('/users/sync'),
    getProfile: () => api.get('/users/me'),
    updateProfile: (data) => api.put('/users/me', data),
};

// -------- Expense API --------
export const expenseAPI = {
    getAll: (params) => api.get('/expenses', { params }),
    getOne: (id) => api.get(`/expenses/${id}`),
    create: (data) => api.post('/expenses', data),
    update: (id, data) => api.put(`/expenses/${id}`, data),
    delete: (id) => api.delete(`/expenses/${id}`),
    bulkDelete: (ids) => api.delete('/expenses/bulk', { data: { ids } }),
    getAnomalies: () => api.get('/expenses/anomalies'),
};

// -------- Analytics API --------
export const analyticsAPI = {
    getSummary: () => api.get('/analytics/summary'),
    getTrends: () => api.get('/analytics/trends'),
    getCategories: (params) => api.get('/analytics/categories', { params }),
    getDaily: () => api.get('/analytics/daily'),
    getPaymentMethods: () => api.get('/analytics/payment-methods'),
    getRecurring: () => api.get('/analytics/recurring'),
    getHeatmap: () => api.get('/analytics/heatmap'),
};

// -------- Budget API --------
export const budgetAPI = {
    getAll: (params) => api.get('/budgets', { params }),
    upsert: (data) => api.post('/budgets', data),
    delete: (id) => api.delete(`/budgets/${id}`),
};

// -------- Export API --------
export const exportAPI = {
    csvUrl: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return `${API_BASE}/export/csv${qs ? '?' + qs : ''}`;
    },
    pdfUrl: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return `${API_BASE}/export/pdf${qs ? '?' + qs : ''}`;
    },
    download: async (type, params = {}) => {
        const { auth } = await import('../config/firebase');
        const token = await auth.currentUser?.getIdToken();
        const qs = new URLSearchParams(params).toString();
        const url = `${API_BASE}/export/${type}${qs ? '?' + qs : ''}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`Export failed (${res.status})`);
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `smartspend-${type}-${Date.now()}.${type === 'csv' ? 'csv' : 'pdf'}`;
        a.click();
        URL.revokeObjectURL(objectUrl);
    },
};

// -------- Insights API (AI) --------
export const insightsAPI = {
    get: () => api.get('/insights'),
    categorize: (title) => api.post('/insights/categorize', { title }),
    scanReceipt: (imageFile, mimeType) => api.post('/insights/scan-receipt', { imageFile, mimeType }),
    command: (query) => api.post('/insights/command', { query }),
};

export default api;
