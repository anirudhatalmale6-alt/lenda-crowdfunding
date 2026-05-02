import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { getMyLoans, makeRepayment } from '../../store/slices/loanSlice';
import { formatCurrency } from '../../utils/formatters';

function Repayments() {
    const dispatch = useDispatch();
    const { myLoans, isLoading } = useSelector((state) => state.loans);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [repaymentAmount, setRepaymentAmount] = useState('');
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        dispatch(getMyLoans());
    }, [dispatch]);

    const handleRepayment = async () => {
        if (!selectedLoan || !repaymentAmount) {
            toast.error('Please enter an amount');
            return;
        }

        const amount = parseFloat(repaymentAmount);
        if (amount <= 0) {
            toast.error('Amount must be greater than 0');
            return;
        }

        try {
            await dispatch(makeRepayment({
                loanId: selectedLoan.id,
                amount: amount
            })).unwrap();
            toast.success('Repayment successful!');
            setShowModal(false);
            setRepaymentAmount('');
            setSelectedLoan(null);
            dispatch(getMyLoans());
        } catch (error) {
            toast.error(error.message || 'Failed to process repayment');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            ACTIVE: 'bg-green-100 text-green-800',
            REPAID: 'bg-blue-100 text-blue-800',
            DEFAULTED: 'bg-red-100 text-red-800',
            FUNDED: 'bg-yellow-100 text-yellow-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getUpcomingPayments = () => {
        if (!myLoans) return [];

        return myLoans
            .filter(loan => loan.status === 'ACTIVE')
            .map(loan => ({
                ...loan,
                nextPayment: loan.repaymentSchedule?.[0] || {
                    amount: loan.loanAmount / loan.durationMonths,
                    dueDate: loan.dueDate,
                }
            }))
            .sort((a, b) => (a.nextPayment.dueDate || 0) - (b.nextPayment.dueDate || 0));
    };

    const upcomingPayments = getUpcomingPayments();
    const totalDue = upcomingPayments.reduce((sum, loan) => sum + (loan.nextPayment?.amount || 0), 0);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Repayments</h1>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card bg-gradient-to-r from-red-500 to-orange-500 text-white">
                    <div className="p-6">
                        <h3 className="text-sm font-medium opacity-90">Total Due This Period</h3>
                        <p className="text-3xl font-bold mt-2">{formatCurrency(totalDue)}</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-6">
                        <h3 className="text-sm text-slate-500">Active Loans</h3>
                        <p className="text-3xl font-bold mt-2 text-slate-800">
                            {myLoans?.filter(l => l.status === 'ACTIVE').length || 0}
                        </p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-6">
                        <h3 className="text-sm text-slate-500">Completed Loans</h3>
                        <p className="text-3xl font-bold mt-2 text-slate-800">
                            {myLoans?.filter(l => l.status === 'REPAID').length || 0}
                        </p>
                    </div>
                </div>
            </div>

            {/* Upcoming Payments */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Upcoming Payments</h2>

                {isLoading ? (
                    <div className="card p-6 text-center">
                        <div className="animate-pulse">Loading repayments...</div>
                    </div>
                ) : upcomingPayments.length === 0 ? (
                    <div className="card p-6 text-center text-slate-500">
                        <p>No upcoming repayments.</p>
                        <p className="text-sm mt-2">You have no active loans requiring repayment.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {upcomingPayments.map((loan) => {
                            const dueDateValue = loan.nextPayment?.dueDate
                                ? new Date(loan.nextPayment.dueDate).getTime()
                                : null;
                            const daysUntilDue = dueDateValue
                                ? Math.ceil((dueDateValue - Date.now()) / (1000 * 60 * 60 * 24))
                                : 0;
                            const isOverdue = daysUntilDue < 0;
                            const isDueSoon = daysUntilDue <= 7 && daysUntilDue >= 0;

                            return (
                                <div key={loan.id} className="card hover:shadow-lg transition-shadow">
                                    <div className="p-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-semibold">Loan #{loan.id}</h3>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                                                        {loan.status}
                                                    </span>
                                                </div>
                                                <p className="text-slate-500 mt-1">
                                                    Original: {formatCurrency(loan.loanAmount)} | {loan.interestRate}% APR
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-bold">{formatCurrency(loan.nextPayment?.amount)}</p>
                                                <p className={`text-sm ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : 'text-slate-500'}`}>
                                                    {isOverdue
                                                        ? `${Math.abs(daysUntilDue)} days overdue`
                                                        : daysUntilDue === 0
                                                            ? 'Due today'
                                                            : `Due in ${daysUntilDue} days`
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mt-4">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>Repayment Progress</span>
                                                <span>{Math.round((loan.repaidAmount / loan.loanAmount) * 100)}%</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                <div
                                                    className="bg-emerald-500 h-2 rounded-full transition-all"
                                                    style={{ width: `${Math.min((loan.repaidAmount / loan.loanAmount) * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                            <div className="flex justify-between text-sm mt-2 text-slate-500">
                                                <span>Paid: {formatCurrency(loan.repaidAmount)}</span>
                                                <span>Remaining: {formatCurrency(loan.loanAmount - loan.repaidAmount)}</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-col sm:flex-row gap-3">
                                            <button
                                                onClick={() => {
                                                    setSelectedLoan(loan);
                                                    setRepaymentAmount(loan.nextPayment?.amount);
                                                    setShowModal(true);
                                                }}
                                                className="btn-primary text-sm"
                                            >
                                                Make Payment
                                            </button>
                                            <button className="btn-secondary text-sm">
                                                View Schedule
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Payment History Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Payment History</h2>
                <div className="card">
                    <div className="p-6 text-center text-slate-500">
                        <p>View your complete payment history</p>
                        <button className="btn-secondary mt-4">
                            View History
                        </button>
                    </div>
                </div>
            </div>

            {/* Repayment Modal */}
            {showModal && selectedLoan && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="card max-w-md w-full mx-4">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Make Payment - Loan #{selectedLoan.id}</h2>
                            <div className="space-y-4">
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <div className="flex justify-between text-sm">
                                        <span>Loan Amount:</span>
                                        <span className="font-medium">{formatCurrency(selectedLoan.loanAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mt-2">
                                        <span>Amount Paid:</span>
                                        <span className="font-medium">{formatCurrency(selectedLoan.repaidAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mt-2">
                                        <span>Remaining:</span>
                                        <span className="font-medium">{formatCurrency(selectedLoan.loanAmount - selectedLoan.repaidAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mt-2 pt-2 border-t">
                                        <span>Next Payment Due:</span>
                                        <span className="font-medium">{formatCurrency(selectedLoan.nextPayment?.amount)}</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Payment Amount</label>
                                    <input
                                        type="number"
                                        className="input-field w-full"
                                        placeholder="Enter amount"
                                        value={repaymentAmount}
                                        onChange={(e) => setRepaymentAmount(e.target.value)}
                                        min="0"
                                        max={selectedLoan.loanAmount - selectedLoan.repaidAmount}
                                    />
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            className="text-xs text-emerald-600 hover:underline"
                                            onClick={() => setRepaymentAmount(selectedLoan.nextPayment?.amount)}
                                        >
                                            Minimum Due
                                        </button>
                                        <button
                                            className="text-xs text-emerald-600 hover:underline"
                                            onClick={() => setRepaymentAmount(selectedLoan.loanAmount - selectedLoan.repaidAmount)}
                                        >
                                            Pay Full Balance
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        className="btn-secondary flex-1"
                                        onClick={() => {
                                            setShowModal(false);
                                            setRepaymentAmount('');
                                            setSelectedLoan(null);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn-primary flex-1"
                                        onClick={handleRepayment}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Processing...' : 'Confirm Payment'}
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

export default Repayments;
