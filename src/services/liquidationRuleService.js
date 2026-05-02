/**
 * Liquidation Rule Evaluation Service (RISK-006)
 * Active rule engine for collateral liquidation triggers
 */

import apiClient from '../utils/api/client';

/**
 * Get all liquidation rules
 * @returns {Promise}
 */
export const getLiquidationRules = async () => {
  try {
    const response = await apiClient.get('/api/liquidation/rules');
    return response.data;
  } catch (error) {
    console.error('Error fetching liquidation rules:', error);
    throw error;
  }
};

/**
 * Create a new liquidation rule
 * @param {Object} ruleData - Rule configuration
 * @returns {Promise}
 */
export const createLiquidationRule = async (ruleData) => {
  try {
    const response = await apiClient.post('/api/liquidation/rules', ruleData);
    return response.data;
  } catch (error) {
    console.error('Error creating liquidation rule:', error);
    throw error;
  }
};

/**
 * Update a liquidation rule
 * @param {number} ruleId - Rule ID
 * @param {Object} ruleData - Updated rule data
 * @returns {Promise}
 */
export const updateLiquidationRule = async (ruleId, ruleData) => {
  try {
    const response = await apiClient.put(`/api/liquidation/rules/${ruleId}`, ruleData);
    return response.data;
  } catch (error) {
    console.error('Error updating liquidation rule:', error);
    throw error;
  }
};

/**
 * Delete a liquidation rule
 * @param {number} ruleId - Rule ID
 * @returns {Promise}
 */
export const deleteLiquidationRule = async (ruleId) => {
  try {
    const response = await apiClient.delete(`/api/liquidation/rules/${ruleId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting liquidation rule:', error);
    throw error;
  }
};

/**
 * Evaluate liquidation readiness for a loan
 * @param {number} loanId - Loan ID
 * @returns {Promise}
 */
export const evaluateLiquidationReadiness = async (loanId) => {
  try {
    const response = await apiClient.get(`/api/liquidation/evaluate/${loanId}`);
    return response.data;
  } catch (error) {
    console.error('Error evaluating liquidation readiness:', error);
    throw error;
  }
};

/**
 * Trigger liquidation for a loan
 * @param {number} loanId - Loan ID
 * @param {Object} liquidationData - Liquidation parameters
 * @returns {Promise}
 */
export const triggerLiquidation = async (loanId, liquidationData) => {
  try {
    const response = await apiClient.post(`/api/liquidation/trigger/${loanId}`, liquidationData);
    return response.data;
  } catch (error) {
    console.error('Error triggering liquidation:', error);
    throw error;
  }
};

/**
 * Get liquidation history
 * @param {Object} filters - Filter options
 * @returns {Promise}
 */
export const getLiquidationHistory = async (filters = {}) => {
  try {
    const response = await apiClient.get('/api/liquidation/history', { params: filters });
    return response.data;
  } catch (error) {
    console.error('Error fetching liquidation history:', error);
    throw error;
  }
};

/**
 * Get active liquidations
 * @returns {Promise}
 */
export const getActiveLiquidations = async () => {
  try {
    const response = await apiClient.get('/api/liquidation/active');
    return response.data;
  } catch (error) {
    console.error('Error fetching active liquidations:', error);
    throw error;
  }
};

/**
 * Run rule evaluation for all eligible loans
 * This should be called by a cron job
 * @returns {Promise}
 */
export const runRuleEvaluation = async () => {
  try {
    const response = await apiClient.post('/api/liquidation/run-evaluation');
    return response.data;
  } catch (error) {
    console.error('Error running rule evaluation:', error);
    throw error;
  }
};

/**
 * Get liquidation statistics
 * @returns {Promise}
 */
export const getLiquidationStats = async () => {
  try {
    const response = await apiClient.get('/api/liquidation/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching liquidation stats:', error);
    throw error;
  }
};

/**
 * Preview rule evaluation without triggering
 * @param {Object} ruleData - Rule to preview
 * @returns {Promise}
 */
export const previewRuleEvaluation = async (ruleData) => {
  try {
    const response = await apiClient.post('/api/liquidation/preview', ruleData);
    return response.data;
  } catch (error) {
    console.error('Error previewing rule evaluation:', error);
    throw error;
  }
};

// Default liquidation rule templates
export const LIQUIDATION_RULE_TEMPLATES = {
  LTV_BASED: {
    name: 'LTV Threshold Trigger',
    description: 'Trigger liquidation when LTV exceeds threshold',
    conditions: [
      { field: 'ltv_ratio', operator: 'greater_than', value: 80 }
    ],
    actions: ['notify_admin', 'initiate_auction'],
    priority: 'high'
  },
  DAYS_PAST_DUE: {
    name: 'Days Past Due Trigger',
    description: 'Trigger liquidation after X days past due',
    conditions: [
      { field: 'days_past_due', operator: 'greater_than', value: 30 }
    ],
    actions: ['send_warning', 'initiate_auction'],
    priority: 'high'
  },
  PAYMENT_STREAK: {
    name: 'Payment Streak Failure',
    description: 'Trigger after X consecutive missed payments',
    conditions: [
      { field: 'consecutive_missed_payments', operator: 'greater_than', value: 3 }
    ],
    actions: ['start_workflow', 'notify_borrower'],
    priority: 'medium'
  },
  COLLATERAL_DEPRECIATION: {
    name: 'Collateral Depreciation Trigger',
    description: 'Trigger when collateral value drops below threshold',
    conditions: [
      { field: 'collateral_coverage', operator: 'less_than', value: 100 }
    ],
    actions: ['request_revaluation', 'notify_admin'],
    priority: 'medium'
  },
  RISK_SCORE: {
    name: 'Risk Score Threshold',
    description: 'Trigger based on risk score deterioration',
    conditions: [
      { field: 'default_probability', operator: 'greater_than', value: 70 }
    ],
    actions: ['escalate', 'enhanced_monitoring'],
    priority: 'low'
  }
};

// Rule action types
export const RULE_ACTIONS = {
  NOTIFY_ADMIN: 'notify_admin',
  NOTIFY_BORROWER: 'notify_borrower',
  NOTIFY_LENDERS: 'notify_lenders',
  INITIATE_AUCTION: 'initiate_auction',
  START_WORKFLOW: 'start_workflow',
  SEND_WARNING: 'send_warning',
  ESCALATE: 'escalate',
  ENHANCED_MONITORING: 'enhanced_monitoring',
  REQUEST_REVALUATION: 'request_revaluation',
  PLACE_HOLD: 'place_hold'
};

export default {
  getLiquidationRules,
  createLiquidationRule,
  updateLiquidationRule,
  deleteLiquidationRule,
  evaluateLiquidationReadiness,
  triggerLiquidation,
  getLiquidationHistory,
  getActiveLiquidations,
  runRuleEvaluation,
  getLiquidationStats,
  previewRuleEvaluation,
  LIQUIDATION_RULE_TEMPLATES,
  RULE_ACTIONS
};
