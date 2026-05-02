import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRateRecommendation } from '../../store/slices/rateSlice';
import { Lightbulb, TrendingUp, Shield, Zap, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

/**
 * RateRecommendationCard - Dynamic recommendation panel showing suggested rate
 * 
 * @param {Object} props
 * @param {number} props.loanAmount - Loan amount
 * @param {number} props.collateralValue - Collateral value
 * @param {string} props.riskCategory - Risk category (AAA, AA, A, BBB, etc.)
 * @param {boolean} props.compact - Show compact version
 */
function RateRecommendationCard({ 
    loanAmount, 
    collateralValue, 
    riskCategory,
    compact = false 
}) {
    const dispatch = useDispatch();
    const { suggestedRate, isLoading } = useSelector(state => state.rates);
    
    // Fetch recommendation when params change
    useEffect(() => {
        if (loanAmount && collateralValue && riskCategory) {
            dispatch(fetchRateRecommendation({
                loanAmount,
                collateralValue,
                riskCategory,
            }));
        }
    }, [dispatch, loanAmount, collateralValue, riskCategory]);
    
    // Get color for funding likelihood
    const getFundingColor = (likelihood) => {
        switch (likelihood) {
            case 'very_high':
            case 'high':
                return 'text-emerald-600 bg-emerald-50 border-emerald-200';
            case 'moderate':
                return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'low':
            case 'very_low':
                return 'text-red-600 bg-red-50 border-red-200';
            default:
                return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };
    
    // Get icon for funding likelihood
    const getFundingIcon = (likelihood) => {
        switch (likelihood) {
            case 'very_high':
            case 'high':
                return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            case 'moderate':
                return <AlertCircle className="w-5 h-5 text-amber-500" />;
            case 'low':
            case 'very_low':
                return <XCircle className="w-5 h-5 text-red-500" />;
            default:
                return <AlertCircle className="w-5 h-5 text-slate-500" />;
        }
    };
    
    // Get color for risk category
    const getRiskColor = (category) => {
        switch (category) {
            case 'AAA':
            case 'AA':
                return 'text-emerald-600 bg-emerald-50';
            case 'A':
            case 'BBB':
                return 'text-blue-600 bg-blue-50';
            case 'BB':
            case 'B':
                return 'text-amber-600 bg-amber-50';
            case 'C':
            case 'D':
                return 'text-red-600 bg-red-50';
            default:
                return 'text-slate-600 bg-slate-50';
        }
    };
    
    if (isLoading) {
        return (
            <div className={`bg-white rounded-xl border border-slate-200 p-6 ${compact ? 'p-4' : ''}`}>
                <div className="animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-1/2 mb-3"></div>
                    <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
                    <div className="h-20 bg-slate-200 rounded"></div>
                </div>
            </div>
        );
    }
    
    if (!suggestedRate) {
        return null;
    }
    
    if (compact) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium text-slate-700">Suggested Rate</span>
                    </div>
                    <span className="text-lg font-bold text-primary-600">
                        {suggestedRate.suggestedRate}%
                    </span>
                </div>
                <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getFundingColor(suggestedRate.fundingLikelihood)}`}>
                    {getFundingIcon(suggestedRate.fundingLikelihood)}
                    <span className="capitalize">{suggestedRate.fundingLikelihood?.replace('_', ' ')}</span>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-50 rounded-lg">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-900">Rate Recommendation</h3>
                    <p className="text-sm text-slate-500">Based on market conditions</p>
                </div>
            </div>
            
            {/* Suggested Rate */}
            <div className="text-center py-4 border-b border-slate-100">
                <div className="text-sm text-slate-500 mb-1">Recommended Interest Rate</div>
                <div className="text-4xl font-bold text-primary-600">
                    {suggestedRate.suggestedRate}%
                </div>
                <div className={`mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getFundingColor(suggestedRate.fundingLikelihood)}`}>
                    {getFundingIcon(suggestedRate.fundingLikelihood)}
                    <span className="capitalize">{suggestedRate.fundingLikelihood?.replace('_', ' ')}</span>
                </div>
            </div>
            
            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs">Funding Speed</span>
                    </div>
                    <div className="font-semibold text-slate-900 capitalize">
                        {suggestedRate.fundingSpeedPrediction?.replace('_', ' ') || 'N/A'}
                    </div>
                </div>
                
                <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Shield className="w-4 h-4" />
                        <span className="text-xs">Risk Category</span>
                    </div>
                    <div className={`inline-flex items-center px-2 py-0.5 rounded text-sm font-semibold ${getRiskColor(riskCategory)}`}>
                        {riskCategory || 'N/A'}
                    </div>
                </div>
            </div>
            
            {/* Confidence Score */}
            {suggestedRate.confidenceScore && (
                <div className="mt-4 p-3 bg-primary-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-primary-700">Recommendation Confidence</span>
                        <span className="text-sm font-semibold text-primary-800">
                            {suggestedRate.confidenceScore}%
                        </span>
                    </div>
                    <div className="w-full bg-primary-200 rounded-full h-2">
                        <div 
                            className="bg-primary-500 h-2 rounded-full transition-all"
                            style={{ width: `${suggestedRate.confidenceScore}%` }}
                        />
                    </div>
                </div>
            )}
            
            {/* Market Insight */}
            {suggestedRate.marketInsight && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-start gap-2">
                        <Zap className="w-4 h-4 text-blue-500 mt-0.5" />
                        <p className="text-sm text-blue-700">{suggestedRate.marketInsight}</p>
                    </div>
                </div>
            )}
            
            {/* Disclaimer */}
            <p className="text-xs text-slate-400 mt-4">
                This is a recommendation based on historical data and current market conditions. 
                Your actual funding success may vary.
            </p>
        </div>
    );
}

export default RateRecommendationCard;
