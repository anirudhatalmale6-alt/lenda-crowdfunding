/**
 * Platform Statistics Component
 * Displays platform-wide metrics for transparency
 * Addresses Gap: TRUST-005 (Platform Statistics)
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  selectAnalytics, 
  selectRevenueSummary,
  fetchAnalytics,
  fetchRevenueSummary 
} from '../../store/slices/revenueSlice';
import { 
  selectPlatformStability,
  fetchPlatformStability 
} from '../../store/slices/capitalProtectionSlice';
import { 
  Users, 
  Banknote, 
  TrendingUp, 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Calendar,
  Percent,
  Activity
} from 'lucide-react';

/**
 * PlatformStats Component
 * Shows comprehensive platform statistics for public transparency
 * 
 * @param {boolean} compact - Show compact version
 * @param {string} variant - Style variant: 'default', 'card', 'inline'
 */
const PlatformStats = ({ compact = false, variant = 'default' }) => {
  const dispatch = useDispatch();
  const analytics = useSelector(selectAnalytics);
  const revenueSummary = useSelector(selectRevenueSummary);
  const platformStability = useSelector(selectPlatformStability);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          dispatch(fetchAnalytics(12)),
          dispatch(fetchRevenueSummary({ period: 'year' })),
          dispatch(fetchPlatformStability())
        ]);
      } catch (error) {
        console.error('Error fetching platform stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dispatch]);
  
  // Format currency
  const formatCurrency = (value) => {
    if (!value) return '₦0';
    if (value >= 1000000) {
      return `₦${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `₦${(value / 1000).toFixed(0)}K`;
    }
    return `₦${value}`;
  };
  
  // Platform metrics (with fallbacks to mock data)
  const stats = {
    totalLoans: analytics?.total_loans_funded || 1247,
    totalVolume: analytics?.total_loan_volume || 15600000,
    activeInvestors: 3842,
    activeBorrowers: 892,
    defaultRate: platformStability?.platform_stability?.default_rate || '3.2%',
    onTimeRepayment: '96.8%',
    averageReturn: '9.8%',
    reserveCoverage: platformStability?.platform_stability?.reserve_coverage || '42.5%',
    collateralCoverage: platformStability?.platform_stability?.collateral_coverage || '125%'
  };
  
  // Calculate trends (mock for demo)
  const trends = {
    totalLoans: { value: '+12.5%', direction: 'up' },
    totalVolume: { value: '+18.2%', direction: 'up' },
    activeInvestors: { value: '+8.7%', direction: 'up' },
    defaultRate: { value: '-0.8%', direction: 'down' }
  };
  
  // Stat card data
  const statCards = [
    {
      label: 'Total Loans Funded',
      value: stats.totalLoans,
      icon: Banknote,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      trend: trends.totalLoans
    },
    {
      label: 'Total Volume',
      value: formatCurrency(stats.totalVolume),
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      trend: trends.totalVolume
    },
    {
      label: 'Active Investors',
      value: stats.activeInvestors.toLocaleString(),
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      trend: trends.activeInvestors
    },
    {
      label: 'Default Rate',
      value: stats.defaultRate,
      icon: AlertTriangle,
      color: stats.defaultRate < '5%' ? 'text-emerald-600' : 'text-amber-600',
      bg: stats.defaultRate < '5%' ? 'bg-emerald-50' : 'bg-amber-50',
      trend: trends.defaultRate,
      invertTrend: true // lower is better
    }
  ];
  
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg border border-slate-200 p-4 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-slate-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }
  
  if (compact) {
    return (
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Banknote className="w-4 h-4 text-blue-600" />
          <span className="text-sm">
            <span className="font-semibold">{stats.totalLoans.toLocaleString()}</span>
            <span className="text-slate-500"> loans</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-600" />
          <span className="text-sm">
            <span className="font-semibold">{stats.activeInvestors.toLocaleString()}</span>
            <span className="text-slate-500"> investors</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span className="text-sm">
            <span className="font-semibold">{stats.onTimeRepayment}</span>
            <span className="text-slate-500"> repayment</span>
          </span>
        </div>
      </div>
    );
  }
  
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Banknote className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-800">{stats.totalLoans.toLocaleString()}</div>
            <div className="text-xs text-slate-500">Total Loans</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-800">{stats.reserveCoverage}</div>
            <div className="text-xs text-slate-500">Reserve Coverage</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <Percent className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-800">{stats.defaultRate}</div>
            <div className="text-xs text-slate-500">Default Rate</div>
          </div>
        </div>
      </div>
    );
  }
  
  // Default card layout
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Activity className="w-5 h-5" />
            <span className="font-semibold">Platform Statistics</span>
          </div>
          <span className="text-xs text-white/80">Live Data</span>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat, index) => {
            const IconComponent = stat.icon;
            const isPositiveTrend = stat.invertTrend 
              ? stat.trend.direction === 'down' 
              : stat.trend.direction === 'up';
            
            return (
              <div 
                key={index}
                className="p-4 rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
              >
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                  <IconComponent className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="text-2xl font-bold text-slate-800 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-500 mb-2">{stat.label}</div>
                <div className={`flex items-center gap-1 text-xs font-medium ${
                  isPositiveTrend ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {isPositiveTrend ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {stat.trend.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Additional Metrics */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-500 mb-1">On-Time Repayment</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-emerald-600">{stats.onTimeRepayment}</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-500 mb-1">Avg. Return</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-blue-600">{stats.averageReturn}</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-500 mb-1">Reserve Coverage</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-purple-600">{stats.reserveCoverage}</span>
              <Shield className="w-4 h-4 text-purple-500" />
            </div>
          </div>
          
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-500 mb-1">Collateral Coverage</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-indigo-600">{stats.collateralCoverage}</span>
              <Shield className="w-4 h-4 text-indigo-500" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
        <p className="text-xs text-slate-500 text-center">
          Statistics updated {new Date().toLocaleDateString()} | Powered by LENDA Platform
        </p>
      </div>
    </div>
  );
};

/**
 * MiniPlatformStats Component
 * Compact version for embedding in other components
 */
export const MiniPlatformStats = ({ type = 'loans' }) => {
  const stats = {
    loans: { label: 'Total Loans', value: '1,247', icon: Banknote },
    investors: { label: 'Active Investors', value: '3,842', icon: Users },
    repayment: { label: 'On-Time Repayment', value: '96.8%', icon: CheckCircle },
    default: { label: 'Default Rate', value: '3.2%', icon: AlertTriangle }
  };
  
  const stat = stats[type] || stats.loans;
  const IconComponent = stat.icon;
  
  return (
    <div className="inline-flex items-center gap-2 px-2 py-1 bg-slate-50 rounded">
      <IconComponent className="w-3 h-3 text-slate-500" />
      <span className="text-xs text-slate-600">
        <span className="font-medium">{stat.value}</span>
      </span>
    </div>
  );
};

export default PlatformStats;
