import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectFeeConfig, calculateTradeSummary, fetchFeeConfig } from '../../store/slices/revenueSlice';

/**
 * TradeSummaryPanel Component
 * Displays trade amount, trading fee, and net received for secondary market token trades
 * 
 * @param {number} tradeAmount - The token sale/purchase amount
 * @param {string} tradeType - 'buy' or 'sell'
 * @param {boolean} showDetails - Whether to show detailed breakdown
 */
const TradeSummaryPanel = ({ tradeAmount = 0, tradeType = 'sell', showDetails = true }) => {
  const dispatch = useDispatch();
  const feeConfig = useSelector(selectFeeConfig);

  // Fetch fee config on mount
  useEffect(() => {
    dispatch(fetchFeeConfig());
  }, [dispatch]);

  // Calculate trade summary when trade amount changes
  useEffect(() => {
    const feePercentage = feeConfig.trading_fee?.percentage || 1;
    dispatch(calculateTradeSummary({
      tradeAmount,
      feePercentage
    }));
  }, [dispatch, tradeAmount, feeConfig]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const feePercentage = feeConfig.trading_fee?.percentage || 1;
  const feeAmount = tradeAmount * (feePercentage / 100);
  const netReceived = tradeAmount - feeAmount;

  if (tradeAmount <= 0) {
    return null;
  }

  const isBuying = tradeType === 'buy';

  return (
    <div className={`rounded-xl p-6 border shadow-sm ${
      isBuying 
        ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
        : 'bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isBuying ? (
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <h3 className="text-lg font-semibold text-slate-800">
            {isBuying ? 'Purchase Summary' : 'Sale Summary'}
          </h3>
        </div>
        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
          Trading Fee: {feePercentage}%
        </span>
      </div>

      <div className="space-y-3">
        {/* Trade Amount */}
        <div className="flex justify-between items-center py-2 border-b border-slate-200">
          <span className="text-slate-600">
            {isBuying ? 'Token Purchase Amount:' : 'Token Sale Amount:'}
          </span>
          <span className="text-lg font-semibold text-slate-800">
            {formatCurrency(tradeAmount)}
          </span>
        </div>

        {/* Trading Fee */}
        <div className="flex justify-between items-center py-2 border-b border-slate-200 bg-amber-50 -mx-6 px-6">
          <div className="flex items-center gap-2">
            <span className="text-slate-700 font-medium">Trading Fee:</span>
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              {feePercentage}%
            </span>
          </div>
          <span className="text-lg font-semibold text-amber-700">
            -{formatCurrency(feeAmount)}
          </span>
        </div>

        {/* Net Received/Paid */}
        <div className={`flex justify-between items-center py-3 -mx-6 px-6 rounded-b-lg ${
          isBuying ? 'bg-emerald-50' : 'bg-purple-50'
        }`}>
          <span className={`font-semibold ${isBuying ? 'text-emerald-800' : 'text-purple-800'}`}>
            {isBuying ? 'Total Paid:' : 'Net Received:'}
          </span>
          <span className={`text-xl font-bold ${isBuying ? 'text-emerald-700' : 'text-purple-700'}`}>
            {formatCurrency(isBuying ? tradeAmount : netReceived)}
          </span>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            <strong>Note:</strong> A {feePercentage}% trading fee applies to all secondary market transactions.
            This fee supports platform operations and liquidity services.
          </p>
        </div>
      )}
    </div>
  );
};

export default TradeSummaryPanel;
