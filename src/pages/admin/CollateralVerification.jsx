import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import {
    getPendingCollateral,
    verifyCollateral,
    rejectCollateral
} from '../../store/slices/loanSlice';
import priceOracleService from '../../services/priceOracleService';
import { ethers } from 'ethers';

function CollateralVerification() {
    const dispatch = useDispatch();
    const { pendingCollateral, isLoading } = useSelector((state) => state.loans);
    const [selectedCollateral, setSelectedCollateral] = useState(null);
    const [verificationNotes, setVerificationNotes] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [filter, setFilter] = useState('PENDING');
    const [searchTerm, setSearchTerm] = useState('');
    const [collateralPrices, setCollateralPrices] = useState({});
    const [priceLoading, setPriceLoading] = useState({});

    // Map collateral types to crypto symbols for price lookup
    const getCryptoSymbol = (type) => {
        const symbolMap = {
            'BTC': 'BTC',
            'ETH': 'ETH',
            'USDT': 'USDT',
            'USDC': 'USDC',
            'WBTC': 'WBTC',
            'WETH': 'WETH',
            'LINK': 'LINK',
        };
        return symbolMap[type?.toUpperCase()] || null;
    };

    // Fetch price from oracle for crypto collateral
    const fetchCollateralPrice = async (collateral) => {
        const symbol = getCryptoSymbol(collateral.type);
        if (!symbol) return null;

        setPriceLoading(prev => ({ ...prev, [collateral.id]: true }));
        try {
            const priceData = await priceOracleService.getPriceWithValidation(symbol);
            setPriceLoading(prev => ({ ...prev, [collateral.id]: false }));
            return {
                price: priceData.price,
                source: priceData.sources?.[0] || 'unknown',
                timestamp: priceData.timestamp,
                isAggregated: priceData.isAggregated,
                deviation: priceData.deviation || 0
            };
        } catch (error) {
            console.error('Failed to fetch price for', symbol, error);
            setPriceLoading(prev => ({ ...prev, [collateral.id]: false }));
            return null;
        }
    };

    // Fetch prices for all crypto collateral
    useEffect(() => {
        const fetchPrices = async () => {
            if (!pendingCollateral?.length) return;

            for (const collateral of pendingCollateral) {
                if (getCryptoSymbol(collateral.type) && !collateralPrices[collateral.id]) {
                    const price = await fetchCollateralPrice(collateral);
                    if (price) {
                        setCollateralPrices(prev => ({ ...prev, [collateral.id]: price }));
                    }
                }
            }
        };

        fetchPrices();
    }, [pendingCollateral]);

    useEffect(() => {
        dispatch(getPendingCollateral());
    }, [dispatch]);

    const handleVerify = async (collateralId, isApproved = true) => {
        try {
            if (isApproved) {
                await dispatch(verifyCollateral(collateralId)).unwrap();
                toast.success('Collateral verified successfully!');
            } else {
                if (!verificationNotes.trim()) {
                    toast.error('Please provide rejection notes');
                    return;
                }
                await dispatch(rejectCollateral({ collateralId, notes: verificationNotes })).unwrap();
                toast.success('Collateral rejected');
                setShowRejectModal(false);
            }
            setVerificationNotes('');
            setSelectedCollateral(null);
            dispatch(getPendingCollateral());
        } catch (error) {
            toast.error(error.message || 'Failed to process collateral');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount || 0);
    };

    // Format crypto price with oracle source
    const formatCryptoPrice = (priceData) => {
        if (!priceData) return null;
        return {
            price: new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: priceData.price > 1000 ? 2 : 6
            }).format(priceData.price),
            source: priceData.source,
            timestamp: new Date(priceData.timestamp).toLocaleString(),
            isAggregated: priceData.isAggregated,
            deviation: priceData.deviation
        };
    };

    const getTypeIcon = (type) => {
        const icons = {
            real_estate: '🏠',
            vehicle: '🚗',
            equipment: '⚙️',
            inventory: '📦',
            invoice: '📄',
            stocks: '📈',
            other: '📦',
        };
        return icons[type] || '📦';
    };

    const filteredCollateral = pendingCollateral?.filter(c => {
        const matchesFilter = filter === 'all' || c.status === filter;
        const matchesSearch = !searchTerm ||
            c.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.id?.toString().includes(searchTerm);
        return matchesFilter && matchesSearch;
    }) || [];

    const getStatusStats = () => {
        if (!pendingCollateral) return { PENDING: 0, VERIFIED: 0, REJECTED: 0 };
        return pendingCollateral.reduce((stats, c) => {
            stats[c.status] = (stats[c.status] || 0) + 1;
            return stats;
        }, { PENDING: 0, VERIFIED: 0, REJECTED: 0 });
    };

    const statusStats = getStatusStats();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Collateral Verification</h1>
                <button
                    onClick={() => dispatch(getPendingCollateral())}
                    className="btn-secondary"
                >
                    🔄 Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold">{pendingCollateral?.length || 0}</p>
                        <p className="text-sm text-slate-500">Total Pending</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-yellow-600">{statusStats.PENDING}</p>
                        <p className="text-sm text-slate-500">Awaiting Review</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{statusStats.VERIFIED}</p>
                        <p className="text-sm text-slate-500">Verified Today</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">
                            {formatCurrency(pendingCollateral?.reduce((sum, c) => sum + (c.value || 0), 0) || 0)}
                        </p>
                        <p className="text-sm text-slate-500">Total Value</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 flex-wrap">
                <input
                    type="text"
                    className="input-field flex-1 min-w-[200px]"
                    placeholder="Search by ID, owner, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                    className="input-field"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                >
                    <option value="all">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="REJECTED">Rejected</option>
                </select>
            </div>

            {/* Collateral List */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Collateral Items</h2>

                {isLoading ? (
                    <div className="card p-6 text-center">
                        <div className="animate-pulse">Loading collateral...</div>
                    </div>
                ) : filteredCollateral.length === 0 ? (
                    <div className="card p-6 text-center text-slate-500">
                        <p>No collateral items found.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredCollateral.map((collateral) => (
                            <div key={collateral.id} className="card hover:shadow-lg transition-shadow">
                                <div className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start gap-4">
                                            <span className="text-4xl">{getTypeIcon(collateral.type)}</span>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-semibold">
                                                        Collateral #{collateral.id}
                                                    </h3>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${collateral.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                            collateral.status === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                                                                'bg-red-100 text-red-800'
                                                        }`}>
                                                        {collateral.status}
                                                    </span>
                                                </div>
                                                <p className="text-slate-500 mt-1">
                                                    Type: {collateral.type?.replace('_', ' ')} |
                                                    Owner: {collateral.ownerName || 'Anonymous'}
                                                </p>
                                                <p className="text-slate-500 text-sm">
                                                    Loan Request: #{collateral.loanId} |
                                                    Submitted: {new Date(collateral.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold">{formatCurrency(collateral.value)}</p>
                                            <p className="text-sm text-slate-500">Declared Value</p>
                                        </div>
                                    </div>

                                    {/* Price Oracle Info for Crypto Collateral */}
                                    {collateralPrices[collateral.id] && (
                                        <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-semibold text-sm text-green-800 flex items-center gap-2">
                                                        <span className="text-green-600">🔗</span>
                                                        Oracle Price Verification
                                                    </h4>
                                                    <p className="text-lg font-bold text-green-700 mt-1">
                                                        {formatCryptoPrice(collateralPrices[collateral.id])?.price}
                                                    </p>
                                                    <p className="text-xs text-green-600 mt-1">
                                                        Source: {formatCryptoPrice(collateralPrices[collateral.id])?.source}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    {formatCryptoPrice(collateralPrices[collateral.id])?.isAggregated && (
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                                            Multi-Source Verified
                                                        </span>
                                                    )}
                                                    <p className="text-xs text-green-600 mt-1">
                                                        Last Updated: {formatCryptoPrice(collateralPrices[collateral.id])?.timestamp}
                                                    </p>
                                                </div>
                                            </div>
                                            {/* Value Comparison */}
                                            <div className="mt-3 pt-3 border-t border-green-200 grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-green-600">Declared Value</p>
                                                    <p className="font-semibold">{formatCurrency(collateral.value)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-green-600">Market Value (Oracle)</p>
                                                    <p className="font-semibold">
                                                        {formatCurrency(collateral.amount * (collateralPrices[collateral.id]?.price || 0))}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Price Loading State */}
                                    {priceLoading[collateral.id] && (
                                        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <div className="animate-spin w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full"></div>
                                                <span className="text-sm">Fetching oracle price...</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Description */}
                                    <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                                        <h4 className="font-semibold text-sm mb-2">Description</h4>
                                        <p className="text-sm text-slate-600">{collateral.description}</p>
                                    </div>

                                    {/* Documents */}
                                    {collateral.documents && collateral.documents.length > 0 && (
                                        <div className="mt-4">
                                            <h4 className="font-semibold text-sm mb-2">Documents ({collateral.documents.length})</h4>
                                            <div className="flex gap-2 flex-wrap">
                                                {collateral.documents.map((doc, index) => (
                                                    <button
                                                        key={index}
                                                        className="px-3 py-1 bg-slate-100 rounded-lg text-sm hover:bg-slate-200"
                                                    >
                                                        📄 Document {index + 1}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Verification Fields */}
                                    {collateral.status === 'PENDING' && (
                                        <div className="mt-4 p-4 border-2 border-dashed border-slate-200 rounded-lg">
                                            <h4 className="font-semibold text-sm mb-3">Verification Checklist</h4>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <label className="flex items-center gap-2">
                                                    <input type="checkbox" className="rounded" />
                                                    <span>Document authenticity verified</span>
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input type="checkbox" className="rounded" />
                                                    <span>Ownership confirmed</span>
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input type="checkbox" className="rounded" />
                                                    <span>Value assessment completed</span>
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input type="checkbox" className="rounded" />
                                                    <span>No encumbrances found</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    {collateral.status === 'PENDING' && (
                                        <div className="mt-4 flex gap-3">
                                            <button
                                                onClick={() => handleVerify(collateral.id, true)}
                                                className="btn-primary"
                                                disabled={isLoading}
                                            >
                                                ✓ Verify & Approve
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedCollateral(collateral);
                                                    setShowRejectModal(true);
                                                }}
                                                className="btn-secondary text-red-600 border-red-300 hover:bg-red-50"
                                            >
                                                ✕ Reject
                                            </button>
                                            <button className="btn-secondary">
                                                Request More Info
                                            </button>
                                        </div>
                                    )}

                                    {/* Notes */}
                                    {collateral.notes && (
                                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                            <p className="text-sm text-blue-800">
                                                <strong>Admin Notes:</strong> {collateral.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Reject Modal */}
            {showRejectModal && selectedCollateral && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="card max-w-md w-full mx-4">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Reject Collateral</h2>
                            <div className="space-y-4">
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-sm text-slate-500">Collateral ID</p>
                                    <p className="font-semibold">#{selectedCollateral.id}</p>
                                    <p className="text-sm text-slate-500 mt-2">Value</p>
                                    <p className="font-semibold">{formatCurrency(selectedCollateral.value)}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Rejection Reason *</label>
                                    <select
                                        className="input-field w-full mb-2"
                                        value={verificationNotes}
                                        onChange={(e) => setVerificationNotes(e.target.value)}
                                    >
                                        <option value="">Select a reason</option>
                                        <option value="Invalid documentation">Invalid documentation</option>
                                        <option value="Ownership cannot be verified">Ownership cannot be verified</option>
                                        <option value="Value overestimated">Value overestimated</option>
                                        <option value="Existing encumbrances">Existing encumbrances</option>
                                        <option value="Fraudulent submission">Fraudulent submission</option>
                                        <option value="Incomplete information">Incomplete information</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    <textarea
                                        className="input-field w-full h-24"
                                        placeholder="Additional notes..."
                                        value={verificationNotes}
                                        onChange={(e) => setVerificationNotes(e.target.value)}
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        className="btn-secondary flex-1"
                                        onClick={() => {
                                            setShowRejectModal(false);
                                            setVerificationNotes('');
                                            setSelectedCollateral(null);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn-primary bg-red-500 hover:bg-red-600 flex-1"
                                        onClick={() => handleVerify(selectedCollateral.id, false)}
                                        disabled={isLoading || !verificationNotes.trim()}
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

export default CollateralVerification;
