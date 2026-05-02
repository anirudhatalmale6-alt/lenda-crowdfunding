import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectFeeConfig, calculateEscrowSummary, fetchFeeConfig } from '../../store/slices/revenueSlice';

/**
 * EscrowTransactionSummary Component
 * Displays payment amount, escrow fee, logistics fee (if item returned), and net settlement
 * 
 * @param {number} amount - The escrow payment amount
 * @param {number} logisticsFee - Optional logistics fee for returned items
 * @param {string} status - Escrow transaction status
 * @param {boolean} showDetails - Whether to show detailed breakdown
 */
const EscrowTransactionSummary = ({ amount = 0, logisticsFee = 0, status = 'created', showDetails = true }) => {
  const dispatch = useDispatch();
  const feeConfig = useSelector(selectFeeConfig);

  // Fetch fee config on mount
  useEffect(() => {
    dispatch(fetchFeeConfig());
  }, [dispatch]);

  // Calculate escrow summary when amount changes
  useEffect(() => {
    const feePercentage = feeConfig.escrow_fee?.percentage || 1.5;
    dispatch(calculateEscrowSummary({
      amount,
      feePercentage
    }));
  }, [dispatch, amount, feeConfig]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const feePercentage = feeConfig.escrow_fee?.percentage || 1.5;
  const escrowFee = amount * (feePercentage / 100);
  const totalDeductions = escrowFee + logisticsFee;
  const netSettlement = amount - totalDeductions;

  if (amount <= 0) {
    return null;
  }

  const isRefunded = status === 'refunded';
  const isDisputed = status === 'disputed';

  // Different display for refunded/disputed status
  if (isRefunded) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-800">Escrow Transaction Summary</h3>
        </div>
        <p className="text-slate-500 text-sm">This transaction has been refunded.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-6 border shadow-sm ${
      isDisputed 
        ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'
        : 'bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-800">Escrow Transaction Summary</h3>
        </div>
        <span className="text-xs bg-cyan-100 text-cyan-800 px-2 py-1 rounded-full">
          Escrow Fee: {feePercentage}%
        </span>
      </div>

      <div className="space-y-3">
        {/* Payment Amount */}
        <div className="flex justify-between items-center py-2 border-b border-slate-200">
          <span className="text-slate-600">Payment Amount:</span>
          <span className="text-lg font-semibold text-slate-800">
            {formatCurrency(amount)}
          </span>
        </div>

        {/* Escrow Fee */}
        <div className="flex justify-between items-center py-2 border-b border-slate-200 bg-amber-50 -mx-6 px-6">
          <div className="flex items-center gap-2">
            <span className="text-slate-700 font-medium">Escrow Service Fee:</span>
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              {feePercentage}%
            </span>
          </div>
          <span className="text-lg font-semibold text-amber-700">
            -{formatCurrency(escrowFee)}
          </span>
        </div>

        {/* Logistics Fee (if applicable) */}
        {logisticsFee > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-slate-200 bg-orange-50 -mx-6 px-6">
            <div className="flex items-center gap-2">
              <span className="text-slate-700 font-medium">Logistics Fee (Return):</span>
            </div>
            <span className="text-lg font-semibold text-orange-700">
              -{formatCurrency(logisticsFee)}
            </span>
          </div>
        )}

        {/* Net Settlement */}
        <div className="flex justify-between items-center py-3 bg-green-50 -mx-6 px-6 rounded-b-lg">
          <span className="text-green-800 font-semibold">
            {isDisputed ? 'Amount in Dispute:' : 'Net Settlement:'}
          </span>
          <span className="text-xl font-bold text-green-700">
            {formatCurrency(netSettlement)}
          </span>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            <strong>Note:</strong> The escrow fee ({feePercentage}%) covers secure payment processing and buyer/seller protection.
            Funds are released only after delivery confirmation.
          </p>
        </div>
      )}
    </div>
  );
};

export default EscrowTransactionSummary;
