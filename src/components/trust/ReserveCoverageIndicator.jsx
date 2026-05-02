/**
 * Reserve Coverage Indicator Component
 * Displays reserve fund coverage ratio for investor confidence
 * Addresses Gap: TRUST-001 (Reserve Coverage Indicator)
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchReserveFundData, 
  selectReserveFundData,
  selectReserveFundLoading 
} from '../../store/slices/reserveFundSlice';
import { Shield, AlertTriangle, CheckCircle, TrendingUp, DollarSign, Activity } from 'lucide-react';

/**
 * Coverage Level Configuration
 */
const COVERAGE_LEVELS = {
  excellent: { 
    min: 25, 
    color: 'text-emerald-600', 
    bg: 'bg-emerald-50', 
    border: 'border-emerald-200',
    label: 'Excellent',
    icon: CheckCircle
  },
  good: { 
    min: 15, 
    color: 'text-blue-600', 
    bg: 'bg-blue-50', 
    border: 'border-blue-200',
    label: 'Good',
    icon: Shield
  },
  fair: { 
    min: 10, 
    color: 'text-amber-600', 
    bg: 'bg-amber-50', 
    border: 'border-amber-200',
    label: 'Fair',
    icon: Activity
  },
  poor: { 
    min: 0, 
    color: 'text-red-600', 
    bg: 'bg-red-50', 
    border: 'border-red-200',
    label: 'Needs Attention',
    icon: AlertTriangle
  }
};

/**
 * Format currency for display
 */
const formatCurrency = (value) => {
  if (value >= 1000000) {
    return `₦${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `₦${(value / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * ReserveCoverageIndicator Component
 * Shows the reserve fund coverage ratio with visual indicators
 * 
 * @param {boolean} compact - Show compact version
 * @param {boolean} showDetails - Show detailed breakdown
 * @param {number} customRatio - Custom coverage ratio (optional)
 * @param {number} customReserve - Custom reserve amount (optional)
 * @param {number} customTarget - Custom target ratio (optional)
 */
const ReserveCoverageIndicator = ({ 
  compact = false, 
  showDetails = false,
  customRatio,
  customReserve,
  customTarget
}) => {
  const dispatch = useDispatch();
  const reserveData = useSelector(selectReserveFundData);
  const loading = useSelector(selectReserveFundLoading);
  
  useEffect(() => {
    dispatch(fetchReserveFundData());
  }, [dispatch]);
  
  // Use custom values or from store
  const coverageRatio = customRatio ?? reserveData.currentRatio ?? 0;
  const totalReserve = customReserve ?? reserveData.totalReserve ?? 0;
  const targetRatio = customTarget ?? reserveData.targetRatio ?? 20;
  
  // Calculate coverage level
  const getCoverageLevel = (ratio) => {
    if (ratio >= 25) return COVERAGE_LEVELS.excellent;
    if (ratio >= 15) return COVERAGE_LEVELS.good;
    if (ratio >= 10) return COVERAGE_LEVELS.fair;
    return COVERAGE_LEVELS.poor;
  };
  
  const level = getCoverageLevel(coverageRatio);
  const IconComponent = level.icon;
  
  // Calculate progress towards target
  const progressToTarget = Math.min(100, (coverageRatio / targetRatio) * 100);
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
        <div className="h-8 bg-slate-200 rounded w-1/2"></div>
      </div>
    );
  }
  
  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${level.bg} border ${level.border}`}>
        <IconComponent className={`w-4 h-4 ${level.color}`} />
        <span className={`text-sm font-semibold ${level.color}`}>
          {coverageRatio.toFixed(1)}% Coverage
        </span>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 ${level.bg} border-b ${level.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconComponent className={`w-5 h-5 ${level.color}`} />
            <span className={`font-semibold ${level.color}`}>
              Reserve Coverage
            </span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${level.bg} ${level.color} border ${level.border}`}>
            {level.label}
          </span>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="p-4">
        {/* Coverage Ratio Display */}
        <div className="text-center mb-4">
          <div className="relative inline-flex items-center justify-center">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-slate-100"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className={`${level.color.replace('text-', 'text-')}`}
                style={{ 
                  strokeDasharray: `${(coverageRatio / 40) * 352} 352`,
                  transition: 'stroke-dasharray 0.5s ease'
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${level.color}`}>
                {coverageRatio.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-500">Coverage Ratio</span>
            </div>
          </div>
        </div>
        
        {/* Progress to Target */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">Progress to Target ({targetRatio}%)</span>
            <span className="font-medium text-slate-800">{progressToTarget.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${level.color.replace('text-', 'bg-')}`}
              style={{ width: `${progressToTarget}%` }}
            />
          </div>
        </div>
        
        {/* Details Section */}
        {showDetails && (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-600">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Total Reserve</span>
              </div>
              <span className="font-semibold text-slate-800">
                {formatCurrency(totalReserve)}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-600">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Target Ratio</span>
              </div>
              <span className="font-semibold text-slate-800">
                {targetRatio}%
              </span>
            </div>
            
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-600">
                <Shield className="w-4 h-4" />
                <span className="text-sm">Investor Protection</span>
              </div>
              <span className="font-semibold text-emerald-600">
                Active
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer Note */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
        <p className="text-xs text-slate-500">
          The reserve fund provides protection against borrower defaults. 
          A higher coverage ratio means more investor security.
        </p>
      </div>
    </div>
  );
};

/**
 * MiniReserveCoverage Component
 * Compact inline version for dashboard cards
 * 
 * @param {number} ratio - Coverage ratio
 */
export const MiniReserveCoverage = ({ ratio = 0 }) => {
  const level = getCoverageLevel(ratio);
  const IconComponent = level.icon;
  
  return (
    <div className={`inline-flex items-center gap-1.5 ${level.color}`}>
      <IconComponent className="w-4 h-4" />
      <span className="text-sm font-medium">{ratio.toFixed(1)}%</span>
    </div>
  );
};

// Helper function for mini component
function getCoverageLevel(ratio) {
  if (ratio >= 25) return COVERAGE_LEVELS.excellent;
  if (ratio >= 15) return COVERAGE_LEVELS.good;
  if (ratio >= 10) return COVERAGE_LEVELS.fair;
  return COVERAGE_LEVELS.poor;
}

export default ReserveCoverageIndicator;
