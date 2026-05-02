import { createApiClient } from '../utils/api/client';

const API_URL = '/api/analytics';
const api = createApiClient(API_URL);

/**
 * Analytics Service - Centralized analytics data fetching
 * Addresses AF-04: Replace mock data with real API data
 */
const analyticsService = {
    /**
     * Get platform overview statistics
     * @param {number} timeRange - Number of days to look back
     */
    getPlatformOverview: async (timeRange = 30) => {
        const response = await api.get('/platform-overview', { params: { timeRange } });
        return response.data;
    },

    /**
     * Get loan analytics
     * @param {number} timeRange - Number of days to look back
     */
    getLoanAnalytics: async (timeRange = 30) => {
        const response = await api.get('/loans', { params: { timeRange } });
        return response.data;
    },

    /**
     * Get user analytics
     * @param {number} timeRange - Number of days to look back
     */
    getUserAnalytics: async (timeRange = 30) => {
        const response = await api.get('/users', { params: { timeRange } });
        return response.data;
    },

    /**
     * Get financial analytics
     * @param {number} timeRange - Number of days to look back
     */
    getFinancialAnalytics: async (timeRange = 30) => {
        const response = await api.get('/financial', { params: { timeRange } });
        return response.data;
    },

    /**
     * Get monthly loan volume data
     * @param {number} months - Number of months to look back
     */
    getMonthlyVolume: async (months = 6) => {
        const response = await api.get('/monthly-volume', { params: { months } });
        return response.data;
    },

    /**
     * Get loan type distribution
     */
    getLoanTypeDistribution: async () => {
        const response = await api.get('/loan-types');
        return response.data;
    },

    /**
     * Get top borrowers
     * @param {number} limit - Number of top borrowers to fetch
     */
    getTopBorrowers: async (limit = 10) => {
        const response = await api.get('/top-borrowers', { params: { limit } });
        return response.data;
    },

    /**
     * Get top lenders
     * @param {number} limit - Number of top lenders to fetch
     */
    getTopLenders: async (limit = 10) => {
        const response = await api.get('/top-lenders', { params: { limit } });
        return response.data;
    },

    /**
     * Get comprehensive dashboard data in one call
     * @param {number} timeRange - Number of days to look back
     */
    getDashboardData: async (timeRange = 30) => {
        const response = await api.get('/dashboard', { params: { timeRange } });
        return response.data;
    },

    /**
     * Export analytics report
     * @param {Object} params - Export parameters
     */
    exportReport: async (params = {}) => {
        const response = await api.post('/export', params);
        return response.data;
    },
};

export default analyticsService;
