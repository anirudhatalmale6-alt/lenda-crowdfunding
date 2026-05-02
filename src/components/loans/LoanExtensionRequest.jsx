import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import {
    Clock,
    Calendar,
    DollarSign,
    AlertCircle,
    CheckCircle,
    Loader,
    FileText,
    Send,
    X
} from 'lucide-react';

/**
 * LoanExtensionRequest - Component for borrowers to request loan term extensions
 * Addresses FEAT-002: Loan Extension Request UI
 */
function LoanExtensionRequest({ loan, onSuccess, onError }) {
    const dispatch = useDispatch();
    const { isLoading } = useSelector(state => state.loans);
    
    const [showModal, setShowModal] = useState(false);
    const [extensionMonths, setExtensionMonths] = useState(3);
    const [reason, setReason] = useState('');
    const [extensionType, setExtensionType] = useState('term');
    const [showPreview, setShowPreview] = useState(false);
    const [success, setSuccess] = useState(false);
    
    // Calculate new terms based on extension
    const calculateNewTerms = () => {
        if (!loan) return null;
        
        const currentMonthlyPayment = (loan.loanAmount * (1 + loan.interestRate / 100)) / loan.durationMonths;
        const newDuration = loan.durationMonths + parseInt(extensionMonths);
        
        // Recalculate monthly payment with same principal, remaining interest
        const remainingPrincipal = loan.loanAmount - (loan.repaidAmount || 0);
        const remainingInterest = remainingPrincipal * (loan.interestRate / 100) * (newDuration / 12);
        const newMonthlyPayment = (remainingPrincipal + remainingInterest) / newDuration;
        
        // Extension fee calculation (typically 1-2% of remaining principal)
        const extensionFee = remainingPrincipal * 0.015;
        
        return {
            currentMonthlyPayment: currentMonthlyPayment.toFixed(2),
            newMonthlyPayment: newMonthlyPayment.toFixed(2),
            newDuration: newDuration,
            extensionFee: extensionFee.toFixed(2),
            totalInterest: remainingInterest.toFixed(2),
            savings: (currentMonthlyPayment - newMonthlyPayment).toFixed(2)
        };
    };
    
    const newTerms = calculateNewTerms();
    
    const maxExtension = loan?.maxExtensionMonths || 12;
    const minExtension = 1;
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!reason.trim()) {
            toast.error('Please provide a reason for the extension request');
            return;
        }
        
        try {
            // In production, this would call an API
            // Mock successful submission
            setSuccess(true);
            toast.success('Extension request submitted successfully!');
            
            if (onSuccess) {
                onSuccess({
                    loanId: loan.id,
                    extensionMonths: parseInt(extensionMonths),
                    reason,
                    extensionType,
                    submittedAt: new Date().toISOString()
                });
            }
            
            setTimeout(() => {
                setShowModal(false);
                setSuccess(false);
                setReason('');
            }, 2000);
            
        } catch (error) {
            toast.error(error.message || 'Failed to submit extension request');
            if (onError) {
                onError(error);
            }
        }
    };
    
    if (!loan) return null;
    
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary-500" />
                    Request Loan Extension
                </h3>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn-primary text-sm"
                >
                    Request Extension
                </button>
            </div>
            
            <div className="text-sm text-slate-500">
                <p>Need more time to repay? You can request to extend your loan term.</p>
                <p className="mt-1">Maximum extension: {maxExtension} months</p>
            </div>
            
            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold">Request Loan Extension</h2>
                                <button 
                                    onClick={() => setShowModal(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            {/* Current Loan Info */}
                            <div className="bg-slate-50 rounded-lg p-4 mb-4">
                                <h4 className="font-medium text-slate-900 mb-2">Current Loan Details</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-slate-500">Loan Amount:</span>
                                        <span className="font-medium ml-2">${loan.loanAmount?.toLocaleString()}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Interest Rate:</span>
                                        <span className="font-medium ml-2">{loan.interestRate}%</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Current Term:</span>
                                        <span className="font-medium ml-2">{loan.durationMonths} months</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Remaining:</span>
                                        <span className="font-medium ml-2">${((loan.loanAmount || 0) - (loan.repaidAmount || 0)).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Extension Options */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Extension Type
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setExtensionType('term')}
                                            className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                                                extensionType === 'term'
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                    : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <Calendar className="w-4 h-4 mx-auto mb-1" />
                                            Extend Term
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setExtensionType('defer')}
                                            className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                                                extensionType === 'defer'
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                    : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <Clock className="w-4 h-4 mx-auto mb-1" />
                                            Defer Payments
                                        </button>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Extension Period (months)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setExtensionMonths(Math.max(minExtension, extensionMonths - 1))}
                                            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            value={extensionMonths}
                                            onChange={(e) => setExtensionMonths(parseInt(e.target.value) || minExtension)}
                                            min={minExtension}
                                            max={maxExtension}
                                            className="flex-1 text-center py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setExtensionMonths(Math.min(maxExtension, extensionMonths + 1))}
                                            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Range: {minExtension} - {maxExtension} months
                                    </p>
                                </div>
                                
                                {/* Preview Toggle */}
                                <button
                                    type="button"
                                    onClick={() => setShowPreview(!showPreview)}
                                    className="text-sm text-primary-600 hover:text-primary-700"
                                >
                                    {showPreview ? 'Hide' : 'Show'} Impact Preview
                                </button>
                                
                                {/* Impact Preview */}
                                {showPreview && newTerms && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h4 className="font-medium text-blue-900 mb-3">Extension Impact</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-blue-700">New Term:</span>
                                                <span className="font-medium">{newTerms.newDuration} months</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-blue-700">New Monthly Payment:</span>
                                                <span className="font-medium">${newTerms.newMonthlyPayment}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-blue-700">Extension Fee (1.5%):</span>
                                                <span className="font-medium text-amber-600">${newTerms.extensionFee}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-blue-700">Additional Interest:</span>
                                                <span className="font-medium">${newTerms.totalInterest}</span>
                                            </div>
                                            {parseFloat(newTerms.savings) > 0 && (
                                                <div className="flex justify-between text-green-600">
                                                    <span>Monthly Savings:</span>
                                                    <span className="font-medium">${newTerms.savings}/month</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Reason for Extension *
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Please explain why you need an extension..."
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
                                        rows={3}
                                        required
                                    />
                                </div>
                                
                                {/* Important Notes */}
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                                        <div className="text-sm text-amber-700">
                                            <p className="font-medium">Important Notes:</p>
                                            <ul className="list-disc list-inside mt-1 space-y-1">
                                                <li>Extension requests are subject to approval</li>
                                                <li>A 1.5% extension fee applies</li>
                                                <li>Your credit score may be affected</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="btn-secondary flex-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading || !reason.trim()}
                                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader className="w-4 h-4 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" />
                                                Submit Request
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Success Message */}
            {success && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">Extension request submitted successfully!</span>
                </div>
            )}
        </div>
    );
}

export default LoanExtensionRequest;
