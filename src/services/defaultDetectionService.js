/**
 * Default Detection Service (RISK-003)
 * Cron-based automatic default detection and workflow progression
 */

import apiClient from '../utils/api/client';

/**
 * Run automatic default check for all active loans
 * This should be called by a cron job
 * @returns {Promise}
 */
export const runAutomaticDefaultCheck = async () => {
  try {
    const response = await apiClient.post('/api/risk/cron/check-defaults');
    return response.data;
  } catch (error) {
    console.error('Error running automatic default check:', error);
    throw error;
  }
};

/**
 * Get loans that are at risk of defaulting
 * @param {number} daysAhead - Days to look ahead for predictions
 * @returns {Promise}
 */
export const getLoansAtRisk = async (daysAhead = 7) => {
  try {
    const response = await apiClient.get('/api/risk/loans-at-risk', {
      params: { daysAhead }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching loans at risk:', error);
    throw error;
  }
};

/**
 * Check if a specific loan should be defaulted
 * @param {number} loanId - Loan ID
 * @returns {Promise}
 */
export const checkLoanDefault = async (loanId) => {
  try {
    const response = await apiClient.get(`/api/risk/check-loan-default/${loanId}`);
    return response.data;
  } catch (error) {
    console.error('Error checking loan default:', error);
    throw error;
  }
};

/**
 * Get automatic workflow progression status
 * @returns {Promise}
 */
export const getWorkflowProgressionStatus = async () => {
  try {
    const response = await apiClient.get('/api/risk/workflow/progression-status');
    return response.data;
  } catch (error) {
    console.error('Error fetching workflow progression status:', error);
    throw error;
  }
};

/**
 * Manually trigger workflow progression for a loan
 * @param {number} loanId - Loan ID
 * @returns {Promise}
 */
export const triggerWorkflowProgression = async (loanId) => {
  try {
    const response = await apiClient.post(`/api/risk/workflow/progress/${loanId}`);
    return response.data;
  } catch (error) {
    console.error('Error triggering workflow progression:', error);
    throw error;
  }
};

/**
 * Get default prediction statistics
 * @returns {Promise}
 */
export const getDefaultPredictionStats = async () => {
  try {
    const response = await apiClient.get('/api/risk/default-prediction/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching default prediction stats:', error);
    throw error;
  }
};

/**
 * Schedule automatic default check
 * @param {number} intervalHours - Interval in hours
 * @returns {Function} Cleanup function
 */
export const scheduleAutomaticDefaultCheck = (intervalHours = 24) => {
  const intervalMs = intervalHours * 60 * 60 * 1000;
  
  const interval = setInterval(async () => {
    try {
      console.log('Running automatic default check...');
      await runAutomaticDefaultCheck();
      console.log('Automatic default check completed');
    } catch (error) {
      console.error('Automatic default check failed:', error);
    }
  }, intervalMs);
  
  // Run immediately on schedule
  runAutomaticDefaultCheck().catch(console.error);
  
  return () => clearInterval(interval);
};

export default {
  runAutomaticDefaultCheck,
  getLoansAtRisk,
  checkLoanDefault,
  getWorkflowProgressionStatus,
  triggerWorkflowProgression,
  getDefaultPredictionStats,
  scheduleAutomaticDefaultCheck
};
