import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * Centralized API client with common configuration and interceptors
 * This eliminates code duplication across all services
 */

// The VITE_API_URL will be replaced by Vite's define option at build/test time
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * API Error response structure
 */
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
}

/**
 * Create a configured axios instance
 * @param baseURL - API base URL (optional, defaults to env variable)
 * @returns Configured axios instance
 */
export const createApiClient = (baseURL: string = API_BASE_URL): AxiosInstance => {
  const api = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor: Add auth token
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('lenda_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: AxiosError) => Promise.reject(error)
  );

  // Response interceptor: Handle errors
  api.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiError>) => {
      if (error.response) {
        // Server responded with error
        if (error.response.status === 401) {
          localStorage.removeItem('lenda_token');
          localStorage.removeItem('lenda_user');
          window.location.href = '/login';
        }
        return Promise.reject(error.response.data);
      } else if (error.request) {
        // Request made but no response
        return Promise.reject({
          message: 'Network error. Please check your connection.'
        });
      }
      // Something else happened
      return Promise.reject({
        message: error.message || 'An unexpected error occurred'
      });
    }
  );

  return api;
};

// Default API client instance
const api = createApiClient();

export default api;
