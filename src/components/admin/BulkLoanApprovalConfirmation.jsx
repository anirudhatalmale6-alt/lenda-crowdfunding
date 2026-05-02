import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-hot-toast';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { approveLoan, bulkApproveLoans } from '../../store/slices/loanSlice';

/**
 * BulkLoanApprovalConfirmation - UX-011: Bulk Loan Approval confirmation screen
 * Shows preview of all loans to be approved in batch operation
 */
function BulkLoanApprovalConfirmation({ loans = [], onClose, onSuccess }) {
    const dispatch = useDispatch();
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedLoans, setSelectedLoans] = useState(loans.map(l => l.id));
    const [showConfirmation, setShowConfirmation] = useState(false);

    const toggleLoan = (loanId) => {
        setSelectedLoans(prev => 
            prev.includes(loanId) 
                ? prev.filter(id => id !== loanId)
                : [...prev, loanId]
        );
    };

    const toggleAll = () => {
        if (selectedLoans.length === loans.length) {
            setSelectedLoans([]);
        } else {
            setSelectedLoans(loans.map(l => l.id));
        }
    };

    const selectedLoanData = loans.filter(l => selectedLoans.includes(l.id));

    const totalAmount = selectedLoanData.reduce((sum, l) => sum + (l.loanAmount || 0), 0);
    const totalFunded = selectedLoanData.reduce((sum, l) => sum + (l.fundedAmount || 0), 0);
    const avgInterestRate = selectedLoanData.length > 0 
        ? selectedLoanData.reduce((sum, l) => sum + (l.interestRate || 0), 0) / selectedLoanData.length 
        : 0;

    const handleConfirm = async () => {
        setIsProcessing(true);
        
        try {
            await dispatch(bulkApproveLoans({ loanIds: selectedLoans })).unwrap();
            toast.success(`Successfully approved ${selectedLoans.length} loans`);
            onSuccess?.();
            onClose?.();
        } catch (error) {
            toast.error(error.message || 'Failed to approve loans');
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            REQUESTED: 'bg-blue-100 text-blue-800',
            FUNDED: 'bg-yellow-100 text-yellow-800',
            ACTIVE: 'bg-green-100 text-green-800',
            REPAID: 'bg-gray-100 text-gray-800',
            DEFAULTED: 'bg-red-100 text-red-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {showConfirmation ? 'Confirm Bulk Approval' : 'Bulk Loan Approval'}
                            </h2>
                            <p className="text-gray-500 mt-1">
                                {showConfirmation 
                                    ? `Review and confirm approval of ${selectedLoans.length} loans`
                                    : `Select loans to approve (${loans.length} pending)`
                                }
                            </p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {!showConfirmation ? (
                    /* Selection View */
                    <>
                        {/* Summary Stats */}
                        <div className="p-4 bg-gray-50 border-b border-gray-100">
                            <div className="grid grid-cols-4 gap-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-gray-900">{loans.length}</p>
                                    <p className="text-xs text-gray-500">Total Pending</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-blue-600">{selectedLoans.length}</p>
                                    <p className="text-xs text-gray-500">Selected</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalAmount)}</p>
                                    <p className="text-xs text-gray-500">Total Amount</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-amber-600">{avgInterestRate.toFixed(1)}%</p>
                                    <p className="text-xs text-gray-500">Avg. Rate</p>
                                </div>
                            </div>
                        </div>

                        {/* Loan List */}
                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-left">
                                            <input
                                                type="checkbox"
                                                checked={selectedLoans.length === loans.length && loans.length > 0}
                                                onChange={toggleAll}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loan ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Term</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Borrower</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loans.map((loan) => (
                                        <tr 
                                            key={loan.id} 
                                            className={`hover:bg-gray-50 cursor-pointer ${
                                                selectedLoans.includes(loan.id) ? 'bg-blue-50' : ''
                                            }`}
                                            onClick={() => toggleLoan(loan.id)}
                                        >
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLoans.includes(loan.id)}
                                                    onChange={() => toggleLoan(loan.id)}
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-900">#{loan.id}</td>
                                            <td className="px-4 py-3 text-gray-600">{formatCurrency(loan.loanAmount)}</td>
                                            <td className="px-4 py-3 text-emerald-600 font-medium">{loan.interestRate}%</td>
                                            <td className="px-4 py-3 text-gray-600">{loan.durationMonths} mo</td>
                                            <td className="px-4 py-3 text-gray-500">
                                                {loan.borrower?.slice(0, 6)}...{loan.borrower?.slice(-4)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(loan.status)}`}>
                                                    {loan.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
                            <p className="text-sm text-gray-500">
                                Select loans to approve
                            </p>
                            <button
                                onClick={() => setShowConfirmation(true)}
                                disabled={selectedLoans.length === 0}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continue ({selectedLoans.length})
                            </button>
                        </div>
                    </>
                ) : (
                    /* Confirmation View */
                    <>
                        {/* Summary */}
                        <div className="p-6 bg-emerald-50 border-b border-emerald-100">
                            <h3 className="font-semibold text-emerald-800 mb-4">Approval Summary</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-sm text-emerald-700">Loans to Approve</p>
                                    <p className="text-2xl font-bold text-emerald-800">{selectedLoans.length}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-emerald-700">Total Amount</p>
                                    <p className="text-2xl font-bold text-emerald-800">{formatCurrency(totalAmount)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-emerald-700">Already Funded</p>
                                    <p className="text-2xl font-bold text-emerald-800">{formatCurrency(totalFunded)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-emerald-700">Avg. Interest Rate</p>
                                    <p className="text-2xl font-bold text-emerald-800">{avgInterestRate.toFixed(1)}%</p>
                                </div>
                            </div>
                        </div>

                        {/* Selected Loans Preview */}
                        <div className="p-6 max-h-64 overflow-y-auto">
                            <h4 className="font-medium text-gray-900 mb-3">Loans to be Approved</h4>
                            <div className="space-y-2">
                                {selectedLoanData.map((loan) => (
                                    <div key={loan.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className="font-medium">#{loan.id}</span>
                                            <span className="text-gray-500 text-sm">
                                                {loan.borrower?.slice(0, 6)}...{loan.borrower?.slice(-4)}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-semibold">{formatCurrency(loan.loanAmount)}</span>
                                            <span className="text-gray-500 text-sm ml-2">@ {loan.interestRate}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Warnings */}
                        <div className="px-6 pb-4">
                            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div>
                                    <p className="text-sm font-medium text-amber-800">Please confirm:</p>
                                    <ul className="text-xs text-amber-700 mt-1 space-y-1">
                                        <li>• All selected loans meet your lending criteria</li>
                                        <li>• Collateral documentation has been verified</li>
                                        <li>• Borrower creditworthiness has been assessed</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50">
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100"
                            >
                                Back to Selection
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isProcessing}
                                className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {isProcessing ? 'Processing...' : `Approve ${selectedLoans.length} Loans`}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default BulkLoanApprovalConfirmation;
