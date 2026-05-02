/**
 * Collateral Verification Badge Component
 * Displays collateral verification status for loans
 * Addresses Gap: TRUST-004 (Collateral Verification Badges)
 */

import React from 'react';
import { 
  Shield, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Building, 
  Car, 
  Gem,
  Home,
  Briefcase
} from 'lucide-react';

/**
 * Verification Status Configuration
 */
const VERIFICATION_STATUS = {
  verified: {
    label: 'Verified',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: CheckCircle,
    description: 'Collateral has been verified by our team'
  },
  pending: {
    label: 'Pending',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: Clock,
    description: 'Verification in progress'
  },
  pending_review: {
    label: 'Under Review',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: Clock,
    description: 'Currently under review'
  },
  not_verified: {
    label: 'Not Verified',
    color: 'text-slate-500',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    icon: AlertTriangle,
    description: 'No verification performed'
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: AlertTriangle,
    description: 'Verification rejected'
  }
};

/**
 * Collateral Type Icons
 */
const COLLATERAL_ICONS = {
  'real_estate': Home,
  'property': Home,
  'vehicle': Car,
  'car': Car,
  'equipment': Briefcase,
  'machinery': Briefcase,
  'inventory': Building,
  'stock': Building,
  'accounts_receivable': FileText,
  'cash': Building,
  'gold': Gem,
  'jewelry': Gem,
  'stocks': Building,
  'bonds': Building,
  'default': Shield
};

/**
 * Get collateral type icon
 */
const getCollateralIcon = (type) => {
  const icon = COLLATERAL_ICONS[type?.toLowerCase().replace(' ', '_')] || COLLATERAL_ICONS.default;
  return icon;
};

/**
 * CollateralVerificationBadge Component
 * Shows verification status badge for collateral
 * 
 * @param {string} status - Verification status: 'verified', 'pending', 'pending_review', 'not_verified', 'rejected'
 * @param {string} collateralType - Type of collateral
 * @param {boolean} showLabel - Show status label
 * @param {boolean} compact - Compact mode
 * @param {boolean} showDetails - Show detailed information
 */
const CollateralVerificationBadge = ({ 
  status = 'verified',
  collateralType = 'Real Estate',
  showLabel = true,
  compact = false,
  showDetails = false
}) => {
  const config = VERIFICATION_STATUS[status] || VERIFICATION_STATUS.not_verified;
  const IconComponent = config.icon;
  const CollateralIcon = getCollateralIcon(collateralType);
  
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bg} ${config.color}`}>
        <IconComponent className="w-3 h-3" />
        <span className="text-xs font-medium">{config.label}</span>
      </div>
    );
  }
  
  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} p-3`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-white ${config.color}`}>
          <IconComponent className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-semibold ${config.color}`}>
              {config.label}
            </span>
            {showLabel && (
              <span className="text-xs text-slate-500">
                Collateral
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CollateralIcon className="w-4 h-4" />
            <span>{collateralType}</span>
          </div>
          
          {showDetails && (
            <div className="mt-2 pt-2 border-t border-slate-200/50">
              <p className="text-xs text-slate-600">
                {config.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * VerificationDetail Component
 * Shows detailed verification breakdown
 * 
 * @param {Object} props
 * @param {boolean} props.ownership - Ownership verified
 * @param {boolean} props.value - Value verified
 * @param {boolean} props.legality - Legal status verified
 * @param {boolean} props.condition - Condition verified
 */
export const VerificationDetail = ({ 
  ownership = false, 
  value = false, 
  legality = false, 
  condition = false 
}) => {
  const checks = [
    { label: 'Ownership Verified', verified: ownership, icon: FileText },
    { label: 'Value Assessed', verified: value, icon: Building },
    { label: 'Legal Status Clear', verified: legality, icon: Shield },
    { label: 'Condition Verified', verified: condition, icon: CheckCircle }
  ];
  
  return (
    <div className="space-y-2">
      {checks.map((check, index) => {
        const IconComponent = check.icon;
        return (
          <div 
            key={index}
            className={`flex items-center gap-3 p-2 rounded-lg ${
              check.verified ? 'bg-emerald-50' : 'bg-slate-50'
            }`}
          >
            <div className={`p-1 rounded ${check.verified ? 'bg-emerald-100' : 'bg-slate-200'}`}>
              {check.verified ? (
                <CheckCircle className="w-3 h-3 text-emerald-600" />
              ) : (
                <Clock className="w-3 h-3 text-slate-400" />
              )}
            </div>
            <span className={`text-sm ${check.verified ? 'text-emerald-700' : 'text-slate-500'}`}>
              {check.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/**
 * CollateralBadge Component
 * Compact collateral info badge
 * 
 * @param {string} type - Collateral type
 * @param {string} value - Collateral value
 * @param {string} status - Verification status
 */
export const CollateralBadge = ({ 
  type = 'Real Estate', 
  value = '$0',
  status = 'not_verified'
}) => {
  const config = VERIFICATION_STATUS[status] || VERIFICATION_STATUS.not_verified;
  const IconComponent = getCollateralIcon(type);
  
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg">
      <div className="p-1 bg-slate-100 rounded">
        <IconComponent className="w-3 h-3 text-slate-600" />
      </div>
      <span className="text-sm font-medium text-slate-700">{type}</span>
      <span className="text-xs text-slate-500">•</span>
      <span className="text-sm text-slate-600">{value}</span>
      <div className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
    </div>
  );
};

/**
 * MultipleCollateralBadge Component
 * Shows badges for multiple collateral items
 * 
 * @param {Array} collaterals - Array of collateral objects { type, value, status }
 */
export const MultipleCollateralBadge = ({ collaterals = [] }) => {
  if (!collaterals || collaterals.length === 0) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-500">No collateral</span>
      </div>
    );
  }
  
  return (
    <div className="flex flex-wrap gap-2">
      {collaterals.map((collateral, index) => (
        <CollateralBadge
          key={index}
          type={collateral.type}
          value={collateral.value}
          status={collateral.status}
        />
      ))}
    </div>
  );
};

export default CollateralVerificationBadge;
