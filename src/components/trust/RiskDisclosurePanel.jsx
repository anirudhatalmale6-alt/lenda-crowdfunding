/**
 * Risk Disclosure Panel Component
 * Provides comprehensive risk disclosure for investors and borrowers
 * Addresses Gap: 11.2 Risk disclosure (Basic - Low severity)
 */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectPlatformStability } from '../../store/slices/capitalProtectionSlice';
import { selectBorrowerRiskScore } from '../../store/slices/riskSlice';

/**
 * RiskDisclosurePanel Component
 * Shows detailed risk disclosures for transparency
 * 
 * @param {string} userType - Type of user: 'investor' | 'borrower'
 * @param {boolean} expanded - Start with expanded sections
 */
const RiskDisclosurePanel = ({ userType = 'investor', expanded = false }) => {
  const [expandedSections, setExpandedSections] = useState(
    expanded ? ['investment', 'platform', 'smart-contract', 'regulatory'] : []
  );
  const platformStability = useSelector(selectPlatformStability);
  const borrowerRisk = useSelector(selectBorrowerRiskScore);

  const platformData = platformStability?.platform_stability || {};

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  // Risk categories for investors
  const investorRisks = [
    {
      id: 'capital',
      title: 'Capital Risk',
      icon: 'currency',
      description: 'You may lose some or all of your invested capital.',
      details: 'The value of your investment can go up or down. While we have risk mitigation measures in place, there is no guarantee that your investment will generate returns or that you will recover your principal.',
      severity: 'high',
      mitigation: 'LENDA maintains a Reserve Fund to cover defaults. Diversify your portfolio across multiple loans.'
    },
    {
      id: 'default',
      title: 'Borrower Default Risk',
      icon: 'user',
      description: 'Borrowers may fail to repay their loans.',
      details: 'Each loan carries a risk of default. Our risk assessment system evaluates borrowers but cannot guarantee repayment. Default rates vary based on loan type, borrower creditworthiness, and economic conditions.',
      severity: 'high',
      mitigation: 'Review borrower credit scores and loan details carefully. Our LENDA Guarantee covers eligible defaults.'
    },
    {
      id: 'liquidity',
      title: 'Liquidity Risk',
      icon: 'clock',
      description: 'You may not be able to sell your investment quickly.',
      details: 'The secondary market may not have sufficient buyers. Token sales may take time and the price may be lower than your original investment.',
      severity: 'medium',
      mitigation: 'Plan to hold investments for the full loan term. Use the secondary market only when necessary.'
    },
    {
      id: 'platform',
      title: 'Platform Risk',
      icon: 'globe',
      description: 'The platform may experience technical issues or shutdown.',
      details: 'Technical failures, cyberattacks, or regulatory actions could affect platform operations.',
      severity: 'low',
      mitigation: 'We maintain robust security measures, regular backups, and business continuity plans.'
    }
  ];

  // Risk categories for borrowers
  const borrowerRisks = [
    {
      id: 'repayment',
      title: 'Repayment Obligation',
      icon: 'currency',
      description: 'You are obligated to repay the loan regardless of circumstances.',
      details: 'Failure to repay can result in collateral liquidation, damage to credit score, and legal action.',
      severity: 'high',
      mitigation: 'Ensure you can afford the monthly payments before taking a loan. Consider emergency funds.'
    },
    {
      id: 'collateral',
      title: 'Collateral Risk',
      icon: 'lock',
      description: 'Your collateral may be liquidated if you default.',
      details: 'Upon default, your collateral may be sold at auction to recover the outstanding balance.',
      severity: 'high',
      mitigation: 'Maintain regular payments. Contact us early if you anticipate payment difficulties.'
    },
    {
      id: 'interest',
      title: 'Interest Rate Risk',
      icon: 'chart',
      description: 'Interest rates may increase during your loan term.',
      details: 'Fixed-rate loans protect you from rate increases. Variable rates may result in higher payments.',
      severity: 'medium',
      mitigation: 'Consider fixed-rate options when available. Budget for potential rate adjustments.'
    }
  ];

  // Additional disclosures
  const additionalDisclosures = [
    {
      id: 'smart-contract',
      title: 'Smart Contract Risks',
      icon: 'code',
      content: 'Smart contracts are subject to code vulnerabilities. While we audit our contracts, exploits may occur. The Reserve Fund provides some protection, but losses may not be recoverable.'
    },
    {
      id: 'regulatory',
      title: 'Regulatory Uncertainty',
      icon: 'scale',
      content: 'Cryptocurrency and lending regulations are evolving. Future regulatory changes may affect platform operations, token values, or your ability to participate.'
    },
    {
      id: 'tax',
      title: 'Tax Implications',
      icon: 'document',
      content: 'Interest income and capital gains may be taxable. Consult a tax professional for advice specific to your jurisdiction.'
    },
    {
      id: 'volatility',
      title: 'Market Volatility',
      icon: 'chart',
      content: 'Crypto asset prices can be highly volatile. The value of your investment and returns may fluctuate significantly based on market conditions.'
    },
    {
      id: 'counterparty',
      title: 'Counterparty Risk',
      icon: 'users',
      content: 'You are exposed to the credit risk of other platform users. If a counterparty fails to meet their obligations, you may incur losses.'
    },
    {
      id: 'technology',
      title: 'Technology Risks',
      icon: 'cpu',
      content: 'Platform operations depend on blockchain technology, smart contracts, and third-party services. Technical failures, bugs, or hacks could result in financial losses.'
    }
  ];

  const risks = userType === 'borrower' ? borrowerRisks : investorRisks;

  // Get severity badge color
  const getSeverityColor = (severity) => {
    const colors = {
      high: 'bg-red-100 text-red-700 border-red-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      low: 'bg-green-100 text-green-700 border-green-200'
    };
    return colors[severity] || colors.medium;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-red-50 border-b border-red-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-800">Risk Disclosure</h3>
            <p className="text-sm text-red-600">
              {userType === 'investor' 
                ? 'Important information about investment risks'
                : 'Important information about borrowing risks'}
            </p>
          </div>
        </div>
      </div>

      {/* Current Risk Metrics */}
      {userType === 'investor' && platformData.default_rate && (
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h4 className="text-sm font-semibold text-slate-800 mb-3">Platform Risk Metrics</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-white rounded border border-slate-200">
              <div className="text-lg font-bold text-slate-800">{platformData.default_rate || '3.2%'}</div>
              <div className="text-xs text-slate-500">Default Rate</div>
            </div>
            <div className="text-center p-3 bg-white rounded border border-slate-200">
              <div className="text-lg font-bold text-slate-800">{platformData.reserve_coverage || '42.5%'}</div>
              <div className="text-xs text-slate-500">Reserve Coverage</div>
            </div>
            <div className="text-center p-3 bg-white rounded border border-slate-200">
              <div className="text-lg font-bold text-slate-800">{platformData.collateral_coverage || '125%'}</div>
              <div className="text-xs text-slate-500">Collateral Coverage</div>
            </div>
          </div>
        </div>
      )}

      {/* Risk Categories */}
      <div className="divide-y divide-slate-200">
        {risks.map((risk) => (
          <div key={risk.id} className="px-6 py-4">
            <button
              onClick={() => toggleSection(risk.id)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  risk.severity === 'high' ? 'bg-red-100' : 
                  risk.severity === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
                }`}>
                  <svg className={`w-4 h-4 ${
                    risk.severity === 'high' ? 'text-red-600' : 
                    risk.severity === 'medium' ? 'text-yellow-600' : 'text-green-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-slate-800">{risk.title}</h4>
                  <p className="text-sm text-slate-500">{risk.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full border ${getSeverityColor(risk.severity)}`}>
                  {risk.severity.charAt(0).toUpperCase() + risk.severity.slice(1)} Risk
                </span>
                <svg 
                  className={`w-5 h-5 text-slate-400 transition-transform ${
                    expandedSections.includes(risk.id) ? 'rotate-180' : ''
                  }`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Expanded Details */}
            {expandedSections.includes(risk.id) && (
              <div className="mt-4 pl-11">
                <p className="text-sm text-slate-600 mb-3">{risk.details}</p>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div>
                      <h5 className="text-sm font-semibold text-emerald-800">Risk Mitigation</h5>
                      <p className="text-xs text-emerald-700 mt-1">{risk.mitigation}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Additional Disclosures */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
        <h4 className="text-sm font-semibold text-slate-800 mb-3">Additional Disclosures</h4>
        <div className="space-y-3">
          {additionalDisclosures.map((disclosure) => (
            <div key={disclosure.id} className="p-3 bg-white rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h5 className="text-sm font-medium text-slate-700">{disclosure.title}</h5>
              </div>
              <p className="text-xs text-slate-500">{disclosure.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Acknowledgment */}
      <div className="px-6 py-4 border-t border-slate-200">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="risk-acknowledgment"
            className="mt-1 w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
          />
          <label htmlFor="risk-acknowledgment" className="text-sm text-slate-600">
            I acknowledge that I have read and understood the risk disclosures above. 
            I am aware that investing/borrowing involves risks and I may lose my invested capital/be subject to collateral liquidation.
          </label>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="px-6 py-3 bg-slate-100 text-center">
        <p className="text-xs text-slate-500">
          This information is for educational purposes only and does not constitute financial advice. 
          Please consult with a qualified financial advisor before making investment decisions.
        </p>
      </div>
    </div>
  );
};

export default RiskDisclosurePanel;
