import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { formatCurrency, formatPercentage, formatDate } from '../../utils/formatters';
import { trackBehavior, updateLastViewed } from '../../store/slices/discoverySlice';
import { RiskBadge, ReputationBadge, TrustScoreIndicator, CollateralVerificationBadge } from '../../components/trust';

/**
 * LoanOpportunityCard Component
 * Displays a loan opportunity with discovery score labels
 */
const LoanOpportunityCard = ({ 
    loan, 
    discoveryScore = null, 
    labels = [],
    showLabels = true,
    onInvest,
    compact = false 
}) => {
    const dispatch = useDispatch();

    // Calculate funding progress
    const fundedAmount = loan.funded_amount || loan.fundedAmount || 0;
    const loanAmount = loan.loan_amount || loan.loanAmount || 1;
    const fundingProgress = Math.min(100, (fundedAmount / loanAmount) * 100);
    const remainingAmount = loanAmount - fundedAmount;

    // Determine if loan is closing soon (>=80% funded)
    const isClosingSoon = fundingProgress >= 80 && fundingProgress < 100;
    const isFullyFunded = fundingProgress >= 100;

    // Get risk color
    const getRiskColor = (riskScore) => {
        if (riskScore <= 30) return 'text-green-600 bg-green-50';
        if (riskScore <= 50) return 'text-blue-600 bg-blue-50';
        if (riskScore <= 70) return 'text-yellow-600 bg-yellow-50';
        return 'text-red-600 bg-red-50';
    };

    // Get demand label color
    const getDemandColor = (level) => {
        switch (level) {
            case 'very_high':
            case 'high':
                return 'bg-green-100 text-green-800';
            case 'medium':
                return 'bg-blue-100 text-blue-800';
            case 'low':
            case 'very_low':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    // Handle loan view tracking
    const handleView = () => {
        dispatch(updateLastViewed(loan.id));
        dispatch(trackBehavior({
            eventType: 'viewed',
            loanId: loan.id,
            interestRateAtEvent: loan.interest_rate,
            loanSizeAtEvent: loanAmount,
            riskCategoryAtEvent: loan.risk_score,
            collateralTypeAtEvent: loan.collateral_type,
        }));
    };

    // Determine labels based on discovery score and loan properties
    const getLabels = () => {
        const labels = [];
        
        if (showLabels) {
            if (discoveryScore >= 80) {
                labels.push({ text: 'Best Match', color: 'bg-purple-100 text-purple-800' });
            }
            
            if ((loan.interest_rate || loan.interestRate || 0) >= 20) {
                labels.push({ text: 'High Yield', color: 'bg-yellow-100 text-yellow-800' });
            }
            
            if ((loan.risk_score || loan.riskScore || 100) <= 30) {
                labels.push({ text: 'Low Risk', color: 'bg-green-100 text-green-800' });
            }
            
            if (isClosingSoon) {
                labels.push({ text: 'Closing Soon', color: 'bg-orange-100 text-orange-800' });
            }
        }

        return labels;
    };

    const cardLabels = labels.length > 0 ? labels : getLabels();

    if (compact) {
        return (
            <Link
                to={`/loans/${loan.id}`}
                onClick={handleView}
                className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">
                                {loan.title || `Loan #${loan.id}`}
                            </span>
                            {cardLabels.slice(0, 1).map((label, idx) => (
                                <span
                                    key={idx}
                                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${label.color}`}
                                >
                                    {label.text}
                                </span>
                            ))}
                        </div>
                        <div className="text-lg font-bold text-blue-600">
                            {formatPercentage(loan.interest_rate || loan.interestRate || 0)}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(loanAmount)}
                        </div>
                        <div className="text-xs text-gray-500">
                            {formatCurrency(remainingAmount)} left
                        </div>
                    </div>
                </div>
                
                {/* Compact progress bar */}
                <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Funded</span>
                        <span>{fundingProgress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${
                                isClosingSoon ? 'bg-orange-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${fundingProgress}%` }}
                        />
                    </div>
                </div>
                
                {/* Trust badges for compact view */}
                <div className="mt-2 flex items-center gap-1">
                    <RiskBadge 
                        rating={loan.risk_rating || loan.riskRating || 'BBB'} 
                        compact 
                        size="sm"
                    />
                    <CollateralVerificationBadge
                        status={loan.collateral_verified || loan.collateralVerified ? 'verified' : 'pending'}
                        collateralType={loan.collateral_type || loan.collateralType || 'Real Estate'}
                        compact
                    />
                </div>
            </Link>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
            {/* Header */}
            <div className="p-5 border-b border-gray-100">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                            {loan.title || `Loan #${loan.id}`}
                        </h3>
                        <p className="text-sm text-gray-500">
                            by {loan.borrower_name || 'Anonymous Borrower'}
                        </p>
                    </div>
                    {discoveryScore !== null && (
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {discoveryScore.toFixed(0)}
                            </div>
                            <div className="text-xs text-gray-500">Match Score</div>
                        </div>
                    )}
                </div>

                {/* Labels */}
                {cardLabels.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {cardLabels.map((label, idx) => (
                            <span
                                key={idx}
                                className={`px-2.5 py-1 text-xs font-medium rounded-full ${label.color}`}
                            >
                                {label.text}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Key Metrics */}
            <div className="p-5">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <div className="text-sm text-gray-500 mb-1">Loan Amount</div>
                        <div className="text-xl font-bold text-gray-900">
                            {formatCurrency(loanAmount)}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-500 mb-1">Interest Rate</div>
                        <div className="text-xl font-bold text-green-600">
                            {formatPercentage(loan.interest_rate || loan.interestRate || 0)}
                        </div>
                    </div>
                </div>

                {/* Additional Details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-gray-500">Duration</span>
                        <span className="font-medium text-gray-900">
                            {loan.duration_months || loan.duration || 12} months
                        </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-gray-500">Credit Score</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRiskColor(loan.risk_score || loan.riskScore || 50)}`}>
                            {loan.credit_score || loan.creditScore || 'N/A'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-gray-500">Collateral</span>
                        <span className="font-medium text-gray-900 capitalize">
                            {loan.collateral_type || loan.collateralType || 'None'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-gray-500">LTV Ratio</span>
                        <span className="font-medium text-gray-900">
                            {formatPercentage(loan.ltv_ratio || loan.ltvRatio || 0)}
                        </span>
                    </div>
                </div>

                {/* Funding Progress */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Funding Progress</span>
                        <span className={`text-sm font-semibold ${isClosingSoon ? 'text-orange-600' : 'text-gray-900'}`}>
                            {fundingProgress.toFixed(1)}%
                        </span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${
                                isClosingSoon 
                                    ? 'bg-gradient-to-r from-orange-400 to-orange-600' 
                                    : 'bg-gradient-to-r from-blue-500 to-blue-600'
                            }`}
                            style={{ width: `${fundingProgress}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>{formatCurrency(fundedAmount)} funded</span>
                        <span>{formatCurrency(remainingAmount)} remaining</span>
                    </div>
                </div>
                
                {/* Trust Signals */}
                <div className="mt-4 p-3 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Trust Signals</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <RiskBadge 
                            rating={loan.risk_rating || loan.riskRating || 'BBB'} 
                            compact 
                        />
                        <ReputationBadge 
                            score={loan.reputation_score || loan.reputationScore || 75} 
                            compact 
                        />
                        <CollateralVerificationBadge
                            status={loan.collateral_verified || loan.collateralVerified ? 'verified' : 'pending'}
                            collateralType={loan.collateral_type || loan.collateralType || 'Real Estate'}
                            compact
                        />
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="p-5 bg-gray-50 border-t border-gray-100">
                <div className="flex gap-3">
                    <Link
                        to={`/loans/${loan.id}`}
                        onClick={handleView}
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium text-center hover:bg-white transition-colors"
                    >
                        View Details
                    </Link>
                    {onInvest && !isFullyFunded && (
                        <button
                            onClick={() => onInvest(loan)}
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            Invest Now
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoanOpportunityCard;
