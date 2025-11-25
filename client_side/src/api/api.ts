// api/api.ts
import axios from 'axios';
import config from '@/lib/config';

const api = axios.create({
  baseURL: config.baseApiUrl,
  withCredentials: true, // Include cookies for authentication
});

// Request interceptor for auth
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage or wherever you store it
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ✅ CRITICAL FIX: Only set JSON Content-Type for non-FormData requests
    if (config.data instanceof FormData) {
      // Don't set Content-Type - let axios set multipart/form-data with boundary
      delete config.headers['Content-Type'];
    } else if (!config.headers['Content-Type']) {
      // Only set JSON as default if no Content-Type is already set
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export { api };
export default api;
