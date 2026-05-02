/**
 * Risk Monitoring Service
 * RISK-13: Enhanced risk scoring algorithm
 * RISK-14: Real-time default probability updates with webhooks
 * RISK-15: Automatic watchlist updates with cron job
 */

import apiClient from '../utils/api/client';

// Risk scoring factors (RISK-13: Enhanced algorithm)
export const RISK_SCORING_FACTORS = {
  paymentHistory: { weight: 0.30, description: 'Payment history weight' },
  debtToIncome: { weight: 0.25, description: 'Debt to income ratio' },
  creditUtilization: { weight: 0.20, description: 'Credit utilization' },
  loanPerformance: { weight: 0.15, description: 'Previous loan performance' },
  collateralQuality: { weight: 0.10, description: 'Collateral quality' },
};

// Watchlist thresholds
export const WATCHLIST_THRESHOLDS = {
  highRisk: 70, // >70% default probability
  mediumRisk: 40, // >40% default probability
  lowRisk: 20, // >20% default probability
};

const riskMonitoringService = {
  /**
   * RISK-13: Get enhanced risk score with ML factors
   * @param {number} userId - User ID
   * @returns {Promise}
   */
  getEnhancedRiskScore: async (userId) => {
    try {
      const response = await apiClient.get(`/api/risk/enhanced-score/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching enhanced risk score:', error);
      throw error;
    }
  },

  /**
   * RISK-13: Calculate ML-based default probability
   * @param {Object} features - Risk features for ML model
   * @returns {Promise}
   */
  calculateDefaultProbability: async (features) => {
    try {
      const response = await apiClient.post('/api/risk/ml/default-probability', features);
      return response.data;
    } catch (error) {
      console.error('Error calculating default probability:', error);
      throw error;
    }
  },

  /**
   * RISK-13: Get risk factors breakdown
   * @param {number} userId - User ID
   * @returns {Promise}
   */
  getRiskFactors: async (userId) => {
    try {
      const response = await apiClient.get(`/api/risk/factors/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching risk factors:', error);
      throw error;
    }
  },

  /**
   * RISK-14: Subscribe to real-time default probability updates
   * @param {number} loanId - Loan ID to monitor
   * @param {Function} callback - Callback for updates
   * @returns {Function} Unsubscribe function
   */
  subscribeToDefaultProbability: (loanId, callback) => {
    // Poll for updates every 60 seconds
    const interval = setInterval(async () => {
      try {
        const response = await apiClient.get(`/api/risk/loan/${loanId}/probability`);
        callback(response.data);
      } catch (error) {
        console.error('Default probability update error:', error);
      }
    }, 60000);

    // Return cleanup function
    return () => clearInterval(interval);
  },

  /**
   * RISK-14: Register webhook for risk events
   * @param {string} webhookUrl - URL to receive updates
   * @param {Object} events - Events to subscribe to
   * @returns {Promise}
   */
  registerWebhook: async (webhookUrl, events) => {
    try {
      const response = await apiClient.post('/api/risk/webhooks/register', {
        url: webhookUrl,
        events: events
      });
      return response.data;
    } catch (error) {
      console.error('Error registering webhook:', error);
      throw error;
    }
  },

  /**
   * RISK-14: Get webhook status
   * @returns {Promise}
   */
  getWebhookStatus: async () => {
    try {
      const response = await apiClient.get('/api/risk/webhooks/status');
      return response.data;
    } catch (error) {
      console.error('Error fetching webhook status:', error);
      throw error;
    }
  },

  /**
   * RISK-14: Trigger manual risk recalculation
   * @param {number} loanId - Loan ID
   * @returns {Promise}
   */
  triggerRiskRecalculation: async (loanId) => {
    try {
      const response = await apiClient.post(`/api/risk/recalculate/${loanId}`);
      return response.data;
    } catch (error) {
      console.error('Error triggering risk recalculation:', error);
      throw error;
    }
  },

  /**
   * RISK-15: Get watchlist
   * @returns {Promise}
   */
  getWatchlist: async () => {
    try {
      const response = await apiClient.get('/api/risk/watchlist');
      return response.data;
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      throw error;
    }
  },

  /**
   * RISK-15: Add loan to watchlist
   * @param {number} loanId - Loan ID
   * @param {string} reason - Reason for watchlist
   * @returns {Promise}
   */
  addToWatchlist: async (loanId, reason) => {
    try {
      const response = await apiClient.post('/api/risk/watchlist/add', {
        loanId,
        reason
      });
      return response.data;
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      throw error;
    }
  },

  /**
   * RISK-15: Remove loan from watchlist
   * @param {number} loanId - Loan ID
   * @returns {Promise}
   */
  removeFromWatchlist: async (loanId) => {
    try {
      const response = await apiClient.post(`/api/risk/watchlist/remove/${loanId}`);
      return response.data;
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      throw error;
    }
  },

  /**
   * RISK-15: Trigger automatic watchlist update (for cron job)
   * @returns {Promise}
   */
  updateWatchlist: async () => {
    try {
      const response = await apiClient.post('/api/risk/watchlist/update');
      return response.data;
    } catch (error) {
      console.error('Error updating watchlist:', error);
      throw error;
    }
  },

  /**
   * RISK-15: Get watchlist statistics
   * @returns {Promise}
   */
  getWatchlistStats: async () => {
    try {
      const response = await apiClient.get('/api/risk/watchlist/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching watchlist stats:', error);
      throw error;
    }
  },

  /**
   * RISK-13: Get trend analysis for a loan
   * @param {number} loanId - Loan ID
   * @param {number} days - Number of days to analyze
   * @returns {Promise}
   */
  getRiskTrend: async (loanId, days = 30) => {
    try {
      const response = await apiClient.get(`/api/risk/trend/${loanId}`, {
        params: { days }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching risk trend:', error);
      throw error;
    }
  },

  /**
   * RISK-14: Batch update probabilities (for cron job)
   * @returns {Promise}
   */
  batchUpdateProbabilities: async () => {
    try {
      const response = await apiClient.post('/api/risk/batch-update-probabilities');
      return response.data;
    } catch (error) {
      console.error('Error batch updating probabilities:', error);
      throw error;
    }
  },

  /**
   * RISK-13: Train ML model (admin only)
   * @returns {Promise}
   */
  trainModel: async () => {
    try {
      const response = await apiClient.post('/api/risk/ml/train');
      return response.data;
    } catch (error) {
      console.error('Error training ML model:', error);
      throw error;
    }
  }
};

export default riskMonitoringService;