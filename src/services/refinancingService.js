/**
 * Refinancing Service
 * RISK-04, RISK-05, RISK-06: Enhanced refinancing with credit check and term validation
 */

import apiClient from '../utils/api/client';

const refinancingService = {
  /**
   * Get refinancing opportunities
   * @returns {Promise}
   */
  getOpportunities: async () => {
    try {
      const response = await apiClient.get('/api/refinancing/opportunities');
      return response.data;
    } catch (error) {
      console.error('Error fetching refinancing opportunities:', error);
      throw error;
    }
  },

  /**
   * Request refinancing for a loan
   * @param {Object} data - Refinancing request data
   * @returns {Promise}
   */
  requestRefinancing: async (data) => {
    try {
      const response = await apiClient.post('/api/refinancing/request', data);
      return response.data;
    } catch (error) {
      console.error('Error requesting refinancing:', error);
      throw error;
    }
  },

  /**
   * Invest in a refinancing opportunity
   * @param {number} refinancingId - Refinancing ID
   * @param {number} amount - Investment amount
   * @returns {Promise}
   */
  investRefinancing: async (refinancingId, amount) => {
    try {
      const response = await apiClient.post(`/api/refinancing/${refinancingId}/invest`, { amount });
      return response.data;
    } catch (error) {
      console.error('Error investing in refinancing:', error);
      throw error;
    }
  },

  /**
   * RISK-05: Perform credit check for refinancing
   * @param {number} loanId - Loan ID
   * @returns {Promise}
   */
  performCreditCheck: async (loanId) => {
    try {
      const response = await apiClient.get(`/api/refinancing/credit-check/${loanId}`);
      return response.data;
    } catch (error) {
      console.error('Error performing credit check:', error);
      throw error;
    }
  },

  /**
   * RISK-06: Validate refinancing terms
   * @param {Object} terms - Terms to validate
   * @returns {Promise}
   */
  validateTerms: async (terms) => {
    try {
      const response = await apiClient.post('/api/refinancing/validate-terms', terms);
      return response.data;
    } catch (error) {
      console.error('Error validating refinancing terms:', error);
      throw error;
    }
  },

  /**
   * Get refinancing history for a user
   * @returns {Promise}
   */
  getRefinancingHistory: async () => {
    try {
      const response = await apiClient.get('/api/refinancing/history');
      return response.data;
    } catch (error) {
      console.error('Error fetching refinancing history:', error);
      throw error;
    }
  },

  /**
   * Cancel refinancing request
   * @param {number} refinancingId - Refinancing ID
   * @returns {Promise}
   */
  cancelRefinancing: async (refinancingId) => {
    try {
      const response = await apiClient.post(`/api/refinancing/${refinancingId}/cancel`);
      return response.data;
    } catch (error) {
      console.error('Error canceling refinancing:', error);
      throw error;
    }
  },

  /**
   * Get refinancing statistics
   * @returns {Promise}
   */
  getStatistics: async () => {
    try {
      const response = await apiClient.get('/api/refinancing/statistics');
      return response.data;
    } catch (error) {
      console.error('Error fetching refinancing statistics:', error);
      throw error;
    }
  }
};

export default refinancingService;