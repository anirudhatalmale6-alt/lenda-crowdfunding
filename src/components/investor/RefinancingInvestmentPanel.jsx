import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { formatCurrency, formatPercentage, formatDate } from '../../utils/formatters';
import { getRefinancingOpportunities, investInRefinancing } from '../../store/slices/loanSlice';

/**
 * RefinancingInvestmentPanel - UX-003: Refinancing Investment flow for lenders
 * Allows investors to invest in refinancing opportunities for existing loans
 */
function RefinancingInvestmentPanel() {
    const dispatch = useDispatch();
    const { refinancingOpportunities, isLoading } = useSelector((state) => state.loans);
    const { wallets } = useSelector((state) => state.wallet);
    
    const [selectedOpportunity, setSelectedOpportunity] = useState(null);
    const [showInvestModal, setShowInvestModal] = useState(false);
    const [investAmount, setInvestAmount] = useState('');
    const [errors, setErrors] = useState({});

    useEffect(() => {
        dispatch(getRefinancingOpportunities());
    }, [dispatch]);

    const handleInvest = (opportunity) => {
        setSelectedOpportunity(opportunity);
        setShowInvestModal(true);
    };

    const validateInvestment = () => {
        const newErrors = {};
        const amount = parseFloat(investAmount);
        
        if (!investAmount || amount <= 0) {
            newErrors.amount = 'Please enter a valid amount';
        } else if (selectedOpportunity && amount > selectedOpportunity.maxInvestment) {
            newErrors.amount = 'Amount exceeds maximum investment';
        } else if (wallets.investment?.available < amount) {
            newErrors.amount = 'Insufficient wallet balance';
        } else if (amount < 100) {
            newErrors.amount = 'Minimum investment is $100';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleConfirmInvestment = async () => {
        if (!validateInvestment()) return;
        
        try {
            await dispatch(investInRefinancing({
                opportunityId: selectedOpportunity.id,
                amount: parseFloat(investAmount)
            })).unwrap();
            
            toast.success('Investment in refinancing successful!');
            setShowInvestModal(false);
            setInvestAmount('');
            setSelectedOpportunity(null);
            dispatch(getRefinancingOpportunities());
        } catch (error) {
            toast.error(error.message || 'Failed to invest');
        }
    };

    const getRiskColor = (risk) => {
        const colors = {
            low: 'bg-green-100 text-green-800',
            medium: 'bg-yellow-100 text-yellow-800',
            high: 'bg-red-100 text-red-800',
        };
        return colors[risk] || 'bg-gray-100 text-gray-800';
    };

    const calculateExpectedReturn = (amount, rate, term) => {
        return amount * (rate / 100) * (term / 12);
    };

    if (isLoading) {
        return (
            <div className="card p-6">
                <div className="animate-pulse text-center text-slate-500">
                    Loading refinancing opportunities...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Refinancing Opportunities</h2>
                    <p className="text-gray-500 mt-1">Invest in loan refinancing for better returns</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 px-4">
                    <p className="text-sm text-emerald-600 font-medium">Available Balance</p>
                    <p className="text-lg font-bold text-emerald-700">
                        {formatCurrency(wallets.investment?.available || 0)}
                    </p>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <p className="text-sm font-medium text-blue-800">How Refinancing Investment Works</p>
                        <p className="text-xs text-blue-700 mt-1">
                            When borrowers refinance, you can invest in the new loan terms at potentially higher rates. 
                            Your original investment is paid back plus accrued interest.
                        </p>
                    </div>
                </div>
            </div>

            {/* Opportunities List */}
            {refinancingOpportunities?.length === 0 ? (
                <div className="card p-8 text-center">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500">No refinancing opportunities available at the moment.</p>
                    <Link to="/dashboard/invest" className="text-emerald-600 hover:underline mt-2 inline-block">
                        Browse new loan opportunities
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {refinancingOpportunities?.map((opportunity) => (
                        <div key={opportunity.id} className="card hover:shadow-lg transition-shadow">
                            <div className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                Loan #{opportunity.originalLoanId}
                                            </h3>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(opportunity.riskLevel)}`}>
                                                {opportunity.riskLevel?.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Original Rate: {formatPercentage(opportunity.originalRate)} → 
                                            New Rate: {formatPercentage(opportunity.newRate)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-emerald-600">
                                            +{(opportunity.newRate - opportunity.originalRate).toFixed(1)}% APY
                                        </p>
                                        <p className="text-sm text-gray-500">Rate Increase</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
                                    <div>
                                        <p className="text-sm text-gray-500">Original Principal</p>
                                        <p className="font-medium">{formatCurrency(opportunity.principal)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">New Rate</p>
                                        <p className="font-medium">{formatPercentage(opportunity.newRate)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Term</p>
                                        <p className="font-medium">{opportunity.newTermMonths} months</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Investment Cap</p>
                                        <p className="font-medium">{formatCurrency(opportunity.maxInvestment)}</p>
                                    </div>
                                </div>

                                {/* Investment Preview */}
                                <div className="mt-4 bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-2">Example: $1,000 investment</p>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Expected Return</span>
                                        <span className="font-semibold text-emerald-600">
                                            +{formatCurrency(calculateExpectedReturn(1000, opportunity.newRate - opportunity.originalRate, opportunity.newTermMonths))}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 flex gap-3">
                                    <button
                                        onClick={() => handleInvest(opportunity)}
                                        className="btn-primary"
                                        disabled={wallets.investment?.available <= 0}
                                    >
                                        Invest in Refinancing
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Investment Modal */}
            {showInvestModal && selectedOpportunity && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">Invest in Refinancing</h2>
                            <p className="text-gray-500 mt-1">Loan #{selectedOpportunity.originalLoanId}</p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-emerald-50 rounded-lg p-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-emerald-700">Rate Increase</span>
                                    <span className="font-semibold text-emerald-800">
                                        +{(selectedOpportunity.newRate - selectedOpportunity.originalRate).toFixed(1)}%
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Investment Amount
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        value={investAmount}
                                        onChange={(e) => {
                                            setInvestAmount(e.target.value);
                                            setErrors({});
                                        }}
                                        className={`w-full pl-8 pr-4 py-3 border rounded-lg ${
                                            errors.amount ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="Enter amount"
                                        min="100"
                                        max={selectedOpportunity.maxInvestment}
                                    />
                                </div>
                                {errors.amount && (
                                    <p className="text-sm text-red-500 mt-1">{errors.amount}</p>
                                )}
                                <div className="flex justify-between text-sm text-gray-500 mt-2">
                                    <span>Min: $100</span>
                                    <span>Max: {formatCurrency(selectedOpportunity.maxInvestment)}</span>
                                </div>
                            </div>

                            {investAmount && (
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-sm text-gray-600 mb-2">Investment Preview</p>
                                    <div className="flex justify-between text-sm">
                                        <span>Your Investment</span>
                                        <span className="font-medium">{formatCurrency(parseFloat(investAmount))}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mt-1">
                                        <span>Expected Return</span>
                                        <span className="font-medium text-emerald-600">
                                            +{formatCurrency(calculateExpectedReturn(
                                                parseFloat(investAmount),
                                                selectedOpportunity.newRate - selectedOpportunity.originalRate,
                                                selectedOpportunity.newTermMonths
                                            ))}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm mt-2 pt-2 border-t">
                                        <span className="font-medium">Total at Maturity</span>
                                        <span className="font-bold text-emerald-700">
                                            {formatCurrency(
                                                parseFloat(investAmount) +
                                                calculateExpectedReturn(
                                                    parseFloat(investAmount),
                                                    selectedOpportunity.newRate - selectedOpportunity.originalRate,
                                                    selectedOpportunity.newTermMonths
                                                )
                                            )}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowInvestModal(false);
                                        setInvestAmount('');
                                        setSelectedOpportunity(null);
                                    }}
                                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmInvestment}
                                    className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
                                >
                                    Confirm Investment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RefinancingInvestmentPanel;
