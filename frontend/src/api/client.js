/**
 * api/client.js — Axios HTTP client for the DocuMind backend
 *
 * WHY: Instead of writing fetch() calls with headers everywhere, we create 
 * one pre-configured Axios "instance". It automatically:
 * - Points to the backend URL
 * - Injects the JWT token from localStorage on every request
 * - Intercepts errors and formats them into a clean, user-readable message
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create the axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s timeout for long RAG operations
});

// ── Request Interceptor ──────────────────────────────────────────────────────
// Add JWT token to every outgoing request automatically
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('documind_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ─────────────────────────────────────────────────────
// Catch every error response and normalize it into a readable format
// WHY: Without this, error messages come back as raw Axios errors that are
// cryptic. We extract the backend's JSON error detail and present it cleanly.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const backendDetail = error.response?.data?.detail || error.response?.data?.error;
    let message = 'An unexpected error occurred. Please try again.';

    if (!error.response) {
      message = '🔴 Cannot connect to backend. Is the server running on port 8000?';
    } else if (status === 401) {
      message = '🔒 Session expired or unauthorized. Please log in again.';
      localStorage.removeItem('documind_token');
      localStorage.removeItem('documind_user');
      window.dispatchEvent(new Event('unauthorized'));
    } else if (status === 422) {
      message = `⚠️ Validation error: ${backendDetail || 'Check your input.'}`;
    } else if (status === 429) {
      message = '⏱️ Rate limit hit. Please wait a minute before trying again.';
    } else if (status === 409) {
      message = `📁 ${backendDetail || 'This file already exists.'}`;
    } else if (status === 413) {
      message = '📦 File too large. Maximum upload size is 50MB.';
    } else if (status === 500) {
      message = `🔥 Server error: ${backendDetail || 'Internal server error. Check backend logs.'}`;
    } else if (backendDetail) {
      message = backendDetail;
    }

    const enrichedError = new Error(message);
    enrichedError.status = status;
    enrichedError.detail = backendDetail;
    enrichedError.raw = error;
    return Promise.reject(enrichedError);
  }
);

// ── Auth API ─────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (username, password) =>
    apiClient.post('/api/auth/login', { username, password }),
};

// ── Documents API ─────────────────────────────────────────────────────────────
export const documentsAPI = {
  list: () => apiClient.get('/api/documents/'),
  upload: (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress?.(pct);
      },
    });
  },
  delete: (documentId) => apiClient.delete(`/api/documents/${documentId}`),
};

// ── Chat API ─────────────────────────────────────────────────────────────────
export const chatAPI = {
  ask: (question, documentIds = null, dateFrom = null, dateTo = null) =>
    apiClient.post('/api/chat', {
      question,
      document_ids: documentIds,
      date_from: dateFrom,
      date_to: dateTo,
    }),
};

// ── Health API ────────────────────────────────────────────────────────────────
export const healthAPI = {
  check: () => apiClient.get('/api/health'),
};

export default apiClient;
