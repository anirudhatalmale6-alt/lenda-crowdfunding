import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    fetchPreferences,
    fetchFullFeed,
    trackBehavior,
    addRecentlyInvested,
} from '../store/slices/discoverySlice';
import { fundLoan } from '../store/slices/loanSlice';
import RecommendedLoansFeed from '../components/loans/RecommendedLoansFeed';
import InvestmentPreferenceSetup from '../components/investor/InvestmentPreferenceSetup';
import { formatCurrency } from '../utils/formatters';

/**
 * Investment Opportunities Page
 * Main page for investors to discover and invest in loans
 */
const InvestmentOpportunities = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const { preferences, recommendedLoans, isLoading } = useSelector((state) => state.discovery);
    const { wallet } = useSelector((state) => state.wallet);

    const [showPreferencesSetup, setShowPreferencesSetup] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [investmentAmount, setInvestmentAmount] = useState('');
    const [showInvestmentModal, setShowInvestmentModal] = useState(false);

    useEffect(() => {
        // Check if user has set preferences
        dispatch(fetchPreferences());
        dispatch(fetchFullFeed());
    }, [dispatch]);

    // Show preferences setup if user hasn't set them
    useEffect(() => {
        if (!preferences || Object.keys(preferences).length === 0) {
            // First time user - show setup
            setShowPreferencesSetup(true);
        }
    }, [preferences]);

    const handleInvest = (loan) => {
        setSelectedLoan(loan);
        setShowInvestmentModal(true);
    };

    const handleConfirmInvestment = async () => {
        if (!selectedLoan || !investmentAmount) return;

        try {
            await dispatch(
                fundLoan({
                    loanId: selectedLoan.id,
                    amount: parseFloat(investmentAmount),
                })
            ).unwrap();

            // Track investment behavior
            dispatch(
                trackBehavior({
                    eventType: 'invested',
                    loanId: selectedLoan.id,
                    interestRateAtEvent: selectedLoan.interest_rate,
                    loanSizeAtEvent: selectedLoan.loan_amount,
                    riskCategoryAtEvent: selectedLoan.risk_score,
                    collateralTypeAtEvent: selectedLoan.collateral_type,
                })
            );

            // Add to recently invested
            dispatch(addRecentlyInvested(selectedLoan.id));

            // Close modal and refresh
            setShowInvestmentModal(false);
            setSelectedLoan(null);
            setInvestmentAmount('');
            dispatch(fetchFullFeed());
        } catch (error) {
            console.error('Investment failed:', error);
        }
    };

    const handlePreferencesSaved = () => {
        setShowPreferencesSetup(false);
        dispatch(fetchFullFeed());
    };

    const maxInvestment = Math.min(
        wallet?.balance || 0,
        preferences?.maxLoanExposure || 50000
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Investment Opportunities
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Discover loans that match your investment preferences
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Wallet Balance */}
                            <div className="text-right">
                                <div className="text-sm text-gray-500">Available Balance</div>
                                <div className="text-xl font-bold text-gray-900">
                                    {formatCurrency(wallet?.balance || 0)}
                                </div>
                            </div>
                            {/* Edit Preferences Button */}
                            <button
                                onClick={() => setShowPreferencesSetup(true)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                </svg>
                                Edit Preferences
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {showPreferencesSetup ? (
                    <div className="bg-white rounded-xl shadow-sm p-8">
                        <InvestmentPreferenceSetup
                            onComplete={handlePreferencesSaved}
                        />
                    </div>
                ) : (
                    <RecommendedLoansFeed showFilters={true} onInvest={handleInvest} />
                )}
            </div>

            {/* Investment Modal */}
            {showInvestmentModal && selectedLoan && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-gray-900">
                                Invest in Loan
                            </h3>
                            <button
                                onClick={() => setShowInvestmentModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        {/* Loan Summary */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-600">Loan Amount</span>
                                <span className="font-semibold text-gray-900">
                                    {formatCurrency(selectedLoan.loan_amount)}
                                </span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-600">Interest Rate</span>
                                <span className="font-semibold text-green-600">
                                    {selectedLoan.interest_rate}%
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Funding Progress</span>
                                <span className="font-semibold text-gray-900">
                                    {(
                                        (selectedLoan.funded_amount / selectedLoan.loan_amount) *
                                        100
                                    ).toFixed(1)}
                                    %
                                </span>
                            </div>
                        </div>

                        {/* Investment Amount Input */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Investment Amount
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    $
                                </span>
                                <input
                                    type="number"
                                    min={preferences?.minInvestmentAmount || 100}
                                    max={maxInvestment}
                                    step="50"
                                    value={investmentAmount}
                                    onChange={(e) => setInvestmentAmount(e.target.value)}
                                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter amount"
                                />
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-gray-500">
                                <span>
                                    Min: {formatCurrency(preferences?.minInvestmentAmount || 100)}
                                </span>
                                <span>Max: {formatCurrency(maxInvestment)}</span>
                            </div>
                        </div>

                        {/* Quick Amount Buttons */}
                        <div className="grid grid-cols-3 gap-2 mb-6">
                            {[1000, 5000, 10000].map((amount) => (
                                <button
                                    key={amount}
                                    onClick={() => setInvestmentAmount(amount.toString())}
                                    disabled={amount > maxInvestment}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {formatCurrency(amount)}
                                </button>
                            ))}
                        </div>

                        {/* Expected Returns */}
                        <div className="bg-blue-50 rounded-lg p-4 mb-6">
                            <div className="text-sm text-blue-600 mb-1">
                                Expected Return
                            </div>
                            <div className="text-xl font-bold text-blue-700">
                                {formatCurrency(
                                    (investmentAmount || 0) *
                                        (selectedLoan.interest_rate / 100) *
                                        ((selectedLoan.duration_months || 12) / 12)
                                )}
                            </div>
                            <div className="text-xs text-blue-500">
                                Over {selectedLoan.duration_months || 12} months
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowInvestmentModal(false)}
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmInvestment}
                                disabled={!investmentAmount || investmentAmount < (preferences?.minInvestmentAmount || 100)}
                                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm Investment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvestmentOpportunities;
