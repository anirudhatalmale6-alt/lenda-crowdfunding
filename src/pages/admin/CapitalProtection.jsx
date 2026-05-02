import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAdminDashboard,
  fetchAlerts,
  evaluateTriggers,
  resolveAlert,
  replenishReserve,
  selectAdminDashboard,
  selectDashboardLoading,
  selectAlerts,
  selectAlertsLoading,
  selectOperationLoading
} from '../../store/slices/capitalProtectionSlice';
import { 
  HEALTH_STATUS_CONFIG, 
  POOL_TYPES, 
  TRIGGER_TYPES, 
  ALERT_SEVERITY 
} from '../../services/capitalProtectionService';

/**
 * Capital Protection Monitor Dashboard
 * Admin page for monitoring and managing capital protection system
 */
const CapitalProtection = () => {
  const dispatch = useDispatch();
  const dashboard = useSelector(selectAdminDashboard);
  const dashboardLoading = useSelector(selectDashboardLoading);
  const alerts = useSelector(selectAlerts);
  const alertsLoading = useSelector(selectAlertsLoading);
  const operationLoading = useSelector(selectOperationLoading);

  const [activeTab, setActiveTab] = useState('overview');
  const [replenishModal, setReplenishModal] = useState(false);
  const [replenishAmount, setReplenishAmount] = useState('');
  const [replenishSource, setReplenishSource] = useState('platform_profit');

  useEffect(() => {
    dispatch(fetchAdminDashboard());
    dispatch(fetchAlerts(20));
  }, [dispatch]);

  const handleReplenish = async () => {
    if (!replenishAmount || parseFloat(replenishAmount) <= 0) return;
    
    await dispatch(replenishReserve({
      amount: parseFloat(replenishAmount),
      source: replenishSource,
      description: 'Manual reserve replenishment'
    }));
    
    setReplenishModal(false);
    setReplenishAmount('');
    dispatch(fetchAdminDashboard());
  };

  const handleResolveAlert = async (alertId) => {
    await dispatch(resolveAlert(alertId));
    dispatch(fetchAlerts(20));
  };

  const handleEvaluateTriggers = () => {
    dispatch(evaluateTriggers());
    setTimeout(() => dispatch(fetchAdminDashboard()), 1000);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const getHealthColor = (status) => {
    const config = HEALTH_STATUS_CONFIG[status] || HEALTH_STATUS_CONFIG.warning;
    return config.color;
  };

  const getHealthLabel = (status) => {
    const config = HEALTH_STATUS_CONFIG[status] || { label: 'Unknown' };
    return config.label;
  };

  const getSeverityColor = (severity) => {
    return ALERT_SEVERITY[severity]?.color || 'gray';
  };

  const getTriggerColor = (isTriggered) => {
    return isTriggered ? 'red' : 'green';
  };

  if (dashboardLoading && !dashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const summary = dashboard?.dashboard?.summary || {};
  const pools = dashboard?.dashboard?.pools || [];
  const coverage = dashboard?.dashboard?.coverage || {};
  const triggers = dashboard?.dashboard?.triggers || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Capital Protection Monitor</h1>
          <p className="text-gray-600">Monitor reserve health and manage capital protection system</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleEvaluateTriggers}
            disabled={operationLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Evaluate Triggers
          </button>
          <button
            onClick={() => setReplenishModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Replenish Reserve
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {['overview', 'triggers', 'alerts', 'pools'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* System Health Banner */}
          <div className={`p-6 rounded-lg border-l-4 bg-${getHealthColor(summary.system_health)}-50 border-${getHealthColor(summary.system_health)}-500`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-lg font-semibold text-${getHealthColor(summary.system_health)}-800`}>
                  System Health: {getHealthLabel(summary.system_health)}
                </h3>
                <p className="text-gray-600">Last checked: {new Date().toLocaleString()}</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-gray-900">{summary.guarantee_coverage?.toFixed(1)}%</div>
                <p className="text-gray-600">Coverage Ratio</p>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total Reserve */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-sm font-medium text-gray-500">Total Reserve</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(summary.total_reserve)}
              </div>
              <div className="mt-2 text-sm text-green-600">All pools combined</div>
            </div>

            {/* Guarantee Coverage */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-sm font-medium text-gray-500">Guarantee Coverage</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {summary.guarantee_coverage?.toFixed(1)}%
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Min: 25% required
              </div>
            </div>

            {/* Default Rate */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-sm font-medium text-gray-500">Default Rate</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {summary.default_rate?.toFixed(1)}%
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Of all loans
              </div>
            </div>

            {/* Collateral Coverage */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-sm font-medium text-gray-500">Collateral Coverage</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {summary.collateral_coverage?.toFixed(1)}%
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Collateral vs Loans
              </div>
            </div>
          </div>

          {/* Coverage Gauge */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reserve Coverage Gauge</h3>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                    Coverage Ratio
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-blue-600">
                    {coverage.coverage_ratio?.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-gray-200">
                <div
                  style={{ width: `${Math.min(coverage.coverage_ratio, 100)}%` }}
                  className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                    coverage.coverage_ratio >= 40 ? 'bg-green-500' :
                    coverage.coverage_ratio >= 25 ? 'bg-blue-500' :
                    coverage.coverage_ratio >= 15 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                ></div>
              </div>
              {/* Threshold markers */}
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span className="text-red-500">15% (Emergency)</span>
                <span className="text-yellow-500">20% (Pause)</span>
                <span className="text-orange-500">30% (Slowdown)</span>
                <span>50%+</span>
              </div>
            </div>
          </div>

          {/* Capital Pools */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Capital Pools</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pools.map((pool) => {
                const poolConfig = POOL_TYPES[pool.pool_type] || { label: pool.pool_name, color: 'gray' };
                return (
                  <div key={pool.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{pool.pool_name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full bg-${poolConfig.color}-100 text-${poolConfig.color}-800`}>
                        {pool.pool_type}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Balance:</span>
                        <span className="font-medium">{formatCurrency(pool.balance)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Available:</span>
                        <span className="font-medium">{formatCurrency(pool.available_balance)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Locked:</span>
                        <span className="font-medium">{formatCurrency(pool.locked_balance)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Minimum:</span>
                        <span className="font-medium">{formatCurrency(pool.minimum_required)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Triggers Tab */}
      {activeTab === 'triggers' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Safety Triggers</h3>
            <div className="space-y-4">
              {triggers.map((trigger) => {
                const triggerConfig = TRIGGER_TYPES[trigger.type] || { label: trigger.name, color: 'gray' };
                return (
                  <div 
                    key={trigger.id} 
                    className={`p-4 rounded-lg border ${
                      trigger.is_triggered 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full bg-${getTriggerColor(trigger.is_triggered)}-500`}></div>
                        <div>
                          <h4 className="font-medium text-gray-900">{trigger.name}</h4>
                          <p className="text-sm text-gray-500">{trigger.action_description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Threshold: {trigger.threshold}%</div>
                        <div className="font-medium">Current: {trigger.current_value?.toFixed(1)}%</div>
                        {trigger.is_triggered && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            TRIGGERED
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h3>
            {alertsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : alerts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No alerts at this time</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      alert.is_resolved 
                        ? 'border-gray-300 bg-gray-50' 
                        : `border-${getSeverityColor(alert.severity)}-500 bg-white`
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{alert.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(alert.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full bg-${getSeverityColor(alert.severity)}-100 text-${getSeverityColor(alert.severity)}-800`}>
                          {alert.severity}
                        </span>
                        {!alert.is_resolved && (
                          <button
                            onClick={() => handleResolveAlert(alert.id)}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pools Tab */}
      {activeTab === 'pools' && (
        <div className="space-y-6">
          {pools.map((pool) => {
            const poolConfig = POOL_TYPES[pool.pool_type] || { label: pool.pool_name, color: 'gray', sources: [] };
            const progress = pool.target > 0 ? (pool.balance / pool.target) * 100 : 0;
            
            return (
              <div key={pool.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{pool.pool_name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full bg-${poolConfig.color}-100 text-${poolConfig.color}-800`}>
                      {pool.pool_type} pool
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(pool.balance)}</div>
                    <p className="text-sm text-gray-500">of {formatCurrency(pool.target)} target</p>
                  </div>
                </div>

                {/* Progress to target */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Progress to Target</span>
                    <span className="font-medium">{progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`bg-${poolConfig.color}-500 h-2 rounded-full`} 
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Sources */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Funding Sources:</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {poolConfig.sources.map((source, index) => (
                      <li key={index}>{source}</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Replenish Modal */}
      {replenishModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Replenish Guarantee Reserve</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  value={replenishAmount}
                  onChange={(e) => setReplenishAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source
                </label>
                <select
                  value={replenishSource}
                  onChange={(e) => setReplenishSource(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="platform_profit">Platform Profit</option>
                  <option value="institutional_injection">Institutional Investor</option>
                  <option value="external_capital">External Capital</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setReplenishModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReplenish}
                disabled={operationLoading || !replenishAmount}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {operationLoading ? 'Processing...' : 'Replenish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CapitalProtection;
