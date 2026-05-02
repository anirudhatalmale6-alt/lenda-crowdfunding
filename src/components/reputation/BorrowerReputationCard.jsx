/**
 * Borrower Reputation Card Component
 * Displays borrower credit score and reputation details
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCreditScore, fetchBorrowerBadges, selectCreditScore, selectCreditScoreLoading, selectBadges, selectBadgesLoading } from '../../store/slices/creditReputationSlice';
import { CREDIT_SCORE_RANGES, BADGE_TYPES } from '../../services/creditReputationService';

// Icon components
const StarIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const BadgeIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const getCategoryColor = (category) => {
  const config = CREDIT_SCORE_RANGES[category];
  return config?.color || 'gray';
};

const getColorClass = (color, isBg = false) => {
  const colorMap = {
    emerald: isBg ? 'bg-emerald-100' : 'text-emerald-600',
    green: isBg ? 'bg-green-100' : 'text-green-600',
    blue: isBg ? 'bg-blue-100' : 'text-blue-600',
    yellow: isBg ? 'bg-yellow-100' : 'text-yellow-600',
    orange: isBg ? 'bg-orange-100' : 'text-orange-600',
    red: isBg ? 'bg-red-100' : 'text-red-600',
    gray: isBg ? 'bg-gray-100' : 'text-gray-600'
  };
  return colorMap[color] || colorMap.gray;
};

const getScoreColor = (score) => {
  if (score >= 800) return 'text-emerald-600';
  if (score >= 720) return 'text-green-600';
  if (score >= 650) return 'text-blue-600';
  if (score >= 580) return 'text-yellow-600';
  if (score >= 500) return 'text-orange-600';
  return 'text-red-600';
};

const getScoreBarColor = (score) => {
  if (score >= 800) return 'bg-emerald-500';
  if (score >= 720) return 'bg-green-500';
  if (score >= 650) return 'bg-blue-500';
  if (score >= 580) return 'bg-yellow-500';
  if (score >= 500) return 'bg-orange-500';
  return 'bg-red-500';
};

const BorrowerReputationCard = ({ borrowerId, showDetails = true, compact = false }) => {
  const dispatch = useDispatch();
  
  const creditScore = useSelector(selectCreditScore);
  const loading = useSelector(selectCreditScoreLoading);
  const badges = useSelector(selectBadges);
  const badgesLoading = useSelector(selectBadgesLoading);
  
  useEffect(() => {
    if (borrowerId) {
      dispatch(fetchCreditScore(borrowerId));
      dispatch(fetchBorrowerBadges(borrowerId));
    }
  }, [dispatch, borrowerId]);
  
  const handleRecalculate = () => {
    dispatch(fetchCreditScore(borrowerId));
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-12 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-2 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }
  
  if (!creditScore) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-gray-500 mb-4">
          No credit reputation data available.
        </div>
        <button
          onClick={handleRecalculate}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Load Reputation Data
        </button>
      </div>
    );
  }
  
  const { credit_score, credit_category, factors, statistics } = creditScore;
  const categoryColor = getCategoryColor(credit_category);
  const categoryConfig = CREDIT_SCORE_RANGES[credit_category];
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Credit Reputation</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getColorClass(categoryColor, true)} ${getColorClass(categoryColor)}`}>
          {categoryConfig?.label || credit_category}
        </span>
      </div>
      
      {/* Score Display */}
      <div className="mb-6">
        <div className={`text-5xl font-bold ${getScoreColor(credit_score)}`}>
          {credit_score}
          <span className="text-lg text-gray-400 font-normal">/900</span>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getScoreBarColor(credit_score)} transition-all duration-500`}
            style={{ width: `${((credit_score - 300) / 600) * 100}%` }}
          ></div>
        </div>
      </div>
      
      {/* Statistics */}
      {!compact && statistics && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 uppercase">Loans Completed</div>
            <div className="text-xl font-semibold text-gray-800">{statistics.successful_loans}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 uppercase">Default History</div>
            <div className="text-xl font-semibold text-gray-800">{statistics.defaulted_loans}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 uppercase">Total Loans</div>
            <div className="text-xl font-semibold text-gray-800">{statistics.total_loans}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 uppercase">Repayment Rate</div>
            <div className="text-xl font-semibold text-gray-800">{statistics.repayment_rate}%</div>
          </div>
        </div>
      )}
      
      {/* Factor Breakdown */}
      {showDetails && factors && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-600 mb-3">Score Factors</h4>
          <div className="space-y-2">
            {Object.entries(factors).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">
                  {key.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center">
                  <div className="w-24 h-2 bg-gray-200 rounded-full mr-2 overflow-hidden">
                    <div 
                      className={`h-full ${getScoreBarColor(value)}`}
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
      
      {/* Badges */}
      {badges && badges.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-600 mb-3">Reputation Badges</h4>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge, index) => (
              <div 
                key={index}
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${getColorClass(BADGE_TYPES[badge.type]?.color || 'gray', true)}`}
                title={badge.description}
              >
                <BadgeIcon />
                <span className="ml-1">{badge.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Last Updated */}
      {creditScore.last_calculated && (
        <div className="text-xs text-gray-400 mt-4 pt-4 border-t">
          Last updated: {new Date(creditScore.last_calculated).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

export default BorrowerReputationCard;
