/**
 * Capital Protection Service
 * API calls for capital protection system
 */

import { createApiClient } from '../utils/api/client';

const apiClient = createApiClient('/api/capital');

// ============================================================
// RESERVE STATUS
// ============================================================

/**
 * Get reserve pool status
 * @returns {Promise}
 */
export const getReserveStatus = async () => {
  try {
    const response = await apiClient.get('/reserve-status');
    return response.data;
  } catch (error) {
    console.error('Error fetching reserve status:', error);
    throw error;
  }
};

/**
 * Get coverage ratio
 * @returns {Promise}
 */
export const getCoverageRatio = async () => {
  try {
    const response = await apiClient.get('/coverage-ratio');
    return response.data;
  } catch (error) {
    console.error('Error fetching coverage ratio:', error);
    throw error;
  }
};

/**
 * Get system health
 * @returns {Promise}
 */
export const getSystemHealth = async () => {
  try {
    const response = await apiClient.get('/system-health');
    return response.data;
  } catch (error) {
    console.error('Error fetching system health:', error);
    throw error;
  }
};

/**
 * Get platform stability (public)
 * @returns {Promise}
 */
export const getPlatformStability = async () => {
  try {
    const response = await apiClient.get('/platform-stability');
    return response.data;
  } catch (error) {
    console.error('Error fetching platform stability:', error);
    throw error;
  }
};

// ============================================================
// ADMIN DASHBOARD
// ============================================================

/**
 * Get admin capital protection dashboard
 * @returns {Promise}
 */
export const getAdminDashboard = async () => {
  try {
    const response = await apiClient.get('/admin/dashboard');
    return response.data;
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    throw error;
  }
};

/**
 * Update pool balance
 * @param {Object} data - Pool update data
 * @returns {Promise}
 */
export const updatePoolBalance = async (data) => {
  try {
    const response = await apiClient.post('/admin/update-pool', data);
    return response.data;
  } catch (error) {
    console.error('Error updating pool balance:', error);
    throw error;
  }
};

/**
 * Replenish reserve
 * @param {Object} data - Replenishment data
 * @returns {Promise}
 */
export const replenishReserve = async (data) => {
  try {
    const response = await apiClient.post('/admin/replenish-reserve', data);
    return response.data;
  } catch (error) {
    console.error('Error replenishing reserve:', error);
    throw error;
  }
};

// ============================================================
// SAFETY TRIGGERS
// ============================================================

/**
 * Get all safety triggers
 * @returns {Promise}
 */
export const getTriggers = async () => {
  try {
    const response = await apiClient.get('/triggers');
    return response.data;
  } catch (error) {
    console.error('Error fetching triggers:', error);
    throw error;
  }
};

/**
 * Evaluate safety triggers
 * @returns {Promise}
 */
export const evaluateTriggers = async () => {
  try {
    const response = await apiClient.post('/triggers/evaluate');
    return response.data;
  } catch (error) {
    console.error('Error evaluating triggers:', error);
    throw error;
  }
};

/**
 * Resolve a trigger
 * @param {number} triggerId - Trigger ID
 * @returns {Promise}
 */
export const resolveTrigger = async (triggerId) => {
  try {
    const response = await apiClient.post(`/triggers/resolve/${triggerId}`);
    return response.data;
  } catch (error) {
    console.error('Error resolving trigger:', error);
    throw error;
  }
};

// ============================================================
// STRESS TEST
// ============================================================

/**
 * Get stress test scenarios
 * @returns {Promise}
 */
export const getStressTestScenarios = async () => {
  try {
    const response = await apiClient.get('/stress-tests');
    return response.data;
  } catch (error) {
    console.error('Error fetching stress test scenarios:', error);
    throw error;
  }
};

/**
 * Run stress test
 * @param {Object} data - Stress test parameters
 * @returns {Promise}
 */
export const runStressTest = async (data) => {
  try {
    const response = await apiClient.post('/stress-test', data);
    return response.data;
  } catch (error) {
    console.error('Error running stress test:', error);
    throw error;
  }
};

/**
 * Get stress test history
 * @returns {Promise}
 */
export const getStressTestHistory = async () => {
  try {
    const response = await apiClient.get('/stress-test/history');
    return response.data;
  } catch (error) {
    console.error('Error fetching stress test history:', error);
    throw error;
  }
};

// ============================================================
// ALERTS
// ============================================================

/**
 * Get system alerts
 * @param {number} limit - Number of alerts to fetch
 * @returns {Promise}
 */
export const getAlerts = async (limit = 20) => {
  try {
    const response = await apiClient.get('/alerts', {
      params: { limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching alerts:', error);
    throw error;
  }
};

/**
 * Resolve an alert
 * @param {number} alertId - Alert ID
 * @returns {Promise}
 */
export const resolveAlert = async (alertId) => {
  try {
    const response = await apiClient.post(`/alerts/${alertId}/resolve`);
    return response.data;
  } catch (error) {
    console.error('Error resolving alert:', error);
    throw error;
  }
};

// ============================================================
// LOAN GUARANTEES
// ============================================================

/**
 * Create loan guarantee
 * @param {Object} data - Guarantee data
 * @returns {Promise}
 */
export const createGuarantee = async (data) => {
  try {
    const response = await apiClient.post('/guarantee/create', data);
    return response.data;
  } catch (error) {
    console.error('Error creating guarantee:', error);
    throw error;
  }
};

/**
 * File guarantee claim
 * @param {Object} data - Claim data
 * @returns {Promise}
 */
export const fileGuaranteeClaim = async (data) => {
  try {
    const response = await apiClient.post('/api/capital/guarantee/claim', data);
    return response.data;
  } catch (error) {
    console.error('Error filing guarantee claim:', error);
    throw error;
  }
};

// ============================================================
// CONFIGURATION CONSTANTS
// ============================================================

// System health thresholds
export const HEALTH_THRESHOLDS = {
  strong: 40,
  healthy: 25,
  warning: 15,
  critical: 10
};

// Safety trigger thresholds
export const TRIGGER_THRESHOLDS = {
  slowdown: 30,
  pause: 20,
  emergency: 15
};

// System health display config
export const HEALTH_STATUS_CONFIG = {
  strong: { label: 'Strong', color: 'green', icon: 'shield-check' },
  healthy: { label: 'Healthy', color: 'blue', icon: 'shield' },
  warning: { label: 'Warning', color: 'yellow', icon: 'alert-triangle' },
  critical: { label: 'Critical', color: 'red', icon: 'alert-circle' }
};

// Trigger types
export const TRIGGER_TYPES = {
  lending_slowdown: { label: 'Lending Slowdown', color: 'yellow', action: 'reduce_approval' },
  lending_pause: { label: 'Lending Pause', color: 'orange', action: 'pause_listing' },
  emergency_mode: { label: 'Emergency Mode', color: 'red', action: 'restrict_collateral_only' },
  default_rate_spike: { label: 'Default Rate Spike', color: 'orange', action: 'reduce_approval' },
  collateral_decline: { label: 'Collateral Decline', color: 'yellow', action: 'reduce_approval' },
  reserve_depletion: { label: 'Reserve Depletion', color: 'red', action: 'emergency_measures' }
};

// Alert severity
export const ALERT_SEVERITY = {
  info: { label: 'Info', color: 'blue' },
  warning: { label: 'Warning', color: 'yellow' },
  critical: { label: 'Critical', color: 'orange' },
  emergency: { label: 'Emergency', color: 'red' }
};

// Pool types
export const POOL_TYPES = {
  operational: { 
    label: 'Operational Reserve', 
    color: 'blue',
    sources: ['Transaction fees', 'Origination fees', 'Marketplace commissions']
  },
  guarantee: { 
    label: 'Guarantee Reserve', 
    color: 'green',
    sources: ['Loan insurance fees', 'Investor interest share', 'Collateral liquidation proceeds']
  },
  emergency: { 
    label: 'Emergency Capital Buffer', 
    color: 'purple',
    sources: ['Platform profits', 'Institutional investors', 'External capital injections']
  }
};

// Default stress test scenarios
export const DEFAULT_SCENARIOS = [
  { name: 'Mild Stress', default_rate: 5, collateral_recovery_rate: 60 },
  { name: 'Moderate Stress', default_rate: 10, collateral_recovery_rate: 45 },
  { name: 'Severe Stress', default_rate: 20, collateral_recovery_rate: 30 },
  { name: 'Crisis Scenario', default_rate: 30, collateral_recovery_rate: 20 }
];

export default {
  getReserveStatus,
  getCoverageRatio,
  getSystemHealth,
  getPlatformStability,
  getAdminDashboard,
  updatePoolBalance,
  replenishReserve,
  getTriggers,
  evaluateTriggers,
  resolveTrigger,
  getStressTestScenarios,
  runStressTest,
  getStressTestHistory,
  getAlerts,
  resolveAlert,
  createGuarantee,
  fileGuaranteeClaim,
  HEALTH_THRESHOLDS,
  TRIGGER_THRESHOLDS,
  HEALTH_STATUS_CONFIG,
  TRIGGER_TYPES,
  ALERT_SEVERITY,
  POOL_TYPES,
  DEFAULT_SCENARIOS
};
