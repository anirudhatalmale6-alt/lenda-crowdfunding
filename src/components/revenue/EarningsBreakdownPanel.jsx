import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectFeeConfig, calculateEarningsBreakdown, fetchFeeConfig } from '../../store/slices/revenueSlice';

/**
 * EarningsBreakdownPanel Component
 * Displays total interest earned, platform fee, and net investor profit
 * 
 * @param {number} totalInterestEarned - Total interest earned from investments
 * @param {boolean} showBreakdown - Whether to show detailed breakdown
 */
const EarningsBreakdownPanel = ({ totalInterestEarned = 0, showBreakdown = true }) => {
  const dispatch = useDispatch();
  const feeConfig = useSelector(selectFeeConfig);
  const investorEarnings = useSelector((state) => state.revenue.investorEarnings);

  // Fetch fee config on mount
  useEffect(() => {
    dispatch(fetchFeeConfig());
  }, [dispatch]);

  // Calculate earnings breakdown when interest earned changes
  useEffect(() => {
    const feePercentage = feeConfig.investor_service_fee?.percentage || 5;
    dispatch(calculateEarningsBreakdown({
      interestEarned: totalInterestEarned,
      feePercentage
    }));
  }, [dispatch, totalInterestEarned, feeConfig]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const feePercentage = feeConfig.investor_service_fee?.percentage || 5;
  const feeAmount = totalInterestEarned * (feePercentage / 100);
  const netProfit = totalInterestEarned - feeAmount;

  if (totalInterestEarned <= 0) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-800">Earnings Breakdown</h3>
        </div>
        <p className="text-slate-500 text-sm">No earnings to display yet. Start investing to see your returns here.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-800">Earnings Breakdown</h3>
        </div>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
          Investor Service Fee: {feePercentage}%
        </span>
      </div>

      <div className="space-y-3">
        {/* Total Interest Earned */}
        <div className="flex justify-between items-center py-2 border-b border-blue-200">
          <span className="text-slate-600">Total Interest Earned:</span>
          <span className="text-lg font-semibold text-slate-800">
            {formatCurrency(totalInterestEarned)}
          </span>
        </div>

        {/* Platform Fee */}
        <div className="flex justify-between items-center py-2 border-b border-blue-200 bg-red-50 -mx-6 px-6">
          <div className="flex items-center gap-2">
            <span className="text-slate-700 font-medium">Platform Service Fee:</span>
            <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
              {feePercentage}%
            </span>
          </div>
          <span className="text-lg font-semibold text-red-600">
            -{formatCurrency(feeAmount)}
          </span>
        </div>

        {/* Net Investor Profit */}
        <div className="flex justify-between items-center py-3 bg-green-50 -mx-6 px-6 rounded-b-lg">
          <span className="text-green-800 font-semibold">Net Investor Profit:</span>
          <span className="text-xl font-bold text-green-700">
            {formatCurrency(netProfit)}
          </span>
        </div>
      </div>

      {showBreakdown && (
        <div className="mt-4 pt-4 border-t border-blue-200">
          <p className="text-xs text-slate-500">
            <strong>Note:</strong> LENDA charges a {feePercentage}% service fee on your earned interest.
            This fee supports platform operations, risk management, and investor protection services.
          </p>
        </div>
      )}
    </div>
  );
};

export default EarningsBreakdownPanel;
