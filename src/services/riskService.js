/**
 * Risk Engine Service
 * API calls for risk management features
 */

import apiClient from '../utils/api/client';
import defaultDetectionService from './defaultDetectionService';

// ============================================================
// BORROWER RISK SCORING
// ============================================================

/**
 * Get borrower risk score
 * @param {number} userId - User ID
 * @returns {Promise}
 */
export const getBorrowerRiskScore = async (userId) => {
  try {
    const response = await apiClient.get(`/api/risk/borrower/score/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching borrower risk score:', error);
    throw error;
  }
};

/**
 * Calculate borrower risk score
 * @returns {Promise}
 */
export const calculateBorrowerRiskScore = async () => {
  try {
    const response = await apiClient.post('/api/risk/borrower/calculate');
    return response.data;
  } catch (error) {
    console.error('Error calculating borrower risk score:', error);
    throw error;
  }
};

// ============================================================
// COLLATERAL VALUATION
// ============================================================

/**
 * Get collateral valuation
 * @param {number} collateralId - Collateral ID
 * @returns {Promise}
 */
export const getCollateralValuation = async (collateralId) => {
  try {
    const response = await apiClient.get(`/api/risk/collateral/valuation/${collateralId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching collateral valuation:', error);
    throw error;
  }
};

/**
 * Verify collateral
 * @param {number} collateralId - Collateral ID
 * @param {Object} data - Verification data
 * @returns {Promise}
 */
export const verifyCollateral = async (collateralId, data) => {
  try {
    const response = await apiClient.post(`/api/risk/collateral/verify/${collateralId}`, data);
    return response.data;
  } catch (error) {
    console.error('Error verifying collateral:', error);
    throw error;
  }
};

// ============================================================
// LOAN-TO-VALUE
// ============================================================

/**
 * Calculate LTV ratio
 * @param {number} loanAmount - Loan amount
 * @param {number} collateralValue - Collateral value
 * @param {string} riskCategory - Risk category
 * @returns {Promise}
 */
export const calculateLTV = async (loanAmount, collateralValue, riskCategory = 'A') => {
  try {
    const response = await apiClient.get('/api/risk/ltv/calculate', {
      params: { loanAmount, collateralValue, riskCategory }
    });
    return response.data;
  } catch (error) {
    console.error('Error calculating LTV:', error);
    throw error;
  }
};

/**
 * Validate LTV
 * @param {Object} data - LTV validation data
 * @returns {Promise}
 */
export const validateLTV = async (data) => {
  try {
    const response = await apiClient.post('/api/risk/ltv/validate', data);
    return response.data;
  } catch (error) {
    console.error('Error validating LTV:', error);
    throw error;
  }
};

// ============================================================
// EXPOSURE LIMITS
// ============================================================

/**
 * Validate exposure limits
 * @param {Object} data - Exposure validation data
 * @returns {Promise}
 */
export const validateExposure = async (data) => {
  try {
    const response = await apiClient.post('/api/risk/exposure/validate', data);
    return response.data;
  } catch (error) {
    console.error('Error validating exposure:', error);
    throw error;
  }
};

// ============================================================
// DEFAULT PREDICTION MODEL
// ============================================================

/**
 * Get loan risk status
 * @param {number} loanId - Loan ID
 * @returns {Promise}
 */
export const getLoanRiskStatus = async (loanId) => {
  try {
    const response = await apiClient.get(`/api/risk/loan/status/${loanId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching loan risk status:', error);
    throw error;
  }
};

/**
 * Analyze loan risk
 * @param {number} loanId - Loan ID
 * @returns {Promise}
 */
export const analyzeLoanRisk = async (loanId) => {
  try {
    const response = await apiClient.post(`/api/risk/loan/analyze/${loanId}`);
    return response.data;
  } catch (error) {
    console.error('Error analyzing loan risk:', error);
    throw error;
  }
};

// ============================================================
// DEFAULT WORKFLOW
// ============================================================

/**
 * Start default workflow
 * @param {number} loanId - Loan ID
 * @returns {Promise}
 */
export const startDefaultWorkflow = async (loanId) => {
  try {
    const response = await apiClient.post(`/api/risk/default/start-workflow/${loanId}`);
    return response.data;
  } catch (error) {
    console.error('Error starting default workflow:', error);
    throw error;
  }
};

/**
 * Advance default workflow
 * @param {number} loanId - Loan ID
 * @returns {Promise}
 */
export const advanceDefaultWorkflow = async (loanId) => {
  try {
    const response = await apiClient.post(`/api/risk/default/advance-workflow/${loanId}`);
    return response.data;
  } catch (error) {
    console.error('Error advancing default workflow:', error);
    throw error;
  }
};

// ============================================================
// RISK MONITORING DASHBOARD
// ============================================================

/**
 * Get risk dashboard data
 * @returns {Promise}
 */
export const getRiskDashboard = async () => {
  try {
    const response = await apiClient.get('/api/risk/admin/dashboard');
    return response.data;
  } catch (error) {
    console.error('Error fetching risk dashboard:', error);
    throw error;
  }
};

/**
 * Get default monitoring data
 * @returns {Promise}
 */
export const getDefaultMonitoring = async () => {
  try {
    const response = await apiClient.get('/api/risk/admin/default-monitoring');
    return response.data;
  } catch (error) {
    console.error('Error fetching default monitoring:', error);
    throw error;
  }
};

// ============================================================
// LOAN VALIDATION
// ============================================================

/**
 * Validate complete loan request
 * @param {Object} data - Loan request data
 * @returns {Promise}
 */
export const validateLoanRequest = async (data) => {
  try {
    const response = await apiClient.post('/api/risk/validate-loan-request', data);
    return response.data;
  } catch (error) {
    console.error('Error validating loan request:', error);
    throw error;
  }
};

// ============================================================
// RISK CONFIGURATION
// ============================================================

// LTV limits by risk category
export const LTV_CONFIG = {
  AAA: 70,
  AA: 65,
  A: 60,
  BBB: 55,
  BB: 50,
  high_risk: 40
};

// Risk categories
export const RISK_CATEGORIES = {
  AAA: { min: 80, max: 100, label: 'AAA', color: 'green' },
  AA: { min: 65, max: 79, label: 'AA', color: 'green' },
  A: { min: 50, max: 64, label: 'A', color: 'blue' },
  BBB: { min: 35, max: 49, label: 'BBB', color: 'yellow' },
  BB: { min: 20, max: 34, label: 'BB', color: 'orange' },
  high_risk: { min: 0, max: 19, label: 'High Risk', color: 'red' }
};

// Risk status display
export const RISK_STATUS_CONFIG = {
  healthy: { label: 'Healthy', color: 'green', icon: 'check-circle' },
  watchlist: { label: 'Watchlist', color: 'yellow', icon: 'eye' },
  high_risk: { label: 'High Risk', color: 'orange', icon: 'alert-triangle' },
  default_imminent: { label: 'Default Imminent', color: 'red', icon: 'alert-circle' },
  defaulted: { label: 'Defaulted', color: 'red', icon: 'x-circle' }
};

// Default workflow stages
// RISK-01: Grace period now configurable (default 7 days)
export const WORKFLOW_STAGES = {
  grace_period: { label: 'Grace Period', days: 7 },
  refinance_attempt: { label: 'Refinance Attempt', days: 14 },
  pre_liquidation: { label: 'Pre-Liquidation Warning', days: 5 },
  liquidation: { label: 'Liquidation', days: 0 },
  recovery: { label: 'Recovery', days: 0 }
};

// ============================================================
// GRACE PERIOD CONFIGURATION (RISK-01)
// ============================================================

// Configurable grace period settings
export const GRACE_PERIOD_CONFIG = {
  defaultDays: 7,
  minDays: 1,
  maxDays: 30,
  warningDays: [3, 5, 7] // Days before default to send reminders
};

/**
 * Get current grace period configuration
 * @returns {Object} Grace period config
 */
export const getGracePeriodConfig = async () => {
  try {
    const response = await apiClient.get('/api/risk/grace-period/config');
    return response.data;
  } catch (error) {
    console.error('Error fetching grace period config:', error);
    return GRACE_PERIOD_CONFIG;
  }
};

/**
 * Update grace period configuration (admin)
 * @param {Object} config - New configuration
 * @returns {Promise}
 */
export const updateGracePeriodConfig = async (config) => {
  try {
    const response = await apiClient.put('/api/risk/grace-period/config', config);
    return response.data;
  } catch (error) {
    console.error('Error updating grace period config:', error);
    throw error;
  }
};

/**
 * Check if loan is in grace period
 * @param {number} loanId - Loan ID
 * @returns {Promise}
 */
export const checkGracePeriodStatus = async (loanId) => {
  try {
    const response = await apiClient.get(`/api/risk/grace-period/status/${loanId}`);
    return response.data;
  } catch (error) {
    console.error('Error checking grace period status:', error);
    throw error;
  }
};

/**
 * Get loans entering grace period soon (for notifications)
 * @param {number} daysAhead - Days to look ahead
 * @returns {Promise}
 */
export const getUpcomingGracePeriodLoans = async (daysAhead = 7) => {
  try {
    const response = await apiClient.get('/api/risk/grace-period/upcoming', {
      params: { daysAhead }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching upcoming grace period loans:', error);
    throw error;
  }
};

// ============================================================
// REFINANCING VALIDATION (RISK-05, RISK-06)
// ============================================================

/**
 * Validate refinancing terms before submission (RISK-05, RISK-06)
 * @param {number} loanId - Loan ID
 * @param {number} newInterestRate - New interest rate
 * @param {number} newDurationMonths - New duration in months
 * @returns {Promise}
 */
export const validateRefinancingTerms = async (loanId, newInterestRate, newDurationMonths) => {
  try {
    const response = await apiClient.post('/api/risk/validate-refinancing', {
      loan_id: loanId,
      new_interest_rate: newInterestRate,
      new_duration_months: newDurationMonths
    });
    return response.data;
  } catch (error) {
    console.error('Error validating refinancing terms:', error);
    throw error;
  }
};

/**
 * Submit refinancing request with risk recalculation (RISK-05)
 * @param {Object} refinancingData - Refinancing request data
 * @returns {Promise}
 */
export const submitRefinancing = async (refinancingData) => {
  try {
    const response = await apiClient.post('/api/risk/submit-refinancing', refinancingData);
    return response.data;
  } catch (error) {
    console.error('Error submitting refinancing:', error);
    throw error;
  }
};

/**
 * Analyze loan risk for refinancing (RISK-05)
 * @param {number} loanId - Loan ID
 * @returns {Promise}
 */
export const analyzeLoanRiskForRefinancing = async (loanId) => {
  try {
    const response = await apiClient.post(`/api/risk/loan/analyze/${loanId}`);
    return response.data;
  } catch (error) {
    console.error('Error analyzing loan risk for refinancing:', error);
    throw error;
  }
};

// ============================================================
// WATCHLIST MANAGEMENT (RISK-15)
// ============================================================

/**
 * Get loans at risk of defaulting (RISK-15)
 * @param {number} daysAhead - Days to look ahead
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
 * Get default prediction statistics (RISK-14)
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

// ============================================================
// WEBHOOK SUBSCRIPTIONS (RISK-14)
// ============================================================

/**
 * Webhook event types
 */
export const WEBHOOK_EVENTS = {
  DEFAULT_PROBABILITY_UPDATE: 'loan.default_probability_update',
  LOAN_DEFAULTED: 'loan.defaulted',
  LIQUIDATION_INITIATED: 'loan.liquidation_initiated',
  WATCHLIST_ADDED: 'loan.watchlist_added',
  GRACE_PERIOD_WARNING: 'loan.grace_period_warning'
};

/**
 * Register webhook endpoint (RISK-14)
 * @param {string} url - Webhook URL
 * @param {string} event - Event type to subscribe to
 * @returns {Promise}
 */
export const registerWebhook = async (url, event) => {
  try {
    const response = await apiClient.post('/api/risk/webhooks/register', {
      url,
      event
    });
    return response.data;
  } catch (error) {
    console.error('Error registering webhook:', error);
    throw error;
  }
};

/**
 * Unregister webhook endpoint (RISK-14)
 * @param {number} webhookId - Webhook ID
 * @returns {Promise}
 */
export const unregisterWebhook = async (webhookId) => {
  try {
    const response = await apiClient.delete(`/api/risk/webhooks/${webhookId}`);
    return response.data;
  } catch (error) {
    console.error('Error unregistering webhook:', error);
    throw error;
  }
};

/**
 * Get registered webhooks (RISK-14)
 * @returns {Promise}
 */
export const getRegisteredWebhooks = async () => {
  try {
    const response = await apiClient.get('/api/risk/webhooks');
    return response.data;
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time default probability updates (RISK-14)
 * Uses polling as fallback when webhooks are not available
 * @param {Function} callback - Callback for probability updates
 * @param {number} intervalMs - Polling interval in milliseconds
 * @returns {Function} Unsubscribe function
 */
export const subscribeToDefaultProbabilityUpdates = (callback, intervalMs = 300000) => {
  // Poll every 5 minutes for default probability changes
  const interval = setInterval(async () => {
    try {
      const data = await getDefaultPredictionStats();
      callback(data);
    } catch (error) {
      console.error('Default probability update error:', error);
    }
  }, intervalMs);
  
  // Also fetch immediately
  getDefaultPredictionStats()
    .then(callback)
    .catch(console.error);
  
  return () => clearInterval(interval);
};

// ============================================================
// PRICE ORACLE FOR LIQUIDATION (RISK-07)
// ============================================================

/**
 * Get collateral valuation for liquidation (RISK-07)
 * @param {number} collateralId - Collateral ID
 * @returns {Promise}
 */
export const getCollateralValuationForLiquidation = async (collateralId) => {
  try {
    const response = await apiClient.get(`/api/risk/collateral/liquidation-valuation/${collateralId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching liquidation valuation:', error);
    throw error;
  }
};

/**
 * Check liquidation threshold (RISK-07)
 * @param {number} loanId - Loan ID
 * @returns {Promise}
 */
export const checkLiquidationThreshold = async (loanId) => {
  try {
    const response = await apiClient.get(`/api/risk/liquidation/threshold/${loanId}`);
    return response.data;
  } catch (error) {
    console.error('Error checking liquidation threshold:', error);
    throw error;
  }
};

/**
 * Trigger liquidation process (RISK-07)
 * @param {number} loanId - Loan ID
 * @returns {Promise}
 */
export const triggerLiquidation = async (loanId) => {
  try {
    const response = await apiClient.post(`/api/risk/liquidation/trigger/${loanId}`);
    return response.data;
  } catch (error) {
    console.error('Error triggering liquidation:', error);
    throw error;
  }
};

// ============================================================
// RESERVE COVERAGE (RISK-10, RISK-11, RISK-12)
// ============================================================

// Minimum coverage ratio configuration (RISK-11)
export const COVERAGE_CONFIG = {
  minRatio: 1500, // 15% minimum
  warningRatio: 2000, // 20% warning
  healthyRatio: 3000, // 30% healthy
  criticalRatio: 1000, // 10% critical
};

/**
 * Get reserve fund coverage status
 * @returns {Promise}
 */
export const getReserveCoverage = async () => {
  try {
    const response = await apiClient.get('/api/risk/reserve-coverage');
    return response.data;
  } catch (error) {
    console.error('Error fetching reserve coverage:', error);
    throw error;
  }
};

/**
 * Validate minimum coverage ratio before loan approval (RISK-11)
 * @param {Object} loanData - Loan data to validate
 * @returns {Promise}
 */
export const validateCoverageForLoan = async (loanData) => {
  try {
    const response = await apiClient.post('/api/risk/validate-coverage', loanData);
    return response.data;
  } catch (error) {
    console.error('Error validating coverage ratio:', error);
    throw error;
  }
};

/**
 * Get real-time coverage data (RISK-12)
 * @returns {Promise}
 */
export const getRealTimeCoverage = async () => {
  try {
    const response = await apiClient.get('/api/risk/reserve-coverage/realtime');
    return response.data;
  } catch (error) {
    console.error('Error fetching realtime coverage:', error);
    throw error;
  }
};

/**
 * Subscribe to coverage updates (RISK-12)
 * @param {Function} callback - Callback for updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeToCoverageUpdates = (callback) => {
  // Poll for updates every 30 seconds
  const interval = setInterval(async () => {
    try {
      const data = await getRealTimeCoverage();
      callback(data);
    } catch (error) {
      console.error('Coverage update error:', error);
    }
  }, 30000);
  
  // Return cleanup function
  return () => clearInterval(interval);
};

/**
 * Get coverage alerts for users (RISK-10)
 * @param {string} userId - User ID
 * @returns {Promise}
 */
export const getCoverageAlerts = async (userId) => {
  try {
    const response = await apiClient.get(`/api/risk/coverage-alerts/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching coverage alerts:', error);
    throw error;
  }
};

/**
 * Check if coverage is below minimum (for loan approval blocking) (RISK-11)
 * @returns {Promise}
 */
export const checkCoverageMinEnforcement = async () => {
  try {
    const response = await apiClient.get('/api/risk/coverage-min-check');
    return response.data;
  } catch (error) {
    console.error('Error checking coverage minimum:', error);
    throw error;
  }
};

export const runAutomaticDefaultCheck = defaultDetectionService.runAutomaticDefaultCheck;
export const checkLoanDefault = defaultDetectionService.checkLoanDefault;
export const getWorkflowProgressionStatus = defaultDetectionService.getWorkflowProgressionStatus;
export const triggerWorkflowProgression = defaultDetectionService.triggerWorkflowProgression;
export const scheduleAutomaticDefaultCheck = defaultDetectionService.scheduleAutomaticDefaultCheck;

export default {
  getBorrowerRiskScore,
  calculateBorrowerRiskScore,
  getCollateralValuation,
  verifyCollateral,
  calculateLTV,
  validateLTV,
  validateExposure,
  getLoanRiskStatus,
  analyzeLoanRisk,
  startDefaultWorkflow,
  advanceDefaultWorkflow,
  getRiskDashboard,
  getDefaultMonitoring,
  validateLoanRequest,
  LTV_CONFIG,
  RISK_CATEGORIES,
  RISK_STATUS_CONFIG,
  WORKFLOW_STAGES,
  GRACE_PERIOD_CONFIG,
  getGracePeriodConfig,
  updateGracePeriodConfig,
  checkGracePeriodStatus,
  getUpcomingGracePeriodLoans,
  // Refinancing (RISK-05, RISK-06)
  validateRefinancingTerms,
  submitRefinancing,
  analyzeLoanRiskForRefinancing,
  // Watchlist (RISK-15)
  getLoansAtRisk,
  // Webhooks (RISK-14)
  WEBHOOK_EVENTS,
  registerWebhook,
  unregisterWebhook,
  getRegisteredWebhooks,
  subscribeToDefaultProbabilityUpdates,
  // Price Oracle (RISK-07)
  getCollateralValuationForLiquidation,
  checkLiquidationThreshold,
  triggerLiquidation,
  COVERAGE_CONFIG,
  getReserveCoverage,
  validateCoverageForLoan,
  getRealTimeCoverage,
  subscribeToCoverageUpdates,
  getCoverageAlerts,
  checkCoverageMinEnforcement,
  // RISK-001: Automatic Default Detection
  runAutomaticDefaultCheck,
  getLoansAtRisk: defaultDetectionService.getLoansAtRisk,
  checkLoanDefault,
  getWorkflowProgressionStatus,
  triggerWorkflowProgression,
  getDefaultPredictionStats: defaultDetectionService.getDefaultPredictionStats,
  scheduleAutomaticDefaultCheck
};
