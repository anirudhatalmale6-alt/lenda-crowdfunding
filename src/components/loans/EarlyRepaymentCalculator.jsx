import { useState, useMemo } from 'react';
import {
    Calculator,
    DollarSign,
    Calendar,
    TrendingDown,
    Info,
    Download,
    X,
    CheckCircle,
    AlertCircle
} from 'lucide-react';

/**
 * EarlyRepaymentCalculator - Calculator showing payoff amounts for early repayment
 * Addresses FEAT-003: Early Repayment Calculator
 */
function EarlyRepaymentCalculator({ loan, onCalculate, onProceed }) {
    const [prepaymentAmount, setPrepaymentAmount] = useState('');
    const [showFullPayoff, setShowFullPayoff] = useState(false);
    const [success, setSuccess] = useState(false);
    
    // Calculate loan details
    const calculations = useMemo(() => {
        if (!loan) return null;
        
        const principal = parseFloat(loan.loanAmount) || 0;
        const repaidAmount = parseFloat(loan.repaidAmount) || 0;
        const interestRate = parseFloat(loan.interestRate) || 0;
        const durationMonths = parseInt(loan.durationMonths) || 0;
        const startDate = loan.startDate ? new Date(loan.startDate) : new Date();
        
        // Calculate remaining principal
        const remainingPrincipal = Math.max(0, principal - repaidAmount);
        
        // Calculate elapsed months
        const now = new Date();
        const elapsedMonths = Math.max(0, Math.floor((now - startDate) / (30 * 24 * 60 * 60 * 1000)));
        const remainingMonths = Math.max(0, durationMonths - elapsedMonths);
        
        // Calculate interest to date (simplified)
        const monthlyRate = interestRate / 100 / 12;
        const elapsedInterest = repaidAmount > 0 
            ? repaidAmount * 0.3 // Approximate ratio of interest paid
            : 0;
        
        // Prepayment penalty (typically 1-2% of prepayment amount)
        const prepayAmount = prepaymentAmount 
            ? parseFloat(prepaymentAmount) 
            : remainingPrincipal;
        const prepaymentPenalty = Math.min(prepayAmount * 0.02, 500); // Max $500 penalty
        
        // Full payoff calculation
        const fullPayoffAmount = remainingPrincipal + prepaymentPenalty;
        const savingsFromEarlyPayoff = remainingPrincipal * 0.15 * (remainingMonths / 12); // Estimated interest savings
        
        // Calculate new monthly payment if partial prepayment
        let newMonthlyPayment = null;
        let newTerm = null;
        let monthsSaved = 0;
        
        if (prepaymentAmount && parseFloat(prepaymentAmount) > 0 && parseFloat(prepaymentAmount) < remainingPrincipal) {
            const newPrincipal = remainingPrincipal - parseFloat(prepaymentAmount);
            if (monthlyRate > 0 && remainingMonths > 0) {
                newMonthlyPayment = (newPrincipal * monthlyRate * Math.pow(1 + monthlyRate, remainingMonths)) / 
                    (Math.pow(1 + monthlyRate, remainingMonths) - 1);
                newTerm = Math.ceil(-Math.log(1 - (newPrincipal * monthlyRate) / newMonthlyPayment) / Math.log(1 + monthlyRate));
                monthsSaved = remainingMonths - newTerm;
            }
        }
        
        return {
            principal,
            repaidAmount,
            remainingPrincipal,
            elapsedMonths,
            remainingMonths,
            interestRate,
            fullPayoffAmount,
            prepaymentPenalty,
            savingsFromEarlyPayoff,
            newMonthlyPayment,
            newTerm,
            monthsSaved,
            originalMonthlyPayment: (principal * monthlyRate * Math.pow(1 + monthlyRate, durationMonths)) / 
                (Math.pow(1 + monthlyRate, durationMonths) - 1)
        };
    }, [loan, prepaymentAmount]);
    
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount || 0);
    };
    
    const handleProceed = () => {
        if (onProceed) {
            onProceed({
                loanId: loan.id,
                prepaymentAmount: showFullPayoff ? calculations.fullPayoffAmount : parseFloat(prepaymentAmount),
                prepaymentPenalty: calculations.prepaymentPenalty,
                type: showFullPayoff ? 'full' : 'partial'
            });
        }
        setSuccess(true);
    };
    
    if (!loan) return null;
    
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-primary-500" />
                    Early Repayment Calculator
                </h3>
            </div>
            
            {/* Current Loan Summary */}
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-slate-900 mb-3">Current Loan Status</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Original Amount:</span>
                        <span className="font-medium">{formatCurrency(calculations.principal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Amount Paid:</span>
                        <span className="font-medium text-green-600">{formatCurrency(calculations.repaidAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Remaining Principal:</span>
                        <span className="font-medium">{formatCurrency(calculations.remainingPrincipal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Remaining Term:</span>
                        <span className="font-medium">{calculations.remainingMonths} months</span>
                    </div>
                </div>
            </div>
            
            {/* Prepayment Options */}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Prepayment Amount
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => {
                                setShowFullPayoff(true);
                                setPrepaymentAmount(calculations.remainingPrincipal.toString());
                            }}
                            className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                                showFullPayoff
                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                    : 'border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <DollarSign className="w-4 h-4 mx-auto mb-1" />
                            Pay Full Balance
                        </button>
                        <button
                            onClick={() => setShowFullPayoff(false)}
                            className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                                !showFullPayoff && !prepaymentAmount
                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                    : 'border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <Calculator className="w-4 h-4 mx-auto mb-1" />
                            Custom Amount
                        </button>
                    </div>
                </div>
                
                {!showFullPayoff && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Enter Custom Amount
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                            <input
                                type="number"
                                value={prepaymentAmount}
                                onChange={(e) => {
                                    setPrepaymentAmount(e.target.value);
                                    setShowFullPayoff(false);
                                }}
                                placeholder="Enter amount"
                                min={0}
                                max={calculations.remainingPrincipal}
                                className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={() => {
                                    setPrepaymentAmount((calculations.remainingPrincipal * 0.25).toString());
                                    setShowFullPayoff(false);
                                }}
                                className="text-xs text-primary-600 hover:text-primary-700"
                            >
                                25% of balance
                            </button>
                            <button
                                onClick={() => {
                                    setPrepaymentAmount((calculations.remainingPrincipal * 0.5).toString());
                                    setShowFullPayoff(false);
                                }}
                                className="text-xs text-primary-600 hover:text-primary-700"
                            >
                                50% of balance
                            </button>
                            <button
                                onClick={() => {
                                    setPrepaymentAmount(calculations.remainingPrincipal.toString());
                                    setShowFullPayoff(true);
                                }}
                                className="text-xs text-primary-600 hover:text-primary-700"
                            >
                                100% of balance
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Calculation Results */}
            {calculations && (prepaymentAmount || showFullPayoff) && (
                <div className="mt-6 space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                            <TrendingDown className="w-4 h-4" />
                            {showFullPayoff ? 'Full Payoff Summary' : 'Prepayment Impact'}
                        </h4>
                        
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-blue-700">Prepayment Amount:</span>
                                <span className="font-medium">
                                    {formatCurrency(prepaymentAmount || calculations.remainingPrincipal)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-blue-700">Prepayment Penalty (2%):</span>
                                <span className="font-medium text-amber-600">
                                    {formatCurrency(calculations.prepaymentPenalty)}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-blue-200 pt-2">
                                <span className="text-blue-900 font-medium">Total Due:</span>
                                <span className="font-bold text-blue-900">
                                    {formatCurrency(calculations.fullPayoffAmount)}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {!showFullPayoff && calculations.newMonthlyPayment && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="font-medium text-green-900 mb-3">If You Prepay {formatCurrency(prepaymentAmount)}</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-green-700">New Monthly Payment:</span>
                                    <span className="font-medium">{formatCurrency(calculations.newMonthlyPayment)}</span>
                                </div>
                                {calculations.newTerm && (
                                    <div className="flex justify-between">
                                        <span className="text-green-700">New Term:</span>
                                        <span className="font-medium">{calculations.newTerm} months</span>
                                    </div>
                                )}
                                {calculations.monthsSaved > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Time Saved:</span>
                                        <span className="font-medium">{calculations.monthsSaved} months</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {showFullPayoff && calculations.savingsFromEarlyPayoff > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                                <div>
                                    <p className="font-medium text-emerald-800">Estimated Interest Savings</p>
                                    <p className="text-sm text-emerald-600">
                                        By paying off early, you'll save approximately {formatCurrency(calculations.savingsFromEarlyPayoff)} in future interest payments.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Important Notes */}
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                            <div className="text-sm text-amber-700">
                                <p className="font-medium">Please Note:</p>
                                <ul className="list-disc list-inside mt-1 space-y-1">
                                    <li>Prepayment penalty may apply (2% of prepayment amount, max $500)</li>
                                    <li>This is an estimate; final amount may vary slightly</li>
                                    <li>Consider the impact on your credit score</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleProceed}
                            className="btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                            <DollarSign className="w-4 h-4" />
                            Proceed with Prepayment
                        </button>
                        <button className="btn-secondary flex items-center justify-center gap-2">
                            <Download className="w-4 h-4" />
                            Download Quote
                        </button>
                    </div>
                </div>
            )}
            
            {/* Success Message */}
            {success && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">Prepayment request submitted successfully!</span>
                </div>
            )}
        </div>
    );
}

export default EarlyRepaymentCalculator;
