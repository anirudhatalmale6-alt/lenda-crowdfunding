/**
 * Risk Monitoring Dashboard
 * Main admin dashboard for risk management
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRiskDashboard, selectRiskDashboard, selectDashboardLoading } from '../../store/slices/riskSlice';

const RiskMonitoring = () => {
  const dispatch = useDispatch();
  const dashboard = useSelector(selectRiskDashboard);
  const loading = useSelector(selectDashboardLoading);
  
  useEffect(() => {
    dispatch(fetchRiskDashboard());
  }, [dispatch]);
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };
  
  const getCoverageColor = (ratio) => {
    if (ratio >= 300) return 'text-green-600';
    if (ratio >= 200) return 'text-yellow-600';
    if (ratio >= 100) return 'text-orange-600';
    return 'text-red-600';
  };
  
  const getDefaultRateColor = (rate) => {
    if (rate <= 3) return 'text-green-600';
    if (rate <= 7) return 'text-yellow-600';
    if (rate <= 10) return 'text-orange-600';
    return 'text-red-600';
  };
  
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!dashboard || !dashboard.dashboard) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Loading risk dashboard...</div>
      </div>
    );
  }
  
  const data = dashboard.dashboard;
  const alerts = dashboard.alerts || [];
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Risk Monitoring Dashboard</h1>
        <button
          onClick={() => dispatch(fetchRiskDashboard())}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh Data
        </button>
      </div>
      
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <div 
              key={index}
              className={`p-4 rounded-lg border ${
                alert.type === 'critical' ? 'bg-red-50 border-red-200' :
                alert.type === 'error' ? 'bg-red-50 border-red-200' :
                alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-center">
                <span className={`mr-2 ${
                  alert.type === 'critical' || alert.type === 'error' ? 'text-red-500' :
                  alert.type === 'warning' ? 'text-yellow-500' :
                  'text-blue-500'
                }`}>
                  {alert.type === 'critical' || alert.type === 'error' ? '⚠' : 'ℹ'}
                </span>
                <span className={`font-medium ${
                  alert.type === 'critical' || alert.type === 'error' ? 'text-red-800' :
                  alert.type === 'warning' ? 'text-yellow-800' :
                  'text-blue-800'
                }`}>
                  {alert.title}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600 ml-6">{alert.message}</p>
            </div>
          ))}
        </div>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Loans */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Total Active Loans</div>
          <div className="text-3xl font-bold text-gray-800">{data.total_active_loans || 0}</div>
          <div className="text-sm text-gray-500 mt-1">
            {formatCurrency(data.total_active_loans_value)}
          </div>
        </div>
        
        {/* Default Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Default Rate</div>
          <div className={`text-3xl font-bold ${getDefaultRateColor(data.total_default_rate)}`}>
            {data.total_default_rate?.toFixed(2) || 0}%
          </div>
          <div className="text-sm text-gray-500 mt-1">of all loans</div>
        </div>
        
        {/* Reserve Coverage */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Reserve Coverage Ratio</div>
          <div className={`text-3xl font-bold ${getCoverageColor(data.reserve_coverage_ratio)}`}>
            {data.reserve_coverage_ratio?.toFixed(1) || 0}%
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Balance: {formatCurrency(data.reserve_balance)}
          </div>
        </div>
        
        {/* Average Risk Score */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Average Risk Score</div>
          <div className="text-3xl font-bold text-gray-800">
            {data.average_risk_score?.toFixed(0) || 0}
            <span className="text-lg text-gray-400">/100</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">across all active loans</div>
        </div>
      </div>
      
      {/* Loan Health Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loan Status Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Loan Health Distribution</h3>
          <div className="space-y-4">
            {/* Healthy */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Healthy</span>
                <span className="font-medium text-green-600">{data.healthy_loans || 0} loans</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500"
                  style={{ width: `${data.total_active_loans ? (data.healthy_loans / data.total_active_loans) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            
            {/* Watchlist */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Watchlist</span>
                <span className="font-medium text-yellow-600">{data.watchlist_loans || 0} loans</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500"
                  style={{ width: `${data.total_active_loans ? (data.watchlist_loans / data.total_active_loans) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            
            {/* High Risk */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">High Risk</span>
                <span className="font-medium text-red-600">{data.high_risk_loans || 0} loans</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500"
                  style={{ width: `${data.total_active_loans ? (data.high_risk_loans / data.total_active_loans) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Risk Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Risk Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Total Loans at Risk</span>
              <span className="font-bold text-gray-800">{formatCurrency(data.total_loans_at_risk)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Reserve Fund Balance</span>
              <span className="font-bold text-gray-800">{formatCurrency(data.reserve_balance)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Active Loans Value</span>
              <span className="font-bold text-gray-800">{formatCurrency(data.total_active_loans_value)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Coverage Ratio</span>
              <span className={`font-bold ${getCoverageColor(data.reserve_coverage_ratio)}`}>
                {data.reserve_coverage_ratio?.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Liquidation Threshold Warning */}
      {data.reserve_coverage_ratio < 200 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">⚠</span>
            <span className="font-medium text-red-800">
              Liquidation Threshold Warning
            </span>
          </div>
          <p className="mt-2 text-sm text-red-700">
            Reserve coverage is below 200% of next payment obligations. 
            The system should initiate liquidation procedures for high-risk loans 
            to protect the platform reserves.
          </p>
        </div>
      )}
    </div>
  );
};

export default RiskMonitoring;
