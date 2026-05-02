import React, { useState, useEffect } from 'react';
import { Flame, TrendingUp, Clock, ArrowRight, Loader } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getHotOpportunities, getAlmostFundedLoans, getHighYieldOpportunities } from '../../services/acceleratorService';

/**
 * HotOpportunitiesPanel - Shows loans nearing completion for investor dashboard
 */
const HotOpportunitiesPanel = ({ maxItems = 5, onInvestClick }) => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHotOpportunities();
  }, []);

  const loadHotOpportunities = async () => {
    setLoading(true);
    try {
      const data = await getHotOpportunities();
      setLoans(data.slice(0, maxItems));
    } catch (err) {
      setError('Failed to load opportunities');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-orange-500" />
          <h3 className="font-bold text-gray-900">Hot Opportunities</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-orange-500" />
          <h3 className="font-bold text-gray-900">Hot Opportunities</h3>
        </div>
        <p className="text-gray-500 text-center py-4">{error}</p>
      </div>
    );
  }

  if (loans.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-orange-500" />
          <h3 className="font-bold text-gray-900">Hot Opportunities</h3>
        </div>
        <p className="text-gray-500 text-center py-4">
          No hot opportunities at the moment. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
          <h3 className="font-bold text-gray-900">Hot Opportunities</h3>
        </div>
        <span className="text-xs text-gray-500">Closing Soon</span>
      </div>

      <div className="space-y-3">
        {loans.map((loan) => {
          const fundingPercentage = loan.LoanRequest?.funded_amount && loan.LoanRequest?.loan_amount
            ? (loan.LoanRequest.funded_amount / loan.LoanRequest.loan_amount * 100).toFixed(0)
            : 0;
          
          return (
            <div
              key={loan.LoanRequest?.id}
              className="border border-gray-100 rounded-lg p-3 hover:border-orange-200 hover:shadow-md transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900 text-sm truncate flex-1">
                  {loan.LoanRequest?.title || 'Untitled Loan'}
                </h4>
                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                  {fundingPercentage}% Funded
                </span>
              </div>

              <div className="flex justify-between items-center text-xs text-gray-600 mb-2">
                <span>Size: {formatCurrency(loan.LoanRequest?.loan_amount)}</span>
                <span className="font-bold text-green-600">{loan.LoanRequest?.interest_rate}% APY</span>
              </div>

              {/* Mini Progress Bar */}
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full"
                  style={{ width: `${fundingPercentage}%` }}
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {formatCurrency(loan.LoanRequest?.loan_amount - loan.LoanRequest?.funded_amount)} remaining
                </span>
                <button
                  onClick={() => onInvestClick && onInvestClick(loan.LoanRequest?.id)}
                  className="text-xs font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  Invest Now <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Link
        to="/loans/closing-soon"
        className="mt-4 block text-center text-sm text-orange-600 hover:text-orange-700 font-medium"
      >
        View All Closing Soon →
      </Link>
    </div>
  );
};

/**
 * AlmostFundedPanel - Shows loans at 90%+ funding
 */
export const AlmostFundedPanel = ({ maxItems = 5, onInvestClick }) => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlmostFunded();
  }, []);

  const loadAlmostFunded = async () => {
    setLoading(true);
    try {
      const data = await getAlmostFundedLoans();
      setLoans(data.slice(0, maxItems));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-500" />
          <h3 className="font-bold text-gray-900">Almost Funded</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (loans.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          <h3 className="font-bold text-gray-900">Almost Funded</h3>
        </div>
        <span className="text-xs text-gray-500">Last Chance!</span>
      </div>

      <div className="space-y-3">
        {loans.map((loan) => {
          const fundingPercentage = loan.LoanRequest?.funded_amount && loan.LoanRequest?.loan_amount
            ? (loan.LoanRequest.funded_amount / loan.LoanRequest.loan_amount * 100).toFixed(0)
            : 0;
          
          return (
            <div
              key={loan.LoanRequest?.id}
              className="border border-green-100 rounded-lg p-3 hover:border-green-300 hover:shadow-md transition-all duration-200 bg-green-50/50"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900 text-sm truncate flex-1">
                  {loan.LoanRequest?.title || 'Untitled Loan'}
                </h4>
                <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded">
                  {fundingPercentage}% Funded
                </span>
              </div>

              <div className="flex justify-between items-center text-xs text-gray-600 mb-2">
                <span>Return: <strong className="text-green-600">{loan.LoanRequest?.interest_rate}%</strong></span>
                <span className="text-red-500 font-medium">
                  Only {formatCurrency(loan.LoanRequest?.loan_amount - loan.LoanRequest?.funded_amount)} left!
                </span>
              </div>

              <button
                onClick={() => onInvestClick && onInvestClick(loan.LoanRequest?.id)}
                className="w-full py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md flex items-center justify-center gap-1"
              >
                <Clock className="w-3 h-3" />
                Invest Now - Closing Soon!
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * HighYieldPanel - Shows loans with highest interest rates
 */
export const HighYieldPanel = ({ maxItems = 5, onInvestClick }) => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHighYield();
  }, []);

  const loadHighYield = async () => {
    setLoading(true);
    try {
      const data = await getHighYieldOpportunities();
      setLoans(data.slice(0, maxItems));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-purple-500" />
          <h3 className="font-bold text-gray-900">High Yield Opportunities</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (loans.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-500" />
          <h3 className="font-bold text-gray-900">High Yield</h3>
        </div>
        <span className="text-xs text-gray-500">Best Returns</span>
      </div>

      <div className="space-y-3">
        {loans.map((loan) => {
          const fundingPercentage = loan.LoanRequest?.funded_amount && loan.LoanRequest?.loan_amount
            ? (loan.LoanRequest.funded_amount / loan.LoanRequest.loan_amount * 100).toFixed(0)
            : 0;
          
          return (
            <div
              key={loan.LoanRequest?.id}
              className="border border-purple-100 rounded-lg p-3 hover:border-purple-300 hover:shadow-md transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900 text-sm truncate flex-1">
                  {loan.LoanRequest?.title || 'Untitled Loan'}
                </h4>
                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                  {loan.LoanRequest?.interest_rate}% APY
                </span>
              </div>

              <div className="flex justify-between items-center text-xs text-gray-600">
                <span>{formatCurrency(loan.LoanRequest?.loan_amount)}</span>
                <span>{fundingPercentage}% funded</span>
              </div>

              <button
                onClick={() => onInvestClick && onInvestClick(loan.LoanRequest?.id)}
                className="mt-2 w-full py-2 text-sm font-medium text-purple-600 border border-purple-200 hover:bg-purple-50 rounded-md"
              >
                View Details
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HotOpportunitiesPanel;
