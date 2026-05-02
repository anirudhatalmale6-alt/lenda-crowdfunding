import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { getMyLoans, requestLoanTopup } from '../../store/slices/loanSlice';
import { formatCurrency } from '../../utils/formatters';

function MyLoans() {
    const dispatch = useDispatch();
    const { myLoans, isLoading } = useSelector((state) => state.loans);
    const [filter, setFilter] = useState('all');
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [showTopupModal, setShowTopupModal] = useState(false);
    const [topupAmount, setTopupAmount] = useState('');

    useEffect(() => {
        dispatch(getMyLoans());
    }, [dispatch]);

    const getStatusColor = (status) => {
        const colors = {
            ACTIVE: 'bg-green-100 text-green-800',
            REPAID: 'bg-blue-100 text-blue-800',
            DEFAULTED: 'bg-red-100 text-red-800',
            FUNDED: 'bg-yellow-100 text-yellow-800',
            PENDING: 'bg-gray-100 text-gray-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const handleTopupRequest = async () => {
        if (!selectedLoan || !topupAmount || parseFloat(topupAmount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        try {
            await dispatch(requestLoanTopup({
                loanId: selectedLoan.id,
                amount: parseFloat(topupAmount)
            })).unwrap();
            toast.success('Top-up request submitted!');
            setShowTopupModal(false);
            setTopupAmount('');
            setSelectedLoan(null);
        } catch (error) {
            toast.error(error.message || 'Failed to request top-up');
        }
    };

    const filteredLoans = myLoans?.filter(loan => {
        if (filter === 'all') return true;
        return loan.status === filter;
    }) || [];

    const getLoanStats = () => {
        if (!myLoans) return { total: 0, active: 0, repaid: 0, defaulted: 0, totalDisbursed: 0, totalRepaid: 0 };

        return {
            total: myLoans.length,
            active: myLoans.filter(l => l.status === 'ACTIVE').length,
            repaid: myLoans.filter(l => l.status === 'REPAID').length,
            defaulted: myLoans.filter(l => l.status === 'DEFAULTED').length,
            totalDisbursed: myLoans.reduce((sum, l) => sum + (l.loanAmount || 0), 0),
            totalRepaid: myLoans.reduce((sum, l) => sum + (l.repaidAmount || 0), 0),
        };
    };

    const stats = getLoanStats();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold">My Loans</h1>
                <Link to="/dashboard/loan-requests" className="btn-primary text-sm">
                    New Loan Request
                </Link>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold">{stats.total}</p>
                        <p className="text-sm text-slate-500">Total</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                        <p className="text-sm text-slate-500">Active</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">{stats.repaid}</p>
                        <p className="text-sm text-slate-500">Repaid</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-red-600">{stats.defaulted}</p>
                        <p className="text-sm text-slate-500">Defaulted</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-xl font-bold">{formatCurrency(stats.totalDisbursed)}</p>
                        <p className="text-sm text-slate-500">Disbursed</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-xl font-bold">{formatCurrency(stats.totalRepaid)}</p>
                        <p className="text-sm text-slate-500">Repaid</p>
                    </div>
                </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2 flex-wrap">
                {['all', 'ACTIVE', 'REPAID', 'DEFAULTED', 'FUNDED'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === status
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        {status === 'all' ? 'All Loans' : status.charAt(0) + status.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            {/* Loans List */}
            {isLoading ? (
                <div className="card p-6 text-center">
                    <div className="animate-pulse">Loading loans...</div>
                </div>
            ) : filteredLoans.length === 0 ? (
                <div className="card p-6 text-center text-slate-500">
                    <p>No loans found.</p>
                    <Link to="/dashboard/loan-requests" className="text-emerald-600 hover:underline mt-2 inline-block">
                        Apply for your first loan
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredLoans.map((loan) => {
                        const progress = (loan.repaidAmount / loan.loanAmount) * 100;
                        const remaining = loan.loanAmount - loan.repaidAmount;
                        const isFullyRepaid = loan.status === 'REPAID';
                        const isDefaulted = loan.status === 'DEFAULTED';

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
                                                {loan.isGuaranteed && (
                                                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                        LENDA Guaranteed
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-slate-500 mt-1">{loan.purpose}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold">{formatCurrency(loan.loanAmount)}</p>
                                            <p className="text-sm text-slate-500">{loan.interestRate}% APR</p>
                                        </div>
                                    </div>

                                    {/* Loan Details */}
                                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500">Duration</p>
                                            <p className="font-semibold">{loan.durationMonths} months</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500">Monthly Payment</p>
                                            <p className="font-semibold">{formatCurrency(loan.monthlyPayment)}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500">Amount Repaid</p>
                                            <p className="font-semibold text-green-600">{formatCurrency(loan.repaidAmount)}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500">Remaining</p>
                                            <p className={`font-semibold ${isDefaulted ? 'text-red-600' : remaining > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                                                {formatCurrency(remaining)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    {!isFullyRepaid && !isDefaulted && (
                                        <div className="mt-4">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>Repayment Progress</span>
                                                <span>{progress.toFixed(1)}%</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                <div
                                                    className="bg-emerald-500 h-2 rounded-full transition-all"
                                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
                                        {!isFullyRepaid && !isDefaulted && (
                                            <>
                                                <Link
                                                    to={`/dashboard/repayments?loan=${loan.id}`}
                                                    className="btn-primary text-sm"
                                                >
                                                    Make Payment
                                                </Link>
                                                <button
                                                    onClick={() => {
                                                        setSelectedLoan(loan);
                                                        setShowTopupModal(true);
                                                    }}
                                                    className="btn-secondary text-sm"
                                                >
                                                    Request Top-up
                                                </button>
                                            </>
                                        )}
                                        <Link
                                            to={`/loans/${loan.id}`}
                                            className="btn-secondary text-sm"
                                        >
                                            View Details
                                        </Link>
                                        {loan.collateral && (
                                            <Link
                                                to={`/dashboard/collateral?loan=${loan.id}`}
                                                className="btn-secondary text-sm"
                                            >
                                                View Collateral
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Top-up Modal */}
            {showTopupModal && selectedLoan && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="card max-w-md w-full mx-4">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Request Loan Top-up</h2>
                            <div className="space-y-4">
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-sm text-slate-500">Current Loan</p>
                                    <p className="font-semibold">#{selectedLoan.id} - {formatCurrency(selectedLoan.loanAmount)}</p>
                                    <p className="text-sm text-slate-500 mt-2">Remaining Balance</p>
                                    <p className="font-semibold">{formatCurrency(selectedLoan.loanAmount - selectedLoan.repaidAmount)}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Top-up Amount</label>
                                    <input
                                        type="number"
                                        className="input-field w-full"
                                        placeholder="Enter amount"
                                        value={topupAmount}
                                        onChange={(e) => setTopupAmount(e.target.value)}
                                        min="100"
                                        max={(selectedLoan.loanAmount * 0.5)}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Maximum: 50% of original loan amount ({formatCurrency(selectedLoan.loanAmount * 0.5)})
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        className="btn-secondary flex-1"
                                        onClick={() => {
                                            setShowTopupModal(false);
                                            setTopupAmount('');
                                            setSelectedLoan(null);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn-primary flex-1"
                                        onClick={handleTopupRequest}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Submitting...' : 'Submit Request'}
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

export default MyLoans;
