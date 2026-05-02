/**
 * Insurance Guarantee Display Component
 * Displays platform insurance and guarantee information for investors
 * Addresses Gap: 11.1 Insurance guarantee display (Not implemented - Medium severity)
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { 
  selectReserveStatus, 
  selectCoverageRatio, 
  selectPlatformStability 
} from '../../store/slices/capitalProtectionSlice';

/**
 * InsuranceGuaranteeDisplay Component
 * Shows the LENDA Guarantee protection details
 * 
 * @param {boolean} compact - Show compact version
 * @param {string} type - Type of display: 'investor' | 'borrower' | 'public'
 */
const InsuranceGuaranteeDisplay = ({ compact = false, type = 'public' }) => {
  const reserveStatus = useSelector(selectReserveStatus);
  const coverageRatio = useSelector(selectCoverageRatio);
  const platformStability = useSelector(selectPlatformStability);

  // Get data from store or use defaults
  const guaranteeReserve = reserveStatus?.reserve_status?.total?.balance || 2500000;
  const coverage = coverageRatio?.coverage_ratio?.coverage_ratio || 42.5;
  const platformData = platformStability?.platform_stability || {};

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get coverage status color
  const getCoverageColor = (ratio) => {
    if (ratio >= 40) return 'green';
    if (ratio >= 25) return 'blue';
    if (ratio >= 15) return 'yellow';
    return 'red';
  };

  // Coverage description based on type
  const getCoverageDescription = () => {
    if (type === 'investor') {
      return 'Your investments are protected by the LENDA Guarantee Reserve, which covers defaults up to the specified limit.';
    } else if (type === 'borrower') {
      return 'The platform maintains a reserve fund to ensure loan liquidity and timely disbursements.';
    }
    return 'The platform maintains a reserve fund to protect investor interests and ensure platform stability.';
  };

  // Coverage percentage details
  const getCoverageDetails = () => {
    return [
      { label: 'Reserve Coverage', value: `${coverage}%`, status: getCoverageColor(coverage) },
      { label: 'Guarantee Reserve', value: formatCurrency(guaranteeReserve), status: 'default' },
      { label: 'Default Rate', value: platformData.default_rate || '3.2%', status: 'default' },
      { label: 'Collateral Coverage', value: platformData.collateral_coverage || '125%', status: 'default' }
    ];
  };

  if (compact) {
    const coverageColor = getCoverageColor(coverage);
    
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg p-4 border border-emerald-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <span className="text-sm font-semibold text-slate-800">LENDA Guarantee</span>
              <span className="text-xs text-slate-500 ml-2">({coverage}% coverage)</span>
            </div>
          </div>
          <div className={`px-2 py-1 rounded text-xs font-medium bg-${coverageColor}-100 text-${coverageColor}-700`}>
            Active
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-blue-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="text-white">
            <h3 className="text-lg font-bold">LENDA Guarantee</h3>
            <p className="text-sm text-white/80">Investor Protection Program</p>
          </div>
        </div>
      </div>

      {/* Coverage Status Banner */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-slate-600">Current Reserve Coverage:</span>
            <span className={`ml-2 text-lg font-bold text-${getCoverageColor(coverage)}-600`}>
              {coverage}%
            </span>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium bg-${getCoverageColor(coverage)}-100 text-${getCoverageColor(coverage)}-700`}>
            Protection Active
          </div>
        </div>
        
        {/* Coverage Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full bg-${getCoverageColor(coverage)}-500 transition-all`}
              style={{ width: `${Math.min(coverage, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-1 text-xs text-slate-500">
            <span>0%</span>
            <span>15% Min</span>
            <span>40% Target</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {getCoverageDetails().map((detail, index) => (
            <div key={index} className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">{detail.label}</div>
              <div className={`text-lg font-bold ${
                detail.status !== 'default' 
                  ? `text-${detail.status}-600` 
                  : 'text-slate-800'
              }`}>
                {detail.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coverage Description */}
      <div className="px-6 py-4 bg-emerald-50 border-t border-emerald-100">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-emerald-800">How the LENDA Guarantee Works</h4>
            <p className="text-xs text-emerald-700 mt-1">{getCoverageDescription()}</p>
          </div>
        </div>
      </div>

      {/* Coverage Limits */}
      <div className="px-6 py-4 border-t border-slate-200">
        <h4 className="text-sm font-semibold text-slate-800 mb-3">Coverage Limits</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">Per-investor maximum:</span>
            <span className="font-medium text-slate-800">$50,000</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">Loan default coverage:</span>
            <span className="font-medium text-slate-800">Up to 100% of principal</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">Interest coverage:</span>
            <span className="font-medium text-slate-800">Up to 30 days</span>
          </div>
        </div>
      </div>

      {/* Important Disclaimer */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          <strong>Disclaimer:</strong> The LENDA Guarantee is funded from the platform reserve and is subject to terms and conditions. Past performance does not guarantee future results. Please read the full terms before investing.
        </p>
      </div>
    </div>
  );
};

// Compact version for loan cards
export const GuaranteeBadge = ({ coverage = 42.5 }) => {
  const getCoverageColor = (ratio) => {
    if (ratio >= 40) return 'green';
    if (ratio >= 25) return 'blue';
    if (ratio >= 15) return 'yellow';
    return 'red';
  };
  
  const color = getCoverageColor(coverage);
  
  return (
    <div 
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${color}-100 text-${color}-700`}
      title="Protected by LENDA Guarantee"
    >
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      <span>Guaranteed</span>
    </div>
  );
};

export default InsuranceGuaranteeDisplay;
