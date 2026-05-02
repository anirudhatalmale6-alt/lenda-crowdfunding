import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { 
    PlusCircle, 
    DollarSign, 
    Calculator, 
    AlertCircle, 
    CheckCircle,
    Clock,
    Shield
} from 'lucide-react';
import { requestLoanTopup, getLoanDetails } from '../../store/slices/loanSlice';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

/**
 * LoanTopUpPanel - Component for borrowers to request additional funding
 * Addresses BF-05: Loan top-up functionality
 */
function LoanTopUpPanel({ loan }) {
    const dispatch = useDispatch();
    const { isLoading, error } = useSelector((state) => state.loans);
    
    const [showModal, setShowModal] = useState(false);
    const [topupAmount, setTopupAmount] = useState('');
    const [purpose, setPurpose] = useState('');
    const [additionalCollateral, setAdditionalCollateral] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    // Calculate limits
    const maxTopupAmount = loan?.collateralValue 
        ? Math.floor(loan.collateralValue * 0.8 - (loan?.amount || 0))
        : 0;
    
    const minTopupAmount = 1000;
    
    // Calculate new LTV after top-up
    const currentAmount = loan?.amount || 0;
    const newAmount = currentAmount + (parseFloat(topupAmount) || 0);
    const newLtv = loan?.collateralValue 
        ? ((newAmount / loan.collateralValue) * 100).toFixed(1)
        : 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!topupAmount || parseFloat(topupAmount) < minTopupAmount) {
            toast.error(`Minimum top-up amount is ${formatCurrency(minTopupAmount)}`);
            return;
        }
        
        if (parseFloat(topupAmount) > maxTopupAmount) {
            toast.error(`Maximum top-up amount is ${formatCurrency(maxTopupAmount)}`);
            return;
        }

        if (!purpose) {
            toast.error('Please provide a reason for the top-up');
            return;
        }

        if (!termsAccepted) {
            toast.error('Please accept the terms and conditions');
            return;
        }

        try {
            const result = await dispatch(requestLoanTopup({
                loanId: loan.id,
                amount: parseFloat(topupAmount),
                purpose,
                additionalCollateral
            })).unwrap();
            
            toast.success('Top-up request submitted successfully!');
            setShowModal(false);
            setTopupAmount('');
            setPurpose('');
            setAdditionalCollateral(false);
            setTermsAccepted(false);
            
            // Refresh loan details
            dispatch(getLoanDetails(loan.id));
        } catch (err) {
            toast.error(err.message || 'Failed to submit top-up request');
        }
    };

    // Don't show if loan is not active or is fully repaid
    if (!loan || loan.status === 'REPAID' || loan.status === 'DEFAULTED' || loan.status === 'RECOVERY_SALE') {
        return null;
    }

    const isEligible = loan.status === 'ACTIVE' && loan.repaymentSchedule === 'monthly';

    return (
        <>
            {/* Top-Up Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg text-slate-900 flex items-center gap-2">
                        <PlusCircle className="w-5 h-5 text-primary-600" />
                        Loan Top-Up
                    </h3>
                    {isEligible ? (
                        <span className="badge-success">Available</span>
                    ) : (
                        <span className="badge-warning">Not Eligible</span>
                    )}
                </div>

                {isEligible ? (
                    <>
                        <p className="text-sm text-slate-600 mb-4">
                            Need additional funds? Request a top-up on your existing loan based on your collateral value.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <div className="text-xs text-slate-500">Current Loan</div>
                                <div className="font-semibold text-slate-900">
                                    {formatCurrency(loan.amount)}
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <div className="text-xs text-slate-500">Max Top-Up</div>
                                <div className="font-semibold text-primary-600">
                                    {formatCurrency(maxTopupAmount)}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowModal(true)}
                            className="w-full btn-primary"
                        >
                            Request Top-Up
                        </button>
                    </>
                ) : (
                    <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-600">
                            Top-up is only available for active loans with monthly repayment schedules.
                        </p>
                    </div>
                )}
            </div>

            {/* Top-Up Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-slate-900 mb-4">
                                Request Loan Top-Up
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Current Loan Info */}
                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-500">Current Loan Amount</span>
                                        <span className="font-medium">{formatCurrency(currentAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-500">Collateral Value</span>
                                        <span className="font-medium">{formatCurrency(loan.collateralValue)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Current LTV</span>
                                        <span className="font-medium">
                                            {((currentAmount / loan.collateralValue) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>

                                {/* Top-Up Amount */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Top-Up Amount *
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="number"
                                            value={topupAmount}
                                            onChange={(e) => setTopupAmount(e.target.value)}
                                            className="input-field pl-10"
                                            placeholder={`Min ${minTopupAmount} - Max ${maxTopupAmount}`}
                                            min={minTopupAmount}
                                            max={maxTopupAmount}
                                            required
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                                        <span>Min: {formatCurrency(minTopupAmount)}</span>
                                        <span>Max: {formatCurrency(maxTopupAmount)}</span>
                                    </div>
                                </div>

                                {/* Quick Amount Buttons */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Quick Select
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[0.25, 0.5, 0.75].map((ratio) => (
                                            <button
                                                key={ratio}
                                                type="button"
                                                onClick={() => setTopupAmount(Math.floor(maxTopupAmount * ratio).toString())}
                                                className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
                                            >
                                                {formatCurrency(Math.floor(maxTopupAmount * ratio))}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Purpose */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Purpose of Top-Up *
                                    </label>
                                    <select
                                        value={purpose}
                                        onChange={(e) => setPurpose(e.target.value)}
                                        className="input-field"
                                        required
                                    >
                                        <option value="">Select purpose</option>
                                        <option value="business_expansion">Business Expansion</option>
                                        <option value="working_capital">Working Capital</option>
                                        <option value="equipment">Equipment Purchase</option>
                                        <option value="inventory">Inventory Purchase</option>
                                        <option value="debt_refinancing">Debt Refinancing</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                {/* Additional Collateral */}
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="additionalCollateral"
                                        checked={additionalCollateral}
                                        onChange={(e) => setAdditionalCollateral(e.target.checked)}
                                        className="w-4 h-4 text-primary-600 rounded"
                                    />
                                    <label htmlFor="additionalCollateral" className="text-sm text-slate-700">
                                        I can provide additional collateral
                                    </label>
                                </div>

                                {/* New LTV Preview */}
                                {topupAmount && parseFloat(topupAmount) > 0 && (
                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Calculator className="w-4 h-4 text-blue-600" />
                                            <span className="font-medium text-blue-800">After Top-Up</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-blue-600">New Amount:</span>
                                                <span className="font-medium ml-1">{formatCurrency(newAmount)}</span>
                                            </div>
                                            <div>
                                                <span className="text-blue-600">New LTV:</span>
                                                <span className={`font-medium ml-1 ${
                                                    newLtv > 80 ? 'text-red-600' : newLtv > 60 ? 'text-yellow-600' : 'text-green-600'
                                                }`}>
                                                    {newLtv}%
                                                </span>
                                            </div>
                                        </div>
                                        {newLtv > 80 && (
                                            <div className="flex items-center gap-2 mt-2 text-xs text-red-600">
                                                <AlertCircle className="w-4 h-4" />
                                                <span>LTV exceeds 80% - additional collateral may be required</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Terms */}
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        id="termsAccepted"
                                        checked={termsAccepted}
                                        onChange={(e) => setTermsAccepted(e.target.checked)}
                                        className="w-4 h-4 mt-1 text-primary-600 rounded"
                                    />
                                    <label htmlFor="termsAccepted" className="text-sm text-slate-600">
                                        I understand that this top-up request is subject to approval and 
                                        will result in a new loan agreement with updated terms and interest rate.
                                    </label>
                                </div>

                                {/* Processing Notice */}
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <Clock className="w-4 h-4 text-amber-600 mt-0.5" />
                                        <div className="text-sm text-amber-700">
                                            <strong>Processing Time:</strong> Top-up requests are typically 
                                            processed within 2-3 business days after submission.
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading || !termsAccepted}
                                        className="flex-1 btn-primary disabled:opacity-50"
                                    >
                                        {isLoading ? 'Submitting...' : 'Submit Request'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default LoanTopUpPanel;
