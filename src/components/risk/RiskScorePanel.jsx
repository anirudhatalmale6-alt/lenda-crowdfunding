/**
 * Risk Score Panel Component
 * Displays borrower risk score and factors
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchBorrowerRiskScore, 
  calculateRiskScore,
  selectBorrowerRiskScore,
  selectBorrowerRiskLoading,
  selectBorrowerRiskError 
} from '../../store/slices/riskSlice';
import { RISK_CATEGORIES } from '../../services/riskService';

// Icons (using text-based for simplicity)
const CheckIcon = () => <span className="text-green-500">✓</span>;
const WarningIcon = () => <span className="text-yellow-500">⚠</span>;
const ErrorIcon = () => <span className="text-red-500">✕</span>;

const RiskScorePanel = ({ userId, showActions = true }) => {
  const dispatch = useDispatch();
  
  const riskScore = useSelector(selectBorrowerRiskScore);
  const loading = useSelector(selectBorrowerRiskLoading);
  const error = useSelector(selectBorrowerRiskError);
  
  useEffect(() => {
    if (userId) {
      dispatch(fetchBorrowerRiskScore(userId));
    }
  }, [dispatch, userId]);
  
  const handleRecalculate = () => {
    dispatch(calculateRiskScore());
  };
  
  const getCategoryConfig = (category) => {
    return RISK_CATEGORIES[category] || { label: 'Unknown', color: 'gray' };
  };
  
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 65) return 'text-green-500';
    if (score >= 50) return 'text-blue-500';
    if (score >= 35) return 'text-yellow-500';
    if (score >= 20) return 'text-orange-500';
    return 'text-red-500';
  };
  
  const getProgressBarColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 65) return 'bg-green-400';
    if (score >= 50) return 'bg-blue-500';
    if (score >= 35) return 'bg-yellow-500';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-2 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }
  
  if (error && !riskScore) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-500 mb-4">
          Unable to load risk score. Please try again.
        </div>
        {showActions && (
          <button
            onClick={() => userId && dispatch(fetchBorrowerRiskScore(userId))}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        )}
      </div>
    );
  }
  
  if (!riskScore) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-gray-500 mb-4">
          No risk score available. Calculate your risk score now.
        </div>
        {showActions && (
          <button
            onClick={handleRecalculate}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Calculate Risk Score
          </button>
        )}
      </div>
    );
  }
  
  const categoryConfig = getCategoryConfig(riskScore.risk_category);
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Risk Score</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          categoryConfig.color === 'green' ? 'bg-green-100 text-green-800' :
          categoryConfig.color === 'blue' ? 'bg-blue-100 text-blue-800' :
          categoryConfig.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
          categoryConfig.color === 'orange' ? 'bg-orange-100 text-orange-800' :
          'bg-red-100 text-red-800'
        }`}>
          {categoryConfig.label}
        </span>
      </div>
      
      {/* Score Display */}
      <div className="mb-6">
        <div className={`text-5xl font-bold ${getScoreColor(riskScore.risk_score)}`}>
          {riskScore.risk_score}
          <span className="text-lg text-gray-400 font-normal">/100</span>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getProgressBarColor(riskScore.risk_score)} transition-all duration-500`}
            style={{ width: `${riskScore.risk_score}%` }}
          ></div>
        </div>
      </div>
      
      {/* Factor Breakdown */}
      {riskScore.factors && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-600 mb-3">Score Breakdown</h4>
          <div className="space-y-2">
            {Object.entries(riskScore.factors).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">
                  {key.replace('_', ' ')}
                </span>
                <div className="flex items-center">
                  <div className="w-24 h-2 bg-gray-200 rounded-full mr-2 overflow-hidden">
                    <div 
                      className={`h-full ${getProgressBarColor(value)}`}
                      style={{ width: `${value}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-8">{Math.round(value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Positive Factors */}
      {riskScore.positive_factors && riskScore.positive_factors.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-green-700 mb-2">Positive Factors</h4>
          <ul className="space-y-1">
            {riskScore.positive_factors.map((factor, index) => (
              <li key={index} className="flex items-center text-sm text-gray-600">
                <CheckIcon />
                <span className="ml-2">{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Risk Factors */}
      {riskScore.risk_factors && riskScore.risk_factors.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-yellow-700 mb-2">Risk Factors</h4>
          <ul className="space-y-1">
            {riskScore.risk_factors.map((factor, index) => (
              <li key={index} className="flex items-center text-sm text-gray-600">
                <WarningIcon />
                <span className="ml-2">{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Actions */}
      {showActions && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={handleRecalculate}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            {loading ? 'Calculating...' : 'Recalculate Score'}
          </button>
        </div>
      )}
      
      {/* Last Updated */}
      {riskScore.last_updated && (
        <div className="mt-4 text-xs text-gray-400">
          Last updated: {new Date(riskScore.last_updated).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

export default RiskScorePanel;
