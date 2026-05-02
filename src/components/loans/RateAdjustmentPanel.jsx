import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    updateLoanRate, 
    previewRateAdjustment, 
    fetchRateHistory 
} from '../../store/slices/rateSlice';
import { 
    TrendingUp, 
    Clock, 
    AlertCircle, 
    CheckCircle, 
    Loader,
    ArrowUp,
    ArrowDown,
    History
} from 'lucide-react';

/**
 * RateAdjustmentPanel - Rate adjustment interface for borrowers
 * 
 * @param {Object} props
 * @param {Object} props.loan - Loan object
 * @param {Function} props.onSuccess - Callback on successful adjustment
 * @param {Function} props.onError - Callback on error
 */
function RateAdjustmentPanel({ loan, onSuccess, onError }) {
    const dispatch = useDispatch();
    const { 
        isLoading, 
        adjustmentPreview, 
        rateHistory,
        platformSettings 
    } = useSelector(state => state.rates);
    
    const [newRate, setNewRate] = useState(loan?.interest_rate || 15);
    const [reason, setReason] = useState('');
    const [adjustmentType, setAdjustmentType] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [success, setSuccess] = useState(false);
    
    const currentRate = loan?.interest_rate || 15;
    const minRate = platformSettings?.min_interest_rate || 5;
    const maxRate = platformSettings?.max_interest_rate || 35;
    const allowIncrease = platformSettings?.allow_rate_increase ?? true;
    const allowDecrease = platformSettings?.allow_rate_decrease ?? false;
    
    // Load rate history
    useEffect(() => {
        if (loan?.id) {
            dispatch(fetchRateHistory(loan.id));
        }
    }, [dispatch, loan?.id]);
    
    // Fetch preview when rate changes
    useEffect(() => {
        if (loan?.id && newRate !== currentRate) {
            dispatch(previewRateAdjustment({ loanId: loan.id, newRate }));
        }
    }, [dispatch, loan?.id, newRate, currentRate]);
    
    // Determine adjustment type
    useEffect(() => {
        if (newRate > currentRate) {
            setAdjustmentType('increase');
        } else if (newRate < currentRate) {
            setAdjustmentType('decrease');
        } else {
            setAdjustmentType(null);
        }
    }, [newRate, currentRate]);
    
    // Handle rate adjustment
    const handleAdjustRate = async () => {
        if (!adjustmentType || (adjustmentType === 'increase' && !allowIncrease) || 
            (adjustmentType === 'decrease' && !allowDecrease)) {
            return;
        }
        
        try {
            await dispatch(updateLoanRate({ 
                loanId: loan.id, 
                newRate, 
                reason 
            })).unwrap();
            
            setSuccess(true);
            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            if (onError) {
                onError(err);
            }
        }
    };
    
    // Handle quick rate adjustments
    const handleQuickAdjust = (delta) => {
        const newValue = Math.max(minRate, Math.min(maxRate, newRate + delta));
        setNewRate(newValue);
    };
    
    // Validation
    const canAdjust = () => {
        if (newRate === currentRate) return false;
        if (adjustmentType === 'increase' && !allowIncrease) return false;
        if (adjustmentType === 'decrease' && !allowDecrease) return false;
        return true;
    };
    
    // Get impact description
    const getImpactDescription = () => {
        if (!adjustmentPreview) return null;
        
        const { fundingLikelihood, fundingSpeed } = adjustmentPreview;
        
        if (adjustmentType === 'increase') {
            return {
                icon: TrendingUp,
                color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
                title: 'Higher Rate = Faster Funding',
                description: `Increasing to ${newRate}% will make your loan ${fundingSpeed?.toLowerCase() || 'faster'} to fund.`,
            };
        } else {
            return {
                icon: Clock,
                color: 'text-amber-600 bg-amber-50 border-amber-200',
                title: 'Lower Rate May Slow Funding',
                description: `Decreasing to ${newRate}% may reduce investor interest.`,
            };
        }
    };
    
    const impact = getImpactDescription();
    const ImpactIcon = impact?.icon;
    
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary-500" />
                    Adjust Interest Rate
                </h3>
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
                >
                    <History className="w-4 h-4" />
                    History
                </button>
            </div>
            
            {/* Current Rate */}
            <div className="text-center p-4 bg-slate-50 rounded-lg mb-4">
                <div className="text-sm text-slate-500 mb-1">Current Rate</div>
                <div className="text-3xl font-bold text-slate-900">{currentRate}%</div>
            </div>
            
            {/* Rate Input */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    New Interest Rate
                </label>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleQuickAdjust(-1)}
                        disabled={newRate <= minRate || (adjustmentType === 'decrease' && !allowDecrease)}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ArrowDown className="w-4 h-4" />
                    </button>
                    <input
                        type="number"
                        value={newRate}
                        onChange={(e) => setNewRate(parseFloat(e.target.value) || 0)}
                        min={minRate}
                        max={maxRate}
                        step={0.5}
                        className="flex-1 text-center text-xl font-bold py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                        onClick={() => handleQuickAdjust(1)}
                        disabled={newRate >= maxRate || (adjustmentType === 'increase' && !allowIncrease)}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ArrowUp className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-xs text-slate-500 mt-2 text-center">
                    Range: {minRate}% - {maxRate}%
                </p>
            </div>
            
            {/* Reason Input */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Reason for Adjustment (optional)
                </label>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why are you adjusting the rate?"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
                    rows={2}
                />
            </div>
            
            {/* Impact Preview */}
            {impact && (
                <div className={`p-4 rounded-lg border mb-4 ${impact.color}`}>
                    <div className="flex items-start gap-3">
                        <ImpactIcon className="w-5 h-5 mt-0.5" />
                        <div>
                            <div className="font-medium">{impact.title}</div>
                            <div className="text-sm mt-1">{impact.description}</div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Restrictions Warning */}
            {adjustmentType === 'decrease' && !allowDecrease && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                    <p className="text-sm text-red-700">
                        Rate decreases are currently disabled by the platform.
                    </p>
                </div>
            )}
            
            {/* Adjust Button */}
            <button
                onClick={handleAdjustRate}
                disabled={!canAdjust() || isLoading}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    !canAdjust()
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                }`}
            >
                {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                        <Loader className="w-4 h-4 animate-spin" />
                        Processing...
                    </span>
                ) : (
                    `Adjust Rate to ${newRate}%`
                )}
            </button>
            
            {/* Rate History */}
            {showHistory && rateHistory.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                    <h4 className="font-medium text-slate-900 mb-3">Rate History</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {rateHistory.map((record, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                                <div>
                                    <span className="font-medium">
                                        {record.previousRate}% → {record.newRate}%
                                    </span>
                                    <span className="text-slate-500 ml-2 text-xs">
                                        {record.rate_change_type}
                                    </span>
                                </div>
                                <span className="text-slate-400 text-xs">
                                    {new Date(record.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Success Message */}
            {success && (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm text-emerald-700">Rate adjusted successfully!</span>
                </div>
            )}
        </div>
    );
}

export default RateAdjustmentPanel;
