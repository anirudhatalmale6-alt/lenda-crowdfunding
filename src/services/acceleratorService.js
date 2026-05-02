/**
 * Loan Funding Accelerator Service
 * Handles all API calls to the accelerator system
 */

import apiClient from '../utils/api/client';

/**
 * Get trending loans (50%+ funded)
 * @returns {Promise<Array>} Array of trending loans
 */
export const getTrendingLoans = async () => {
  try {
    const response = await apiClient.get('/loans/trending');
    return response.data.trending_loans || [];
  } catch (error) {
    console.error('Error fetching trending loans:', error);
    return [];
  }
};

/**
 * Get loans closing soon (75%+ funded)
 * @returns {Promise<Array>} Array of closing soon loans
 */
export const getClosingSoonLoans = async () => {
  try {
    const response = await apiClient.get('/loans/closing-soon');
    return response.data.closing_soon_loans || [];
  } catch (error) {
    console.error('Error fetching closing soon loans:', error);
    return [];
  }
};

/**
 * Get accelerator status for a specific loan
 * @param {number} loanId - The loan ID
 * @returns {Promise<Object>} Accelerator status object
 */
export const getAcceleratorStatus = async (loanId) => {
  try {
    const response = await apiClient.get(`/accelerator/status/${loanId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching accelerator status:', error);
    return null;
  }
};

/**
 * Request a rate boost for a loan (borrower action)
 * @param {number} loanId - The loan ID
 * @param {number} newRate - The new interest rate
 * @returns {Promise<Object>} Result of the rate boost request
 */
export const boostLoanRate = async (loanId, newRate) => {
  try {
    const response = await apiClient.post(`/loan/${loanId}/boost-rate`, {
      interest_rate: newRate
    });
    return response.data;
  } catch (error) {
    console.error('Error boosting loan rate:', error);
    throw error;
  }
};

/**
 * Get hot opportunities for investor dashboard
 * @returns {Promise<Array>} Array of hot opportunity loans
 */
export const getHotOpportunities = async () => {
  try {
    const response = await apiClient.get('/accelerator/hot-opportunities');
    return response.data.hot_opportunities || [];
  } catch (error) {
    console.error('Error fetching hot opportunities:', error);
    return [];
  }
};

/**
 * Get high yield opportunities
 * @returns {Promise<Array>} Array of high yield loans
 */
export const getHighYieldOpportunities = async () => {
  try {
    const response = await apiClient.get('/accelerator/high-yield');
    return response.data.high_yield_opportunities || [];
  } catch (error) {
    console.error('Error fetching high yield opportunities:', error);
    return [];
  }
};

/**
 * Get almost funded loans (90%+ funded)
 * @returns {Promise<Array>} Array of almost funded loans
 */
export const getAlmostFundedLoans = async () => {
  try {
    const response = await apiClient.get('/accelerator/almost-funded');
    return response.data.almost_funded_loans || [];
  } catch (error) {
    console.error('Error fetching almost funded loans:', error);
    return [];
  }
};

// ==================== ADMIN FUNCTIONS ====================

/**
 * Get accelerator settings (admin)
 * @returns {Promise<Array>} Array of accelerator settings
 */
export const getAcceleratorSettings = async () => {
  try {
    const response = await apiClient.get('/accelerator/admin/settings');
    return response.data.settings || [];
  } catch (error) {
    console.error('Error fetching accelerator settings:', error);
    return [];
  }
};

/**
 * Update accelerator settings (admin)
 * @param {Array} settings - Array of settings to update
 * @returns {Promise<Object>} Result of the update
 */
export const updateAcceleratorSettings = async (settings) => {
  try {
    const response = await apiClient.post('/accelerator/admin/settings/update', {
      settings
    });
    return response.data;
  } catch (error) {
    console.error('Error updating accelerator settings:', error);
    throw error;
  }
};

/**
 * Get accelerator analytics (admin)
 * @param {number} months - Number of months to fetch
 * @returns {Promise<Object>} Analytics data
 */
export const getAcceleratorAnalytics = async (months = 6) => {
  try {
    const response = await apiClient.get(`/accelerator/admin/analytics?months=${months}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching accelerator analytics:', error);
    return null;
  }
};

/**
 * Manually trigger accelerator for a loan (admin)
 * @param {number} loanId - The loan ID
 * @param {string} action - The action to trigger
 * @returns {Promise<Object>} Result of the trigger
 */
export const triggerAccelerator = async (loanId, action = 'refresh') => {
  try {
    const response = await apiClient.post(`/accelerator/admin/trigger/${loanId}`, {
      action
    });
    return response.data;
  } catch (error) {
    console.error('Error triggering accelerator:', error);
    throw error;
  }
};

export default {
  getTrendingLoans,
  getClosingSoonLoans,
  getAcceleratorStatus,
  boostLoanRate,
  getHotOpportunities,
  getHighYieldOpportunities,
  getAlmostFundedLoans,
  getAcceleratorSettings,
  updateAcceleratorSettings,
  getAcceleratorAnalytics,
  triggerAccelerator
};
