/**
 * Loan Risk Status Component
 * Displays loan risk status for investors
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLoanRiskStatus, selectLoanRiskStatus, selectLoanRiskLoading } from '../../store/slices/riskSlice';
import { RISK_STATUS_CONFIG } from '../../services/riskService';

// Icons
const TrendUpIcon = () => <span className="text-green-500">↑</span>;
const TrendDownIcon = () => <span className="text-red-500">↓</span>;
const TrendStableIcon = () => <span className="text-gray-400">→</span>;

const LoanRiskStatus = ({ loanId, showDetails = true }) => {
  const dispatch = useDispatch();
  const riskStatus = useSelector((state) => selectLoanRiskStatus(state, loanId));
  const loading = useSelector(selectLoanRiskLoading);
  
  useEffect(() => {
    if (loanId) {
      dispatch(fetchLoanRiskStatus(loanId));
    }
  }, [dispatch, loanId]);
  
  const getStatusConfig = (status) => {
    return RISK_STATUS_CONFIG[status] || { 
      label: 'Unknown', 
      color: 'gray',
      icon: 'help-circle'
    };
  };
  
  const getStatusColor = (color) => {
    const colors = {
      green: 'bg-green-100 text-green-800 border-green-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      gray: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[color] || colors.gray;
  };
  
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving':
        return <TrendUpIcon />;
      case 'deteriorating':
        return <TrendDownIcon />;
      default:
        return <TrendStableIcon />;
    }
  };
  
  const getTrendText = (trend) => {
    switch (trend) {
      case 'improving':
        return 'Improving';
      case 'deteriorating':
        return 'Deteriorating';
      default:
        return 'Stable';
    }
  };
  
  const getTrendColor = (trend) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600';
      case 'deteriorating':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }
  
  if (!riskStatus || !riskStatus.risk_status) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-gray-500 text-sm">Risk analysis pending...</div>
      </div>
    );
  }
  
  const statusConfig = getStatusConfig(riskStatus.risk_status);
  const defaultProbability = riskStatus.default_probability || 0;
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-700">Loan Risk Status</h4>
        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(statusConfig.color)}`}>
          {statusConfig.label}
        </span>
      </div>
      
      {/* Risk Score Display */}
      <div className="mb-4">
        <div className="text-sm text-gray-500 mb-1">Risk Score</div>
        <div className="flex items-end">
          <span className={`text-3xl font-bold ${
            riskStatus.risk_score >= 70 ? 'text-green-600' :
            riskStatus.risk_score >= 50 ? 'text-yellow-600' :
            riskStatus.risk_score >= 30 ? 'text-orange-600' :
            'text-red-600'
          }`}>
            {riskStatus.risk_score?.toFixed(0) || 'N/A'}
          </span>
          <span className="text-gray-400 text-lg mb-1">/100</span>
        </div>
      </div>
      
      {/* Risk Trend */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">Risk Trend</div>
            <div className={`font-medium ${getTrendColor(riskStatus.risk_trend)}`}>
              {getTrendText(riskStatus.risk_trend)}
            </div>
          </div>
          <div className="text-2xl">
            {getTrendIcon(riskStatus.risk_trend)}
          </div>
        </div>
      </div>
      
      {/* Default Probability */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-500">Default Probability</span>
          <span className={`font-medium ${
            defaultProbability >= 50 ? 'text-red-600' :
            defaultProbability >= 30 ? 'text-yellow-600' :
            'text-green-600'
          }`}>
            {defaultProbability.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              defaultProbability >= 50 ? 'bg-red-500' :
              defaultProbability >= 30 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${defaultProbability}%` }}
          ></div>
        </div>
      </div>
      
      {/* Additional Details */}
      {showDetails && (
        <div className="space-y-2 text-sm border-t pt-3 border-gray-100">
          {riskStatus.missed_payments > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Missed Payments</span>
              <span className="font-medium text-red-600">{riskStatus.missed_payments}</span>
            </div>
          )}
          
          {riskStatus.days_past_due > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Days Past Due</span>
              <span className="font-medium text-yellow-600">{riskStatus.days_past_due}</span>
            </div>
          )}
          
          {riskStatus.ltv_ratio && (
            <div className="flex justify-between">
              <span className="text-gray-500">LTV Ratio</span>
              <span className="font-medium">{riskStatus.ltv_ratio.toFixed(1)}%</span>
            </div>
          )}
          
          {riskStatus.debt_to_income_ratio && (
            <div className="flex justify-between">
              <span className="text-gray-500">Debt-to-Income</span>
              <span className={`font-medium ${
                riskStatus.debt_to_income_ratio > 40 ? 'text-red-600' :
                riskStatus.debt_to_income_ratio > 30 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {riskStatus.debt_to_income_ratio.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* Risk Factors */}
      {riskStatus.risk_factors && riskStatus.risk_factors.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500 mb-2">Risk Factors</div>
          <div className="flex flex-wrap gap-1">
            {riskStatus.risk_factors.map((factor, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded"
              >
                {factor}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Last Analysis */}
      {riskStatus.last_analysis && (
        <div className="mt-3 text-xs text-gray-400">
          Last analyzed: {new Date(riskStatus.last_analysis).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default LoanRiskStatus;
