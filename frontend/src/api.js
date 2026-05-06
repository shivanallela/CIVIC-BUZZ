/**
 * src/api.js
 * Centralized API helper.
 * FIX: All requests include credentials: 'include' for session cookies.
 */

const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include', // FIX: Send session cookies with every request
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers
    },
    ...options
  });

  const data = await res.json().catch(() => ({ error: 'Invalid server response' }));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}

export const api = {
  // Auth
  login: (username, password, role) =>
    apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, role })
    }),

  register: (username, password, full_name) =>
    apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, full_name })
    }),

  logout: () =>
    apiFetch('/api/auth/logout', { method: 'POST' }),

  getMe: () =>
    apiFetch('/api/auth/me'),

  // Reports
  getReports: () =>
    apiFetch('/api/reports'),

  getReport: (id) =>
    apiFetch(`/api/reports/${id}`),

  analyzeImage: (formData) =>
    apiFetch('/api/reports/analyze', {
      method: 'POST',
      body: formData // FormData — no Content-Type header
    }),

  submitReport: (formData) =>
    apiFetch('/api/reports', {
      method: 'POST',
      body: formData
    }),

  updateStatus: (id, status, note) =>
    apiFetch(`/api/reports/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note })
    }),

  getStats: () =>
    apiFetch('/api/reports/stats/summary')
};
