import { createApiClient } from '../utils/api/client';

const API_URL = '/api/marketplace';

// Create marketplace-specific API client
const api = createApiClient(API_URL);

const marketplaceService = {
    // Get recovery marketplace items
    getRecoveryItems: async (filters = {}) => {
        const response = await api.get('/', { params: filters });
        return response.data;
    },

    // Get featured items
    getFeaturedItems: async () => {
        const response = await api.get('/featured');
        return response.data;
    },

    // Get item details
    getItemDetails: async (itemId) => {
        const response = await api.get(`/${itemId}`);
        return response.data;
    },

    // Place a bid
    placeBid: async (itemId, amount) => {
        const response = await api.post(`/${itemId}/bid`, { amount });
        return response.data;
    },

    // Buy now
    buyNow: async (itemId) => {
        const response = await api.post(`/${itemId}/buy`);
        return response.data;
    },

    // Get my bids
    getMyBids: async () => {
        const response = await api.get('/my-bids');
        return response.data;
    },

    // Get my purchased items
    getMyPurchases: async () => {
        const response = await api.get('/my-purchases');
        return response.data;
    },

    // Get item history
    getItemHistory: async (itemId) => {
        const response = await api.get(`/${itemId}/history`);
        return response.data;
    },

    // Get auction status
    getAuctionStatus: async (itemId) => {
        const response = await api.get(`/${itemId}/auction-status`);
        return response.data;
    },

    // Get marketplace statistics
    getStatistics: async () => {
        const response = await api.get('/statistics');
        return response.data;
    },

    // Get recovery listings (admin)
    getRecoveryListings: async () => {
        const response = await api.get('/admin/recovery-listings');
        return response.data;
    },

    // Approve recovery listing (admin)
    approveRecoveryListing: async (listingId) => {
        const response = await api.post(`/admin/recovery-listings/${listingId}/approve`);
        return response.data;
    },

    // Process recovery sale (admin)
    processRecoverySale: async (listingId) => {
        const response = await api.post(`/admin/recovery-listings/${listingId}/process-sale`);
        return response.data;
    },

    // Cancel recovery listing (admin)
    cancelRecoveryListing: async (listingId) => {
        const response = await api.post(`/admin/recovery-listings/${listingId}/cancel`);
        return response.data;
    },
};

export default marketplaceService;
