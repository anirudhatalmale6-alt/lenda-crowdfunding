import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import {
    getRecoveryListings,
    approveRecoveryListing,
    processRecoverySale,
    cancelRecoveryListing
} from '../../store/slices/marketplaceSlice';

function RecoveryManagement() {
    const dispatch = useDispatch();
    const { recoveryListings, isLoading } = useSelector((state) => state.marketplace);
    const [filter, setFilter] = useState('all');
    const [selectedListing, setSelectedListing] = useState(null);
    const [showActionModal, setShowActionModal] = useState(false);

    useEffect(() => {
        dispatch(getRecoveryListings());
    }, [dispatch]);

    const handleAction = async (listingId, action) => {
        try {
            switch (action) {
                case 'approve':
                    await dispatch(approveRecoveryListing(listingId)).unwrap();
                    toast.success('Listing approved');
                    break;
                case 'sold':
                    await dispatch(processRecoverySale(listingId)).unwrap();
                    toast.success('Sale processed successfully');
                    break;
                case 'cancel':
                    await dispatch(cancelRecoveryListing(listingId)).unwrap();
                    toast.success('Listing cancelled');
                    break;
                default:
                    break;
            }
            setShowActionModal(false);
            setSelectedListing(null);
            dispatch(getRecoveryListings());
        } catch (error) {
            toast.error(error.message || 'Action failed');
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
            PENDING: 'bg-yellow-100 text-yellow-800',
            ACTIVE: 'bg-blue-100 text-blue-800',
            SOLD: 'bg-green-100 text-green-800',
            CANCELLED: 'bg-red-100 text-red-800',
            EXPIRED: 'bg-slate-100 text-slate-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const filteredListings = recoveryListings?.filter(listing => {
        if (filter === 'all') return true;
        return listing.status === filter;
    }) || [];

    const getStats = () => {
        if (!recoveryListings) return {
            total: 0,
            totalValue: 0,
            sold: 0,
            pendingApproval: 0,
            soldValue: 0
        };

        return {
            total: recoveryListings.length,
            totalValue: recoveryListings.reduce((sum, l) => sum + (l.askingPrice || 0), 0),
            sold: recoveryListings.filter(l => l.status === 'SOLD').length,
            pendingApproval: recoveryListings.filter(l => l.status === 'PENDING').length,
            soldValue: recoveryListings
                .filter(l => l.status === 'SOLD')
                .reduce((sum, l) => sum + (l.soldPrice || 0), 0),
        };
    };

    const stats = getStats();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Recovery Marketplace Management</h1>
                <button
                    onClick={() => dispatch(getRecoveryListings())}
                    className="btn-secondary"
                >
                    🔄 Refresh
                </button>
            </div>

            {/* Warning Banner */}
            <div className="card bg-orange-50 border border-orange-200">
                <div className="p-4 flex items-center gap-4">
                    <span className="text-3xl">🏦</span>
                    <div>
                        <p className="font-semibold text-orange-800">Collateral Recovery Operations</p>
                        <p className="text-sm text-orange-600">
                            Manage defaulted loan collateral listings. Proceeds replenish the LENDA Guarantee Reserve Fund.
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold">{stats.total}</p>
                        <p className="text-sm text-slate-500">Total Listings</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-yellow-600">{stats.pendingApproval}</p>
                        <p className="text-sm text-slate-500">Pending Approval</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalValue)}</p>
                        <p className="text-sm text-slate-500">Total Asking Value</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{stats.sold}</p>
                        <p className="text-sm text-slate-500">Successfully Sold</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.soldValue)}</p>
                        <p className="text-sm text-slate-500">Recovered Funds</p>
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2">
                {['all', 'PENDING', 'ACTIVE', 'SOLD', 'CANCELLED'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === status
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        {status === 'all' ? 'All' : status}
                    </button>
                ))}
            </div>

            {/* Listings */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Recovery Listings</h2>

                {isLoading ? (
                    <div className="card p-6 text-center">
                        <div className="animate-pulse">Loading listings...</div>
                    </div>
                ) : filteredListings.length === 0 ? (
                    <div className="card p-6 text-center text-slate-500">
                        <p>No recovery listings found.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredListings.map((listing) => (
                            <div key={listing.id} className="card hover:shadow-lg transition-shadow">
                                <div className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-lg font-semibold">Recovery #{listing.id}</h3>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(listing.status)}`}>
                                                    {listing.status}
                                                </span>
                                            </div>
                                            <p className="text-slate-500 mt-1">
                                                Original Loan: #{listing.loanId} |
                                                Defaulted: {formatDate(listing.defaultedAt)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold">{formatCurrency(listing.askingPrice)}</p>
                                            <p className="text-sm text-slate-500">Asking Price</p>
                                        </div>
                                    </div>

                                    {/* Collateral Details */}
                                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500">Type</p>
                                            <p className="font-semibold capitalize">{listing.collateralType?.replace('_', ' ')}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500">Original Value</p>
                                            <p className="font-semibold">{formatCurrency(listing.originalValue)}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500">Listed Date</p>
                                            <p className="font-semibold">{formatDate(listing.createdAt)}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500">Discount</p>
                                            <p className={`font-semibold ${listing.discount > 30 ? 'text-green-600' : 'text-slate-600'}`}>
                                                {listing.discount || Math.round((1 - listing.askingPrice / listing.originalValue) * 100)}%
                                            </p>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {listing.description && (
                                        <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                                            <p className="text-sm text-slate-600">{listing.description}</p>
                                        </div>
                                    )}

                                    {/* Bid Info */}
                                    {listing.bids && listing.bids.length > 0 && (
                                        <div className="mt-4">
                                            <p className="font-semibold mb-2">Bids ({listing.bids.length})</p>
                                            <div className="space-y-2">
                                                {listing.bids.slice(0, 3).map((bid, index) => (
                                                    <div key={index} className="flex justify-between p-2 bg-slate-50 rounded">
                                                        <span className="text-sm">{bid.bidder}</span>
                                                        <span className="font-medium">{formatCurrency(bid.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Sale Info */}
                                    {listing.status === 'SOLD' && (
                                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                            <p className="text-sm text-green-800">
                                                <strong>Sold!</strong> Final price: {formatCurrency(listing.soldPrice)} |
                                                Buyer: {listing.buyer} |
                                                Date: {formatDate(listing.soldAt)}
                                            </p>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="mt-4 flex gap-3">
                                        {listing.status === 'PENDING' && (
                                            <button
                                                onClick={() => {
                                                    setSelectedListing(listing);
                                                    setShowActionModal(true);
                                                }}
                                                className="btn-primary"
                                            >
                                                ✓ Approve Listing
                                            </button>
                                        )}
                                        {listing.status === 'ACTIVE' && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setSelectedListing(listing);
                                                        setShowActionModal(true);
                                                    }}
                                                    className="btn-primary"
                                                >
                                                    ✓ Mark as Sold
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedListing(listing);
                                                        setShowActionModal(true);
                                                    }}
                                                    className="btn-secondary text-red-600 border-red-300 hover:bg-red-50"
                                                >
                                                    ✕ Cancel
                                                </button>
                                            </>
                                        )}
                                        <button className="btn-secondary">
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Action Modal */}
            {showActionModal && selectedListing && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="card max-w-md w-full mx-4">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">
                                {selectedListing.status === 'PENDING' && 'Approve Listing'}
                                {selectedListing.status === 'ACTIVE' && 'Process Sale'}
                            </h2>
                            <div className="space-y-4">
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-sm text-slate-500">Listing ID</p>
                                    <p className="font-semibold">#{selectedListing.id}</p>
                                    <p className="text-sm text-slate-500 mt-2">Asking Price</p>
                                    <p className="font-semibold">{formatCurrency(selectedListing.askingPrice)}</p>
                                </div>

                                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                                    <p className="text-sm text-yellow-800">
                                        {selectedListing.status === 'PENDING'
                                            ? 'This will make the listing visible to buyers on the Recovery Marketplace.'
                                            : 'Processing this sale will transfer funds to the LENDA Guarantee Reserve Fund.'
                                        }
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        className="btn-secondary flex-1"
                                        onClick={() => {
                                            setShowActionModal(false);
                                            setSelectedListing(null);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn-primary flex-1"
                                        onClick={() => {
                                            if (selectedListing.status === 'PENDING') {
                                                handleAction(selectedListing.id, 'approve');
                                            } else if (selectedListing.status === 'ACTIVE') {
                                                handleAction(selectedListing.id, 'sold');
                                            }
                                        }}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Processing...' : 'Confirm'}
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

export default RecoveryManagement;
