import React from 'react';
import { Flame, TrendingUp } from 'lucide-react';

/**
 * TrendingLoanBadge - Displays a badge for trending loans
 * Shown when a loan reaches 50% funding
 */
const TrendingLoanBadge = ({ fundingPercentage, className = '' }) => {
  const getBadgeText = () => {
    if (fundingPercentage >= 90) return 'ALMOST FUNDED';
    if (fundingPercentage >= 75) return 'HOT';
    if (fundingPercentage >= 50) return 'TRENDING';
    return null;
  };

  const getBadgeStyle = () => {
    if (fundingPercentage >= 90) {
      return 'bg-gradient-to-r from-amber-500 to-orange-500';
    }
    if (fundingPercentage >= 75) {
      return 'bg-gradient-to-r from-red-500 to-pink-500';
    }
    return 'bg-gradient-to-r from-orange-500 to-yellow-500';
  };

  const getIcon = () => {
    if (fundingPercentage >= 75) {
      return <Flame className="w-3 h-3" />;
    }
    return <TrendingUp className="w-3 h-3" />;
  };

  const badgeText = getBadgeText();

  if (!badgeText) return null;

  return (
    <div
      className={`
        inline-flex items-center gap-1 px-2 py-1 
        ${getBadgeStyle()} 
        text-white text-xs font-bold rounded-md 
        shadow-md animate-pulse
        ${className}
      `}
    >
      {getIcon()}
      <span>{badgeText}</span>
      {fundingPercentage >= 50 && (
        <span className="opacity-90 ml-1">
          {fundingPercentage >= 90 ? '🔥' : fundingPercentage >= 75 ? '⚡' : '🔥'}
        </span>
      )}
    </div>
  );
};

/**
 * FundingProgressBar - Enhanced progress bar with accelerator stages
 */
export const FundingProgressBar = ({ 
  fundedAmount, 
  totalAmount, 
  showLabel = true,
  size = 'md',
  animated = false,
  className = '' 
}) => {
  const percentage = totalAmount > 0 ? Math.min((fundedAmount / totalAmount) * 100, 100) : 0;
  
  const getProgressColor = () => {
    if (percentage >= 90) return 'bg-gradient-to-r from-green-400 to-emerald-500';
    if (percentage >= 75) return 'bg-gradient-to-r from-orange-500 to-red-500';
    if (percentage >= 50) return 'bg-gradient-to-r from-yellow-400 to-orange-500';
    return 'bg-blue-600';
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'h-1.5';
      case 'lg': return 'h-4';
      default: return 'h-2.5';
    }
  };

  const remaining = totalAmount - fundedAmount;

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">
            {percentage >= 90 ? 'Almost Funded!' : 'Funding Progress'}
          </span>
          <span className="text-sm font-bold text-gray-900">
            {percentage.toFixed(1)}%
          </span>
        </div>
      )}
      
      <div className={`w-full ${getSizeClasses()} bg-gray-200 rounded-full overflow-hidden`}>
        <div
          className={`
            ${getSizeClasses()} 
            ${getProgressColor()} 
            rounded-full 
            transition-all duration-500 ease-out
            ${animated ? 'animate-pulse' : ''}
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {showLabel && percentage < 100 && (
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>${fundedAmount.toLocaleString()} funded</span>
          <span>${remaining.toLocaleString()} remaining</span>
        </div>
      )}

      {percentage >= 90 && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
          <p className="text-xs text-green-700 font-medium">
            🎉 Only ${remaining.toLocaleString()} needed to fully fund this loan!
          </p>
        </div>
      )}
    </div>
  );
};

export default TrendingLoanBadge;
