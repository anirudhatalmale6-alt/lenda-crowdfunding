import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { formatCurrency, formatPercentage, formatDate } from '../../utils/formatters';
import { fundLoan, getLoanRequests } from '../../store/slices/loanSlice';
import { getWallets } from '../../store/slices/walletSlice';

/**
 * FundingPreviewModal - UX-001: Loan Funding Confirmation modal with token allocation preview
 * Shows token allocation, expected returns, and transaction breakdown before funding
 */
function FundingPreviewModal({ loan, isOpen, onClose, onSuccess }) {
    const dispatch = useDispatch();
    const { wallets, isLoading: walletLoading } = useSelector((state) => state.wallet);
    const { isLoading: loanLoading } = useSelector((state) => state.loans);
    
    const [fundAmount, setFundAmount] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [errors, setErrors] = useState({});
    const [tokenAllocation, setTokenAllocation] = useState(null);

    // Calculate token allocation preview
    useEffect(() => {
        if (loan && fundAmount) {
            const amount = parseFloat(fundAmount);
            if (amount > 0 && amount <= (loan.loanAmount - loan.fundedAmount)) {
                // Calculate tokens based on loan tokenization
                const tokensReceived = (amount / loan.loanAmount) * loan.totalTokens;
                const ownershipPercentage = (amount / loan.loanAmount) * 100;
                const expectedYield = amount * (loan.interestRate / 100) * (loan.durationMonths / 12);
                const monthlyPayment = (amount + expectedYield) / loan.durationMonths;
                
                setTokenAllocation({
                    tokensReceived,
                    ownershipPercentage,
                    expectedYield,
                    monthlyPayment,
                    totalValue: amount,
                });
            } else {
                setTokenAllocation(null);
            }
        } else {
            setTokenAllocation(null);
        }
    }, [loan, fundAmount]);

    const handleAmountChange = (value) => {
        setFundAmount(value);
        setErrors({});
    };

    const validateFunding = () => {
        const newErrors = {};
        const amount = parseFloat(fundAmount);

        if (!fundAmount || amount <= 0) {
            newErrors.amount = 'Please enter a valid amount';
        } else if (amount > (loan.loanAmount - loan.fundedAmount)) {
            newErrors.amount = 'Amount exceeds remaining funding needed';
        } else if (wallets.investment?.available < amount) {
            newErrors.amount = 'Insufficient investment wallet balance';
        } else if (amount < 100) {
            newErrors.amount = 'Minimum funding amount is $100';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePreview = () => {
        if (validateFunding()) {
            setShowConfirmation(true);
        }
    };

    const handleConfirmFunding = async () => {
        try {
            await dispatch(fundLoan({
                loanId: loan.id,
                amount: parseFloat(fundAmount)
            })).unwrap();
            
            toast.success('Loan funded successfully! Tokens have been allocated to your portfolio.');
            handleClose();
            onSuccess?.();
            
            // Refresh loan requests
            dispatch(getLoanRequests());
        } catch (error) {
            toast.error(error.message || 'Failed to fund loan');
        }
    };

    const handleClose = () => {
        setFundAmount('');
        setShowConfirmation(false);
        setErrors({});
        setTokenAllocation(null);
        onClose();
    };

    if (!isOpen || !loan) return null;

    const maxFundAmount = loan.loanAmount - loan.fundedAmount;
    const availableBalance = wallets.investment?.available || 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Fund Loan</h2>
                            <p className="text-gray-500 mt-1">Review your investment before confirming</p>
                        </div>
                        <button 
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Loan Summary */}
                <div className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-100">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-semibold text-gray-900">Loan #{loan.id}</h3>
                            <p className="text-sm text-gray-600">Borrower: {loan.borrower?.slice(0, 6)}...{loan.borrower?.slice(-4)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(loan.loanAmount)}</p>
                            <p className="text-sm text-gray-600">{loan.interestRate}% APR</p>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500">Duration</p>
                            <p className="font-medium">{loan.durationMonths} months</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Already Funded</p>
                            <p className="font-medium">{formatCurrency(loan.fundedAmount)}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Remaining</p>
                            <p className="font-medium text-emerald-600">{formatCurrency(maxFundAmount)}</p>
                        </div>
                    </div>
                </div>

                {!showConfirmation ? (
                    /* Step 1: Enter Amount */
                    <div className="p-6 space-y-6">
                        {/* Amount Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Amount to Fund
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                <input
                                    type="number"
                                    value={fundAmount}
                                    onChange={(e) => handleAmountChange(e.target.value)}
                                    className={`w-full pl-8 pr-4 py-3 border rounded-lg text-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                                        errors.amount ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    placeholder="Enter amount"
                                    min="100"
                                    max={maxFundAmount}
                                />
                            </div>
                            {errors.amount && (
                                <p className="text-sm text-red-500 mt-1">{errors.amount}</p>
                            )}
                            <div className="flex justify-between text-sm text-gray-500 mt-2">
                                <span>Min: $100</span>
                                <span>Max: {formatCurrency(maxFundAmount)}</span>
                            </div>
                        </div>

                        {/* Quick Amount Buttons */}
                        <div className="flex gap-2">
                            {[1000, 2500, 5000, 10000].map((amount) => (
                                <button
                                    key={amount}
                                    onClick={() => handleAmountChange(amount.toString())}
                                    disabled={amount > maxFundAmount || amount > availableBalance}
                                    className="flex-1 py-2 px-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    ${amount.toLocaleString()}
                                </button>
                            ))}
                        </div>

                        {/* Wallet Balance */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-gray-600">Investment Wallet Balance</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        {formatCurrency(availableBalance)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-600">After Funding</p>
                                    <p className={`text-lg font-semibold ${
                                        availableBalance - (parseFloat(fundAmount) || 0) >= 0 
                                            ? 'text-emerald-600' 
                                            : 'text-red-600'
                                    }`}>
                                        {formatCurrency(Math.max(0, availableBalance - (parseFloat(fundAmount) || 0)))}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Preview Button */}
                        <button
                            onClick={handlePreview}
                            disabled={!fundAmount || parseFloat(fundAmount) <= 0 || loanLoading}
                            className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Preview Investment
                        </button>
                    </div>
                ) : (
                    /* Step 2: Confirmation with Token Allocation */
                    <div className="p-6 space-y-6">
                        {/* Token Allocation Preview */}
                        {tokenAllocation && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Token Allocation Preview
                                </h3>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white rounded-lg p-4">
                                        <p className="text-sm text-gray-500">Tokens Received</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {tokenAllocation.tokensReceived.toFixed(2)}
                                        </p>
                                        <p className="text-xs text-gray-500">LNDA Tokens</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4">
                                        <p className="text-sm text-gray-500">Ownership</p>
                                        <p className="text-2xl font-bold text-indigo-600">
                                            {tokenAllocation.ownershipPercentage.toFixed(2)}%
                                        </p>
                                        <p className="text-xs text-gray-500">of loan pool</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Expected Returns */}
                        {tokenAllocation && (
                            <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Expected Returns
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Investment</span>
                                        <span className="font-medium">{formatCurrency(tokenAllocation.totalValue)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Expected Interest Yield</span>
                                        <span className="font-medium text-emerald-600">+{formatCurrency(tokenAllocation.expectedYield)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-emerald-200 pt-3">
                                        <span className="text-gray-900 font-medium">Total at Maturity</span>
                                        <span className="font-bold text-emerald-700">
                                            {formatCurrency(tokenAllocation.totalValue + tokenAllocation.expectedYield)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Monthly Payment</span>
                                        <span className="text-gray-700">{formatCurrency(tokenAllocation.monthlyPayment)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Transaction Summary */}
                        <div className="bg-gray-50 rounded-xl p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Transaction Summary</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Principal Amount</span>
                                    <span className="font-medium">{formatCurrency(parseFloat(fundAmount))}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Platform Fee (1%)</span>
                                    <span className="font-medium">{formatCurrency(parseFloat(fundAmount) * 0.01)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Estimated Gas Fee</span>
                                    <span className="font-medium">~$5.00</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-200 pt-3">
                                    <span className="text-gray-900 font-medium">Total</span>
                                    <span className="font-bold text-gray-900">
                                        {formatCurrency(parseFloat(fundAmount) * 1.01 + 5)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Warning */}
                        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                                <p className="text-sm font-medium text-amber-800">Investment Risk Notice</p>
                                <p className="text-xs text-amber-700 mt-1">
                                    This is a loan investment and carries default risk. Past performance does not guarantee future returns.
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleConfirmFunding}
                                disabled={loanLoading}
                                className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                                {loanLoading ? 'Processing...' : 'Confirm & Fund'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default FundingPreviewModal;
