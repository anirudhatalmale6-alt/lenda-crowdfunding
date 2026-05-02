/**
 * Loan Reputation Indicator Component
 * Displays borrower reputation on loan marketplace cards
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCreditScore, fetchReputationSignals, selectCreditScore, selectCreditScoreLoading, selectSignals, selectSignalsLoading } from '../../store/slices/creditReputationSlice';
import { CREDIT_SCORE_RANGES, SIGNAL_TYPES } from '../../services/creditReputationService';
import { CompactReputationBadges } from './ReputationBadges';

// Icons
const CheckCircleIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const WarningIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const InfoIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
  </svg>
);

const getScoreColor = (score) => {
  if (score >= 800) return 'text-emerald-600';
  if (score >= 720) return 'text-green-600';
  if (score >= 650) return 'text-blue-600';
  if (score >= 580) return 'text-yellow-600';
  if (score >= 500) return 'text-orange-600';
  return 'text-red-600';
};

const getScoreBgColor = (score) => {
  if (score >= 800) return 'bg-emerald-50';
  if (score >= 720) return 'bg-green-50';
  if (score >= 650) return 'bg-blue-50';
  if (score >= 580) return 'bg-yellow-50';
  if (score >= 500) return 'bg-orange-50';
  return 'bg-red-50';
};

const LoanReputationIndicator = ({ borrowerId, loanId, showFullDetails = false }) => {
  const dispatch = useDispatch();
  
  const creditScore = useSelector(selectCreditScore);
  const scoreLoading = useSelector(selectCreditScoreLoading);
  const signals = useSelector(selectSignals);
  const signalsLoading = useSelector(selectSignalsLoading);
  
  useEffect(() => {
    if (borrowerId) {
      dispatch(fetchCreditScore(borrowerId));
      if (loanId) {
        dispatch(fetchReputationSignals({ borrowerId, loanId }));
      }
    }
  }, [dispatch, borrowerId, loanId]);
  
  if (scoreLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-24"></div>
      </div>
    );
  }
  
  if (!creditScore) {
    return (
      <div className="text-sm text-gray-500">
        No reputation data
      </div>
    );
  }
  
  const { credit_score, credit_category, statistics } = creditScore;
  const categoryConfig = CREDIT_SCORE_RANGES[credit_category];
  const repaymentRate = statistics?.repayment_rate || 0;
  
  // Get the primary signal for this loan
  const primarySignal = signals && signals.length > 0 ? signals[0] : null;
  
  // Compact display for loan cards
  if (!showFullDetails) {
    return (
      <div className="flex items-center gap-3">
        {/* Score Badge */}
        <div className={`flex items-center px-2 py-1 rounded ${getScoreBgColor(credit_score)}`}>
          <span className={`text-sm font-bold ${getScoreColor(credit_score)}`}>
            {credit_score}
          </span>
        </div>
        
        {/* Repayment Rate */}
        <div className="flex items-center text-sm text-gray-600">
          <CheckCircleIcon />
          <span className="ml-1">{repaymentRate.toFixed(0)}%</span>
        </div>
        
        {/* Completed Loans */}
        <div className="flex items-center text-sm text-gray-600">
          <span>{statistics?.successful_loans || 0} loans</span>
        </div>
      </div>
    );
  }
  
  // Full display for loan detail pages
  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      {/* Score Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">Borrower Credit Score</div>
          <div className={`text-3xl font-bold ${getScoreColor(credit_score)}`}>
            {credit_score}
          </div>
          <div className="text-sm text-gray-600">
            {categoryConfig?.label}
          </div>
        </div>
        
        {primarySignal && (
          <div className={`px-3 py-2 rounded-lg text-sm ${
            primarySignal.strength === 'strong' ? 'bg-green-100 text-green-800' :
            primarySignal.strength === 'moderate' ? 'bg-blue-100 text-blue-800' :
            'bg-red-100 text-red-800'
          }`}>
            <div className="font-medium capitalize">{primarySignal.type.replace(/_/g, ' ')}</div>
          </div>
        )}
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded p-2">
          <div className="text-lg font-semibold text-gray-800">{repaymentRate.toFixed(0)}%</div>
          <div className="text-xs text-gray-500">Repayment</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-lg font-semibold text-gray-800">{statistics?.successful_loans || 0}</div>
          <div className="text-xs text-gray-500">Completed</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-lg font-semibold text-gray-800">{statistics?.defaulted_loans || 0}</div>
          <div className="text-xs text-gray-500">Defaulted</div>
        </div>
      </div>
      
      {/* Investment Signal */}
      {primarySignal && (
        <div className={`p-3 rounded-lg border ${
          primarySignal.strength === 'strong' ? 'border-green-200 bg-green-50' :
          primarySignal.strength === 'moderate' ? 'border-blue-200 bg-blue-50' :
          'border-red-200 bg-red-50'
        }`}>
          <div className="flex items-start gap-2">
            {primarySignal.strength === 'strong' ? (
              <CheckCircleIcon />
            ) : primarySignal.strength === 'moderate' ? (
              <InfoIcon />
            ) : (
              <WarningIcon />
            )}
            <div>
              <div className="text-sm font-medium">
                {primarySignal.message}
              </div>
              {primarySignal.recommendation && (
                <div className="text-xs text-gray-600 mt-1">
                  {primarySignal.recommendation}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Risk Indicator */}
      {credit_category === 'high_risk' || credit_category === 'weak' ? (
        <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-2 rounded">
          <WarningIcon />
          <span>Higher risk borrower - verify collateral before investing</span>
        </div>
      ) : credit_category === 'elite' || credit_category === 'excellent' ? (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
          <CheckCircleIcon />
          <span>Excellent track record - reliable borrower</span>
        </div>
      ) : null}
    </div>
  );
};

export default LoanReputationIndicator;
