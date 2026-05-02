/**
 * Borrower Risk Insights Component
 * Provides investor analytics on borrower reliability
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchCreditScore, 
  fetchRepaymentHistory,
  fetchReputationSignals,
  selectCreditScore, 
  selectCreditScoreLoading,
  selectRepaymentHistory,
  selectHistoryLoading,
  selectSignals,
  selectSignalsLoading
} from '../../store/slices/creditReputationSlice';
import { CREDIT_SCORE_RANGES, SIGNAL_TYPES } from '../../services/creditReputationService';

// Icons
const TrendingUpIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
  </svg>
);

const TrendingDownIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
  </svg>
);

const getScoreColor = (score) => {
  if (score >= 800) return 'text-emerald-600';
  if (score >= 720) return 'text-green-600';
  if (score >= 650) return 'text-blue-600';
  if (score >= 580) return 'text-yellow-600';
  if (score >= 500) return 'text-orange-600';
  return 'text-red-600';
};

const getSignalColor = (strength) => {
  switch (strength) {
    case 'strong': return 'bg-green-50 border-green-200 text-green-800';
    case 'moderate': return 'bg-blue-50 border-blue-200 text-blue-800';
    case 'weak': return 'bg-red-50 border-red-200 text-red-800';
    default: return 'bg-gray-50 border-gray-200 text-gray-800';
  }
};

const BorrowerRiskInsights = ({ borrowerId, loanId }) => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('overview');
  
  const creditScore = useSelector(selectCreditScore);
  const scoreLoading = useSelector(selectCreditScoreLoading);
  const repaymentHistory = useSelector(selectRepaymentHistory);
  const historyLoading = useSelector(selectHistoryLoading);
  const signals = useSelector(selectSignals);
  const signalsLoading = useSelector(selectSignalsLoading);
  
  useEffect(() => {
    if (borrowerId) {
      dispatch(fetchCreditScore(borrowerId));
      dispatch(fetchRepaymentHistory(borrowerId));
      if (loanId) {
        dispatch(fetchReputationSignals({ borrowerId, loanId }));
      }
    }
  }, [dispatch, borrowerId, loanId]);
  
  // Calculate completion rate
  const calculateCompletionRate = () => {
    if (!creditScore?.statistics) return 0;
    const { successful_loans, total_loans } = creditScore.statistics;
    return total_loans > 0 ? (successful_loans / total_loans) * 100 : 0;
  };
  
  // Get volume data for chart
  const getVolumeData = () => {
    if (!repaymentHistory || repaymentHistory.length === 0) {
      return [
        { month: 'M1', amount: 0 },
        { month: 'M2', amount: 0 },
        { month: 'M3', amount: 0 },
        { month: 'M4', amount: 0 },
        { month: 'M5', amount: 0 },
        { month: 'M6', amount: 0 }
      ];
    }
    
    // Group by month (mock implementation)
    return [
      { month: 'M1', amount: 1000 },
      { month: 'M2', amount: 2500 },
      { month: 'M3', amount: 1800 },
      { month: 'M4', amount: 3200 },
      { month: 'M5', amount: 2800 },
      { month: 'M6', amount: creditScore?.statistics?.total_borrowed || 0 }
    ];
  };
  
  const completionRate = calculateCompletionRate();
  const volumeData = getVolumeData();
  const maxVolume = Math.max(...volumeData.map(d => d.amount), 1);
  
  if (scoreLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (!creditScore) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-gray-500">No borrower data available</div>
      </div>
    );
  }
  
  const { credit_score, credit_category, statistics, factors } = creditScore;
  const categoryConfig = CREDIT_SCORE_RANGES[credit_category];
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b mb-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2 text-sm font-medium transition-colors ${
            activeTab === 'overview' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-2 text-sm font-medium transition-colors ${
            activeTab === 'history' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Repayment History
        </button>
        <button
          onClick={() => setActiveTab('signals')}
          className={`pb-2 text-sm font-medium transition-colors ${
            activeTab === 'signals' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Investment Signals
        </button>
      </div>
      
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Credit Score Summary */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-500">Credit Score</div>
              <div className={`text-3xl font-bold ${getScoreColor(credit_score)}`}>
                {credit_score}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Category</div>
              <div className="text-lg font-semibold text-gray-800">
                {categoryConfig?.label}
              </div>
            </div>
          </div>
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <ChartIcon />
                <span className="ml-2">Loan Completion</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {completionRate.toFixed(1)}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <TrendingUpIcon />
                <span className="ml-2">Total Volume</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                ${(statistics?.total_borrowed || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {statistics?.total_loans} loans
              </div>
            </div>
          </div>
          
          {/* Historical Volume Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-3">Historical Borrowing Volume</h4>
            <div className="flex items-end gap-2 h-24">
              {volumeData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-blue-500 rounded-t transition-all"
                    style={{ height: `${(data.amount / maxVolume) * 100}%` }}
                  ></div>
                  <span className="text-xs text-gray-400 mt-1">{data.month}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Factor Breakdown */}
          {factors && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-3">Score Factors</h4>
              <div className="space-y-2">
                {Object.entries(factors).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                    <div className="flex items-center">
                      <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${value}%` }}
                        ></div>
                      </div>
                      <span className="text-gray-800 font-medium">{Math.round(value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* History Tab */}
      {activeTab === 'history' && (
        <div>
          {historyLoading ? (
            <div className="text-gray-500">Loading history...</div>
          ) : repaymentHistory.length > 0 ? (
            <div className="space-y-2">
              {repaymentHistory.slice(0, 10).map((payment, index) => (
                <div 
                  key={index}
                  className={`p-3 border rounded-lg flex items-center justify-between ${
                    payment.status === 'paid' ? 'bg-green-50' :
                    payment.status === 'late' ? 'bg-yellow-50' :
                    payment.status === 'defaulted' ? 'bg-red-50' : 'bg-gray-50'
                  }`}
                >
                  <div>
                    <div className="font-medium text-gray-800">{payment.loan_title}</div>
                    <div className="text-sm text-gray-500">Payment #{payment.payment_number}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${payment.amount_paid.toLocaleString()}</div>
                    <div className={`text-sm ${
                      payment.status === 'paid' ? 'text-green-600' :
                      payment.status === 'late' ? 'text-yellow-600' :
                      payment.status === 'defaulted' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {payment.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              No repayment history available
            </div>
          )}
        </div>
      )}
      
      {/* Signals Tab */}
      {activeTab === 'signals' && (
        <div>
          {signalsLoading ? (
            <div className="text-gray-500">Loading signals...</div>
          ) : signals && signals.length > 0 ? (
            <div className="space-y-3">
              {signals.map((signal, index) => (
                <div 
                  key={index}
                  className={`p-4 border rounded-lg ${getSignalColor(signal.strength)}`}
                >
                  <div className="flex items-start">
                    <div className="flex-1">
                      <div className="font-semibold">{signal.type.replace(/_/g, ' ')}</div>
                      <div className="text-sm mt-1">{signal.message}</div>
                      {signal.recommendation && (
                        <div className="text-xs mt-2 opacity-75">{signal.recommendation}</div>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      signal.strength === 'strong' ? 'bg-green-200' :
                      signal.strength === 'moderate' ? 'bg-blue-200' : 'bg-red-200'
                    }`}>
                      {signal.strength}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              No investment signals available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BorrowerRiskInsights;
