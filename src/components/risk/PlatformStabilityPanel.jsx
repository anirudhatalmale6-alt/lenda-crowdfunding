import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPlatformStability, selectPlatformStability, selectStabilityLoading } from '../../store/slices/capitalProtectionSlice';
import { formatCurrency } from '../../utils/formatters';

/**
 * Platform Stability Panel
 * Component for investor transparency - shows platform health metrics
 */
const PlatformStabilityPanel = ({ compact = false }) => {
  const dispatch = useDispatch();
  const stability = useSelector(selectPlatformStability);
  const loading = useSelector(selectStabilityLoading);

  useEffect(() => {
    dispatch(fetchPlatformStability());
  }, [dispatch]);

  const getHealthColor = (health) => {
    switch (health) {
      case 'Strong': return 'green';
      case 'Healthy': return 'blue';
      case 'Caution': return 'yellow';
      case 'Warning': return 'orange';
      case 'Critical': return 'red';
      default: return 'gray';
    }
  };

  const getHealthBgColor = (health) => {
    switch (health) {
      case 'Strong': return 'bg-green-50';
      case 'Healthy': return 'bg-blue-50';
      case 'Caution': return 'bg-yellow-50';
      case 'Warning': return 'bg-orange-50';
      case 'Critical': return 'bg-red-50';
      default: return 'bg-gray-50';
    }
  };

  if (loading && !stability) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  const data = stability?.platform_stability || {};
  const healthColor = getHealthColor(data.system_health);
  const healthBgColor = getHealthBgColor(data.system_health);
  const reserveCoverageValue = Number.parseFloat(data.reserve_coverage) || 0;
  const defaultRateValue = Number.parseFloat(data.default_rate) || 0;
  const collateralCoverageValue = Number.parseFloat(data.collateral_coverage) || 0;
  const guaranteeReserveValue = Number.parseFloat(data.guarantee_reserve) || 0;
  const outstandingLoansValue = Number.parseFloat(data.outstanding_loans) || 0;

  const formatCompactMillions = (amount) => {
    if (!amount) return formatCurrency(0);
    if (amount >= 1000000) {
      return `${formatCurrency(amount / 1000000)}M`;
    }

    return formatCurrency(amount);
  };

  if (compact) {
    // Compact view for embedding in other pages
    return (
      <div className={`p-4 rounded-lg border ${healthBgColor} border-${healthColor}-200`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full bg-${healthColor}-500`}></div>
            <span className="font-medium text-gray-900">Platform Health: {data.system_health}</span>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Reserve Coverage</div>
            <div className="font-bold text-gray-900">{reserveCoverageValue}%</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-lg border ${healthBgColor} border-${healthColor}-200`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Platform Stability</h3>
          <p className="text-sm text-gray-500">Real-time platform health metrics</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium bg-${healthColor}-100 text-${healthColor}-800`}>
          {data.system_health}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4">
        {/* Reserve Coverage */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Reserve Coverage</div>
          <div className="text-2xl font-bold text-gray-900">{reserveCoverageValue}%</div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full bg-${
                  reserveCoverageValue >= 40 ? 'green' :
                  reserveCoverageValue >= 25 ? 'blue' :
                  reserveCoverageValue >= 15 ? 'yellow' : 'red'
                }-500`}
                style={{ width: `${Math.min(reserveCoverageValue, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Default Rate */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Default Rate</div>
          <div className="text-2xl font-bold text-gray-900">{defaultRateValue}%</div>
          <div className="mt-2 text-xs text-gray-500">
            {defaultRateValue <= 5 ? 'Low risk' : 
             defaultRateValue <= 10 ? 'Moderate' : 'Elevated'}
          </div>
        </div>

        {/* Collateral Coverage */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Collateral Coverage</div>
          <div className="text-2xl font-bold text-gray-900">{collateralCoverageValue}%</div>
          <div className="mt-2 text-xs text-gray-500">
            {collateralCoverageValue >= 100 ? 'Fully covered' : 
             collateralCoverageValue >= 70 ? 'Well covered' : 'Needs attention'}
          </div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Guarantee Reserve:</span>
            <span className="ml-2 font-medium text-gray-900">
              {formatCompactMillions(guaranteeReserveValue)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Outstanding Loans:</span>
            <span className="ml-2 font-medium text-gray-900">
              {formatCompactMillions(outstandingLoansValue)}
            </span>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="mt-4 text-xs text-gray-400 text-right">
        Last updated: {data.updated_at ? new Date(data.updated_at).toLocaleString() : 'N/A'}
      </div>
    </div>
  );
};

export default PlatformStabilityPanel;
