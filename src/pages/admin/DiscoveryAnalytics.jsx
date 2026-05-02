import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDiscoveryAnalytics } from '../../store/slices/discoverySlice';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

/**
 * Discovery Analytics Dashboard
 * Admin page to monitor recommendation engine performance
 */
const DiscoveryAnalytics = () => {
    const dispatch = useDispatch();
    const { analytics, isLoading } = useSelector((state) => state.discovery);

    const [timeRange, setTimeRange] = useState(30);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        dispatch(fetchDiscoveryAnalytics({ timeRange }));
    }, [dispatch, timeRange]);

    const handleTimeRangeChange = (range) => {
        setTimeRange(range);
    };

    // Mock data for demonstration (replace with real data from API)
    const mockData = {
        overview: {
            avgFundingTime: 4.2,
            avgFundingTimeChange: -12.5,
            engagementRate: 67.8,
            engagementRateChange: 8.3,
            recommendationAccuracy: 82.5,
            recommendationAccuracyChange: 5.2,
            loansFundedToday: 12,
            loansFundedTodayChange: 15.0,
            totalVolume: 2450000,
            totalVolumeChange: 22.5,
        },
        charts: {
            fundingTime: [
                { date: '2024-01', value: 5.2 },
                { date: '2024-02', value: 4.8 },
                { date: '2024-03', value: 4.5 },
                { date: '2024-04', value: 4.2 },
            ],
            engagement: [
                { date: '2024-01', value: 58 },
                { date: '2024-02', value: 62 },
                { date: '2024-03', value: 65 },
                { date: '2024-04', value: 68 },
            ],
        },
        topRecommendations: [
            { loanId: 'LN-001', title: 'Business Expansion Loan', conversionRate: 85, fundedAmount: 45000 },
            { loanId: 'LN-002', title: 'Equipment Financing', conversionRate: 78, fundedAmount: 32000 },
            { loanId: 'LN-003', title: 'Working Capital', conversionRate: 72, fundedAmount: 28000 },
            { loanId: 'LN-004', title: 'Inventory Purchase', conversionRate: 68, fundedAmount: 22000 },
            { loanId: 'LN-005', title: 'Vehicle Loan', conversionRate: 65, fundedAmount: 18000 },
        ],
        investorBehavior: {
            avgViewsPerSession: 8.5,
            avgTimeOnPage: '4:32',
            clickThroughRate: 34.2,
            investmentConversion: 22.8,
            topFilters: [
                { filter: 'Interest Rate', usage: 78 },
                { filter: 'Loan Size', usage: 65 },
                { filter: 'Risk Category', usage: 52 },
                { filter: 'Collateral Type', usage: 38 },
            ],
        },
    };

    const data = analytics || mockData;

    const renderOverview = () => (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm text-gray-500">Avg. Funding Time</div>
                        <div className={`text-xs font-medium ${data.overview.avgFundingTimeChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {data.overview.avgFundingTimeChange > 0 ? '+' : ''}{data.overview.avgFundingTimeChange}%
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{data.overview.avgFundingTime} days</div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm text-gray-500">Investor Engagement</div>
                        <div className={`text-xs font-medium ${data.overview.engagementRateChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {data.overview.engagementRateChange > 0 ? '+' : ''}{data.overview.engagementRateChange}%
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{data.overview.engagementRate}%</div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm text-gray-500">Recommendation Accuracy</div>
                        <div className={`text-xs font-medium ${data.overview.recommendationAccuracyChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {data.overview.recommendationAccuracyChange > 0 ? '+' : ''}{data.overview.recommendationAccuracyChange}%
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{data.overview.recommendationAccuracy}%</div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm text-gray-500">Loans Funded Today</div>
                        <div className={`text-xs font-medium ${data.overview.loansFundedTodayChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {data.overview.loansFundedTodayChange > 0 ? '+' : ''}{data.overview.loansFundedTodayChange}%
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{data.overview.loansFundedToday}</div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Funding Time Chart */}
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Average Loan Funding Time
                    </h3>
                    <div className="h-64 flex items-end justify-between gap-2">
                        {data.charts.fundingTime.map((item, index) => (
                            <div key={index} className="flex-1 flex flex-col items-center">
                                <div
                                    className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                                    style={{ height: `${(item.value / 6) * 100}%` }}
                                />
                                <div className="text-xs text-gray-500 mt-2">{item.date}</div>
                                <div className="text-sm font-medium text-gray-900">{item.value}d</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 text-sm text-gray-500">
                        Trend: {data.overview.avgFundingTimeChange < 0 ? '↓ Improving' : '↑ Declining'} ({Math.abs(data.overview.avgFundingTimeChange)}%)
                    </div>
                </div>

                {/* Engagement Rate Chart */}
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Investor Engagement Rate
                    </h3>
                    <div className="h-64 flex items-end justify-between gap-2">
                        {data.charts.engagement.map((item, index) => (
                            <div key={index} className="flex-1 flex flex-col items-center">
                                <div
                                    className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600"
                                    style={{ height: `${item.value}%` }}
                                />
                                <div className="text-xs text-gray-500 mt-2">{item.date}</div>
                                <div className="text-sm font-medium text-gray-900">{item.value}%</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 text-sm text-gray-500">
                        Trend: {data.overview.engagementRateChange > 0 ? '↑ Improving' : '↓ Declining'} ({Math.abs(data.overview.engagementRateChange)}%)
                    </div>
                </div>
            </div>

            {/* Volume Card */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm text-gray-500">Total Funded Volume</div>
                        <div className="text-3xl font-bold text-gray-900">
                            {formatCurrency(data.overview.totalVolume)}
                        </div>
                    </div>
                    <div className={`text-sm font-medium ${data.overview.totalVolumeChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {data.overview.totalVolumeChange > 0 ? '↑' : '↓'} {Math.abs(data.overview.totalVolumeChange)}% vs last period
                    </div>
                </div>
            </div>
        </div>
    );

    const renderRecommendations = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Top Performing Recommendations
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Loans with the highest recommendation conversion rates
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loan ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversion Rate</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Funded Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data.topRecommendations.map((loan, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-blue-600">
                                        {loan.loanId}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {loan.title}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="w-24 h-2 bg-gray-200 rounded-full mr-2">
                                                <div
                                                    className="h-full bg-green-500 rounded-full"
                                                    style={{ width: `${loan.conversionRate}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">
                                                {loan.conversionRate}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {formatCurrency(loan.fundedAmount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderBehavior = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="text-sm text-gray-500 mb-1">Avg. Views per Session</div>
                    <div className="text-2xl font-bold text-gray-900">
                        {data.investorBehavior.avgViewsPerSession}
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="text-sm text-gray-500 mb-1">Avg. Time on Page</div>
                    <div className="text-2xl font-bold text-gray-900">
                        {data.investorBehavior.avgTimeOnPage}
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="text-sm text-gray-500 mb-1">Click-Through Rate</div>
                    <div className="text-2xl font-bold text-gray-900">
                        {data.investorBehavior.clickThroughRate}%
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="text-sm text-gray-500 mb-1">Investment Conversion</div>
                    <div className="text-2xl font-bold text-gray-900">
                        {data.investorBehavior.investmentConversion}%
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Most Used Filters
                </h3>
                <div className="space-y-3">
                    {data.investorBehavior.topFilters.map((filter, index) => (
                        <div key={index} className="flex items-center">
                            <div className="w-32 text-sm text-gray-600">{filter.filter}</div>
                            <div className="flex-1 mx-4">
                                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full"
                                        style={{ width: `${filter.usage}%` }}
                                    />
                                </div>
                            </div>
                            <div className="w-16 text-sm font-medium text-gray-900 text-right">
                                {filter.usage}%
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const tabs = [
        { id: 'overview', label: 'Overview', content: renderOverview },
        { id: 'recommendations', label: 'Top Recommendations', content: renderRecommendations },
        { id: 'behavior', label: 'Investor Behavior', content: renderBehavior },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Discovery Engine Analytics
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Monitor recommendation engine performance and investor behavior
                            </p>
                        </div>
                        {/* Time Range Selector */}
                        <div className="flex items-center gap-2">
                            {[7, 30, 90].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => handleTimeRangeChange(range)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        timeRange === range
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {range}D
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <nav className="flex space-x-8">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    tabs.find((t) => t.id === activeTab)?.content()
                )}
            </div>
        </div>
    );
};

export default DiscoveryAnalytics;
