/**
 * Credit Reputation Service
 * API calls for LENDA Credit Reputation System
 */

import { createApiClient } from '../utils/api/client';

const apiClient = createApiClient('/api/credit');

// ============================================================
// CREDIT SCORE
// ============================================================

/**
 * Get borrower credit score
 * @param {number} borrowerId - Borrower ID
 * @returns {Promise}
 */
export const getBorrowerCreditScore = async (borrowerId) => {
  try {
    const response = await apiClient.get(`/borrower/score/${borrowerId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching credit score:', error);
    throw error;
  }
};

/**
 * Calculate borrower credit score
 * @returns {Promise}
 */
export const calculateCreditScore = async () => {
  try {
    const response = await apiClient.post('/borrower/calculate');
    return response.data;
  } catch (error) {
    console.error('Error calculating credit score:', error);
    throw error;
  }
};

// ============================================================
// BORROWER PROFILE
// ============================================================

/**
 * Get borrower profile with reputation data
 * @param {number} borrowerId - Borrower ID
 * @returns {Promise}
 */
export const getBorrowerProfile = async (borrowerId) => {
  try {
    const response = await apiClient.get(`/borrower/profile/${borrowerId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching borrower profile:', error);
    throw error;
  }
};

// ============================================================
// REPAYMENT HISTORY
// ============================================================

/**
 * Get borrower repayment history
 * @param {number} borrowerId - Borrower ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise}
 */
export const getRepaymentHistory = async (borrowerId, page = 1, limit = 20) => {
  try {
    const response = await apiClient.get(`/borrower/repayment-history/${borrowerId}`, {
      params: { page, limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching repayment history:', error);
    throw error;
  }
};

// ============================================================
// REPUTATION BADGES
// ============================================================

/**
 * Get borrower reputation badges
 * @param {number} borrowerId - Borrower ID
 * @returns {Promise}
 */
export const getBorrowerBadges = async (borrowerId) => {
  try {
    const response = await apiClient.get(`/borrower/badges/${borrowerId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching borrower badges:', error);
    throw error;
  }
};

// ============================================================
// REPUTATION SIGNALS
// ============================================================

/**
 * Get reputation signals for a loan
 * @param {number} borrowerId - Borrower ID
 * @param {number} loanId - Loan ID
 * @returns {Promise}
 */
export const getReputationSignals = async (borrowerId, loanId) => {
  try {
    const response = await apiClient.get(`/signals/${borrowerId}/${loanId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching reputation signals:', error);
    throw error;
  }
};

// ============================================================
// ADMIN MONITORING
// ============================================================

/**
 * Get credit monitoring dashboard
 * @returns {Promise}
 */
export const getCreditMonitoringDashboard = async () => {
  try {
    const response = await apiClient.get('/admin/monitoring');
    return response.data;
  } catch (error) {
    console.error('Error fetching credit monitoring dashboard:', error);
    throw error;
  }
};

// ============================================================
// CREDIT SCORE CONFIGURATION
// ============================================================

// Score ranges
export const CREDIT_SCORE_RANGES = {
  elite: { min: 800, max: 900, label: 'Elite', color: 'emerald' },
  excellent: { min: 720, max: 799, label: 'Excellent', color: 'green' },
  good: { min: 650, max: 719, label: 'Good', color: 'blue' },
  fair: { min: 580, max: 649, label: 'Fair', color: 'yellow' },
  weak: { min: 500, max: 579, label: 'Weak', color: 'orange' },
  high_risk: { min: 300, max: 499, label: 'High Risk', color: 'red' }
};

// Scoring weights
export const SCORING_WEIGHTS = {
  repayment_history: 40,
  loan_completion: 25,
  collateral_quality: 15,
  account_longevity: 10,
  marketplace_reputation: 10
};

// Badge types
export const BADGE_TYPES = {
  reliable_borrower: {
    name: 'Reliable Borrower',
    icon: 'shield-check',
    color: 'green'
  },
  high_repayment_streak: {
    name: 'High Repayment Streak',
    icon: 'fire',
    color: 'orange'
  },
  collateral_verified: {
    name: 'Collateral Verified',
    icon: 'lock',
    color: 'blue'
  },
  veteran_borrower: {
    name: 'Veteran Borrower',
    icon: 'star',
    color: 'purple'
  },
  on_time_king: {
    name: 'On Time King',
    icon: 'clock',
    color: 'yellow'
  },
  first_loan_completed: {
    name: 'First Loan Completed',
    icon: 'flag',
    color: 'green'
  },
  consistent_borrower: {
    name: 'Consistent Borrower',
    icon: 'trending-up',
    color: 'blue'
  },
  trusted_borrower: {
    name: 'Trusted Borrower',
    icon: 'award',
    color: 'emerald'
  },
  low_ratio_borrower: {
    name: 'Low Ratio Borrower',
    icon: 'percent',
    color: 'green'
  },
  fast_payer: {
    name: 'Fast Payer',
    icon: 'zap',
    color: 'yellow'
  }
};

// Signal types
export const SIGNAL_TYPES = {
  high_reputation_high_rate: {
    label: 'Strong Opportunity',
    description: 'High credit score with above-market rate',
    recommendation: 'The borrower\'s excellent credit history may justify the higher rate',
    color: 'green'
  },
  high_reputation_low_rate: {
    label: 'Conservative Borrower',
    description: 'High credit score with competitive rate',
    recommendation: 'Lower risk but potentially lower returns',
    color: 'blue'
  },
  low_reputation_high_rate: {
    label: 'High Risk',
    description: 'Lower credit score with high interest rate',
    recommendation: 'The offered rate may not adequately compensate for the risk',
    color: 'red'
  },
  low_reputation_low_rate: {
    label: 'Conservative Pricing',
    description: 'Lower credit score with competitive rate',
    recommendation: 'Borrower may be building credit - verify collateral',
    color: 'yellow'
  },
  new_borrower: {
    label: 'New Borrower',
    description: 'Limited platform history',
    recommendation: 'Consider starting with smaller investments',
    color: 'gray'
  },
  consistent_performance: {
    label: 'Excellent Track Record',
    description: '95%+ repayment rate',
    recommendation: 'Strong indicator of reliability',
    color: 'green'
  }
};

export default {
  getBorrowerCreditScore,
  calculateCreditScore,
  getBorrowerProfile,
  getRepaymentHistory,
  getBorrowerBadges,
  getReputationSignals,
  getCreditMonitoringDashboard,
  CREDIT_SCORE_RANGES,
  SCORING_WEIGHTS,
  BADGE_TYPES,
  SIGNAL_TYPES
};
