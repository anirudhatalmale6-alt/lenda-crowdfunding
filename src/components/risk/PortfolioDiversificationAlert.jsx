import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { dismissDiversificationAlert } from '../../store/slices/uiSlice';

/**
 * PortfolioDiversificationAlert - UX-007: Risk alert notifications when concentration risk is detected
 * Monitors portfolio allocation and warns when risk is too concentrated
 */
function PortfolioDiversificationAlert({ portfolio = [], threshold = 25, onDismiss }) {
    const dispatch = useDispatch();
    const { dismissedAlerts } = useSelector((state) => state.ui);
    const [alert, setAlert] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (portfolio.length > 0) {
            const concentrationRisk = analyzePortfolio(portfolio);
            if (concentrationRisk && !dismissedAlerts.includes('diversification')) {
                setAlert(concentrationRisk);
                // Delay showing the alert for better UX
                setTimeout(() => setIsVisible(true), 500);
            }
        }
    }, [portfolio]);

    const analyzePortfolio = (portfolio) => {
        // Check for single loan concentration
        const totalValue = portfolio.reduce((sum, item) => sum + (item.value || 0), 0);
        
        if (totalValue === 0) return null;

        // Find the largest position
        let largestPosition = { value: 0, loanId: null };
        portfolio.forEach(item => {
            if (item.value > largestPosition.value) {
                largestPosition = item;
            }
        });

        const largestPercentage = (largestPosition.value / totalValue) * 100;

        // Alert if single loan exceeds threshold
        if (largestPercentage > threshold) {
            return {
                type: 'concentration',
                severity: largestPercentage > 50 ? 'high' : 'medium',
                title: 'High Concentration Risk Detected',
                message: `${largestPercentage.toFixed(1)}% of your portfolio is in a single loan (Loan #${largestPosition.loanId}). Consider diversifying to reduce risk.`,
                recommendation: 'Spread your investments across multiple loans to minimize risk.',
                loanId: largestPosition.loanId,
                percentage: largestPercentage,
            };
        }

        // Check for sector/collateral concentration
        const collateralTypes = {};
        portfolio.forEach(item => {
            const type = item.collateralType || 'unsecured';
            collateralTypes[type] = (collateralTypes[type] || 0) + item.value;
        });

        for (const [type, value] of Object.entries(collateralTypes)) {
            const typePercentage = (value / totalValue) * 100;
            if (typePercentage > 60 && type !== 'unsecured') {
                return {
                    type: 'sector',
                    severity: 'medium',
                    title: 'Collateral Concentration Warning',
                    message: `${typePercentage.toFixed(1)}% of your portfolio is backed by ${type} collateral. Consider diversifying across different collateral types.`,
                    recommendation: 'Diversify across different collateral types for better risk management.',
                    collateralType: type,
                    percentage: typePercentage,
                };
            }
        }

        // Check for maturity concentration
        const maturities = {};
        portfolio.forEach(item => {
            const months = item.durationMonths || 0;
            const bucket = months <= 6 ? 'short' : months <= 12 ? 'medium' : 'long';
            maturities[bucket] = (maturities[bucket] || 0) + item.value;
        });

        for (const [bucket, value] of Object.entries(maturities)) {
            const bucketPercentage = (value / totalValue) * 100;
            if (bucketPercentage > 80) {
                return {
                    type: 'maturity',
                    severity: 'low',
                    title: 'Maturity Concentration Notice',
                    message: `${bucketPercentage.toFixed(1)}% of your loans have ${bucket}-term maturities. Consider a mix of maturities for better liquidity planning.`,
                    recommendation: 'Balance short, medium, and long-term loans for optimal liquidity.',
                    maturityBucket: bucket,
                    percentage: bucketPercentage,
                };
            }
        }

        return null;
    };

    const handleDismiss = () => {
        setIsVisible(false);
        dispatch(dismissDiversificationAlert('diversification'));
        onDismiss?.();
    };

    if (!alert || !isVisible) return null;

    const severityStyles = {
        high: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            icon: 'text-red-600',
            title: 'text-red-800',
            button: 'bg-red-600 hover:bg-red-700',
        },
        medium: {
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            icon: 'text-amber-600',
            title: 'text-amber-800',
            button: 'bg-amber-600 hover:bg-amber-700',
        },
        low: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            icon: 'text-blue-600',
            title: 'text-blue-800',
            button: 'bg-blue-600 hover:bg-blue-700',
        },
    };

    const style = severityStyles[alert.severity];

    return (
        <div className={`fixed bottom-4 right-4 max-w-md w-full ${style.bg} border ${style.border} rounded-xl shadow-lg z-50 transition-all duration-300 transform ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
            <div className="p-4">
                <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        alert.severity === 'high' ? 'bg-red-100' :
                        alert.severity === 'medium' ? 'bg-amber-100' : 'bg-blue-100'
                    }`}>
                        <svg className={`w-5 h-5 ${style.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold ${style.title}`}>
                            {alert.title}
                        </h4>
                        <p className="text-sm text-gray-700 mt-1">
                            {alert.message}
                        </p>
                        
                        {/* Recommendation */}
                        <div className="mt-2 p-2 bg-white bg-opacity-50 rounded-lg">
                            <p className="text-xs text-gray-600">
                                <span className="font-medium">Recommendation:</span> {alert.recommendation}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-3">
                            {alert.loanId && (
                                <Link
                                    to={`/loans/${alert.loanId}`}
                                    className="flex-1 text-center py-2 px-3 text-sm border border-gray-300 rounded-lg hover:bg-white transition-colors"
                                >
                                    View Loan
                                </Link>
                            )}
                            <Link
                                to="/dashboard/invest"
                                className={`flex-1 text-center py-2 px-3 text-sm text-white rounded-lg ${style.button} transition-colors`}
                            >
                                Diversify Now
                            </Link>
                        </div>
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={handleDismiss}
                        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * DiversificationScore - Shows overall portfolio diversification score
 */
function DiversificationScore({ portfolio = [] }) {
    const calculateScore = () => {
        if (portfolio.length === 0) return { score: 0, grade: 'N/A', color: 'gray' };

        const totalValue = portfolio.reduce((sum, item) => sum + (item.value || 0), 0);
        if (totalValue === 0) return { score: 0, grade: 'N/A', color: 'gray' };

        // Calculate concentration scores
        let concentrationScore = 100;
        
        // Single loan concentration
        let maxLoanConcentration = 0;
        portfolio.forEach(item => {
            const concentration = (item.value / totalValue) * 100;
            if (concentration > maxLoanConcentration) {
                maxLoanConcentration = concentration;
            }
        });
        
        if (maxLoanConcentration > 50) concentrationScore -= 40;
        else if (maxLoanConcentration > 30) concentrationScore -= 20;
        else if (maxLoanConcentration > threshold) concentrationScore -= 10;

        // Collateral diversification
        const collateralTypes = new Set(portfolio.map(p => p.collateralType || 'unsecured'));
        if (collateralTypes.size < 3) concentrationScore -= 15;
        if (collateralTypes.size < 2) concentrationScore -= 10;

        // Maturity diversification
        const maturities = portfolio.map(p => p.durationMonths || 0);
        const hasShort = maturities.some(m => m <= 6);
        const hasMedium = maturities.some(m => m > 6 && m <= 12);
        const hasLong = maturities.some(m => m > 12);
        const maturityCount = [hasShort, hasMedium, hasLong].filter(Boolean).length;
        
        if (maturityCount < 2) concentrationScore -= 10;
        if (maturityCount < 3) concentrationScore -= 5;

        // Number of loans
        if (portfolio.length < 5) concentrationScore -= 15;
        else if (portfolio.length < 10) concentrationScore -= 10;

        const score = Math.max(0, Math.min(100, concentrationScore));
        
        let grade, color;
        if (score >= 80) { grade = 'A'; color = 'green'; }
        else if (score >= 60) { grade = 'B'; color = 'blue'; }
        else if (score >= 40) { grade = 'C'; color = 'yellow'; }
        else if (score >= 20) { grade = 'D'; color = 'orange'; }
        else { grade = 'F'; color = 'red'; }

        return { score, grade, color };
    };

    const { score, grade, color } = calculateScore();

    const colorClasses = {
        green: 'text-green-600 bg-green-100',
        blue: 'text-blue-600 bg-blue-100',
        yellow: 'text-yellow-600 bg-yellow-100',
        orange: 'text-orange-600 bg-orange-100',
        red: 'text-red-600 bg-red-100',
        gray: 'text-gray-600 bg-gray-100',
    };

    return (
        <div className="card p-4">
            <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${colorClasses[color]}`}>
                    <span className="text-2xl font-bold">{grade}</span>
                </div>
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Diversification Score</p>
                    <p className="text-2xl font-bold text-gray-900">{score}/100</p>
                </div>
            </div>
            
            {score < 60 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <Link 
                        to="/dashboard/invest" 
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                        Improve your diversification →
                    </Link>
                </div>
            )}
        </div>
    );
}

const threshold = 25; // Define threshold at module level

export { PortfolioDiversificationAlert, DiversificationScore };
export default PortfolioDiversificationAlert;
