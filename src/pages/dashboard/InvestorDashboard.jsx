import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    getPortfolio, 
    getTokenHoldings, 
    getMarketStats,
    getRiskAssessments 
} from '../../store/slices/tokenSlice';
import { formatCurrency, formatPercentage, formatDate } from '../../utils/formatters';
import { EarningsBreakdownPanel } from '../../components/revenue';
import { BorrowerRiskInsights } from '../../components/reputation';
import PlatformStabilityPanel from '../../components/risk/PlatformStabilityPanel';
import HotOpportunitiesPanel, { AlmostFundedPanel, HighYieldPanel } from '../../components/loans/HotOpportunitiesPanel';
import { Flame, Zap, TrendingUp } from 'lucide-react';

const InvestorDashboard = () => {
    const dispatch = useDispatch();
    const { portfolio, tokenHoldings, marketStats, riskAssessments, isLoading } = useSelector(
        (state) => state.tokens
    );
    const { user } = useSelector((state) => state.auth);
    
    const [activeTab, setActiveTab] = useState('overview');
    
    useEffect(() => {
        dispatch(getPortfolio());
        dispatch(getTokenHoldings());
        dispatch(getMarketStats());
        dispatch(getRiskAssessments());
    }, [dispatch]);

    const getRiskColor = (rating) => {
        const colors = {
            'AAA': 'bg-green-100 text-green-800',
            'AA': 'bg-green-50 text-green-700',
            'A': 'bg-blue-100 text-blue-800',
            'BBB': 'bg-blue-50 text-blue-700',
            'BB': 'bg-yellow-100 text-yellow-800',
            'B': 'bg-orange-100 text-orange-800',
            'CCC': 'bg-red-100 text-red-800',
            'CC': 'bg-red-50 text-red-700',
            'C': 'bg-red-100 text-red-800',
            'D': 'bg-red-200 text-red-900'
        };
        return colors[rating] || 'bg-gray-100 text-gray-800';
    };

    const renderOverview = () => (
        <div className="space-y-6">
            {/* Accelerator Opportunity Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <HotOpportunitiesPanel maxItems={5} />
                <AlmostFundedPanel maxItems={5} />
                <HighYieldPanel maxItems={5} />
            </div>

            {/* Portfolio Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Invested</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {formatCurrency(portfolio?.totalInvested || 0)}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Portfolio Value</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {formatCurrency(portfolio?.portfolioValue || 0)}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                    </div>
                    <p className={`text-sm mt-2 ${(portfolio?.unrealizedGains || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(portfolio?.unrealizedGains || 0)} unrealized
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Earned</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {formatCurrency(portfolio?.totalEarned || 0)}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        {portfolio?.realizedGains ? formatCurrency(portfolio.realizedGains) : 0} realized
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Tokens</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {portfolio?.totalTokens?.toLocaleString() || 0}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Earnings Breakdown Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <EarningsBreakdownPanel totalInterestEarned={portfolio?.totalEarned || 0} />
                
                {/* Risk Distribution */}
                {portfolio?.riskDistribution && (
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
                        <div className="grid grid-cols-5 gap-4">
                            {Object.entries(portfolio.riskDistribution).map(([rating, percentage]) => (
                                <div key={rating} className="text-center">
                                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(rating)}`}>
                                        {rating}
                                    </div>
                                    <p className="text-lg font-semibold text-gray-900 mt-2">{percentage}%</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Market Stats */}
            {marketStats && (
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Overview</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">24h Volume</p>
                            <p className="text-xl font-semibold text-gray-900">{formatCurrency(marketStats.totalVolume24h || 0)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Trades</p>
                            <p className="text-xl font-semibold text-gray-900">{marketStats.tradeCount?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Active Tokens</p>
                            <p className="text-xl font-semibold text-gray-900">{marketStats.activeTokens || 0}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Market Cap</p>
                            <p className="text-xl font-semibold text-gray-900">{formatCurrency(marketStats.marketCap || 0)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Platform Stability Panel */}
            <PlatformStabilityPanel />

            {/* Borrower Risk Insights for Investors */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Borrower Risk Analysis</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Analyze borrower creditworthiness to make informed investment decisions
                </p>
                <BorrowerRiskInsights 
                    borrowerId={user?.id || 1} 
                    loanId={null}
                />
            </div>
        </div>
    );

    const renderHoldings = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Token Holdings</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yield</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {tokenHoldings?.map((holding) => (
                            <tr key={holding.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div>
                                        <p className="font-medium text-gray-900">{holding.loanTitle}</p>
                                        <p className="text-sm text-gray-500">{holding.loanId}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getRiskColor(holding.riskRating)}`}>
                                        {holding.riskRating}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-900">
                                    {holding.tokenCount?.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-gray-900">
                                    {formatCurrency(holding.currentValue)}
                                </td>
                                <td className="px-6 py-4 text-gray-900">
                                    {formatPercentage(holding.interestRate)}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                        holding.status === 'active' ? 'bg-green-100 text-green-800' :
                                        holding.status === 'repaid' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {holding.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderExpectedRepayments = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Expected Repayments</h3>
            <div className="space-y-4">
                {tokenHoldings?.filter(h => h.nextPayment).map((holding) => (
                    <div key={holding.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900">{holding.loanTitle}</p>
                            <p className="text-sm text-gray-500">Next payment: {formatDate(holding.nextPayment.date)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-semibold text-gray-900">{formatCurrency(holding.nextPayment.amount)}</p>
                            <p className="text-sm text-gray-500">{holding.tokenCount} tokens × {formatCurrency(holding.nextPayment.perToken)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Investor Dashboard</h1>
                    <p className="text-gray-600 mt-2">Manage your loan token portfolio</p>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'overview'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('holdings')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'holdings'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Holdings
                        </button>
                        <button
                            onClick={() => setActiveTab('repayments')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'repayments'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Repayments
                        </button>
                    </nav>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'holdings' && renderHoldings()}
                        {activeTab === 'repayments' && renderExpectedRepayments()}
                    </>
                )}
            </div>
        </div>
    );
};

export default InvestorDashboard;
