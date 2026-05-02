import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectRevenueSummary,
  selectAnalytics,
  selectRevenueLoading,
  selectRevenueError,
  selectFeeConfig,
  fetchRevenueSummary,
  fetchAnalytics,
  fetchFeeConfig,
  updateFeeConfig
} from '../../store/slices/revenueSlice';

/**
 * RevenueAnalyticsDashboard Component
 * Admin dashboard showing platform financial performance with charts and metrics
 */
const RevenueAnalyticsDashboard = () => {
  const dispatch = useDispatch();
  const summary = useSelector(selectRevenueSummary);
  const analytics = useSelector(selectAnalytics);
  const loading = useSelector(selectRevenueLoading);
  const error = useSelector(selectRevenueError);
  const feeConfig = useSelector(selectFeeConfig);
  
  const [period, setPeriod] = useState('month');
  const [months, setMonths] = useState(12);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [editingFees, setEditingFees] = useState({});

  // Fetch data on mount and when period changes
  useEffect(() => {
    dispatch(fetchFeeConfig());
    dispatch(fetchRevenueSummary({ period }));
    dispatch(fetchAnalytics(months));
  }, [dispatch, period, months]);

  // Initialize editing fees when fee config loads
  useEffect(() => {
    if (feeConfig && Object.keys(feeConfig).length > 0) {
      const fees = {};
      Object.entries(feeConfig).forEach(([key, value]) => {
        fees[key] = value.percentage || 0;
      });
      setEditingFees(fees);
    }
  }, [feeConfig]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const getRevenueTypeLabel = (type) => {
    const labels = {
      'loan_origination': 'Loan Origination',
      'investor_service': 'Investor Service',
      'secondary_market_trading': 'Trading',
      'escrow_service': 'Escrow Service',
      'liquidation_commission': 'Liquidation'
    };
    return labels[type] || type;
  };

  const getRevenueTypeColor = (type) => {
    const colors = {
      'loan_origination': 'bg-blue-500',
      'investor_service': 'bg-green-500',
      'secondary_market_trading': 'bg-purple-500',
      'escrow_service': 'bg-cyan-500',
      'liquidation_commission': 'bg-orange-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  const handleFeeChange = (feeType, value) => {
    setEditingFees(prev => ({
      ...prev,
      [feeType]: parseFloat(value) || 0
    }));
  };

  const handleSaveFees = async () => {
    const fees = {};
    Object.entries(editingFees).forEach(([key, value]) => {
      fees[key] = { percentage: value };
    });
    await dispatch(updateFeeConfig(fees));
    setShowFeeModal(false);
    dispatch(fetchFeeConfig());
  };

  // Calculate totals
  const totalRevenue = summary.total_revenue || 0;
  const totalTransactions = summary.total_transactions || 0;
  const byType = summary.by_type || {};

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Revenue Analytics Dashboard</h1>
          <p className="text-slate-600">Platform financial performance and revenue tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={() => setShowFeeModal(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configure Fees
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error.summary && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error.summary}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-700">Total Revenue</span>
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-emerald-800 mt-2">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-emerald-600 mt-1">{totalTransactions} transactions</p>
        </div>

        {/* Total Loans Funded */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700">Loans Funded</span>
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-blue-800 mt-2">{analytics.total_loans_funded || 0}</p>
          <p className="text-xs text-blue-600 mt-1">{formatCurrency(analytics.total_loan_volume || 0)} volume</p>
        </div>

        {/* Marketplace Volume */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-purple-700">Marketplace Volume</span>
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-purple-800 mt-2">{formatCurrency(analytics.marketplace_volume || 0)}</p>
          <p className="text-xs text-purple-600 mt-1">Secondary market trades</p>
        </div>

        {/* Average Transaction */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-orange-700">Avg. Transaction</span>
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-orange-800 mt-2">
            {totalTransactions > 0 ? formatCurrency(totalRevenue / totalTransactions) : formatCurrency(0)}
          </p>
          <p className="text-xs text-orange-600 mt-1">Per transaction</p>
        </div>
      </div>

      {/* Revenue by Category */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Revenue by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Object.entries(byType).map(([type, data]) => (
            <div key={type} className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${getRevenueTypeColor(type)}`}></div>
                <span className="text-sm font-medium text-slate-700">{getRevenueTypeLabel(type)}</span>
              </div>
              <p className="text-lg font-bold text-slate-800">{formatCurrency(data.amount)}</p>
              <p className="text-xs text-slate-500">{data.count || 0} transactions</p>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Monthly Platform Earnings</h2>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="px-3 py-1 border border-slate-300 rounded-lg text-sm"
          >
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
            <option value={24}>Last 24 months</option>
          </select>
        </div>
        
        {loading.analytics ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {analytics.monthly_data?.map((month, index) => (
              <div key={index} className="flex items-center gap-4">
                <span className="w-20 text-sm text-slate-600">{month.month}</span>
                <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg transition-all duration-500"
                    style={{ width: `${Math.min((month.total / (analytics.total_revenue || 1)) * 100, 100)}%` }}
                  ></div>
                </div>
                <span className="w-28 text-right text-sm font-medium text-slate-800">{formatCurrency(month.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revenue Breakdown Bar */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Total Revenue Distribution</h2>
        <div className="h-8 bg-slate-100 rounded-lg overflow-hidden flex">
          {Object.entries(analytics.revenue_by_category || {}).map(([type, amount], index) => {
            const percentage = (amount / (analytics.total_revenue || 1)) * 100;
            return (
              <div
                key={type}
                className={`${getRevenueTypeColor(type)} h-full transition-all duration-500`}
                style={{ width: `${percentage}%` }}
                title={`${getRevenueTypeLabel(type)}: ${formatCurrency(amount)}`}
              ></div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-4">
          {Object.entries(analytics.revenue_by_category || {}).map(([type, amount]) => (
            <div key={type} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getRevenueTypeColor(type)}`}></div>
              <span className="text-sm text-slate-600">{getRevenueTypeLabel(type)}:</span>
              <span className="text-sm font-medium text-slate-800">{formatCurrency(amount)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fee Configuration Modal */}
      {showFeeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Configure Platform Fees</h3>
              <button
                onClick={() => setShowFeeModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {Object.entries(feeConfig).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {getRevenueTypeLabel(key)} Fee (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={editingFees[key] || 0}
                      onChange={(e) => handleFeeChange(key, e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{value.description}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowFeeModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFees}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueAnalyticsDashboard;
