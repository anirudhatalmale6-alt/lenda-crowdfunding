import axios from 'axios';
import cacheService, { CacheKeys } from '../../services/cacheService';
import { getStoredToken, clearAuthData } from '../storage';

/**
 * Centralized API client with common configuration and interceptors
 * This eliminates code duplication across all services
 */

// The VITE_API_URL will be replaced by Vite's define option at build/test time
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Default cache TTL (5 minutes)
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/**
 * Create a configured axios instance
 * @param {string} baseURL - API base URL (optional, defaults to env variable)
 * @returns {axios.AxiosInstance} Configured axios instance
 */
export const createApiClient = (baseURL = API_BASE_URL) => {
    const api = axios.create({
        baseURL,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Request interceptor: Add auth token
    // SEC-008: Get token from secure cookie storage (not localStorage)
    api.interceptors.request.use(
        (config) => {
            const token = getStoredToken(); // SEC-008: Use secure storage
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // Response interceptor: Handle errors
    api.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response) {
                // Server responded with error
                if (error.response.status === 401) {
                    // SEC-008: Clear auth data using secure storage utility
                    clearAuthData();
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

/**
 * Create API client with caching enabled
 * @param {string} baseURL - API base URL
 * @param {object} options - Cache options
 * @returns {object} API client with cache methods
 */
export const createCachedApiClient = (baseURL = API_BASE_URL, options = {}) => {
    const { defaultTTL = DEFAULT_CACHE_TTL, enabled = true } = options;
    const api = createApiClient(baseURL);
    
    // Wrap GET method with caching
    const originalGet = api.get;
    api.get = async (url, config = {}) => {
        const { useCache = true, cacheKey, cacheTTL = defaultTTL, ...requestConfig } = config;
        
        if (useCache && enabled && requestConfig.method !== 'post') {
            const key = cacheKey || `api:${url}:${JSON.stringify(requestConfig.params || {})}`;
            const cached = cacheService.get(key);
            
            if (cached !== null) {
                return { data: cached };
            }
            
            try {
                const response = await originalGet(url, requestConfig);
                cacheService.set(key, response.data, cacheTTL);
                return response;
            } catch (error) {
                throw error;
            }
        }
        
        return originalGet(url, requestConfig);
    };
    
    // Invalidate cache after mutations
    const originalPost = api.post;
    api.post = async (url, data, config = {}) => {
        const response = await originalPost(url, data, config);
        
        // Invalidate related cache entries
        if (enabled && config.invalidateCache !== false) {
            cacheService.invalidatePattern('api:*');
        }
        
        return response;
    };
    
    const originalPut = api.put;
    api.put = async (url, data, config = {}) => {
        const response = await originalPut(url, data, config);
        
        if (enabled && config.invalidateCache !== false) {
            cacheService.invalidatePattern('api:*');
        }
        
        return response;
    };
    
    const originalDelete = api.delete;
    api.delete = async (url, config = {}) => {
        const response = await originalDelete(url, config);
        
        if (enabled && config.invalidateCache !== false) {
            cacheService.invalidatePattern('api:*');
        }
        
        return response;
    };
    
    return api;
};

// Default API client instance
const api = createApiClient();

// Cached API client instance
const cachedApi = createCachedApiClient(API_BASE_URL, { enabled: true });

export default api;

// Export cached client for use with caching
export { cachedApi };

// Export createApiClient for custom configurations
// Note: Already exported as named exports above

// Export cache service for direct use
export { cacheService, CacheKeys };
