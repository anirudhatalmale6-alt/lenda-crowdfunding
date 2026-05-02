import { useSelector } from 'react-redux';
import { DollarSign, Percent, Calendar, Shield, TrendingUp, AlertTriangle } from 'lucide-react';

/**
 * LoanSummaryCard - Complete loan economics display
 * 
 * @param {Object} props
 * @param {Object} props.loanData - Loan data object
 * @param {boolean} props.compact - Show compact version
 * @param {boolean} props.showCollateral - Show collateral details
 */
function LoanSummaryCard({ loanData, compact = false, showCollateral = true }) {
    const { loanForm, loanProjections } = useSelector(state => state.rates);
    
    // Use loan data or form data
    const principal = loanData?.principalAmount || loanData?.loan_amount || loanForm.amount || 0;
    const interestRate = loanData?.interestRate || loanForm.interestRate || 0;
    const duration = loanData?.durationMonths || loanData?.term_months || loanForm.duration || 0;
    const collateralValue = loanData?.collateralValue || loanForm.collateralValue || 0;
    const ltvRatio = loanData?.ltvRatio || loanData?.ltv_ratio || loanForm.ltvRatio || 0;
    
    // Calculate values
    const totalRepayment = loanProjections?.totalRepayment || (principal * (1 + (interestRate / 100)));
    const monthlyPayment = loanProjections?.monthlyPayment || (totalRepayment / duration) || 0;
    const totalInterest = totalRepayment - principal;
    
    // Get LTV status color
    const getLTVColor = (ltv) => {
        if (ltv <= 40) return 'text-emerald-600 bg-emerald-50';
        if (ltv <= 50) return 'text-blue-600 bg-blue-50';
        if (ltv <= 60) return 'text-amber-600 bg-amber-50';
        return 'text-red-600 bg-red-50';
    };
    
    if (compact) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-sm text-slate-500">Principal</div>
                        <div className="font-semibold text-slate-900">${principal.toLocaleString()}</div>
                    </div>
                    <div>
                        <div className="text-sm text-slate-500">Total Repayment</div>
                        <div className="font-semibold text-slate-900">${totalRepayment.toLocaleString()}</div>
                    </div>
                    <div>
                        <div className="text-sm text-slate-500">Interest Rate</div>
                        <div className="font-semibold text-primary-600">{interestRate}%</div>
                    </div>
                    <div>
                        <div className="text-sm text-slate-500">Monthly</div>
                        <div className="font-semibold text-slate-900">${monthlyPayment.toLocaleString()}</div>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-500" />
                Loan Summary
            </h3>
            
            {/* Principal & Interest */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-sm">Principal</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                        ${principal.toLocaleString()}
                    </div>
                </div>
                
                <div className="p-4 bg-primary-50 rounded-lg">
                    <div className="flex items-center gap-2 text-primary-600 mb-1">
                        <Percent className="w-4 h-4" />
                        <span className="text-sm">Interest Rate</span>
                    </div>
                    <div className="text-2xl font-bold text-primary-700">
                        {interestRate}%
                    </div>
                </div>
            </div>
            
            {/* Repayment Details */}
            <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600">Total Repayment</span>
                    <span className="font-semibold text-slate-900">${totalRepayment.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600">Total Interest</span>
                    <span className="font-semibold text-amber-600">${totalInterest.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600">Monthly Payment</span>
                    <span className="font-semibold text-slate-900">${monthlyPayment.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600">Duration</span>
                    <span className="font-semibold text-slate-900">{duration} months</span>
                </div>
            </div>
            
            {/* Collateral Section */}
            {showCollateral && (
                <div className="pt-4 border-t border-slate-100">
                    <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-slate-500" />
                        Collateral Details
                    </h4>
                    
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-600">Collateral Value</span>
                            <span className="font-semibold text-slate-900">
                                ${collateralValue.toLocaleString()}
                            </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                            <span className="text-slate-600 flex items-center gap-1">
                                Loan-to-Value Ratio
                                {ltvRatio > 60 && (
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                )}
                            </span>
                            <span className={`px-2 py-1 rounded font-semibold ${getLTVColor(ltvRatio)}`}>
                                {ltvRatio}%
                            </span>
                        </div>
                    </div>
                    
                    {/* LTV Warning */}
                    {ltvRatio > 60 && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700">
                                <strong>Warning:</strong> LTV exceeds the maximum 60% limit. 
                                Please increase collateral or reduce loan amount.
                            </p>
                        </div>
                    )}
                </div>
            )}
            
            {/* Interest Breakdown Visual */}
            <div className="mt-6">
                <div className="text-sm text-slate-500 mb-2">Principal vs Interest</div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
                    <div 
                        className="bg-primary-500 h-full"
                        style={{ width: `${(principal / totalRepayment) * 100}%` }}
                    />
                    <div 
                        className="bg-amber-400 h-full"
                        style={{ width: `${(totalInterest / totalRepayment) * 100}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-xs">
                    <span className="text-slate-500">Principal ({((principal / totalRepayment) * 100).toFixed(0)}%)</span>
                    <span className="text-slate-500">Interest ({((totalInterest / totalRepayment) * 100).toFixed(0)}%)</span>
                </div>
            </div>
            
            {/* Calendar Icon */}
            <div className="mt-4 p-3 bg-slate-50 rounded-lg flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-500" />
                <div>
                    <div className="text-sm font-medium text-slate-900">
                        {duration} Monthly Payments
                    </div>
                    <div className="text-xs text-slate-500">
                        First payment due in 30 days
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoanSummaryCard;
