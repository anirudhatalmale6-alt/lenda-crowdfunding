/**
 * Credit Monitoring Panel Component
 * Admin dashboard for credit reputation monitoring
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCreditMonitoring, selectMonitoringData, selectMonitoringLoading } from '../../store/slices/creditReputationSlice';
import { CREDIT_SCORE_RANGES } from '../../services/creditReputationService';

// Icons
const UsersIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const TrendIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
  </svg>
);

const getCategoryColor = (category) => {
  const colorMap = {
    elite: 'bg-emerald-500',
    excellent: 'bg-green-500',
    good: 'bg-blue-500',
    fair: 'bg-yellow-500',
    weak: 'bg-orange-500',
    high_risk: 'bg-red-500'
  };
  return colorMap[category] || 'bg-gray-500';
};

const CreditMonitoringPanel = () => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('overview');
  
  const monitoringData = useSelector(selectMonitoringData);
  const loading = useSelector(selectMonitoringLoading);
  
  useEffect(() => {
    dispatch(fetchCreditMonitoring());
  }, [dispatch]);
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-4 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!monitoringData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-gray-500">No monitoring data available</div>
        <button
          onClick={() => dispatch(fetchCreditMonitoring())}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Load Data
        </button>
      </div>
    );
  }
  
  const { summary } = monitoringData;
  const categoryBreakdown = summary?.category_breakdown || {};
  const tierPerformance = summary?.tier_performance || {};
  
  // Calculate category percentages
  const totalBorrowers = summary?.total_borrowers || 0;
  const getPercentage = (count) => totalBorrowers > 0 ? (count / totalBorrowers) * 100 : 0;
  
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Credit Reputation Monitoring</h2>
        <span className="text-sm text-gray-500">
          Last updated: {new Date(monitoringData.generated_at).toLocaleString()}
        </span>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-4 border-b">
        {['overview', 'categories', 'tiers'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-sm font-medium transition-colors ${
              activeTab === tab 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center text-gray-500 mb-2">
                <UsersIcon />
                <span className="ml-2">Total Borrowers</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {summary.total_borrowers || 0}
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center text-gray-500 mb-2">
                <ChartIcon />
                <span className="ml-2">Avg Credit Score</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {summary.average_credit_score?.toFixed(0) || 0}
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center text-gray-500 mb-2">
                <TrendIcon />
                <span className="ml-2">Avg Repayment Rate</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {summary.average_repayment_rate?.toFixed(1) || 0}%
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center text-gray-500 mb-2">
                <AlertIcon />
                <span className="ml-2">Default Rate</span>
              </div>
              <div className={`text-2xl font-bold ${
                (summary.default_rate || 0) > 5 ? 'text-red-600' : 'text-green-600'
              }`}>
                {summary.default_rate?.toFixed(2) || 0}%
              </div>
            </div>
          </div>
          
          {/* Category Distribution */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Credit Score Distribution</h3>
            <div className="flex h-8 rounded-lg overflow-hidden">
              {Object.entries(categoryBreakdown).map(([category, count]) => (
                <div
                  key={category}
                  className={`${getCategoryColor(category)} transition-all`}
                  style={{ width: `${getPercentage(count)}%` }}
                  title={`${category}: ${count} (${getPercentage(count).toFixed(1)}%)`}
                ></div>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 mt-2">
              {Object.entries(CREDIT_SCORE_RANGES).map(([key, config]) => (
                <div key={key} className="flex items-center">
                  <div className={`w-3 h-3 rounded ${getCategoryColor(key)} mr-1`}></div>
                  <span className="text-sm text-gray-600">
                    {config.label}: {categoryBreakdown[key] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Borrower Categories</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(CREDIT_SCORE_RANGES).map(([key, config]) => (
              <div key={key} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-800">{config.label}</span>
                  <span className={`px-2 py-1 rounded text-sm ${getCategoryColor(key)} text-white`}>
                    {categoryBreakdown[key] || 0}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  Score: {config.min}-{config.max}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full ${getCategoryColor(key)}`}
                    style={{ width: `${getPercentage(categoryBreakdown[key] || 0)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {getPercentage(categoryBreakdown[key] || 0).toFixed(1)}% of borrowers
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Tiers Tab */}
      {activeTab === 'tiers' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance by Score Tier</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Tier</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Borrowers</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Default Rate</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(tierPerformance).map(([tier, data]) => (
                  <tr key={tier} className="border-b">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded ${getCategoryColor(tier)} mr-2`}></div>
                        <span className="font-medium text-gray-800 capitalize">{tier.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-gray-600">{data?.count || 0}</td>
                    <td className="text-right py-3 px-4">
                      <span className={`font-medium ${
                        (data?.default_rate || 0) > 10 ? 'text-red-600' :
                        (data?.default_rate || 0) > 5 ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {data?.default_rate?.toFixed(2) || 0}%
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        (data?.default_rate || 0) > 10 ? 'bg-red-100 text-red-800' :
                        (data?.default_rate || 0) > 5 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {(data?.default_rate || 0) > 10 ? 'High' :
                         (data?.default_rate || 0) > 5 ? 'Medium' : 'Low'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Refresh Button */}
      <div className="pt-4 border-t">
        <button
          onClick={() => dispatch(fetchCreditMonitoring())}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
};

export default CreditMonitoringPanel;
