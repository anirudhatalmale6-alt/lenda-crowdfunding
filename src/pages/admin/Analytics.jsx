import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getPlatformStats } from '../../store/slices/loanSlice';
import { CreditMonitoringPanel } from '../../components/reputation';
import analyticsService from '../../services/analyticsService';

function Analytics() {
    const dispatch = useDispatch();
    const { platformStats, isLoading: sliceLoading } = useSelector((state) => state.loans);
    const [timeRange, setTimeRange] = useState('30');
    const [activeTab, setActiveTab] = useState('overview');
    
    // Real analytics data
    const [analyticsData, setAnalyticsData] = useState({
        monthlyVolume: [],
        loanTypeDistribution: [],
        topBorrowers: [],
        topLenders: [],
    });
    const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
    const [analyticsError, setAnalyticsError] = useState(null);

    useEffect(() => {
        dispatch(getPlatformStats({ timeRange: parseInt(timeRange) }));
    }, [dispatch, timeRange]);

    // Fetch analytics data from API
    useEffect(() => {
        const fetchAnalyticsData = async () => {
            setIsLoadingAnalytics(true);
            setAnalyticsError(null);
            try {
                const [monthlyData, typeDist, borrowers, lenders] = await Promise.all([
                    analyticsService.getMonthlyVolume(6),
                    analyticsService.getLoanTypeDistribution(),
                    analyticsService.getTopBorrowers(5),
                    analyticsService.getTopLenders(5),
                ]);
                
                setAnalyticsData({
                    monthlyVolume: monthlyData?.data || [],
                    loanTypeDistribution: typeDist?.data || [],
                    topBorrowers: borrowers?.data || [],
                    topLenders: lenders?.data || [],
                });
            } catch (error) {
                console.error('Failed to fetch analytics data:', error);
                setAnalyticsError('Failed to load analytics data');
            } finally {
                setIsLoadingAnalytics(false);
            }
        };
        
        fetchAnalyticsData();
    }, [timeRange]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount || 0);
    };

    const formatNumber = (num) => {
        return new Intl.NumberFormat('en-US').format(num || 0);
    };

    // Fallback data if API doesn't return data
    const stats = platformStats || {
        totalVolume: 2450000,
        activeLoans: 342,
        totalUsers: 1250,
        lenderCount: 890,
        borrowerCount: 360,
        defaultRate: 2.3,
        avgInterestRate: 9.5,
        avgLoanSize: 15000,
        completionRate: 87.5,
        guaranteeFund: 450000,
        monthlyGrowth: 12.5,
        newUsersThisMonth: 45,
    };

    // Use API data or fallback to default values
    const loanTypeDistribution = analyticsData.loanTypeDistribution.length > 0
        ? analyticsData.loanTypeDistribution
        : [
            { name: 'Business', value: 45, color: 'bg-blue-500' },
            { name: 'Personal', value: 25, color: 'bg-green-500' },
            { name: 'Real Estate', value: 20, color: 'bg-purple-500' },
            { name: 'Equipment', value: 10, color: 'bg-orange-500' },
        ];

    const monthlyData = analyticsData.monthlyVolume.length > 0
        ? analyticsData.monthlyVolume.map(item => ({
            month: item.month,
            loans: item.loanCount,
            volume: item.volume,
        }))
        : [
            { month: 'Jan', loans: 45, volume: 680000 },
            { month: 'Feb', loans: 52, volume: 780000 },
            { month: 'Mar', loans: 48, volume: 720000 },
            { month: 'Apr', loans: 61, volume: 920000 },
            { month: 'May', loans: 55, volume: 830000 },
            { month: 'Jun', loans: 68, volume: 1020000 },
        ];

    const topBorrowers = analyticsData.topBorrowers.length > 0
        ? analyticsData.topBorrowers
        : [
            { id: 1, name: 'TechStart Inc', loans: 5, amount: 125000, status: 'Active' },
            { id: 2, name: 'Green Energy Co', loans: 3, amount: 85000, status: 'Active' },
            { id: 3, name: 'BuildRight LLC', loans: 4, amount: 72000, status: 'Active' },
        ];

    const topLenders = analyticsData.topLenders.length > 0
        ? analyticsData.topLenders
        : [
            { id: 1, name: 'Investor A', loans: 12, amount: 180000, roi: 14.5 },
            { id: 2, name: 'Investor B', loans: 8, amount: 145000, roi: 12.3 },
            { id: 3, name: 'Investor C', loans: 6, amount: 98000, roi: 11.8 },
        ];

    // Loading state
    const isLoading = sliceLoading || isLoadingAnalytics;

    // Skeleton component for loading state
    const MetricSkeleton = () => (
        <div className="card animate-pulse">
            <div className="p-4">
                <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-slate-200 rounded w-32"></div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Platform Analytics</h1>
                <div className="flex gap-2">
                    <select
                        className="input-field"
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                    >
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 90 days</option>
                        <option value="365">Last year</option>
                    </select>
                    <button className="btn-secondary">
                        📥 Export Report
                    </button>
                </div>
            </div>

            {/* Error message */}
            {analyticsError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {analyticsError}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b">
                {['overview', 'loans', 'users', 'financial', 'credit'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 font-medium capitalize transition-colors ${activeTab === tab
                                ? 'text-emerald-600 border-b-2 border-emerald-600'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {isLoading ? (
                            <>
                                <MetricSkeleton />
                                <MetricSkeleton />
                                <MetricSkeleton />
                                <MetricSkeleton />
                            </>
                        ) : (
                            <>
                                <div className="card">
                                    <div className="p-4">
                                        <p className="text-sm text-slate-500">Total Volume</p>
                                        <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalVolume)}</p>
                                        <p className="text-xs text-green-600 mt-1">↑ {stats.monthlyGrowth}% from last month</p>
                                    </div>
                                </div>
                                <div className="card">
                                    <div className="p-4">
                                        <p className="text-sm text-slate-500">Active Loans</p>
                                        <p className="text-2xl font-bold mt-1">{formatNumber(stats.activeLoans)}</p>
                                        <p className="text-xs text-slate-500 mt-1">{stats.completionRate}% completion rate</p>
                                    </div>
                                </div>
                                <div className="card">
                                    <div className="p-4">
                                        <p className="text-sm text-slate-500">Total Users</p>
                                        <p className="text-2xl font-bold mt-1">{formatNumber(stats.totalUsers)}</p>
                                        <p className="text-xs text-green-600 mt-1">+{stats.newUsersThisMonth} this month</p>
                                    </div>
                                </div>
                                <div className="card">
                                    <div className="p-4">
                                        <p className="text-sm text-slate-500">Default Rate</p>
                                        <p className={`text-2xl font-bold mt-1 ${stats.defaultRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                                            {stats.defaultRate}%
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">Industry avg: 4.2%</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Monthly Volume Chart */}
                        <div className="card">
                            <div className="p-6">
                                <h3 className="text-lg font-semibold mb-4">Monthly Loan Volume</h3>
                                <div className="space-y-3">
                                    {monthlyData.map((data) => (
                                        <div key={data.month} className="flex items-center gap-4">
                                            <span className="w-10 text-sm text-slate-500">{data.month}</span>
                                            <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                                                <div
                                                    className="bg-emerald-500 h-full rounded-full transition-all"
                                                    style={{ width: `${(data.volume / 1200000) * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="w-20 text-sm font-medium text-right">{formatCurrency(data.volume)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Loan Type Distribution */}
                        <div className="card">
                            <div className="p-6">
                                <h3 className="text-lg font-semibold mb-4">Loan Type Distribution</h3>
                                <div className="space-y-4">
                                    {loanTypeDistribution.map((type) => (
                                        <div key={type.name}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>{type.name}</span>
                                                <span className="font-medium">{type.value}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                <div
                                                    className={`${type.color} h-2 rounded-full`}
                                                    style={{ width: `${type.value}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Platform Health */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="card">
                            <div className="p-6">
                                <h3 className="font-semibold mb-2">Guarantee Fund</h3>
                                <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.guaranteeFund)}</p>
                                <p className="text-sm text-slate-500 mt-1">18.4% of total volume</p>
                            </div>
                        </div>
                        <div className="card">
                            <div className="p-6">
                                <h3 className="font-semibold mb-2">Average Interest Rate</h3>
                                <p className="text-3xl font-bold">{stats.avgInterestRate}%</p>
                                <p className="text-sm text-slate-500 mt-1">Competitive with market</p>
                            </div>
                        </div>
                        <div className="card">
                            <div className="p-6">
                                <h3 className="font-semibold mb-2">Average Loan Size</h3>
                                <p className="text-3xl font-bold">{formatCurrency(stats.avgLoanSize)}</p>
                                <p className="text-sm text-slate-500 mt-1">Per loan</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Loans Tab */}
            {activeTab === 'loans' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="card">
                            <div className="p-4 text-center">
                                <p className="text-2xl font-bold">{formatNumber(stats.activeLoans)}</p>
                                <p className="text-sm text-slate-500">Active Loans</p>
                            </div>
                        </div>
                        <div className="card">
                            <div className="p-4 text-center">
                                <p className="text-2xl font-bold">{stats.avgInterestRate}%</p>
                                <p className="text-sm text-slate-500">Avg Interest Rate</p>
                            </div>
                        </div>
                        <div className="card">
                            <div className="p-4 text-center">
                                <p className="text-2xl font-bold">{formatCurrency(stats.avgLoanSize)}</p>
                                <p className="text-sm text-slate-500">Avg Loan Amount</p>
                            </div>
                        </div>
                        <div className="card">
                            <div className="p-4 text-center">
                                <p className="text-2xl font-bold">{stats.completionRate}%</p>
                                <p className="text-sm text-slate-500">Repayment Rate</p>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Loan Performance by Type</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-3 px-4">Type</th>
                                            <th className="text-right py-3 px-4">Count</th>
                                            <th className="text-right py-3 px-4">Volume</th>
                                            <th className="text-right py-3 px-4">Avg Rate</th>
                                            <th className="text-right py-3 px-4">Default Rate</th>
                                            <th className="text-right py-3 px-4">Performance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loanTypeDistribution.map((type) => (
                                            <tr key={type.name} className="border-b">
                                                <td className="py-3 px-4">{type.name}</td>
                                                <td className="text-right py-3 px-4">{Math.floor(stats.activeLoans * type.value / 100)}</td>
                                                <td className="text-right py-3 px-4">{formatCurrency(stats.totalVolume * type.value / 100)}</td>
                                                <td className="text-right py-3 px-4">{stats.avgInterestRate - 1 + Math.random() * 2}%</td>
                                                <td className="text-right py-3 px-4">{(Math.random() * 3).toFixed(1)}%</td>
                                                <td className="text-right py-3 px-4">
                                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Good</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="card">
                            <div className="p-4 text-center">
                                <p className="text-2xl font-bold">{formatNumber(stats.totalUsers)}</p>
                                <p className="text-sm text-slate-500">Total Users</p>
                            </div>
                        </div>
                        <div className="card">
                            <div className="p-4 text-center">
                                <p className="text-2xl font-bold">{formatNumber(stats.lenderCount)}</p>
                                <p className="text-sm text-slate-500">Lenders</p>
                            </div>
                        </div>
                        <div className="card">
                            <div className="p-4 text-center">
                                <p className="text-2xl font-bold">{formatNumber(stats.borrowerCount)}</p>
                                <p className="text-sm text-slate-500">Borrowers</p>
                            </div>
                        </div>
                        <div className="card">
                            <div className="p-4 text-center">
                                <p className="text-2xl font-bold">{stats.newUsersThisMonth}</p>
                                <p className="text-sm text-slate-500">New This Month</p>
                            </div>
                        </div>
                    </div>

                    {/* Top Borrowers */}
                    <div className="card">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Top Borrowers</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-3 px-4">Rank</th>
                                            <th className="text-left py-3 px-4">Name</th>
                                            <th className="text-right py-3 px-4">Active Loans</th>
                                            <th className="text-right py-3 px-4">Total Borrowed</th>
                                            <th className="text-right py-3 px-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topBorrowers.map((borrower, index) => (
                                            <tr key={borrower.id} className="border-b">
                                                <td className="py-3 px-4">#{index + 1}</td>
                                                <td className="py-3 px-4 font-medium">{borrower.name}</td>
                                                <td className="text-right py-3 px-4">{borrower.loans}</td>
                                                <td className="text-right py-3 px-4">{formatCurrency(borrower.amount)}</td>
                                                <td className="text-right py-3 px-4">
                                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                                        {borrower.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Top Lenders */}
                    <div className="card">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Top Lenders by ROI</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-3 px-4">Rank</th>
                                            <th className="text-left py-3 px-4">Name</th>
                                            <th className="text-right py-3 px-4">Funded Loans</th>
                                            <th className="text-right py-3 px-4">Total Invested</th>
                                            <th className="text-right py-3 px-4">ROI</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topLenders.map((lender, index) => (
                                            <tr key={lender.id} className="border-b">
                                                <td className="py-3 px-4">#{index + 1}</td>
                                                <td className="py-3 px-4 font-medium">{lender.name}</td>
                                                <td className="text-right py-3 px-4">{lender.loans}</td>
                                                <td className="text-right py-3 px-4">{formatCurrency(lender.amount)}</td>
                                                <td className="text-right py-3 px-4">
                                                    <span className="text-green-600 font-medium">{lender.roi}%</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Financial Tab */}
            {activeTab === 'financial' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="card">
                            <div className="p-4 text-center">
                                <p className="text-2xl font-bold">{formatCurrency(stats.totalVolume)}</p>
                                <p className="text-sm text-slate-500">Total Volume</p>
                            </div>
                        </div>
                        <div className="card">
                            <div className="p-4 text-center">
                                <p className="text-2xl font-bold">{formatCurrency(stats.guaranteeFund)}</p>
                                <p className="text-sm text-slate-500">Guarantee Fund</p>
                            </div>
                        </div>
                        <div className="card">
                            <div className="p-4 text-center">
                                <p className="text-2xl font-bold">{formatCurrency(stats.totalVolume * 0.12)}</p>
                                <p className="text-sm text-slate-500">Interest Earned</p>
                            </div>
                        </div>
                        <div className="card">
                            <div className="p-4 text-center">
                                <p className="text-2xl font-bold">{formatCurrency(stats.totalVolume * 0.02)}</p>
                                <p className="text-sm text-slate-500">Default Write-offs</p>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Revenue Breakdown</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Origination Fees</span>
                                        <span className="font-medium">{formatCurrency(stats.totalVolume * 0.02)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Interest Spread</span>
                                        <span className="font-medium">{formatCurrency(stats.totalVolume * 0.015)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Late Fees</span>
                                        <span className="font-medium">{formatCurrency(stats.totalVolume * 0.005)}</span>
                                    </div>
                                    <div className="flex justify-between pt-3 border-t">
                                        <span className="font-semibold">Total Revenue</span>
                                        <span className="font-semibold text-green-600">{formatCurrency(stats.totalVolume * 0.04)}</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Guarantee Payouts</span>
                                        <span className="font-medium text-red-600">-{formatCurrency(stats.totalVolume * 0.015)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Operating Costs</span>
                                        <span className="font-medium">-{formatCurrency(stats.totalVolume * 0.01)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Reserve Fund Contribution</span>
                                        <span className="font-medium">-{formatCurrency(stats.totalVolume * 0.005)}</span>
                                    </div>
                                    <div className="flex justify-between pt-3 border-t">
                                        <span className="font-semibold">Net Profit</span>
                                        <span className="font-semibold text-green-600">{formatCurrency(stats.totalVolume * 0.01)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Credit Reputation Tab */}
            {activeTab === 'credit' && (
                <div className="space-y-6">
                    <CreditMonitoringPanel />
                </div>
            )}
        </div>
    );
}

export default Analytics;
