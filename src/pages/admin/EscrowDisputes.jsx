import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { getEscrowDisputes, resolveDispute } from '../../store/slices/escrowSlice';

function EscrowDisputes() {
    const dispatch = useDispatch();
    const { escrowDisputes, isLoading } = useSelector((state) => state.escrow);
    const [filter, setFilter] = useState('OPEN');
    const [selectedDispute, setSelectedDispute] = useState(null);
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [resolution, setResolution] = useState({
        decision: '',
        refundBuyer: false,
        releaseToSeller: false,
        notes: '',
    });

    useEffect(() => {
        dispatch(getEscrowDisputes());
    }, [dispatch]);

    const handleResolve = async () => {
        if (!selectedDispute || !resolution.decision) {
            toast.error('Please select a resolution decision');
            return;
        }

        try {
            await dispatch(resolveDispute({
                disputeId: selectedDispute.id,
                decision: resolution.decision,
                refundBuyer: resolution.refundBuyer,
                releaseToSeller: resolution.releaseToSeller,
                notes: resolution.notes,
            })).unwrap();
            toast.success('Dispute resolved successfully!');
            setShowResolveModal(false);
            setSelectedDispute(null);
            setResolution({ decision: '', refundBuyer: false, releaseToSeller: false, notes: '' });
            dispatch(getEscrowDisputes());
        } catch (error) {
            toast.error(error.message || 'Failed to resolve dispute');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount || 0);
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getStatusColor = (status) => {
        const colors = {
            OPEN: 'bg-red-100 text-red-800',
            IN_REVIEW: 'bg-yellow-100 text-yellow-800',
            RESOLVED: 'bg-green-100 text-green-800',
            CLOSED: 'bg-slate-100 text-slate-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getPriorityColor = (priority) => {
        const colors = {
            HIGH: 'text-red-600',
            MEDIUM: 'text-yellow-600',
            LOW: 'text-green-600',
        };
        return colors[priority] || 'text-slate-600';
    };

    const filteredDisputes = escrowDisputes?.filter(dispute => {
        if (filter === 'all') return true;
        return dispute.status === filter;
    }) || [];

    const getStats = () => {
        if (!escrowDisputes) return { total: 0, open: 0, inReview: 0, resolved: 0 };
        return {
            total: escrowDisputes.length,
            open: escrowDisputes.filter(d => d.status === 'OPEN').length,
            inReview: escrowDisputes.filter(d => d.status === 'IN_REVIEW').length,
            resolved: escrowDisputes.filter(d => d.status === 'RESOLVED').length,
        };
    };

    const stats = getStats();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Escrow Disputes</h1>
                <button
                    onClick={() => dispatch(getEscrowDisputes())}
                    className="btn-secondary"
                >
                    🔄 Refresh
                </button>
            </div>

            {/* Alert Banner */}
            {stats.open > 0 && (
                <div className="card bg-red-50 border border-red-200">
                    <div className="p-4 flex items-center gap-4">
                        <span className="text-3xl">⚠️</span>
                        <div>
                            <p className="font-semibold text-red-800">{stats.open} Active Disputes Require Attention</p>
                            <p className="text-sm text-red-600">
                                Please review and resolve open disputes to maintain platform trust.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold">{stats.total}</p>
                        <p className="text-sm text-slate-500">Total Disputes</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-red-600">{stats.open}</p>
                        <p className="text-sm text-slate-500">Open</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-yellow-600">{stats.inReview}</p>
                        <p className="text-sm text-slate-500">In Review</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                        <p className="text-sm text-slate-500">Resolved</p>
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2">
                {['all', 'OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === status
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        {status === 'all' ? 'All' : status.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Disputes List */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Dispute Cases</h2>

                {isLoading ? (
                    <div className="card p-6 text-center">
                        <div className="animate-pulse">Loading disputes...</div>
                    </div>
                ) : filteredDisputes.length === 0 ? (
                    <div className="card p-6 text-center text-slate-500">
                        <p>No disputes found.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredDisputes.map((dispute) => (
                            <div key={dispute.id} className="card hover:shadow-lg transition-shadow border-l-4 border-red-500">
                                <div className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-lg font-semibold">Dispute #{dispute.id}</h3>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(dispute.status)}`}>
                                                    {dispute.status}
                                                </span>
                                                <span className={`px-2 py-1 rounded text-xs font-medium bg-slate-100 ${getPriorityColor(dispute.priority)}`}>
                                                    {dispute.priority || 'MEDIUM'} PRIORITY
                                                </span>
                                            </div>
                                            <p className="text-slate-500 mt-1">
                                                Escrow Transaction: #{dispute.escrowId} |
                                                Opened: {formatDate(dispute.openedAt)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold">{formatCurrency(dispute.amount)}</p>
                                            <p className="text-sm text-slate-500">Escrow Amount</p>
                                        </div>
                                    </div>

                                    {/* Parties */}
                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500">Buyer</p>
                                            <p className="font-medium">{dispute.buyerName || 'Buyer'}</p>
                                            <p className="text-xs text-slate-500">{dispute.buyerAddress?.slice(0, 10)}...</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500">Seller</p>
                                            <p className="font-medium">{dispute.sellerName || 'Seller'}</p>
                                            <p className="text-xs text-slate-500">{dispute.sellerAddress?.slice(0, 10)}...</p>
                                        </div>
                                    </div>

                                    {/* Dispute Details */}
                                    <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                                        <h4 className="font-semibold mb-2">Dispute Reason</h4>
                                        <p className="text-sm">{dispute.reason}</p>
                                        {dispute.buyerClaim && (
                                            <div className="mt-3 p-3 bg-blue-50 rounded">
                                                <p className="text-xs text-blue-800 font-medium">Buyer&apos;s Claim:</p>
                                                <p className="text-sm text-blue-700">{dispute.buyerClaim}</p>
                                            </div>
                                        )}
                                        {dispute.sellerResponse && (
                                            <div className="mt-3 p-3 bg-green-50 rounded">
                                                <p className="text-xs text-green-800 font-medium">Seller&apos;s Response:</p>
                                                <p className="text-sm text-green-700">{dispute.sellerResponse}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Timeline */}
                                    {dispute.timeline && dispute.timeline.length > 0 && (
                                        <div className="mt-4">
                                            <h4 className="font-semibold mb-2">Activity Timeline</h4>
                                            <div className="space-y-2">
                                                {dispute.timeline.map((event, index) => (
                                                    <div key={index} className="flex gap-3 text-sm">
                                                        <span className="text-slate-400">{formatDate(event.date)}</span>
                                                        <span>{event.description}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    {(dispute.status === 'OPEN' || dispute.status === 'IN_REVIEW') && (
                                        <div className="mt-4 flex gap-3">
                                            <button
                                                onClick={() => {
                                                    setSelectedDispute(dispute);
                                                    setShowResolveModal(true);
                                                }}
                                                className="btn-primary"
                                            >
                                                ⚖️ Resolve Dispute
                                            </button>
                                            <button className="btn-secondary">
                                                Request More Info
                                            </button>
                                            <button className="btn-secondary">
                                                Contact Parties
                                            </button>
                                        </div>
                                    )}

                                    {/* Resolution */}
                                    {dispute.status === 'RESOLVED' && dispute.resolution && (
                                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                            <p className="text-sm text-green-800">
                                                <strong>Resolution:</strong> {dispute.resolution.decision} |
                                                {dispute.resolution.refundBuyer ? ' Buyer refunded' : ' Funds released to seller'} |
                                                Date: {formatDate(dispute.resolvedAt)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Resolve Modal */}
            {showResolveModal && selectedDispute && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="card max-w-lg w-full mx-4">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Resolve Dispute #{selectedDispute.id}</h2>
                            <div className="space-y-4">
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-sm text-slate-500">Escrow Amount</p>
                                    <p className="font-semibold">{formatCurrency(selectedDispute.amount)}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Decision *</label>
                                    <select
                                        className="input-field w-full"
                                        value={resolution.decision}
                                        onChange={(e) => setResolution({ ...resolution, decision: e.target.value })}
                                    >
                                        <option value="">Select decision</option>
                                        <option value="refund_buyer">Refund Buyer - Full</option>
                                        <option value="refund_partial">Refund Buyer - Partial</option>
                                        <option value="release_seller">Release to Seller - Full</option>
                                        <option value="release_partial">Release to Seller - Partial</option>
                                        <option value="split">Split Between Parties</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            className="rounded"
                                            checked={resolution.refundBuyer}
                                            onChange={(e) => setResolution({ ...resolution, refundBuyer: e.target.checked })}
                                        />
                                        <span>Refund buyer</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            className="rounded"
                                            checked={resolution.releaseToSeller}
                                            onChange={(e) => setResolution({ ...resolution, releaseToSeller: e.target.checked })}
                                        />
                                        <span>Release funds to seller</span>
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Notes</label>
                                    <textarea
                                        className="input-field w-full h-24"
                                        placeholder="Explain the resolution..."
                                        value={resolution.notes}
                                        onChange={(e) => setResolution({ ...resolution, notes: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        className="btn-secondary flex-1"
                                        onClick={() => {
                                            setShowResolveModal(false);
                                            setSelectedDispute(null);
                                            setResolution({ decision: '', refundBuyer: false, releaseToSeller: false, notes: '' });
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn-primary flex-1"
                                        onClick={handleResolve}
                                        disabled={isLoading || !resolution.decision}
                                    >
                                        {isLoading ? 'Processing...' : 'Resolve Dispute'}
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

export default EscrowDisputes;
