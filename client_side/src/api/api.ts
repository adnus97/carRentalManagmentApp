// api/api.ts
import axios from 'axios';
import config from '@/lib/config';
import i18n from '@/i18n';

const api = axios.create({
  baseURL: config.baseApiUrl,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Set content-type safely
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    } else if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }

    // Attach current language
    const lng = (i18n?.resolvedLanguage || i18n?.language || 'en').split(
      '-',
    )[0];
    config.headers['Accept-Language'] = lng;

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
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
