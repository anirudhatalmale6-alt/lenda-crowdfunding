import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fundLoan } from '../../store/slices/loanSlice';
import { 
    DollarSign, 
    TrendingUp, 
    Percent, 
    Shield, 
    Wallet,
    AlertCircle,
    CheckCircle,
    Loader
} from 'lucide-react';

/**
 * TokenPurchasePanel - Fractional loan token purchase interface
 * 
 * @param {Object} props
 * @param {Object} props.loan - Loan object
 * @param {Function} props.onSuccess - Callback on successful purchase
 * @param {Function} props.onError - Callback on error
 */
function TokenPurchasePanel({ loan, onSuccess, onError }) {
    const dispatch = useDispatch();
    const { isLoading, error } = useSelector(state => state.loans);
    const { user } = useSelector(state => state.auth);
    
    const [investmentAmount, setInvestmentAmount] = useState('');
    const [calculatedTokens, setCalculatedTokens] = useState(0);
    const [expectedReturn, setExpectedReturn] = useState(0);
    const [ownershipPercent, setOwnershipPercent] = useState(0);
    const [purchaseSuccess, setPurchaseSuccess] = useState(false);
    
    // Loan details
    const totalLoanAmount = loan?.loan_amount || loan?.principalAmount || 0;
    const fundedAmount = loan?.funded_amount || 0;
    const remainingFunding = totalLoanAmount - fundedAmount;
    const interestRate = loan?.interest_rate || loan?.interestRate || 0;
    const duration = loan?.duration_months || loan?.duration || 0;
    const minInvestment = loan?.min_investment || 100;
    const maxInvestment = remainingFunding;
    
    // Calculate token details based on investment amount
    const calculateInvestment = useCallback((amount) => {
        if (!amount || amount <= 0) {
            setCalculatedTokens(0);
            setExpectedReturn(0);
            setOwnershipPercent(0);
            return;
        }
        
        // Calculate tokens (1 token = $1 of loan)
        const tokens = parseFloat(amount);
        
        // Calculate ownership percentage
        const ownership = (tokens / totalLoanAmount) * 100;
        
        // Calculate expected return (principal + interest)
        const interest = tokens * (interestRate / 100);
        const totalReturn = tokens + interest;
        
        setCalculatedTokens(tokens);
        setOwnershipPercent(ownership);
        setExpectedReturn(totalReturn);
    }, [totalLoanAmount, interestRate]);
    
    // Handle amount change
    const handleAmountChange = (e) => {
        const value = e.target.value;
        setInvestmentAmount(value);
        calculateInvestment(value);
    };
    
    // Handle quick amount buttons
    const handleQuickAmount = (percent) => {
        const amount = Math.min(
            Math.round((remainingFunding * percent) / 100),
            maxInvestment
        );
        setInvestmentAmount(amount.toString());
        calculateInvestment(amount);
    };
    
    // Handle purchase
    const handlePurchase = async () => {
        if (!investmentAmount || parseFloat(investmentAmount) < minInvestment) {
            if (onError) {
                onError(`Minimum investment is $${minInvestment}`);
            }
            return;
        }
        
        try {
            await dispatch(fundLoan({ 
                loanId: loan.id, 
                amount: parseFloat(investmentAmount) 
            })).unwrap();
            
            setPurchaseSuccess(true);
            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            if (onError) {
                onError(err);
            }
        }
    };
    
    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };
    
    // Validation
    const isValidAmount = () => {
        const amount = parseFloat(investmentAmount);
        return amount >= minInvestment && amount <= maxInvestment;
    };
    
    if (purchaseSuccess) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                        Investment Successful!
                    </h3>
                    <p className="text-slate-600 mb-4">
                        You've invested {formatCurrency(investmentAmount)} in this loan.
                    </p>
                    <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-600">
                            Expected return: <span className="font-semibold text-emerald-600">
                                {formatCurrency(expectedReturn)}
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary-500" />
                Invest in This Loan
            </h3>
            
            {/* Investment Input */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Investment Amount
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                        $
                    </span>
                    <input
                        type="number"
                        value={investmentAmount}
                        onChange={handleAmountChange}
                        min={minInvestment}
                        max={maxInvestment}
                        placeholder={`Min: ${minInvestment}`}
                        className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                </div>
                
                {/* Quick Amount Buttons */}
                <div className="flex gap-2 mt-2">
                    {[25, 50, 75, 100].map(percent => (
                        <button
                            key={percent}
                            onClick={() => handleQuickAmount(percent)}
                            className="flex-1 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
                        >
                            {percent}%
                        </button>
                    ))}
                </div>
                
                {/* Min/Max Info */}
                <p className="text-xs text-slate-500 mt-2">
                    Min: {formatCurrency(minInvestment)} - Max: {formatCurrency(maxInvestment)}
                </p>
            </div>
            
            {/* Investment Summary */}
            {calculatedTokens > 0 && (
                <div className="space-y-3 mb-6 p-4 bg-slate-50 rounded-lg">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Tokens</span>
                        <span className="font-semibold text-slate-900">
                            {calculatedTokens.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Ownership</span>
                        <span className="font-semibold text-slate-900">
                            {ownershipPercent.toFixed(2)}%
                        </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                        <span className="text-sm text-slate-600">Expected Return</span>
                        <span className="font-bold text-emerald-600">
                            {formatCurrency(expectedReturn)}
                        </span>
                    </div>
                </div>
            )}
            
            {/* Loan Details */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-1 text-slate-500 mb-1">
                        <Percent className="w-3 h-3" />
                        <span className="text-xs">Interest Rate</span>
                    </div>
                    <div className="font-semibold text-slate-900">{interestRate}%</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-1 text-slate-500 mb-1">
                        <TrendingUp className="w-3 h-3" />
                        <span className="text-xs">Duration</span>
                    </div>
                    <div className="font-semibold text-slate-900">{duration} months</div>
                </div>
            </div>
            
            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-700">{error}</span>
                </div>
            )}
            
            {/* Invest Button */}
            <button
                onClick={handlePurchase}
                disabled={!isValidAmount() || isLoading}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    !isValidAmount()
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
                    `Invest ${investmentAmount ? formatCurrency(investmentAmount) : ''}`
                )}
            </button>
            
            {/* Guarantee Note */}
            <div className="mt-4 p-3 bg-emerald-50 rounded-lg flex items-start gap-2">
                <Shield className="w-4 h-4 text-emerald-600 mt-0.5" />
                <p className="text-xs text-emerald-700">
                    This investment is protected by the LENDA Guarantee Fund.
                </p>
            </div>
        </div>
    );
}

export default TokenPurchasePanel;
