/**
 * Default Monitoring Panel Component
 * Displays loans on watchlist, in default, and in liquidation
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDefaultMonitoring, selectDefaultMonitoring, selectMonitoringLoading } from '../../store/slices/riskSlice';
import { WORKFLOW_STAGES, RISK_STATUS_CONFIG } from '../../services/riskService';

// Icons
const AlertIcon = () => <span className="text-red-500">⚠</span>;
const EyeIcon = () => <span className="text-yellow-500">👁</span>;
const ClockIcon = () => <span className="text-blue-500">⏱</span>;

const DefaultMonitoringPanel = ({ onLoanClick }) => {
  const dispatch = useDispatch();
  const monitoring = useSelector(selectDefaultMonitoring);
  const loading = useSelector(selectMonitoringLoading);
  
  useEffect(() => {
    dispatch(fetchDefaultMonitoring());
  }, [dispatch]);
  
  const getStatusColor = (status) => {
    const colors = {
      healthy: 'bg-green-100 text-green-800',
      watchlist: 'bg-yellow-100 text-yellow-800',
      high_risk: 'bg-orange-100 text-orange-800',
      default_imminent: 'bg-red-100 text-red-800',
      defaulted: 'bg-red-200 text-red-900'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };
  
  const getStageLabel = (stage) => {
    return WORKFLOW_STAGES[stage]?.label || stage;
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!monitoring || !monitoring.monitoring) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-gray-500">No monitoring data available</div>
      </div>
    );
  }
  
  const { watchlist_loans, high_risk_loans, active_workflows, watchlist_count, high_risk_count } = monitoring.monitoring;
  
  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Default Monitoring</h3>
          <button
            onClick={() => dispatch(fetchDefaultMonitoring())}
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="p-6 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{watchlist_count || 0}</div>
            <div className="text-sm text-gray-500">Watchlist</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{high_risk_count || 0}</div>
            <div className="text-sm text-gray-500">High Risk</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{active_workflows?.length || 0}</div>
            <div className="text-sm text-gray-500">Active Workflows</div>
          </div>
        </div>
      </div>
      
      {/* Watchlist Loans */}
      {watchlist_loans && watchlist_loans.length > 0 && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center mb-4">
            <EyeIcon />
            <h4 className="ml-2 font-medium text-gray-800">Watchlist Loans</h4>
          </div>
          <div className="space-y-3">
            {watchlist_loans.slice(0, 5).map((loan) => (
              <div 
                key={loan.loan_id}
                className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100"
                onClick={() => onLoanClick && onLoanClick(loan.loan_id)}
              >
                <div>
                  <div className="font-medium text-gray-800">Loan #{loan.loan_id}</div>
                  <div className="text-sm text-gray-500">
                    Default Probability: {loan.default_probability?.toFixed(1)}%
                  </div>
                </div>
                <div className="text-right">
                  {loan.days_past_due > 0 && (
                    <div className="text-sm text-red-600">
                      {loan.days_past_due} days overdue
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* High Risk Loans */}
      {high_risk_loans && high_risk_loans.length > 0 && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center mb-4">
            <AlertIcon />
            <h4 className="ml-2 font-medium text-gray-800">High Risk Loans</h4>
          </div>
          <div className="space-y-3">
            {high_risk_loans.slice(0, 5).map((loan) => (
              <div 
                key={loan.loan_id}
                className="flex items-center justify-between p-3 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100"
                onClick={() => onLoanClick && onLoanClick(loan.loan_id)}
              >
                <div>
                  <div className="font-medium text-gray-800">Loan #{loan.loan_id}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      loan.risk_status === 'default_imminent' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {RISK_STATUS_CONFIG[loan.risk_status]?.label || loan.risk_status}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-red-600">
                    {loan.default_probability?.toFixed(1)}% default probability
                  </div>
                  <div className={`text-xs ${
                    loan.risk_trend === 'deteriorating' ? 'text-red-500' :
                    loan.risk_trend === 'improving' ? 'text-green-500' :
                    'text-gray-500'
                  }`}>
                    Trend: {loan.risk_trend}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Active Workflows */}
      {active_workflows && active_workflows.length > 0 && (
        <div className="p-6">
          <div className="flex items-center mb-4">
            <ClockIcon />
            <h4 className="ml-2 font-medium text-gray-800">Active Default Workflows</h4>
          </div>
          <div className="space-y-3">
            {active_workflows.map((workflow) => (
              <div 
                key={workflow.loan_id}
                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100"
                onClick={() => onLoanClick && onLoanClick(workflow.loan_id)}
              >
                <div>
                  <div className="font-medium text-gray-800">Loan #{workflow.loan_id}</div>
                  <div className="text-sm text-gray-500">
                    Started: {formatDate(workflow.started_at)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    {getStageLabel(workflow.stage)}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">
                    Day {workflow.days_in_stage}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {(!watchlist_loans || watchlist_loans.length === 0) && 
       (!high_risk_loans || high_risk_loans.length === 0) && 
       (!active_workflows || active_workflows.length === 0) && (
        <div className="p-6 text-center">
          <div className="text-green-500 text-4xl mb-2">✓</div>
          <div className="text-gray-600">No loans require default monitoring</div>
          <div className="text-sm text-gray-400">All loans are performing well</div>
        </div>
      )}
    </div>
  );
};

export default DefaultMonitoringPanel;
