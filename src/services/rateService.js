import { createApiClient } from '../utils/api/client';

const API_URL = '/api/rates';

const api = createApiClient(API_URL);

const rateService = {
    // Get platform rate settings
    getPlatformSettings: async () => {
        const response = await api.get('/platform-settings');
        return response.data;
    },

    // Update platform rate settings (admin)
    updatePlatformSettings: async (settings) => {
        const response = await api.put('/platform-settings', settings);
        return response.data;
    },

    // Get suggested rate for borrower
    getSuggestedRate: async (params) => {
        const response = await api.get('/suggested', { params });
        return response.data;
    },

    // Calculate market demand for a loan
    calculateMarketDemand: async (loanId) => {
        const response = await api.get(`/market-demand/${loanId}`);
        return response.data;
    },

    // Get rate recommendation for loan creation
    getRateRecommendation: async (loanData) => {
        const response = await api.post('/recommend', loanData);
        return response.data;
    },

    // Update loan interest rate (borrower adjustment)
    updateLoanRate: async (loanId, newRate, reason) => {
        const response = await api.put(`/${loanId}/rate`, { 
            newRate, 
            reason 
        });
        return response.data;
    },

    // Get rate history for a loan
    getRateHistory: async (loanId) => {
        const response = await api.get(`/${loanId}/history`);
        return response.data;
    },

    // Get current market demand level
    getCurrentDemand: async (loanId) => {
        const response = await api.get(`/${loanId}/demand`);
        return response.data;
    },

    // Calculate loan projections (monthly payment, total repayment)
    calculateLoanProjections: async (params) => {
        const response = await api.get('/calculate', { params });
        return response.data;
    },

    // Validate rate against platform limits
    validateRate: async (rate, riskCategory) => {
        const response = await api.post('/validate', { rate, riskCategory });
        return response.data;
    },

    // Get rate statistics for admin dashboard
    getRateStatistics: async (timeRange = 30) => {
        const response = await api.get('/statistics', { params: { timeRange } });
        return response.data;
    },

    // Get average funded rates by risk category
    getAverageRatesByCategory: async () => {
        const response = await api.get('/average-by-category');
        return response.data;
    },

    // Get funding speed predictions
    getFundingSpeedPrediction: async (loanId) => {
        const response = await api.get(`/${loanId}/funding-speed`);
        return response.data;
    },

    // Calculate LTV ratio
    calculateLTV: async (loanAmount, collateralValue) => {
        const response = await api.get('/ltv', { 
            params: { loanAmount, collateralValue } 
        });
        return response.data;
    },

    // Get risk category from score
    getRiskCategory: async (riskScore) => {
        const response = await api.get('/risk-category', { 
            params: { riskScore } 
        });
        return response.data;
    },

    // Preview rate adjustment impact
    previewRateAdjustment: async (loanId, newRate) => {
        const response = await api.post(`/${loanId}/preview-adjustment`, { newRate });
        return response.data;
    },
};

export default rateService;
