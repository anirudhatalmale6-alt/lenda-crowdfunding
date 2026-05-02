import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    setLoanFormRate, 
    calculateLoanProjections,
    validateRate 
} from '../../store/slices/rateSlice';
import { TrendingUp, DollarSign, Calendar, Percent } from 'lucide-react';

/**
 * RateSelector - Interest rate input component with slider
 * 
 * @param {Object} props
 * @param {number} props.minRate - Minimum rate (default: 5)
 * @param {number} props.maxRate - Maximum rate (default: 35)
 * @param {number} props.initialRate - Initial rate value
 * @param {boolean} props.readOnly - Whether component is read-only
 * @param {Function} props.onChange - Callback when rate changes
 */
function RateSelector({ 
    minRate = 5, 
    maxRate = 35, 
    initialRate = 15, 
    readOnly = false,
    onChange 
}) {
    const dispatch = useDispatch();
    const { loanForm, loanProjections, platformSettings, rateValidation } = useSelector(state => state.rates);
    const [localRate, setLocalRate] = useState(initialRate);
    
    // Use platform settings if available
    const effectiveMaxRate = platformSettings?.max_interest_rate || maxRate;
    const effectiveMinRate = platformSettings?.min_interest_rate || minRate;
    
    // Calculate projections when rate changes
    useEffect(() => {
        if (loanForm.amount > 0 && loanForm.duration > 0) {
            dispatch(calculateLoanProjections({
                amount: loanForm.amount,
                rate: localRate,
                duration: loanForm.duration,
            }));
        }
    }, [dispatch, localRate, loanForm.amount, loanForm.duration]);
    
    // Validate rate when it changes
    useEffect(() => {
        if (loanForm.riskCategory) {
            dispatch(validateRate({ 
                rate: localRate, 
                riskCategory: loanForm.riskCategory 
            }));
        }
    }, [dispatch, localRate, loanForm.riskCategory]);
    
    // Handle rate change
    const handleRateChange = useCallback((newRate) => {
        const clampedRate = Math.max(effectiveMinRate, Math.min(effectiveMaxRate, newRate));
        setLocalRate(clampedRate);
        dispatch(setLoanFormRate(clampedRate));
        if (onChange) {
            onChange(clampedRate);
        }
    }, [dispatch, effectiveMinRate, effectiveMaxRate, onChange]);
    
    // Calculate investor yield
    const calculateInvestorYield = () => {
        if (!loanForm.amount || !localRate) return 0;
        return (loanForm.amount * localRate / 100);
    };
    
    // Calculate monthly payment
    const calculateMonthlyPayment = () => {
        if (!loanProjections?.monthlyPayment) return 0;
        return loanProjections.monthlyPayment;
    };
    
    // Calculate total repayment
    const calculateTotalRepayment = () => {
        if (!loanProjections?.totalRepayment) return 0;
        return loanProjections.totalRepayment;
    };
    
    const isRateValid = rateValidation?.isValid ?? true;
    const validationMessage = rateValidation?.message;
    
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Percent className="w-5 h-5 text-primary-500" />
                    Interest Rate
                </h3>
                <div className="text-sm text-slate-500">
                    Range: {effectiveMinRate}% - {effectiveMaxRate}%
                </div>
            </div>
            
            {/* Rate Display */}
            <div className="text-center mb-6">
                <div className="text-5xl font-bold text-primary-600">
                    {localRate}%
                </div>
                <div className="text-sm text-slate-500 mt-1">
                    Annual Interest Rate
                </div>
            </div>
            
            {/* Slider */}
            <div className="mb-6">
                <input
                    type="range"
                    min={effectiveMinRate}
                    max={effectiveMaxRate}
                    step={0.5}
                    value={localRate}
                    onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                    disabled={readOnly}
                    className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-2">
                    <span>{effectiveMinRate}%</span>
                    <span>{effectiveMaxRate}%</span>
                </div>
            </div>
            
            {/* Rate Input */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Or enter rate directly
                </label>
                <div className="relative">
                    <input
                        type="number"
                        value={localRate}
                        onChange={(e) => handleRateChange(parseFloat(e.target.value) || 0)}
                        disabled={readOnly}
                        min={effectiveMinRate}
                        max={effectiveMaxRate}
                        step={0.5}
                        className={`w-full px-4 py-3 pl-12 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                            !isRateValid ? 'border-red-500' : 'border-slate-300'
                        }`}
                    />
                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
                {!isRateValid && (
                    <p className="text-red-500 text-sm mt-1">{validationMessage}</p>
                )}
            </div>
            
            {/* Quick Rate Buttons */}
            {!readOnly && (
                <div className="flex flex-wrap gap-2 mb-6">
                    {[10, 15, 18, 20, 25, 30].filter(r => r >= effectiveMinRate && r <= effectiveMaxRate).map(rate => (
                        <button
                            key={rate}
                            onClick={() => handleRateChange(rate)}
                            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                                localRate === rate
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {rate}%
                        </button>
                    ))}
                </div>
            )}
            
            {/* Live Calculations */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-sm">Monthly Payment</span>
                    </div>
                    <div className="text-xl font-bold text-slate-900">
                        ${calculateMonthlyPayment().toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm">Investor Yield</span>
                    </div>
                    <div className="text-xl font-bold text-emerald-600">
                        ${calculateInvestorYield().toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                </div>
            </div>
            
            <div className="mt-4 p-4 bg-primary-50 rounded-lg">
                <div className="flex items-center gap-2 text-primary-700">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">Total Repayment</span>
                </div>
                <div className="text-2xl font-bold text-primary-800 mt-1">
                    ${calculateTotalRepayment().toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
            </div>
        </div>
    );
}

export default RateSelector;
