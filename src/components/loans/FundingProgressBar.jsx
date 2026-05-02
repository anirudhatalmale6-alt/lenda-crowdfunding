import { useState, useEffect } from 'react';
import { DollarSign, Users, Clock, TrendingUp, AlertCircle } from 'lucide-react';

/**
 * FundingProgressBar - Display loan funding progress
 * 
 * @param {Object} props
 * @param {number} props.totalAmount - Total loan amount
 * @param {number} props.fundedAmount - Amount currently funded
 * @param {number} props.funderCount - Number of funders
 * @param {string} props.status - Loan status
 * @param {string} props.endDate - Funding end date
 * @param {boolean} props.compact - Show compact version
 */
function FundingProgressBar({ 
    totalAmount, 
    fundedAmount, 
    funderCount = 0, 
    status = 'active',
    endDate,
    compact = false 
}) {
    const [animatedProgress, setAnimatedProgress] = useState(0);
    
    // Calculate progress percentage
    const progress = totalAmount > 0 ? (fundedAmount / totalAmount) * 100 : 0;
    const remaining = totalAmount - fundedAmount;
    
    // Animate progress on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedProgress(progress);
        }, 100);
        return () => clearTimeout(timer);
    }, [progress]);
    
    // Get status color
    const getStatusColor = () => {
        switch (status) {
            case 'funded':
            case 'active':
                return 'bg-emerald-500';
            case 'partially_funded':
                return 'bg-primary-500';
            case 'expired':
            case 'failed':
                return 'bg-red-500';
            default:
                return 'bg-slate-400';
        }
    };
    
    // Get progress bar color based on percentage
    const getProgressColor = () => {
        if (progress >= 100) return 'bg-emerald-500';
        if (progress >= 90) return 'bg-gradient-to-r from-green-400 to-emerald-500';
        if (progress >= 75) return 'bg-gradient-to-r from-orange-400 to-red-500';
        if (progress >= 50) return 'bg-gradient-to-r from-yellow-400 to-orange-500';
        if (progress >= 25) return 'bg-amber-400';
        return 'bg-amber-500';
    };
    
    // Get accelerator stage
    const getAcceleratorStage = () => {
        if (progress >= 90) return { stage: 'almost_funded', label: 'Almost Funded!', color: 'text-green-600', bg: 'bg-green-50' };
        if (progress >= 75) return { stage: 'hot', label: 'Hot!', color: 'text-orange-600', bg: 'bg-orange-50' };
        if (progress >= 50) return { stage: 'trending', label: 'Trending', color: 'text-yellow-600', bg: 'bg-yellow-50' };
        return null;
    };
    
    const acceleratorStage = getAcceleratorStage();
    
    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };
    
    // Calculate days remaining
    const getDaysRemaining = () => {
        if (!endDate) return null;
        const now = new Date();
        const end = new Date(endDate);
        const diffTime = end - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };
    
    const daysRemaining = getDaysRemaining();
    const isFullyFunded = progress >= 100;
    const isAtRisk = daysRemaining !== null && daysRemaining <= 7 && !isFullyFunded;
    const isAlmostFunded = progress >= 90 && progress < 100;
    
    if (compact) {
        return (
            <div className="flex items-center gap-3">
                <div className="flex-1">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className={`h-full ${getProgressColor()} transition-all duration-500`}
                            style={{ width: `${Math.min(animatedProgress, 100)}%` }}
                        />
                    </div>
                </div>
                <span className="text-sm font-medium text-slate-600">
                    {progress.toFixed(0)}%
                </span>
            </div>
        );
    }
    
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            {/* Accelerator Stage Badge */}
            {acceleratorStage && (
                <div className={`mb-4 p-3 rounded-lg ${acceleratorStage.bg} border border-${acceleratorStage.stage === 'almost_funded' ? 'green' : acceleratorStage.stage === 'hot' ? 'orange' : 'yellow'}-200`}>
                    <div className="flex items-center gap-2">
                        <span className={`font-bold ${acceleratorStage.color}`}>
                            {acceleratorStage.stage === 'almost_funded' ? '🎉' : acceleratorStage.stage === 'hot' ? '🔥' : '⚡'}
                        </span>
                        <span className={`font-semibold ${acceleratorStage.color}`}>
                            {acceleratorStage.label}
                        </span>
                        <span className="text-sm text-slate-600">
                            {acceleratorStage.stage === 'almost_funded' 
                                ? `- Only ${formatCurrency(remaining)} to go!`
                                : acceleratorStage.stage === 'hot'
                                ? '- Closing soon!'
                                : '- Gaining momentum!'
                            }
                        </span>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary-500" />
                    Funding Progress
                </h3>
                {isFullyFunded && (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                        Fully Funded
                    </span>
                )}
                {isAtRisk && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Ending Soon
                    </span>
                )}
            </div>
            
            {/* Progress Bar */}
            <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden mb-4">
                <div 
                    className={`absolute left-0 top-0 h-full ${getProgressColor()} transition-all duration-700 ease-out`}
                    style={{ width: `${Math.min(animatedProgress, 100)}%` }}
                />
                {/* Funding milestones */}
                {[25, 50, 75, 90].map(milestone => (
                    <div 
                        key={milestone}
                        className={`absolute top-0 h-full w-0.5 ${
                            milestone === 50 ? 'bg-yellow-400/50' :
                            milestone === 75 ? 'bg-orange-400/50' :
                            milestone === 90 ? 'bg-green-400/50' :
                            'bg-white/50'
                        }`}
                        style={{ left: `${milestone}%` }}
                    />
                ))}
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-xs">Funded</span>
                    </div>
                    <div className="text-lg font-bold text-slate-900">
                        {formatCurrency(fundedAmount)}
                    </div>
                    <div className="text-xs text-slate-500">
                        of {formatCurrency(totalAmount)}
                    </div>
                </div>
                
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
                        <Users className="w-4 h-4" />
                        <span className="text-xs">Investors</span>
                    </div>
                    <div className="text-lg font-bold text-slate-900">
                        {funderCount}
                    </div>
                    <div className="text-xs text-slate-500">
                        {funderCount === 1 ? 'investor' : 'investors'}
                    </div>
                </div>
                
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs">Remaining</span>
                    </div>
                    <div className={`text-lg font-bold ${isAtRisk ? 'text-red-600' : 'text-slate-900'}`}>
                        {formatCurrency(remaining)}
                    </div>
                    <div className="text-xs text-slate-500">
                        {progress.toFixed(0)}% funded
                    </div>
                </div>
            </div>
            
            {/* Days Remaining */}
            {daysRemaining !== null && !isFullyFunded && (
                <div className={`mt-4 p-3 rounded-lg ${isAtRisk ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <div className="flex items-center justify-between">
                        <span className={`text-sm ${isAtRisk ? 'text-red-700' : 'text-slate-600'}`}>
                            {isAtRisk ? 'Funding ends soon!' : 'Time remaining'}
                        </span>
                        <span className={`text-sm font-semibold ${isAtRisk ? 'text-red-700' : 'text-slate-900'}`}>
                            {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
                        </span>
                    </div>
                </div>
            )}
            
            {/* Fully Funded Message */}
            {isFullyFunded && (
                <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
                    <p className="text-sm text-emerald-700 text-center font-medium">
                        🎉 This loan has been fully funded!
                    </p>
                </div>
            )}
        </div>
    );
}

export default FundingProgressBar;
