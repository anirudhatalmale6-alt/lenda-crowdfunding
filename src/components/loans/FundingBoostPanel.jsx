import React, { useState, useEffect } from 'react';
import { Zap, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { boostLoanRate } from '../../services/acceleratorService';

/**
 * FundingBoostPanel - Allows borrowers to boost their loan funding
 * by increasing the interest rate
 */
const FundingBoostPanel = ({ 
  loanId, 
  currentRate, 
  maxRateIncrease = 5,
  minRateIncrease = 0.5,
  onBoostSuccess,
  onBoostError,
  disabled = false
}) => {
  const [newRate, setNewRate] = useState(currentRate);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const maxAllowedRate = currentRate + maxRateIncrease;
  const minAllowedRate = currentRate + minRateIncrease;

  useEffect(() => {
    setNewRate(minAllowedRate);
  }, [minAllowedRate]);

  const getFundingSpeedEstimate = (rateIncrease) => {
    if (rateIncrease >= 3) return { text: 'Very Fast', color: 'text-green-600', bg: 'bg-green-100' };
    if (rateIncrease >= 2) return { text: 'Fast', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (rateIncrease >= 1) return { text: 'Moderate', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { text: 'Standard', color: 'text-gray-600', bg: 'bg-gray-100' };
  };

  const handleRateChange = (e) => {
    const value = parseFloat(e.target.value);
    if (value >= minAllowedRate && value <= maxAllowedRate) {
      setNewRate(value);
      setError(null);
    } else if (value > maxAllowedRate) {
      setError(`Rate cannot exceed ${maxAllowedRate}%`);
    }
  };

  const handleBoost = async () => {
    if (newRate <= currentRate) {
      setError('New rate must be higher than current rate');
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await boostLoanRate(loanId, newRate);
      if (result.success) {
        setMessage('Interest rate boosted successfully!');
        if (onBoostSuccess) {
          onBoostSuccess(result);
        }
      } else {
        setError(result.message || 'Failed to boost rate');
        if (onBoostError) {
          onBoostError(result);
        }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'An error occurred';
      setError(errorMsg);
      if (onBoostError) {
        onBoostError(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const rateIncrease = newRate - currentRate;
  const speedEstimate = getFundingSpeedEstimate(rateIncrease);

  if (disabled) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-500">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Rate Boost Unavailable</span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Rate boost is only available for approved loans that are not yet fully funded.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-amber-600" />
        <h3 className="font-bold text-gray-900">Funding Boost</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Increase your interest rate to attract more investors and fund your loan faster.
      </p>

      {/* Current Rate Display */}
      <div className="bg-white rounded-md p-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Current Rate</span>
          <span className="font-bold text-gray-900">{currentRate}%</span>
        </div>
      </div>

      {/* Rate Slider */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          New Interest Rate: <span className="text-amber-600 font-bold">{newRate}%</span>
        </label>
        <input
          type="range"
          min={minAllowedRate}
          max={maxAllowedRate}
          step={0.5}
          value={newRate}
          onChange={handleRateChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
          disabled={isLoading}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{minAllowedRate}% (min)</span>
          <span>{maxAllowedRate}% (max)</span>
        </div>
      </div>

      {/* Rate Increase Display */}
      <div className="bg-white rounded-md p-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Rate Increase</span>
          <span className="font-bold text-green-600">+{rateIncrease.toFixed(1)}%</span>
        </div>
      </div>

      {/* Funding Speed Estimate */}
      <div className={`rounded-md p-3 mb-4 ${speedEstimate.bg}`}>
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${speedEstimate.color}`} />
          <span className={`text-sm font-medium ${speedEstimate.color}`}>
            Predicted Funding Speed: <strong>{speedEstimate.text}</strong>
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Success Message */}
      {message && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">{message}</span>
          </div>
        </div>
      )}

      {/* Boost Button */}
      <button
        onClick={handleBoost}
        disabled={isLoading || newRate <= currentRate}
        className={`
          w-full py-3 px-4 rounded-md font-medium
          flex items-center justify-center gap-2
          transition-colors duration-200
          ${isLoading || newRate <= currentRate
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
          }
        `}
      >
        {isLoading ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            Processing...
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            Boost Interest Rate
          </>
        )}
      </button>

      {/* Info Box */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-xs text-blue-700">
          <strong>Note:</strong> Rate increases are permanent and will apply to all future 
          repayments. This can help your loan get funded 2-3x faster.
        </p>
      </div>
    </div>
  );
};

export default FundingBoostPanel;
