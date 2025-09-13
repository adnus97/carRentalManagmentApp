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
    console.log('🔍 API Interceptor - Request Config:', {
      url: config.url,
      method: config.method,
      dataType: typeof config.data,
      isFormData: config.data instanceof FormData,
      headers: config.headers,
    });

    // Get token from localStorage or wherever you store it
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ✅ CRITICAL FIX: Only set JSON Content-Type for non-FormData requests
    if (config.data instanceof FormData) {
      console.log(
        '🔍 API Interceptor - Detected FormData, removing Content-Type header',
      );
      // Don't set Content-Type - let axios set multipart/form-data with boundary
      delete config.headers['Content-Type'];
    } else if (!config.headers['Content-Type']) {
      console.log('🔍 API Interceptor - Setting JSON Content-Type');
      // Only set JSON as default if no Content-Type is already set
      config.headers['Content-Type'] = 'application/json';
    }

    console.log('🔍 API Interceptor - Final headers:', config.headers);
    return config;
  },
  (error) => {
    console.log('🔍 API Interceptor - Request Error:', error);
    return Promise.reject(error);
  },
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('🔍 API Interceptor - Response:', {
      status: response.status,
      headers: response.headers,
      data: typeof response.data,
    });
    return response;
  },
  (error) => {
    console.log('🔍 API Interceptor - Response Error:', error);
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
