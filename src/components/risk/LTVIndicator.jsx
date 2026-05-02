/**
 * LTV Indicator Component
 * Displays Loan-to-Value ratio with color indicators
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { calculateLTV, selectLTVResult, selectLTVLoading, clearLTV } from '../../store/slices/riskSlice';
import { LTV_CONFIG } from '../../services/riskService';

const LTVIndicator = ({ 
  loanAmount, 
  collateralValue, 
  riskCategory = 'A',
  showDetails = true,
  editable = false,
  onLTVChange 
}) => {
  const dispatch = useDispatch();
  const ltvResult = useSelector(selectLTVResult);
  const loading = useSelector(selectLTVLoading);
  
  useEffect(() => {
    if (loanAmount && collateralValue) {
      dispatch(calculateLTV({ loanAmount, collateralValue, riskCategory }));
    }
    
    return () => {
      dispatch(clearLTV());
    };
  }, [dispatch, loanAmount, collateralValue, riskCategory]);
  
  const getStatusColor = () => {
    if (!ltvResult) return 'bg-gray-200';
    
    if (ltvResult.status === 'exceeds') return 'bg-red-500';
    if (ltvResult.status === 'caution') return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  const getStatusTextColor = () => {
    if (!ltvResult) return 'text-gray-600';
    
    if (ltvResult.status === 'exceeds') return 'text-red-600';
    if (ltvResult.status === 'caution') return 'text-yellow-600';
    return 'text-green-600';
  };
  
  const getStatusBadge = () => {
    if (!ltvResult) return null;
    
    if (ltvResult.status === 'exceeds') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
          Exceeds Limit
        </span>
      );
    }
    if (ltvResult.status === 'caution') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          Caution
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
        Safe
      </span>
    );
  };
  
  const maxLtv = LTV_CONFIG[riskCategory] || 60;
  const currentLtv = ltvResult?.ltv_ratio || 0;
  const percentageOfMax = Math.min(100, (currentLtv / maxLtv) * 100);
  
  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-700">Loan-to-Value (LTV)</h4>
        {getStatusBadge()}
      </div>
      
      {/* Main Value */}
      <div className="mb-4">
        <div className={`text-3xl font-bold ${getStatusTextColor()}`}>
          {currentLtv.toFixed(1)}%
        </div>
        <div className="text-sm text-gray-500">
          Maximum allowed: {maxLtv}% ({riskCategory})
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden relative">
          {/* Warning zone (60-80% of max) */}
          <div 
            className="absolute h-full bg-yellow-300 opacity-30"
            style={{ width: `${60}%` }}
          ></div>
          {/* Danger zone (80-100% of max) */}
          <div 
            className="absolute h-full bg-red-300 opacity-30"
            style={{ left: '60%', width: '40%' }}
          ></div>
          {/* Actual progress */}
          <div 
            className={`h-full transition-all duration-300 ${getStatusColor()}`}
            style={{ width: `${percentageOfMax}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>0%</span>
          <span>{maxLtv}%</span>
        </div>
      </div>
      
      {/* Details */}
      {showDetails && (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Collateral Value</span>
            <span className="font-medium">{formatCurrency(collateralValue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Loan Amount</span>
            <span className="font-medium">{formatCurrency(loanAmount)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-100">
            <span className="text-gray-500">Max Loan (LTV)</span>
            <span className="font-medium text-gray-700">
              {formatCurrency(collateralValue * (maxLtv / 100))}
            </span>
          </div>
        </div>
      )}
      
      {/* Warning/Error Message */}
      {ltvResult && ltvResult.status === 'exceeds' && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm">
          <div className="text-red-800 font-medium mb-1">LTV Exceeds Limit</div>
          <div className="text-red-600">
            {ltvResult.recommendation && (
              <>
                Reduce loan by {formatCurrency(ltvResult.recommendation.reduce_loan_by)} 
                {' '}or increase collateral by {formatCurrency(ltvResult.recommendation.increase_collateral_by)}
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Caution Message */}
      {ltvResult && ltvResult.status === 'caution' && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <div className="text-yellow-800 font-medium">Near LTV Limit</div>
          <div className="text-yellow-600">
            Your LTV is close to the maximum allowed. Consider increasing collateral for better rates.
          </div>
        </div>
      )}
    </div>
  );
};

export default LTVIndicator;
