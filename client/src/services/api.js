import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE,
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

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const message = error.response?.data?.message || 'Something went wrong';
        return Promise.reject(new Error(message));
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
    bulkDelete: (ids) => api.delete('/expenses', { data: { ids } }),
};

// -------- Analytics API --------
export const analyticsAPI = {
    getSummary: () => api.get('/analytics/summary'),
    getTrends: () => api.get('/analytics/trends'),
    getCategories: (params) => api.get('/analytics/categories', { params }),
    getDaily: () => api.get('/analytics/daily'),
    getPaymentMethods: () => api.get('/analytics/payment-methods'),
};

// -------- Budget API --------
export const budgetAPI = {
    getAll: (params) => api.get('/budgets', { params }),
    upsert: (data) => api.post('/budgets', data),
    delete: (id) => api.delete(`/budgets/${id}`),
};

// -------- Export API --------
// These return raw binary — use directly with window.location or fetch with blob
export const exportAPI = {
    csvUrl: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return `${API_BASE}/export/csv${qs ? '?' + qs : ''}`;
    },
    pdfUrl: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return `${API_BASE}/export/pdf${qs ? '?' + qs : ''}`;
    },
    // Download helper — fetches with auth token then triggers browser download
    download: async (type, params = {}) => {
        const { auth } = await import('../config/firebase');
        const token = await auth.currentUser?.getIdToken();
        const qs = new URLSearchParams(params).toString();
        const url = `${API_BASE}/export/${type}${qs ? '?' + qs : ''}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `smartspend-${type}-${Date.now()}.${type === 'csv' ? 'csv' : 'pdf'}`;
        a.click();
        URL.revokeObjectURL(objectUrl);
    },
};

export default api;

