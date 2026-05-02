/**
 * Notification Service
 * RISK-02: Grace period notifications and risk alerts
 * Handles automated notifications for grace period, default risk, and coverage alerts
 */

import apiClient from '../utils/api/client';

// Notification types
export const NOTIFICATION_TYPES = {
  GRACE_PERIOD_WARNING: 'grace_period_warning',
  GRACE_PERIOD_EXPIRED: 'grace_period_expired',
  DEFAULT_IMMINENT: 'default_imminent',
  COVERAGE_ALERT: 'coverage_alert',
  LIQUIDATION_WARNING: 'liquidation_warning',
  REFINANCING_OPPORTUNITY: 'refinancing_opportunity',
  RISK_WATCHLIST: 'risk_watchlist',
};

// Notification priorities
export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

const notificationService = {
  /**
   * Send grace period reminder notification
   * @param {number} loanId - Loan ID
   * @param {number} daysRemaining - Days remaining until default
   */
  async sendGracePeriodReminder(loanId, daysRemaining) {
    try {
      const response = await apiClient.post('/api/notifications/grace-period-reminder', {
        loanId,
        daysRemaining,
        type: NOTIFICATION_TYPES.GRACE_PERIOD_WARNING,
        priority: daysRemaining <= 3 ? NOTIFICATION_PRIORITY.HIGH : NOTIFICATION_PRIORITY.MEDIUM,
      });
      return response.data;
    } catch (error) {
      console.error('Error sending grace period reminder:', error);
      throw error;
    }
  },

  /**
   * Send grace period expired notification
   * @param {number} loanId - Loan ID
   */
  async sendGracePeriodExpired(loanId) {
    try {
      const response = await apiClient.post('/api/notifications/grace-period-expired', {
        loanId,
        type: NOTIFICATION_TYPES.GRACE_PERIOD_EXPIRED,
        priority: NOTIFICATION_PRIORITY.CRITICAL,
      });
      return response.data;
    } catch (error) {
      console.error('Error sending grace period expired notification:', error);
      throw error;
    }
  },

  /**
   * Send coverage ratio alert (RISK-10)
   * @param {number} currentRatio - Current coverage ratio
   * @param {number} minRequired - Minimum required ratio
   */
  async sendCoverageAlert(currentRatio, minRequired) {
    try {
      const response = await apiClient.post('/api/notifications/coverage-alert', {
        currentRatio,
        minRequired,
        type: NOTIFICATION_TYPES.COVERAGE_ALERT,
        priority: currentRatio < minRequired ? NOTIFICATION_PRIORITY.CRITICAL : NOTIFICATION_PRIORITY.HIGH,
      });
      return response.data;
    } catch (error) {
      console.error('Error sending coverage alert:', error);
      throw error;
    }
  },

  /**
   * Send default imminent notification (RISK-14)
   * @param {number} loanId - Loan ID
   * @param {number} defaultProbability - Default probability percentage
   */
  async sendDefaultImminent(loanId, defaultProbability) {
    try {
      const response = await apiClient.post('/api/notifications/default-imminent', {
        loanId,
        defaultProbability,
        type: NOTIFICATION_TYPES.DEFAULT_IMMINENT,
        priority: defaultProbability > 50 ? NOTIFICATION_PRIORITY.CRITICAL : NOTIFICATION_PRIORITY.HIGH,
      });
      return response.data;
    } catch (error) {
      console.error('Error sending default imminent notification:', error);
      throw error;
    }
  },

  /**
   * Send liquidation warning (RISK-08)
   * @param {number} loanId - Loan ID
   * @param {number} currentLTV - Current LTV ratio
   * @param {number} liquidationThreshold - Liquidation threshold
   */
  async sendLiquidationWarning(loanId, currentLTV, liquidationThreshold) {
    try {
      const response = await apiClient.post('/api/notifications/liquidation-warning', {
        loanId,
        currentLTV,
        liquidationThreshold,
        type: NOTIFICATION_TYPES.LIQUIDATION_WARNING,
        priority: currentLTV >= liquidationThreshold ? NOTIFICATION_PRIORITY.CRITICAL : NOTIFICATION_PRIORITY.HIGH,
      });
      return response.data;
    } catch (error) {
      console.error('Error sending liquidation warning:', error);
      throw error;
    }
  },

  /**
   * Send refinancing opportunity notification
   * @param {number} loanId - Loan ID
   * @param {Object} terms - New refinancing terms
   */
  async sendRefinancingOpportunity(loanId, terms) {
    try {
      const response = await apiClient.post('/api/notifications/refinancing-opportunity', {
        loanId,
        terms,
        type: NOTIFICATION_TYPES.REFINANCING_OPPORTUNITY,
        priority: NOTIFICATION_PRIORITY.MEDIUM,
      });
      return response.data;
    } catch (error) {
      console.error('Error sending refinancing opportunity notification:', error);
      throw error;
    }
  },

  /**
   * Add loan to watchlist notification (RISK-15)
   * @param {number} loanId - Loan ID
   * @param {string} reason - Reason for watchlist addition
   */
  async sendWatchlistNotification(loanId, reason) {
    try {
      const response = await apiClient.post('/api/notifications/watchlist', {
        loanId,
        reason,
        type: NOTIFICATION_TYPES.RISK_WATCHLIST,
        priority: NOTIFICATION_PRIORITY.HIGH,
      });
      return response.data;
    } catch (error) {
      console.error('Error sending watchlist notification:', error);
      throw error;
    }
  },

  /**
   * Get user notifications
   * @param {Object} params - Query parameters
   */
  async getNotifications(params = {}) {
    try {
      const response = await apiClient.get('/api/notifications', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  /**
   * Mark notification as read
   * @param {number} notificationId - Notification ID
   */
  async markAsRead(notificationId) {
    try {
      const response = await apiClient.put(`/api/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount() {
    try {
      const response = await apiClient.get('/api/notifications/unread-count');
      return response.data;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  },

  /**
   * Batch send notifications (for cron jobs)
   * @param {string} notificationType - Type of notifications to send
   * @param {Object} params - Additional parameters
   */
  async batchSend(notificationType, params = {}) {
    try {
      const response = await apiClient.post(`/api/notifications/batch/${notificationType}`, params);
      return response.data;
    } catch (error) {
      console.error('Error batch sending notifications:', error);
      throw error;
    }
  },
};

export default notificationService;