import { createApiClient } from '../utils/api/client';

const API_URL = '/api/escrow';

// Create escrow-specific API client
const api = createApiClient(API_URL);

const escrowService = {
    // Create escrow transaction
    createTransaction: async (transactionData) => {
        const response = await api.post('/', transactionData);
        return response.data;
    },

    // Get all transactions (admin)
    getTransactions: async (filters = {}) => {
        const response = await api.get('/', { params: filters });
        return response.data;
    },

    // Get my transactions (as buyer or seller)
    getMyTransactions: async () => {
        const response = await api.get('/my-transactions');
        return response.data;
    },

    // Get transaction details
    getTransactionDetails: async (transactionId) => {
        const response = await api.get(`/${transactionId}`);
        return response.data;
    },

    // Fund escrow (buyer pays)
    fundTransaction: async (transactionId, amount) => {
        const response = await api.post(`/${transactionId}/fund`, { amount });
        return response.data;
    },

    // Mark as shipped
    markAsShipped: async (transactionId, trackingNumber) => {
        const response = await api.post(`/${transactionId}/ship`, {
            trackingNumber,
        });
        return response.data;
    },

    // Confirm delivery
    confirmDelivery: async (transactionId, proofData = null) => {
        const payload = {};
        
        // If proof data is provided (e.g., file URLs, delivery notes)
        if (proofData) {
            payload.proof = proofData;
        }
        
        const response = await api.post(`/${transactionId}/confirm`, payload);
        return response.data;
    },

    // Upload delivery proof (photos, documents, etc.)
    uploadDeliveryProof: async (transactionId, proofFile) => {
        const formData = new FormData();
        formData.append('proof', proofFile);
        formData.append('transactionId', transactionId);
        
        const response = await api.post(`/${transactionId}/upload-proof`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Get delivery proof details
    getDeliveryProof: async (transactionId) => {
        const response = await api.get(`/${transactionId}/proof`);
        return response.data;
    },

    // Release funds (to seller)
    releaseFunds: async (transactionId) => {
        const response = await api.post(`/${transactionId}/release`);
        return response.data;
    },

    // Open dispute
    openDispute: async (transactionId, reason) => {
        const response = await api.post(`/${transactionId}/dispute`, { reason });
        return response.data;
    },

    // Resolve dispute (admin)
    resolveDispute: async (transactionId, resolution) => {
        const response = await api.post(`/${transactionId}/resolve`, resolution);
        return response.data;
    },

    // Get escrow statistics
    getStatistics: async () => {
        const response = await api.get('/statistics');
        return response.data;
    },

    // Get shipping carriers
    getShippingCarriers: async () => {
        const response = await api.get('/shipping-carriers');
        return response.data;
    },

    // Get escrow disputes (admin)
    getDisputes: async (filters = {}) => {
        const response = await api.get('/disputes', { params: filters });
        return response.data;
    },

    // ============================================================
    // AUTO-RELEASE TIMEOUT FEATURES
    // ============================================================

    /**
     * Get auto-release timeout configuration for a transaction
     * @param {string} transactionId - Escrow transaction ID
     * @returns {Promise} Timeout configuration
     */
    getAutoReleaseConfig: async (transactionId) => {
        const response = await api.get(`/${transactionId}/auto-release`);
        return response.data;
    },

    /**
     * Set auto-release timeout for a transaction
     * @param {string} transactionId - Escrow transaction ID
     * @param {number} hours - Timeout in hours
     * @returns {Promise} Configuration result
     */
    setAutoReleaseTimeout: async (transactionId, hours = 168) => {
        // Default: 7 days (168 hours)
        const response = await api.post(`/${transactionId}/auto-release`, { hours });
        return response.data;
    },

    /**
     * Cancel auto-release timer
     * @param {string} transactionId - Escrow transaction ID
     * @returns {Promise} Cancellation result
     */
    cancelAutoRelease: async (transactionId) => {
        const response = await api.delete(`/${transactionId}/auto-release`);
        return response.data;
    },

    /**
     * Get time remaining until auto-release
     * @param {string} transactionId - Escrow transaction ID
     * @returns {Promise} Time remaining information
     */
    getTimeUntilAutoRelease: async (transactionId) => {
        const response = await api.get(`/${transactionId}/auto-release/status`);
        return response.data;
    },

    /**
     * Trigger manual release (bypasses auto-release)
     * @param {string} transactionId - Escrow transaction ID
     * @returns {Promise} Release result
     */
    manualRelease: async (transactionId) => {
        const response = await api.post(`/${transactionId}/manual-release`);
        return response.data;
    },

    /**
     * Extend auto-release timeout
     * @param {string} transactionId - Escrow transaction ID
     * @param {number} additionalHours - Additional hours to add
     * @returns {Promise} Extension result
     */
    extendAutoRelease: async (transactionId, additionalHours) => {
        const response = await api.put(`/${transactionId}/auto-release/extend`, { 
            additionalHours 
        });
        return response.data;
    },
};

export default escrowService;
