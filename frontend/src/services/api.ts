import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = '/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - add JWT token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Format error message
    const responseData = error.response?.data as Record<string, unknown> | undefined;
    const message =
      (responseData?.message as string) ||
      (responseData?.error as string) ||
      error.message ||
      'Une erreur inattendue est survenue';

    return Promise.reject({ ...error, userMessage: message });
  }
);

export default api;
