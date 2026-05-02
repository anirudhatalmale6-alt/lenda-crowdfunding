/**
 * Platform Security Badges Component
 * Displays security certifications and trust indicators
 */

import React from 'react';
import { Shield, Lock, CheckCircle, Award, FileText, Globe } from 'lucide-react';

const PlatformSecurityBadges = ({ 
  showDetails = false, 
  layout = 'horizontal',
  size = 'medium'
}) => {
  const badges = [
    {
      id: 'encryption',
      icon: Lock,
      label: '256-bit Encryption',
      description: 'All data encrypted at rest and in transit',
      verified: true,
      color: 'green'
    },
    {
      id: 'compliance',
      icon: FileText,
      label: 'SOC 2 Type II',
      description: 'Security compliance certified',
      verified: true,
      color: 'blue'
    },
    {
      id: 'kyc',
      icon: Shield,
      label: 'KYC Verified',
      description: 'All borrowers verified through KYC process',
      verified: true,
      color: 'green'
    },
    {
      id: 'aml',
      icon: CheckCircle,
      label: 'AML Compliant',
      description: 'Anti-money laundering measures in place',
      verified: true,
      color: 'green'
    },
    {
      id: 'audit',
      icon: Award,
      label: 'Audited Smart Contracts',
      description: 'Third-party security audit completed',
      verified: true,
      color: 'blue'
    },
    {
      id: 'jurisdiction',
      icon: Globe,
      label: 'Regulated Jurisdiction',
      description: 'Operating under regulatory oversight',
      verified: false,
      color: 'yellow'
    }
  ];

  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    medium: 'text-sm px-3 py-2',
    large: 'text-base px-4 py-3'
  };

  const iconSizes = {
    small: 16,
    medium: 20,
    large: 24
  };

  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    red: 'bg-red-100 text-red-800 border-red-200'
  };

  const containerClasses = layout === 'horizontal' 
    ? 'flex flex-wrap gap-2' 
    : 'flex flex-col gap-2';

  return (
    <div className="platform-security-badges">
      <div className={containerClasses}>
        {badges.map((badge) => {
          const Icon = badge.icon;
          return (
            <div
              key={badge.id}
              className={`
                flex items-center gap-2 rounded-lg border
                ${colorClasses[badge.color]}
                ${sizeClasses[size]}
              `}
              title={showDetails ? badge.description : undefined}
            >
              <Icon size={iconSizes[size]} />
              <span className="font-medium">{badge.label}</span>
              {badge.verified && (
                <CheckCircle size={iconSizes[size] - 4} className="text-green-600" />
              )}
            </div>
          );
        })}
      </div>

      {showDetails && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">
            Security Commitment
          </h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Funds held in regulated escrow accounts</li>
            <li>• Two-factor authentication required for all transactions</li>
            <li>• Biometric verification for large withdrawals</li>
            <li>• 24/7 fraud monitoring with AI detection</li>
            <li>• Insurance coverage for digital assets</li>
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * Compact Security Badges - Smaller version for footers/headers
 */
export const CompactSecurityBadges = ({ showDetails = false }) => {
  const compactBadges = [
    { icon: Lock, label: 'Encrypted', color: 'green' },
    { icon: Shield, label: 'KYC Verified', color: 'green' },
    { icon: Award, label: 'Audited', color: 'blue' }
  ];

  return (
    <div className="flex items-center gap-3">
      {compactBadges.map((badge, idx) => {
        const Icon = badge.icon;
        return (
          <div
            key={idx}
            className={`flex items-center gap-1 text-xs text-${badge.color}-600`}
            title={showDetails ? badge.label : undefined}
          >
            <Icon size={14} />
            <span>{badge.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default PlatformSecurityBadges;
