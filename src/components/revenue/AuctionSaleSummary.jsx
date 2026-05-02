import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectFeeConfig, calculateAuctionSummary, fetchFeeConfig } from '../../store/slices/revenueSlice';
import { formatCurrency } from '../../utils/formatters';

/**
 * AuctionSaleSummary Component
 * Displays winning bid, platform commission, and reserve contribution for liquidation sales
 * 
 * @param {number} winningBid - The winning bid/auction sale price
 * @param {number} reserveContribution - Percentage of commission to contribute to reserve pool
 * @param {boolean} showDetails - Whether to show detailed breakdown
 */
const AuctionSaleSummary = ({ winningBid = 0, reserveContribution = 20, showDetails = true }) => {
  const dispatch = useDispatch();
  const feeConfig = useSelector(selectFeeConfig);

  // Fetch fee config on mount
  useEffect(() => {
    dispatch(fetchFeeConfig());
  }, [dispatch]);

  // Calculate auction summary when winning bid changes
  useEffect(() => {
    const commissionPercentage = feeConfig.liquidation_commission?.percentage || 10;
    dispatch(calculateAuctionSummary({
      winningBid,
      commissionPercentage
    }));
  }, [dispatch, winningBid, feeConfig]);

  const commissionPercentage = feeConfig.liquidation_commission?.percentage || 10;
  const commissionAmount = winningBid * (commissionPercentage / 100);
  const reserveAmount = commissionAmount * (reserveContribution / 100);
  const platformNet = commissionAmount - reserveAmount;
  const netAfterCommission = winningBid - commissionAmount;

  if (winningBid <= 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M gavel 21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-800">Auction Sale Summary</h3>
        </div>
        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
          Commission: {commissionPercentage}%
        </span>
      </div>

      <div className="space-y-3">
        {/* Winning Bid */}
        <div className="flex justify-between items-center py-2 border-b border-slate-200">
          <span className="text-slate-600">Winning Bid:</span>
          <span className="text-lg font-semibold text-slate-800">
            {formatCurrency(winningBid)}
          </span>
        </div>

        {/* Platform Commission */}
        <div className="flex justify-between items-center py-2 border-b border-slate-200 bg-red-50 -mx-6 px-6">
          <div className="flex items-center gap-2">
            <span className="text-slate-700 font-medium">Platform Commission:</span>
            <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
              {commissionPercentage}%
            </span>
          </div>
          <span className="text-lg font-semibold text-red-700">
            -{formatCurrency(commissionAmount)}
          </span>
        </div>

        {/* After Commission */}
        <div className="flex justify-between items-center py-2 border-b border-slate-200 bg-slate-50 -mx-6 px-6">
          <span className="text-slate-600">Net After Commission:</span>
          <span className="text-lg font-medium text-slate-700">
            {formatCurrency(netAfterCommission)}
          </span>
        </div>

        {/* Reserve Contribution */}
        {reserveContribution > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-slate-200 bg-blue-50 -mx-6 px-6">
            <div className="flex items-center gap-2">
              <span className="text-slate-700 font-medium">Reserve Pool Contribution:</span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                {reserveContribution}% of commission
              </span>
            </div>
            <span className="text-lg font-semibold text-blue-700">
              -{formatCurrency(reserveAmount)}
            </span>
          </div>
        )}

        {/* Platform Net Revenue */}
        <div className="flex justify-between items-center py-3 bg-green-50 -mx-6 px-6 rounded-b-lg">
          <span className="text-green-800 font-semibold">Platform Net Revenue:</span>
          <span className="text-xl font-bold text-green-700">
            {formatCurrency(platformNet)}
          </span>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            <strong>Note:</strong> The platform collects a {commissionPercentage}% commission on liquidation sales.
            A portion ({reserveContribution}%) of this commission is contributed to the reserve pool to protect investors.
          </p>
        </div>
      )}
    </div>
  );
};

export default AuctionSaleSummary;
