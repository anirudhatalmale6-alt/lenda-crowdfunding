import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectFeeConfig, selectFeePreview, calculateFeePreview, fetchFeeConfig } from '../../store/slices/revenueSlice';
import { formatCurrency } from '../../utils/formatters';

/**
 * LoanFeePreview Component
 * Displays loan amount, interest rate, platform origination fee, and net amount borrower receives
 * 
 * @param {number} loanAmount - The requested loan amount
 * @param {number} interestRate - The interest rate set by borrower
 * @param {boolean} showDetails - Whether to show detailed breakdown
 */
const LoanFeePreview = ({ loanAmount = 0, interestRate = 0, showDetails = true }) => {
  const dispatch = useDispatch();
  const feeConfig = useSelector(selectFeeConfig);
  const feePreview = useSelector(selectFeePreview);
  const [localLoanAmount, setLocalLoanAmount] = useState(loanAmount);
  const [localInterestRate, setLocalInterestRate] = useState(interestRate);

  // Fetch fee config on mount
  useEffect(() => {
    dispatch(fetchFeeConfig());
  }, [dispatch]);

  // Calculate fee preview when loan amount or fee changes
  useEffect(() => {
    const feePercentage = feeConfig.origination_fee?.percentage || 2;
    dispatch(calculateFeePreview({
      loanAmount: localLoanAmount,
      feePercentage
    }));
  }, [dispatch, localLoanAmount, feeConfig]);

  // Update local state when props change
  useEffect(() => {
    setLocalLoanAmount(loanAmount);
  }, [loanAmount]);

  useEffect(() => {
    setLocalInterestRate(interestRate);
  }, [interestRate]);

  const feePercentage = feeConfig.origination_fee?.percentage || 2;

  if (loanAmount <= 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-slate-800">Loan Fee Preview</h3>
      </div>

      <div className="space-y-3">
        {/* Loan Requested */}
        <div className="flex justify-between items-center py-2 border-b border-slate-200">
          <span className="text-slate-600">Loan Requested:</span>
          <span className="text-lg font-semibold text-slate-800">{formatCurrency(localLoanAmount)}</span>
        </div>

        {/* Interest Rate */}
        <div className="flex justify-between items-center py-2 border-b border-slate-200">
          <span className="text-slate-600">Interest Rate (Your Rate):</span>
          <span className="text-lg font-medium text-emerald-600">{localInterestRate}% APR</span>
        </div>

        {/* Platform Fee */}
        <div className="flex justify-between items-center py-2 border-b border-slate-200 bg-amber-50 -mx-6 px-6">
          <div className="flex items-center gap-2">
            <span className="text-slate-700 font-medium">Platform Origination Fee:</span>
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              {feePercentage}%
            </span>
          </div>
          <span className="text-lg font-semibold text-amber-700">
            -{formatCurrency(feePreview.feeAmount || 0)}
          </span>
        </div>

        {/* Net Amount Borrower Receives */}
        <div className="flex justify-between items-center py-3 bg-emerald-50 -mx-6 px-6 rounded-b-lg">
          <span className="text-emerald-800 font-semibold">Borrower Receives:</span>
          <span className="text-xl font-bold text-emerald-700">
            {formatCurrency(feePreview.borrowerReceives || 0)}
          </span>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            <strong>Note:</strong> The platform origination fee is deducted before loan funds are released.
            Your chosen interest rate remains unchanged and is what investors will receive.
          </p>
        </div>
      )}
    </div>
  );
};

export default LoanFeePreview;
