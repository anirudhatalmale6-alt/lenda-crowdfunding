/**
 * Enhanced Fee Breakdown Component
 * Provides comprehensive fee breakdown for loans and investments
 * Addresses Gap: 11.2 Fee breakdown (Incomplete - Medium severity)
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  selectFeeConfig, 
  selectFeePreview, 
  calculateFeePreview,
  calculateEarningsBreakdown,
  calculateTradeSummary,
  calculateEscrowSummary,
  fetchFeeConfig 
} from '../../store/slices/revenueSlice';

/**
 * EnhancedFeeBreakdown Component
 * Shows complete fee breakdown for various operations
 * 
 * @param {string} type - Type of breakdown: 'loan' | 'investment' | 'trade' | 'escrow'
 * @param {number} amount - Primary amount for calculation
 * @param {number} interestRate - For loan/investment calculations
 * @param {boolean} showDetails - Show detailed breakdown
 */
const EnhancedFeeBreakdown = ({ 
  type = 'loan', 
  amount = 0, 
  interestRate = 0, 
  showDetails = true 
}) => {
  const dispatch = useDispatch();
  const feeConfig = useSelector(selectFeeConfig);
  const feePreview = useSelector(selectFeePreview);
  const [activeTab, setActiveTab] = useState(type);
  const [calculatedFees, setCalculatedFees] = useState({
    origination: 0,
    service: 0,
    trading: 0,
    escrow: 0,
    total: 0
  });

  // Fetch fee config on mount
  useEffect(() => {
    dispatch(fetchFeeConfig());
  }, [dispatch]);

  // Calculate fees when amount changes
  useEffect(() => {
    if (amount > 0) {
      const originationFee = feeConfig.origination_fee?.percentage || 2;
      const serviceFee = feeConfig.investor_service_fee?.percentage || 5;
      const tradingFee = feeConfig.trading_fee?.percentage || 1;
      const escrowFee = feeConfig.escrow_fee?.percentage || 1.5;

      setCalculatedFees({
        origination: amount * (originationFee / 100),
        service: amount * (serviceFee / 100),
        trading: amount * (tradingFee / 100),
        escrow: amount * (escrowFee / 100),
        total: amount * ((originationFee + serviceFee + tradingFee + escrowFee) / 100)
      });

      // Update the preview
      dispatch(calculateFeePreview({
        loanAmount: amount,
        feePercentage: originationFee
      }));
    }
  }, [amount, feeConfig, dispatch]);

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Get fee configuration by type
  const getFeeConfig = () => {
    const fees = {
      loan: {
        title: 'Loan Fees',
        description: 'Fees associated with borrowing',
        items: [
          {
            name: 'Origination Fee',
            percentage: feeConfig.origination_fee?.percentage || 2,
            description: 'One-time fee for processing the loan',
            amount: calculatedFees.origination
          }
        ]
      },
      investment: {
        title: 'Investment Fees',
        description: 'Fees associated with lending and returns',
        items: [
          {
            name: 'Service Fee',
            percentage: feeConfig.investor_service_fee?.percentage || 5,
            description: 'Annual fee for portfolio management',
            amount: calculatedFees.service
          }
        ]
      },
      trade: {
        title: 'Trading Fees',
        description: 'Fees for secondary market transactions',
        items: [
          {
            name: 'Transaction Fee',
            percentage: feeConfig.trading_fee?.percentage || 1,
            description: 'Fee for buying or selling loan tokens',
            amount: calculatedFees.trading
          }
        ]
      },
      escrow: {
        title: 'Escrow Fees',
        description: 'Fees for escrow services',
        items: [
          {
            name: 'Escrow Service Fee',
            percentage: feeConfig.escrow_fee?.percentage || 1.5,
            description: 'Fee for secure transaction handling',
            amount: calculatedFees.escrow
          }
        ]
      }
    };
    return fees[activeTab] || fees.loan;
  };

  // Calculate example scenarios
  const getExampleScenarios = () => {
    const scenarios = [];
    const exampleAmounts = [1000, 5000, 10000, 25000];
    
    exampleAmounts.forEach(exampleAmount => {
      const originationFee = exampleAmount * ((feeConfig.origination_fee?.percentage || 2) / 100);
      scenarios.push({
        amount: exampleAmount,
        fee: originationFee,
        net: exampleAmount - originationFee
      });
    });
    
    return scenarios;
  };

  const feeData = getFeeConfig();
  const exampleScenarios = getExampleScenarios();

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Fee Breakdown</h3>
            <p className="text-sm text-slate-500">{feeData.description}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 py-3 border-b border-slate-200">
        <div className="flex gap-2">
          {['loan', 'investment', 'trade', 'escrow'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Fee Items */}
      <div className="px-6 py-4">
        <h4 className="text-sm font-semibold text-slate-800 mb-3">{feeData.title}</h4>
        
        {/* Amount Input */}
        {amount > 0 && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Transaction Amount:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(amount)}</span>
            </div>
          </div>
        )}

        {/* Fee Items List */}
        <div className="space-y-3">
          {feeData.items.map((item, index) => (
            <div 
              key={index}
              className="flex justify-between items-start p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{item.name}</span>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {item.percentage}%
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{item.description}</p>
              </div>
              <div className="text-right">
                <span className="font-semibold text-slate-800">
                  {amount > 0 ? formatCurrency(item.amount) : '-'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        {amount > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-800">Total Fees:</span>
              <span className="text-lg font-bold text-amber-600">
                {formatCurrency(calculatedFees.total)}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-slate-600">Net Amount:</span>
              <span className="font-semibold text-emerald-600">
                {formatCurrency(amount - calculatedFees.total)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Example Scenarios (Only for loan type) */}
      {showDetails && activeTab === 'loan' && (
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
          <h4 className="text-sm font-semibold text-slate-800 mb-3">Fee Examples</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {exampleScenarios.map((scenario, index) => (
              <div key={index} className="text-center p-2 bg-white rounded border border-slate-200">
                <div className="text-xs text-slate-500">{formatCurrency(scenario.amount)}</div>
                <div className="text-sm font-semibold text-amber-600">{formatCurrency(scenario.fee)}</div>
                <div className="text-xs text-slate-400">fee</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fee Policy */}
      <div className="px-6 py-4 border-t border-slate-200">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-slate-500">
            <p className="font-medium text-slate-700">Fee Policy</p>
            <p className="mt-1">All fees are transparently displayed before any transaction. 
            Origination fees are deducted from the loan amount before disbursement. 
            Service fees are deducted from investment returns.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedFeeBreakdown;
