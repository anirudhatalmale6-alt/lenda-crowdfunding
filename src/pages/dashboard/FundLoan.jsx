import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    getLoanRequests,
    fundLoan,
    setFilters,
    setPage
} from '../../store/slices/loanSlice';
import { getWallets } from '../../store/slices/walletSlice';
import { fundLoanSchema, validateForm } from '../../utils/validation';
import { formatCurrency, formatDate } from '../../utils/formatters';

function FundLoan() {
    const dispatch = useDispatch();
    const { loanRequests, isLoading, filters, pagination } = useSelector((state) => state.loans);
    const { wallets } = useSelector((state) => state.wallet);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [fundAmount, setFundAmount] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        dispatch(getLoanRequests(filters));
        dispatch(getWallets());
    }, [dispatch, filters]);

    const handleFund = async () => {
        if (!selectedLoan || !fundAmount) {
            toast.error('Please enter an amount');
            return;
        }

        // Validate with Zod
        const validationErrors = validateForm(fundLoanSchema, {
            loanId: selectedLoan.id,
            amount: fundAmount,
        });

        if (wallets.investment?.available < parseFloat(fundAmount)) {
            validationErrors.amount = 'Insufficient investment wallet balance';
        }

        if (parseFloat(fundAmount) > selectedLoan.loanAmount - selectedLoan.fundedAmount) {
            validationErrors.amount = 'Amount exceeds remaining funding needed';
        }

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error(validationErrors.amount || 'Please fix the errors');
            return;
        }

        try {
            await dispatch(fundLoan({
                loanId: selectedLoan.id,
                amount: parseFloat(fundAmount)
            })).unwrap();
            toast.success('Loan funded successfully!');
            setShowModal(false);
            setFundAmount('');
            setSelectedLoan(null);
            setErrors({});
            dispatch(getLoanRequests(filters));
        } catch (error) {
            toast.error(error.message || 'Failed to fund loan');
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
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Find Loans to Fund</h1>
                <div className="flex gap-4">
                    <select
                        className="input-field w-40"
                        value={filters.status}
                        onChange={(e) => dispatch(setFilters({ status: e.target.value }))}
                    >
                        <option value="all">All Status</option>
                        <option value="REQUESTED">Requested</option>
                        <option value="FUNDED">Funded</option>
                        <option value="ACTIVE">Active</option>
                    </select>
                    <select
                        className="input-field w-40"
                        value={filters.duration}
                        onChange={(e) => dispatch(setFilters({ duration: e.target.value }))}
                    >
                        <option value="all">All Duration</option>
                        <option value="3">3 Months</option>
                        <option value="6">6 Months</option>
                        <option value="12">12 Months</option>
                        <option value="24">24 Months</option>
                    </select>
                </div>
            </div>

            {/* Investment Wallet Balance */}
            <div className="card bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                <div className="p-6">
                    <h3 className="text-lg font-semibold">Investment Wallet</h3>
                    <p className="text-3xl font-bold mt-2">
                        {formatCurrency(wallets.investment?.available || 0)}
                    </p>
                    <p className="text-sm mt-1 opacity-80">
                        Available for lending
                    </p>
                </div>
            </div>

            {/* Loan Listings */}
            {isLoading ? (
                <div className="card p-6 text-center">
                    <div className="animate-pulse">Loading loan opportunities...</div>
                </div>
            ) : loanRequests.length === 0 ? (
                <div className="card p-6 text-center text-slate-500">
                    <p>No loan opportunities available at the moment.</p>
                    <Link to="/dashboard/borrower" className="text-emerald-600 hover:underline mt-2 inline-block">
                        Become a borrower to create a loan request
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {loanRequests.map((loan) => (
                        <div key={loan.id} className="card hover:shadow-lg transition-shadow">
                            <div className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xl font-semibold">Loan #{loan.id}</h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                                                {loan.status}
                                            </span>
                                        </div>
                                        <p className="text-slate-500 mt-1">Borrower: {loan.borrower?.slice(0, 6)}...{loan.borrower?.slice(-4)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-emerald-600">
                                            {formatCurrency(loan.loanAmount)}
                                        </p>
                                        <p className="text-sm text-slate-500">{loan.interestRate}% APR</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
                                    <div>
                                        <p className="text-sm text-slate-500">Duration</p>
                                        <p className="font-medium">{loan.durationMonths} months</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Funded</p>
                                        <p className="font-medium">{formatCurrency(loan.fundedAmount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Remaining</p>
                                        <p className="font-medium">{formatCurrency(loan.loanAmount - loan.fundedAmount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Collateral</p>
                                        <p className="font-medium">{loan.collateralType || 'N/A'}</p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-4">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Funding Progress</span>
                                        <span>{Math.round((loan.fundedAmount / loan.loanAmount) * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div
                                            className="bg-emerald-500 h-2 rounded-full transition-all"
                                            style={{ width: `${(loan.fundedAmount / loan.loanAmount) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {loan.status === 'REQUESTED' || loan.status === 'FUNDED' ? (
                                    <div className="mt-4 flex gap-3">
                                        <Link
                                            to={`/loans/${loan.id}`}
                                            className="btn-secondary"
                                        >
                                            View Details
                                        </Link>
                                        <button
                                            onClick={() => {
                                                setSelectedLoan(loan);
                                                setShowModal(true);
                                            }}
                                            className="btn-primary"
                                            disabled={wallets.investment?.available <= 0}
                                        >
                                            Fund This Loan
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination.total > pagination.limit && (
                <div className="flex justify-center gap-2">
                    <button
                        className="btn-secondary"
                        disabled={pagination.page === 1}
                        onClick={() => dispatch(setPage(pagination.page - 1))}
                    >
                        Previous
                    </button>
                    <span className="px-4 py-2">
                        Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
                    </span>
                    <button
                        className="btn-secondary"
                        disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                        onClick={() => dispatch(setPage(pagination.page + 1))}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Fund Modal */}
            {showModal && selectedLoan && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="card max-w-md w-full mx-4">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Fund Loan #{selectedLoan.id}</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Amount to Fund</label>
                                    <input
                                        type="number"
                                        className={`input-field w-full ${errors.amount ? 'border-red-500' : ''}`}
                                        placeholder="Enter amount"
                                        value={fundAmount}
                                        onChange={(e) => {
                                            setFundAmount(e.target.value);
                                            if (errors.amount) setErrors(prev => ({ ...prev, amount: '' }));
                                        }}
                                        max={selectedLoan.loanAmount - selectedLoan.fundedAmount}
                                    />
                                    {errors.amount && (
                                        <p className="text-sm text-red-500 mt-1">{errors.amount}</p>
                                    )}
                                    <p className="text-sm text-slate-500 mt-1">
                                        Max: {formatCurrency(selectedLoan.loanAmount - selectedLoan.fundedAmount)}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <div className="flex justify-between text-sm">
                                        <span>Your Balance:</span>
                                        <span className="font-medium">{formatCurrency(wallets.investment?.available || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mt-2">
                                        <span>After Funding:</span>
                                        <span className="font-medium text-emerald-600">
                                            {formatCurrency((wallets.investment?.available || 0) - (parseFloat(fundAmount) || 0))}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        className="btn-secondary flex-1"
                                        onClick={() => {
                                            setShowModal(false);
                                            setFundAmount('');
                                            setSelectedLoan(null);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn-primary flex-1"
                                        onClick={handleFund}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Processing...' : 'Confirm Funding'}
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

export default FundLoan;
