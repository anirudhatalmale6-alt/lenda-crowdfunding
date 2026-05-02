import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import {
    getMyEscrowTransactions,
    confirmDelivery,
    releaseFunds,
    openDispute
} from '../../store/slices/escrowSlice';
import { EscrowTransactionSummary } from '../../components/revenue';
import { formatCurrency } from '../../utils/formatters';

function EscrowDashboard() {
    const dispatch = useDispatch();
    const { myTransactions, isLoading } = useSelector((state) => state.escrow);
    const [filter, setFilter] = useState('all');
    const transactions = myTransactions || [];

    useEffect(() => {
        dispatch(getMyEscrowTransactions());
    }, [dispatch]);

    const handleConfirmDelivery = async (transactionId) => {
        try {
            await dispatch(confirmDelivery(transactionId)).unwrap();
            toast.success('Delivery confirmed!');
        } catch (error) {
            toast.error(error.message || 'Failed to confirm delivery');
        }
    };

    const handleReleaseFunds = async (transactionId) => {
        try {
            await dispatch(releaseFunds(transactionId)).unwrap();
            toast.success('Funds released to seller!');
        } catch (error) {
            toast.error(error.message || 'Failed to release funds');
        }
    };

    const handleOpenDispute = async (transactionId) => {
        const reason = prompt('Please enter the reason for dispute:');
        if (!reason) return;

        try {
            await dispatch(openDispute({ transactionId, reason })).unwrap();
            toast.success('Dispute opened successfully!');
        } catch (error) {
            toast.error(error.message || 'Failed to open dispute');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            CREATED: 'bg-gray-100 text-gray-800',
            FUNDED: 'bg-blue-100 text-blue-800',
            SHIPPED: 'bg-yellow-100 text-yellow-800',
            DELIVERED: 'bg-green-100 text-green-800',
            DISPUTED: 'bg-red-100 text-red-800',
            RELEASED: 'bg-emerald-100 text-emerald-800',
            REFUNDED: 'bg-orange-100 text-orange-800',
            CANCELLED: 'bg-slate-100 text-slate-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const filteredTransactions = transactions.filter(tx => {
        if (filter === 'all') return true;
        if (filter === 'buyer') return tx.isBuyer;
        if (filter === 'seller') return tx.isSeller;
        return tx.status === filter;
    });

    const getTransactionStats = () => {
        const stats = { total: transactions.length, pending: 0, completed: 0, disputed: 0 };
        transactions.forEach(tx => {
            if (tx.status === 'DISPUTED') stats.disputed++;
            else if (tx.status === 'RELEASED' || tx.status === 'REFUNDED') stats.completed++;
            else stats.pending++;
        });
        return stats;
    };

    const stats = getTransactionStats();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold">Escrow Transactions</h1>
                <Link to="/dashboard/escrow/create" className="btn-primary text-sm">
                    New Transaction
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold">{stats.total}</p>
                        <p className="text-sm text-slate-500">Total</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                        <p className="text-sm text-slate-500">Pending</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                        <p className="text-sm text-slate-500">Completed</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-red-600">{stats.disputed}</p>
                        <p className="text-sm text-slate-500">Disputed</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                {['all', 'buyer', 'seller', 'FUNDED', 'SHIPPED', 'DELIVERED', 'DISPUTED'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Transaction List */}
            {isLoading ? (
                <div className="card p-6 text-center">
                    <div className="animate-pulse">Loading transactions...</div>
                </div>
            ) : filteredTransactions.length === 0 ? (
                <div className="card p-6 text-center text-slate-500">
                    <p>No escrow transactions found.</p>
                    <Link to="/dashboard/escrow/create" className="text-emerald-600 hover:underline mt-2 inline-block">
                        Create your first transaction
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredTransactions.map((transaction) => (
                        <div key={transaction.id} className="card hover:shadow-lg transition-shadow">
                            <div className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-semibold">Transaction #{transaction.id}</h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                                                {transaction.status}
                                            </span>
                                        </div>
                                        <p className="text-slate-500 mt-1">
                                            {transaction.isBuyer ? 'You are the Buyer' : 'You are the Seller'} |
                                            {transaction.isBuyer ? ` Seller: ${transaction.seller?.slice(0, 6)}...` : ` Buyer: ${transaction.buyer?.slice(0, 6)}...`}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-bold">{formatCurrency(transaction.amount)}</p>
                                        <p className="text-sm text-slate-500">+{formatCurrency(transaction.shippingFee)} shipping</p>
                                    </div>
                                </div>

                                {/* Progress Steps */}
                                <div className="mt-6">
                                    <div className="flex items-center justify-between">
                                        {['CREATED', 'FUNDED', 'SHIPPED', 'DELIVERED', 'RELEASED'].map((step, index) => {
                                            const stepIndex = ['CREATED', 'FUNDED', 'SHIPPED', 'DELIVERED', 'RELEASED'].indexOf(transaction.status);
                                            const isCompleted = stepIndex >= index;
                                            const isCurrent = stepIndex === index;

                                            return (
                                                <div key={step} className="flex flex-col items-center">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCompleted
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'bg-slate-200 text-slate-400'
                                                        }`}>
                                                        {isCompleted ? '✓' : index + 1}
                                                    </div>
                                                    <span className={`text-xs mt-1 ${isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                        {step}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
                                    {transaction.isBuyer && transaction.status === 'SHIPPED' && (
                                        <>
                                            <button
                                                onClick={() => handleConfirmDelivery(transaction.id)}
                                                className="btn-primary"
                                            >
                                                Confirm Delivery
                                            </button>
                                            <button
                                                onClick={() => handleOpenDispute(transaction.id)}
                                                className="btn-secondary text-red-600 border-red-300 hover:bg-red-50"
                                            >
                                                Open Dispute
                                            </button>
                                        </>
                                    )}
                                    {transaction.isBuyer && transaction.status === 'DELIVERED' && (
                                        <>
                                            <button
                                                onClick={() => handleReleaseFunds(transaction.id)}
                                                className="btn-primary"
                                            >
                                                Release Funds
                                            </button>
                                            <button
                                                onClick={() => handleOpenDispute(transaction.id)}
                                                className="btn-secondary text-red-600 border-red-300 hover:bg-red-50"
                                            >
                                                Open Dispute
                                            </button>
                                        </>
                                    )}
                                    <button className="btn-secondary">View Details</button>
                                </div>
                                
                                {/* Escrow Transaction Summary */}
                                <div className="mt-4">
                                    <EscrowTransactionSummary 
                                        amount={transaction.amount}
                                        logisticsFee={transaction.shippingFee || 0}
                                        status={transaction.status.toLowerCase()}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default EscrowDashboard;
