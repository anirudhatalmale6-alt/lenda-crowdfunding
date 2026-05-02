/**
 * Trust Badge Component
 * Displays borrower reputation scores and loan risk ratings (AAA-CCC)
 * Addresses Gap: TRUST-002 (Borrower Reputation Score), TRUST-003 (Loan Risk Indicators)
 */

import React from 'react';
import { Shield, Award, CheckCircle, Star, TrendingUp } from 'lucide-react';

/**
 * Risk Rating Configuration
 * Standard credit ratings from AAA (lowest risk) to CCC (highest risk)
 */
export const RISK_RATINGS = {
  'AAA': { 
    label: 'AAA', 
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    bg: 'bg-emerald-500',
    description: 'Exceptional',
    riskLevel: 'Very Low'
  },
  'AA': { 
    label: 'AA', 
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    bg: 'bg-emerald-400',
    description: 'Excellent',
    riskLevel: 'Very Low'
  },
  'A': { 
    label: 'A', 
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    bg: 'bg-blue-500',
    description: 'Very Good',
    riskLevel: 'Low'
  },
  'BBB': { 
    label: 'BBB', 
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    bg: 'bg-blue-400',
    description: 'Good',
    riskLevel: 'Low-Medium'
  },
  'BB': { 
    label: 'BB', 
    color: 'bg-amber-50 text-amber-600 border-amber-200',
    bg: 'bg-amber-500',
    description: 'Fair',
    riskLevel: 'Medium'
  },
  'B': { 
    label: 'B', 
    color: 'bg-amber-50 text-amber-600 border-amber-200',
    bg: 'bg-amber-400',
    description: 'Marginal',
    riskLevel: 'Medium'
  },
  'CCC': { 
    label: 'CCC', 
    color: 'bg-red-50 text-red-600 border-red-200',
    bg: 'bg-red-500',
    description: 'Weak',
    riskLevel: 'High'
  },
  'CC': { 
    label: 'CC', 
    color: 'bg-red-50 text-red-600 border-red-200',
    bg: 'bg-red-400',
    description: 'Very Weak',
    riskLevel: 'Very High'
  },
  'C': { 
    label: 'C', 
    color: 'bg-red-100 text-red-700 border-red-200',
    bg: 'bg-red-300',
    description: 'Poor',
    riskLevel: 'Very High'
  }
};

/**
 * Reputation Score Thresholds
 */
export const REPUTATION_LEVELS = {
  excellent: { min: 90, color: 'text-emerald-600 bg-emerald-50', label: 'Excellent' },
  good: { min: 75, color: 'text-blue-600 bg-blue-50', label: 'Good' },
  fair: { min: 60, color: 'text-amber-600 bg-amber-50', label: 'Fair' },
  poor: { min: 0, color: 'text-red-600 bg-red-50', label: 'Poor' }
};

/**
 * RiskBadge Component
 * Displays credit risk rating (AAA-CCC) for loans
 * 
 * @param {string} rating - Risk rating (AAA, AA, A, BBB, BB, B, CCC, CC, C)
 * @param {boolean} showLabel - Show the risk level label
 * @param {boolean} compact - Compact badge mode
 * @param {string} size - Size: 'sm', 'md', 'lg'
 */
export const RiskBadge = ({ 
  rating = 'BBB', 
  showLabel = false, 
  compact = false,
  size = 'md' 
}) => {
  const config = RISK_RATINGS[rating.toUpperCase()] || RISK_RATINGS['BBB'];
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };
  
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };
  
  return (
    <div className="inline-flex flex-col">
      <span className={`inline-flex items-center gap-1 font-semibold rounded-full border ${config.color} ${sizeClasses[size]}`}>
        <Shield className={iconSizes[size]} />
        {rating}
      </span>
      {showLabel && (
        <span className={`text-xs mt-1 ${config.color.split(' ')[1]}`}>
          {config.description}
        </span>
      )}
    </div>
  );
};

/**
 * ReputationBadge Component
 * Displays borrower reputation score
 * 
 * @param {number} score - Reputation score (0-100)
 * @param {boolean} showScore - Show the numeric score
 * @param {boolean} compact - Compact badge mode
 */
export const ReputationBadge = ({ 
  score = 75, 
  showScore = true,
  compact = false 
}) => {
  const getReputationLevel = (score) => {
    if (score >= 90) return REPUTATION_LEVELS.excellent;
    if (score >= 75) return REPUTATION_LEVELS.good;
    if (score >= 60) return REPUTATION_LEVELS.fair;
    return REPUTATION_LEVELS.poor;
  };
  
  const level = getReputationLevel(score);
  
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${level.color}`}>
        <Star className="w-3 h-3" />
        <span className="text-xs font-semibold">{score}</span>
      </div>
    );
  }
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${level.color}`}>
      <Award className="w-4 h-4" />
      {showScore && (
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold">{score}</span>
          <span className="text-xs opacity-75">/100</span>
        </div>
      )}
      <span className="text-sm font-medium">{level.label}</span>
    </div>
  );
};

/**
 * TrustBadge Component
 * Combined badge showing both reputation and risk rating
 * 
 * @param {Object} props
 * @param {number} props.reputationScore - Borrower reputation score (0-100)
 * @param {string} props.riskRating - Loan risk rating (AAA-CCC)
 * @param {string} props.size - Size: 'sm', 'md', 'lg'
 * @param {boolean} props.compact - Compact mode
 */
const TrustBadge = ({ 
  reputationScore = 75, 
  riskRating = 'BBB',
  size = 'md',
  compact = false 
}) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <ReputationBadge score={reputationScore} showScore={false} compact />
        <RiskBadge rating={riskRating} compact size="sm" />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-600">Borrower Reputation</span>
        <ReputationBadge score={reputationScore} showScore />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-600">Risk Rating</span>
        <RiskBadge rating={riskRating} showLabel size={size === 'sm' ? 'sm' : 'md'} />
      </div>
    </div>
  );
};

/**
 * TrustScoreIndicator Component
 * Shows detailed trust metrics with visual indicators
 * 
 * @param {Object} props
 * @param {number} props.reputationScore - Borrower reputation score
 * @param {string} props.riskRating - Loan risk rating
 * @param {number} props.successRate - Borrower success/repayment rate
 * @param {number} props.completedLoans - Number of completed loans
 */
export const TrustScoreIndicator = ({
  reputationScore = 75,
  riskRating = 'BBB',
  successRate = 95,
  completedLoans = 10
}) => {
  const config = RISK_RATINGS[riskRating.toUpperCase()] || RISK_RATINGS['BBB'];
  
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-emerald-500" />
        Trust Score
      </h4>
      
      <div className="space-y-3">
        {/* Reputation Score */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">Reputation Score</span>
            <span className="font-semibold">{reputationScore}/100</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
              style={{ width: `${reputationScore}%` }}
            />
          </div>
        </div>
        
        {/* Risk Rating */}
        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
          <span className="text-sm text-slate-600">Credit Risk</span>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${config.color}`}>
              {riskRating}
            </span>
            <span className="text-xs text-slate-500">{config.riskLevel}</span>
          </div>
        </div>
        
        {/* Success Rate */}
        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
          <span className="text-sm text-slate-600 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Repayment Rate
          </span>
          <span className="text-sm font-semibold text-emerald-600">{successRate}%</span>
        </div>
        
        {/* Completed Loans */}
        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
          <span className="text-sm text-slate-600">Completed Loans</span>
          <span className="text-sm font-semibold">{completedLoans}</span>
        </div>
      </div>
    </div>
  );
};

export default TrustBadge;
