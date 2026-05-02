import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCurrentDemand } from '../../store/slices/rateSlice';
import { Users, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

/**
 * MarketDemandMeter - Real-time market demand indicator
 * 
 * @param {Object} props
 * @param {string|number} props.loanId - Loan ID for fetching demand
 * @param {Object} props.demandData - Direct demand data (optional)
 * @param {boolean} props.compact - Show compact version
 * @param {boolean} props.showDetails - Show detailed breakdown
 */
function MarketDemandMeter({ 
    loanId, 
    demandData, 
    compact = false, 
    showDetails = false 
}) {
    const dispatch = useDispatch();
    const { currentDemandLevel, marketDemand, isLoading } = useSelector(state => state.rates);
    
    // Fetch demand data if loanId provided
    useEffect(() => {
        if (loanId) {
            dispatch(fetchCurrentDemand(loanId));
        }
    }, [dispatch, loanId]);
    
    const demand = demandData || currentDemandLevel;
    
    // Get demand level info
    const getDemandInfo = (level) => {
        switch (level) {
            case 'very_high':
                return {
                    label: 'Very High Demand',
                    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
                    barColor: 'bg-emerald-500',
                    icon: TrendingUp,
                    description: 'This loan is attracting significant investor interest',
                };
            case 'high':
                return {
                    label: 'High Demand',
                    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
                    barColor: 'bg-emerald-400',
                    icon: TrendingUp,
                    description: 'Investors are showing strong interest in this loan',
                };
            case 'moderate':
                return {
                    label: 'Moderate Demand',
                    color: 'text-amber-600 bg-amber-50 border-amber-200',
                    barColor: 'bg-amber-400',
                    icon: Minus,
                    description: 'This loan has average investor attention',
                };
            case 'low':
                return {
                    label: 'Low Demand',
                    color: 'text-orange-600 bg-orange-50 border-orange-200',
                    barColor: 'bg-orange-400',
                    icon: TrendingDown,
                    description: 'Consider adjusting the interest rate to attract more investors',
                };
            case 'very_low':
                return {
                    label: 'Very Low Demand',
                    color: 'text-red-600 bg-red-50 border-red-200',
                    barColor: 'bg-red-500',
                    icon: TrendingDown,
                    description: 'This loan may need significant rate adjustments to get funded',
                };
            default:
                return {
                    label: 'No Data',
                    color: 'text-slate-600 bg-slate-50 border-slate-200',
                    barColor: 'bg-slate-300',
                    icon: Activity,
                    description: 'Unable to calculate market demand at this time',
                };
        }
    };
    
    // Calculate progress percentage
    const getProgressPercentage = (level) => {
        switch (level) {
            case 'very_high': return 100;
            case 'high': return 75;
            case 'moderate': return 50;
            case 'low': return 25;
            case 'very_low': return 10;
            default: return 0;
        }
    };
    
    const demandInfo = getDemandInfo(demand?.demandLevel);
    const progressPercentage = getProgressPercentage(demand?.demandLevel);
    const Icon = demandInfo.icon;
    
    if (isLoading) {
        return (
            <div className={`bg-white rounded-xl border border-slate-200 ${compact ? 'p-3' : 'p-4'}`}>
                <div className="animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
            </div>
        );
    }
    
    if (compact) {
        return (
            <div className={`flex items-center gap-2 ${demandInfo.color} px-3 py-2 rounded-lg border`}>
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{demandInfo.label}</span>
            </div>
        );
    }
    
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-500" />
                    Market Demand
                </h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${demandInfo.color}`}>
                    {demandInfo.label}
                </span>
            </div>
            
            {/* Progress Bar */}
            <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden mb-3">
                <div 
                    className={`absolute left-0 top-0 h-full ${demandInfo.barColor} transition-all duration-500`}
                    style={{ width: `${progressPercentage}%` }}
                />
            </div>
            
            {/* Demand Level Indicator */}
            <div className={`flex items-center gap-2 p-3 rounded-lg ${demandInfo.color}`}>
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{demandInfo.description}</span>
            </div>
            
            {/* Detailed Breakdown */}
            {showDetails && demand && (
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
                    <div className="text-center">
                        <div className="text-xs text-slate-500 mb-1">Demand Score</div>
                        <div className="text-lg font-bold text-slate-900">
                            {demand.demandScore || 'N/A'}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-slate-500 mb-1">Risk Factor</div>
                        <div className="text-lg font-bold text-slate-900">
                            {demand.riskScoreFactor ? `${demand.riskScoreFactor}%` : 'N/A'}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-slate-500 mb-1">Rate Factor</div>
                        <div className="text-lg font-bold text-slate-900">
                            {demand.rateCompetitivenessFactor ? `${demand.rateCompetitivenessFactor}%` : 'N/A'}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Funding Speed */}
            {demand?.fundingSpeedPrediction && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Predicted Funding Speed</span>
                        <span className="text-sm font-semibold text-slate-900 capitalize">
                            {demand.fundingSpeedPrediction.replace('_', ' ')}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MarketDemandMeter;
