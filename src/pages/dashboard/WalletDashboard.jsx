import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import {
    getWalletBalance,
    depositFunds,
    withdrawFunds,
    getTransactionHistory
} from '../../store/slices/walletSlice';
import { formatCurrency, formatDate } from '../../utils/formatters';

function WalletDashboard() {
    const dispatch = useDispatch();
    const { wallet, transactionHistory, isLoading } = useSelector((state) => state.wallet);
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [amount, setAmount] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        dispatch(getWalletBalance());
        dispatch(getTransactionHistory());
    }, [dispatch]);

    const handleDeposit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        try {
            await dispatch(depositFunds(parseFloat(amount))).unwrap();
            toast.success('Deposit successful!');
            setShowDepositModal(false);
            setAmount('');
            dispatch(getWalletBalance());
        } catch (error) {
            toast.error(error.message || 'Deposit failed');
        }
    };

    const handleWithdraw = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (wallet && parseFloat(amount) > wallet.balance) {
            toast.error('Insufficient balance');
            return;
        }

        try {
            await dispatch(withdrawFunds(parseFloat(amount))).unwrap();
            toast.success('Withdrawal initiated!');
            setShowWithdrawModal(false);
            setAmount('');
            dispatch(getWalletBalance());
        } catch (error) {
            toast.error(error.message || 'Withdrawal failed');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            COMPLETED: 'bg-green-100 text-green-800',
            PENDING: 'bg-yellow-100 text-yellow-800',
            FAILED: 'bg-red-100 text-red-800',
            CANCELLED: 'bg-slate-100 text-slate-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getTypeIcon = (type) => {
        const icons = {
            DEPOSIT: '💰',
            WITHDRAWAL: '🏦',
            LOAN_DISBURSEMENT: '💳',
            LOAN_REPAYMENT: '📅',
            LENDER_INVESTMENT: '📈',
            LENDER_REPAYMENT: '✅',
            GUARANTEE_CLAIM: '🛡️',
            ESCROW_FUNDING: '🔒',
            ESCROW_RELEASE: '🔓',
            ESCROW_REFUND: '↩️',
        };
        return icons[type] || '💵';
    };

    const filteredTransactions = transactionHistory?.filter(tx => {
        if (filter === 'all') return true;
        return tx.type === filter;
    }) || [];

    const getTotalStats = () => {
        if (!transactionHistory) return { totalIn: 0, totalOut: 0 };

        return transactionHistory.reduce((stats, tx) => {
            if (tx.status === 'COMPLETED') {
                if (['DEPOSIT', 'LOAN_DISBURSEMENT', 'LENDER_REPAYMENT', 'GUARANTEE_CLAIM', 'ESCROW_RELEASE', 'ESCROW_REFUND'].includes(tx.type)) {
                    stats.totalIn += tx.amount;
                } else {
                    stats.totalOut += tx.amount;
                }
            }
            return stats;
        }, { totalIn: 0, totalOut: 0 });
    };

    const stats = getTotalStats();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">My Wallet</h1>

            {/* Wallet Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                    <div className="p-6">
                        <p className="text-sm opacity-90">Available Balance</p>
                        <p className="text-3xl font-bold mt-2">{formatCurrency(wallet?.balance || 0)}</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-6">
                        <p className="text-sm text-slate-500">Total In (All Time)</p>
                        <p className="text-2xl font-bold mt-2 text-green-600">{formatCurrency(stats.totalIn)}</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-6">
                        <p className="text-sm text-slate-500">Total Out (All Time)</p>
                        <p className="text-2xl font-bold mt-2 text-red-600">{formatCurrency(stats.totalOut)}</p>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                    onClick={() => setShowDepositModal(true)}
                    className="btn-primary flex-1 text-center"
                >
                    💰 Deposit Funds
                </button>
                <button
                    onClick={() => setShowWithdrawModal(true)}
                    className="btn-secondary flex-1 text-center"
                >
                    🏦 Withdraw
                </button>
            </div>

            {/* Wallet Details */}
            <div className="card">
                <div className="p-6">
                    <h2 className="text-lg font-semibold mb-4">Wallet Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <p className="text-sm text-slate-500">Wallet Address</p>
                            <p className="font-mono text-sm mt-1 break-all">
                                {wallet?.address || 'Not connected'}
                            </p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <p className="text-sm text-slate-500">Pending Balance</p>
                            <p className="font-semibold mt-1">{formatCurrency(wallet?.pendingBalance || 0)}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <p className="text-sm text-slate-500">Reserved for Escrow</p>
                            <p className="font-semibold mt-1">{formatCurrency(wallet?.reservedBalance || 0)}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <p className="text-sm text-slate-500">Total Earnings</p>
                            <p className="font-semibold mt-1 text-green-600">{formatCurrency(wallet?.totalEarnings || 0)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction History */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-xl font-semibold">Transaction History</h2>
                    <div className="w-full sm:w-auto">
                        <select
                            className="input-field text-sm w-full sm:min-w-[180px]"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            <option value="all">All Transactions</option>
                            <option value="DEPOSIT">Deposits</option>
                            <option value="WITHDRAWAL">Withdrawals</option>
                            <option value="LOAN_DISBURSEMENT">Disbursements</option>
                            <option value="LOAN_REPAYMENT">Repayments</option>
                            <option value="LENDER_INVESTMENT">Investments</option>
                            <option value="GUARANTEE_CLAIM">Guarantee Claims</option>
                            <option value="ESCROW_FUNDING">Escrow Funding</option>
                            <option value="ESCROW_RELEASE">Escrow Release</option>
                        </select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="card p-6 text-center">
                        <div className="animate-pulse">Loading transactions...</div>
                    </div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="card p-6 text-center text-slate-500">
                        <p>No transactions found.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredTransactions.map((tx) => (
                            <div key={tx.id} className="card hover:shadow-md transition-shadow">
                                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <span className="text-2xl">{getTypeIcon(tx.type)}</span>
                                        <div>
                                            <p className="font-medium text-sm">{tx.type.replace(/_/g, ' ')}</p>
                                            <p className="text-xs text-slate-500">
                                                {formatDate(tx.timestamp || tx.createdAt, {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right flex sm:flex-col items-center sm:items-end gap-1">
                                        <p className={`font-semibold ${tx.type.includes('DEPOSIT') || tx.type.includes('DISBURSEMENT') || tx.type.includes('REPAYMENT') || tx.type.includes('CLAIM') || tx.type.includes('RELEASE') || tx.type.includes('REFUND') ? 'text-green-600' : 'text-red-600'}`}>
                                            {tx.type.includes('DEPOSIT') || tx.type.includes('DISBURSEMENT') || tx.type.includes('REPAYMENT') || tx.type.includes('CLAIM') || tx.type.includes('RELEASE') || tx.type.includes('REFUND') ? '+' : '-'}{formatCurrency(tx.amount)}
                                        </p>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                                            {tx.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Deposit Modal */}
            {showDepositModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="card max-w-md w-full mx-4">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Deposit Funds</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Amount (NGN)</label>
                                    <input
                                        type="number"
                                        className="input-field w-full"
                                        placeholder="Enter amount"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        min="10"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        className="btn-secondary flex-1"
                                        onClick={() => {
                                            setShowDepositModal(false);
                                            setAmount('');
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn-primary flex-1"
                                        onClick={handleDeposit}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Processing...' : 'Deposit'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Withdraw Modal */}
            {showWithdrawModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="card max-w-md w-full mx-4">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Withdraw Funds</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Amount (NGN)</label>
                                    <input
                                        type="number"
                                        className="input-field w-full"
                                        placeholder="Enter amount"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        min="10"
                                        max={wallet?.balance}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Available: {formatCurrency(wallet?.balance || 0)}
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        className="btn-secondary flex-1"
                                        onClick={() => {
                                            setShowWithdrawModal(false);
                                            setAmount('');
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn-primary flex-1"
                                        onClick={handleWithdraw}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Processing...' : 'Withdraw'}
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

export default WalletDashboard;
