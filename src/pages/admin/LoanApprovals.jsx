import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import {
    getPendingLoans,
    approveLoan,
    rejectLoan,
    resetLoading
} from '../../store/slices/loanSlice';

function LoanApprovals() {
    const dispatch = useDispatch();
    const { pendingLoans, isLoading } = useSelector((state) => state.loans);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);

    useEffect(() => {
        dispatch(getPendingLoans());
        
        // Cleanup: reset loading state on component unmount to prevent stale states
        return () => {
            dispatch(resetLoading());
        };
    }, [dispatch]);

    const handleApprove = async (loanId) => {
        try {
            await dispatch(approveLoan(loanId)).unwrap();
            toast.success('Loan approved successfully!');
            dispatch(getPendingLoans());
        } catch (error) {
            toast.error(error.message || 'Failed to approve loan');
        }
    };

    const handleReject = async () => {
        if (!selectedLoan || !rejectReason.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }

        try {
            await dispatch(rejectLoan({ loanId: selectedLoan.id, reason: rejectReason })).unwrap();
            toast.success('Loan rejected');
            setShowRejectModal(false);
            setRejectReason('');
            setSelectedLoan(null);
            dispatch(getPendingLoans());
        } catch (error) {
            toast.error(error.message || 'Failed to reject loan');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount || 0);
    };

    const getStatusColor = (status) => {
        const colors = {
            PENDING: 'bg-yellow-100 text-yellow-800',
            VERIFIED: 'bg-blue-100 text-blue-800',
            APPROVED: 'bg-green-100 text-green-800',
            REJECTED: 'bg-red-100 text-red-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Loan Approvals</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => dispatch(getPendingLoans())}
                        className="btn-secondary"
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold">{pendingLoans?.length || 0}</p>
                        <p className="text-sm text-slate-500">Pending Review</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">
                            {pendingLoans?.filter(l => l.collateral?.verified).length || 0}
                        </p>
                        <p className="text-sm text-slate-500">Collateral Verified</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">
                            {pendingLoans?.reduce((sum, l) => sum + (l.loanAmount || 0), 0) || 0}
                        </p>
                        <p className="text-sm text-slate-500">Total Value</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-red-600">
                            {pendingLoans?.filter(l => !l.collateral?.verified).length || 0}
                        </p>
                        <p className="text-sm text-slate-500">Pending Collateral</p>
                    </div>
                </div>
            </div>

            {/* Pending Loans List */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Pending Loan Requests</h2>

                {isLoading ? (
                    <div className="card p-6 text-center">
                        <div className="animate-pulse">Loading pending loans...</div>
                    </div>
                ) : !pendingLoans || pendingLoans.length === 0 ? (
                    <div className="card p-6 text-center text-slate-500">
                        <p>No pending loan approvals.</p>
                        <p className="text-sm mt-2">All loan requests have been processed.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {pendingLoans.map((loan) => (
                            <div key={loan.id} className="card hover:shadow-lg transition-shadow">
                                <div className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-lg font-semibold">Loan Request #{loan.id}</h3>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                                                    {loan.status}
                                                </span>
                                            </div>
                                            <p className="text-slate-500 mt-1">
                                                Borrower: {loan.borrowerName || 'Anonymous'} |
                                                Applied: {new Date(loan.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold">{formatCurrency(loan.loanAmount)}</p>
                                            <p className="text-sm text-slate-500">{loan.interestRate}% APR</p>
                                        </div>
                                    </div>

                                    {/* Loan Details */}
                                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500">Purpose</p>
                                            <p className="font-semibold text-sm truncate">{loan.purpose}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500">Duration</p>
                                            <p className="font-semibold">{loan.durationMonths} months</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500">Collateral</p>
                                            <p className={`font-semibold ${loan.collateral?.verified ? 'text-green-600' : 'text-yellow-600'}`}>
                                                {loan.collateral?.verified ? '✓ Verified' : '⏳ Pending'}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500">Monthly Payment</p>
                                            <p className="font-semibold">{formatCurrency(loan.monthlyPayment)}</p>
                                        </div>
                                    </div>

                                    {/* Collateral Details */}
                                    {loan.collateral && (
                                        <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                                            <h4 className="font-semibold mb-2">Collateral Details</h4>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-slate-500">Type:</span> {loan.collateral.type}
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Value:</span> {formatCurrency(loan.collateral.value)}
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="text-slate-500">Description:</span> {loan.collateral.description}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Risk Assessment */}
                                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                        <h4 className="font-semibold mb-2">Risk Assessment</h4>
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className="text-slate-500">Collateral Ratio:</span>{' '}
                                                <span className={`font-semibold ${(loan.collateral?.value / loan.loanAmount) >= 1.2
                                                        ? 'text-green-600'
                                                        : 'text-red-600'
                                                    }`}>
                                                    {((loan.collateral?.value / loan.loanAmount) * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Credit Score:</span>{' '}
                                                <span className={`font-semibold ${loan.creditScore >= 650 ? 'text-green-600' : 'text-yellow-600'
                                                    }`}>
                                                    {loan.creditScore || 'N/A'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">DTI Ratio:</span>{' '}
                                                <span className={`font-semibold ${(loan.debtToIncome || 0) <= 0.36
                                                        ? 'text-green-600'
                                                        : 'text-red-600'
                                                    }`}>
                                                    {((loan.debtToIncome || 0) * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-4 flex gap-3">
                                        <button
                                            onClick={() => handleApprove(loan.id)}
                                            className="btn-primary"
                                            disabled={!loan.collateral?.verified}
                                        >
                                            ✓ Approve
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedLoan(loan);
                                                setShowRejectModal(true);
                                            }}
                                            className="btn-secondary text-red-600 border-red-300 hover:bg-red-50"
                                        >
                                            ✕ Reject
                                        </button>
                                        <button className="btn-secondary">
                                            View Full Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Reject Modal */}
            {showRejectModal && selectedLoan && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="card max-w-md w-full mx-4">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Reject Loan Request #{selectedLoan.id}</h2>
                            <div className="space-y-4">
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-sm text-slate-500">Loan Amount</p>
                                    <p className="font-semibold">{formatCurrency(selectedLoan.loanAmount)}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Rejection Reason *</label>
                                    <select
                                        className="input-field w-full mb-2"
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                    >
                                        <option value="">Select a reason</option>
                                        <option value="Insufficient collateral">Insufficient collateral</option>
                                        <option value="Poor credit history">Poor credit history</option>
                                        <option value="High debt-to-income ratio">High debt-to-income ratio</option>
                                        <option value="Incomplete documentation">Incomplete documentation</option>
                                        <option value="Verification failed">Verification failed</option>
                                        <option value="Policy violation">Policy violation</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    <textarea
                                        className="input-field w-full h-24"
                                        placeholder="Provide additional details..."
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        className="btn-secondary flex-1"
                                        onClick={() => {
                                            setShowRejectModal(false);
                                            setRejectReason('');
                                            setSelectedLoan(null);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn-primary bg-red-500 hover:bg-red-600 flex-1"
                                        onClick={handleReject}
                                        disabled={isLoading || !rejectReason.trim()}
                                    >
                                        {isLoading ? 'Processing...' : 'Confirm Rejection'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LoanApprovals;
