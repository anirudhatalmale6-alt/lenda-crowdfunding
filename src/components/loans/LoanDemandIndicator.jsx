import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLoanDemand } from '../../store/slices/discoverySlice';

/**
 * LoanDemandIndicator Component
 * Shows borrowers how attractive their loan appears to investors
 */
const LoanDemandIndicator = ({ loanId, loanData = null, compact = false }) => {
    const dispatch = useDispatch();
    const { loanDemand } = useSelector((state) => state.discovery);

    // Get demand data from store or use provided data
    const demand = loanDemand[loanId] || loanData;

    useEffect(() => {
        if (loanId && !demand) {
            dispatch(fetchLoanDemand(loanId));
        }
    }, [dispatch, loanId, demand]);

    // If no demand data available, show placeholder
    if (!demand && !loanData) {
        return (
            <div className="bg-gray-50 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            </div>
        );
    }

    // Use provided data as fallback
    const data = demand || loanData || {};

    const getDemandLevelInfo = (level) => {
        switch (level) {
            case 'very_high':
                return {
                    color: 'bg-green-500',
                    textColor: 'text-green-700',
                    bgColor: 'bg-green-50',
                    borderColor: 'border-green-200',
                    icon: (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                        </svg>
                    ),
                };
            case 'high':
                return {
                    color: 'bg-green-400',
                    textColor: 'text-green-600',
                    bgColor: 'bg-green-50',
                    borderColor: 'border-green-200',
                    icon: (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    ),
                };
            case 'medium':
                return {
                    color: 'bg-blue-400',
                    textColor: 'text-blue-600',
                    bgColor: 'bg-blue-50',
                    borderColor: 'border-blue-200',
                    icon: (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                    ),
                };
            case 'low':
                return {
                    color: 'bg-yellow-400',
                    textColor: 'text-yellow-600',
                    bgColor: 'bg-yellow-50',
                    borderColor: 'border-yellow-200',
                    icon: (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    ),
                };
            case 'very_low':
                return {
                    color: 'bg-red-400',
                    textColor: 'text-red-600',
                    bgColor: 'bg-red-50',
                    borderColor: 'border-red-200',
                    icon: (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    ),
                };
            default:
                return {
                    color: 'bg-gray-400',
                    textColor: 'text-gray-600',
                    bgColor: 'bg-gray-50',
                    borderColor: 'border-gray-200',
                    icon: (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    ),
                };
        }
    };

    const demandInfo = getDemandLevelInfo(data.demandLevel || 'medium');

    if (compact) {
        return (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${demandInfo.bgColor} ${demandInfo.borderColor} border`}>
                <span className={`w-2 h-2 rounded-full ${demandInfo.color}`}></span>
                <span className={`text-sm font-medium ${demandInfo.textColor}`}>
                    {data.demandLevel === 'very_high' ? 'Very High' : 
                     data.demandLevel === 'very_low' ? 'Very Low' : 
                     data.demandLevel?.charAt(0).toUpperCase() + data.demandLevel?.slice(1) || 'Medium'}
                </span>
            </div>
        );
    }

    return (
        <div className={`rounded-xl border ${demandInfo.borderColor} ${demandInfo.bgColor} p-6`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                    Investor Demand Indicator
                </h3>
                <button
                    onClick={() => dispatch(fetchLoanDemand(loanId))}
                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                    title="Refresh"
                >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {/* Main Demand Level */}
            <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 rounded-full bg-white ${demandInfo.color} bg-opacity-20`}>
                    <div className={demandInfo.color}>
                        {demandInfo.icon}
                    </div>
                </div>
                <div>
                    <div className="text-sm text-gray-600">Demand Level</div>
                    <div className={`text-2xl font-bold ${demandInfo.textColor}`}>
                        {data.demandLevel === 'very_high' ? 'Very High' : 
                         data.demandLevel === 'very_low' ? 'Very Low' : 
                         data.demandLevel?.charAt(0).toUpperCase() + data.demandLevel?.slice(1) || 'Medium'}
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Investor Interest</div>
                    <div className="text-lg font-semibold text-gray-900">
                        {data.investorInterest || 'Moderate'}
                    </div>
                </div>
                <div className="bg-white/50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Funding Progress</div>
                    <div className="text-lg font-semibold text-gray-900">
                        {(data.fundingProgress || 0).toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Demand Score</span>
                    <span className="font-medium text-gray-900">
                        {data.demandScore || 0}/100
                    </span>
                </div>
                <div className="w-full h-3 bg-white/50 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${demandInfo.color}`}
                        style={{ width: `${data.demandScore || 0}%` }}
                    />
                </div>
            </div>

            {/* Suggestion */}
            <div className="bg-white/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <div className="text-sm font-medium text-gray-900">AI Suggestion</div>
                        <div className="text-sm text-gray-600 mt-1">
                            {data.suggestion || 'Loan is attracting moderate interest from investors.'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tips */}
            <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Tips to Increase Demand
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Competitive interest rates attract more investors
                    </li>
                    <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Verified collateral increases trust
                    </li>
                    <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Share your loan to increase visibility
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default LoanDemandIndicator;
