import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getMyFundedLoans } from '../../store/slices/loanSlice';
import { LoanReputationIndicator } from '../../components/reputation';
import { formatCurrency } from '../../utils/formatters';

function Portfolio() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isLoading } = useSelector((state) => state.loans);
    const { user } = useSelector((state) => state.auth);
    const [portfolioStats, setPortfolioStats] = useState({
        totalInvested: 0,
        totalEarnings: 0,
        activeLoans: 0,
        completedLoans: 0,
        defaultedLoans: 0,
    });
    const [fundedLoans, setFundedLoans] = useState([]);

    useEffect(() => {
        loadPortfolio();
    }, []);

    const loadPortfolio = async () => {
        try {
            const response = await dispatch(getMyFundedLoans()).unwrap();
            setFundedLoans(response.loans || []);

            // Calculate stats
            const stats = {
                totalInvested: 0,
                totalEarnings: 0,
                activeLoans: 0,
                completedLoans: 0,
                defaultedLoans: 0,
            };

            (response.loans || []).forEach(loan => {
                stats.totalInvested += loan.fundedAmount || 0;
                stats.totalEarnings += loan.earnedAmount || 0;
                if (loan.status === 'ACTIVE') stats.activeLoans++;
                if (loan.status === 'REPAID') stats.completedLoans++;
                if (loan.status === 'DEFAULTED' || loan.status === 'PLATFORM_SETTLED') stats.defaultedLoans++;
            });

            setPortfolioStats(stats);
        } catch (error) {
            console.error('Failed to load portfolio:', error);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            ACTIVE: 'bg-green-100 text-green-800',
            REPAID: 'bg-blue-100 text-blue-800',
            DEFAULTED: 'bg-red-100 text-red-800',
            PLATFORM_SETTLED: 'bg-orange-100 text-orange-800',
            FUNDED: 'bg-yellow-100 text-yellow-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const calculateROI = (earned, invested) => {
        if (invested === 0) return 0;
        return ((earned / invested) * 100).toFixed(2);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">My Portfolio</h1>

            {/* Portfolio Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                    <div className="p-6">
                        <h3 className="text-sm font-medium opacity-90">Total Invested</h3>
                        <p className="text-3xl font-bold mt-2">{formatCurrency(portfolioStats.totalInvested)}</p>
                    </div>
                </div>
                <div className="card bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                    <div className="p-6">
                        <h3 className="text-sm font-medium opacity-90">Total Earnings</h3>
                        <p className="text-3xl font-bold mt-2">{formatCurrency(portfolioStats.totalEarnings)}</p>
                        <p className="text-sm opacity-80 mt-1">
                            {calculateROI(portfolioStats.totalEarnings, portfolioStats.totalInvested)}% ROI
                        </p>
                    </div>
                </div>
                <div className="card bg-gradient-to-r from-purple-500 to-pink-600 text-white">
                    <div className="p-6">
                        <h3 className="text-sm font-medium opacity-90">Active Loans</h3>
                        <p className="text-3xl font-bold mt-2">{portfolioStats.activeLoans}</p>
                    </div>
                </div>
                <div className="card bg-gradient-to-r from-orange-500 to-red-600 text-white">
                    <div className="p-6">
                        <h3 className="text-sm font-medium opacity-90">Completed</h3>
                        <p className="text-3xl font-bold mt-2">{portfolioStats.completedLoans}</p>
                        <p className="text-sm opacity-80 mt-1">
                            {portfolioStats.defaultedLoans} defaulted
                        </p>
                    </div>
                </div>
            </div>

            {/* Funded Loans List */}
            {isLoading ? (
                <div className="card p-6 text-center">
                    <div className="animate-pulse">Loading portfolio...</div>
                </div>
            ) : fundedLoans.length === 0 ? (
                <div className="card p-6 text-center text-slate-500">
                    <p>You haven&apos;t funded any loans yet.</p>
                    <Link to="/dashboard/loans" className="text-emerald-600 hover:underline mt-2 inline-block">
                        Browse loan opportunities
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Funded Loans</h2>
                    <div className="grid gap-4">
                        {fundedLoans.map((loan) => (
                            <div key={loan.id} className="card hover:shadow-lg transition-shadow">
                                <div className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-lg font-semibold">Loan #{loan.id}</h3>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                                                    {loan.status}
                                                </span>
                                            </div>
                                            <p className="text-slate-500 mt-1">
                                                Borrower: {loan.borrower?.slice(0, 6)}...{loan.borrower?.slice(-4)}
                                            </p>
                                            {loan.borrowerId && (
                                                <div className="mt-2">
                                                    <LoanReputationIndicator
                                                        borrowerId={loan.borrowerId}
                                                        loanId={loan.id}
                                                        showFullDetails={false}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold">{formatCurrency(loan.fundedAmount)}</p>
                                            <p className="text-sm text-emerald-600">
                                                +{formatCurrency(loan.earnedAmount || 0)} earned
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
                                        <div>
                                            <p className="text-sm text-slate-500">Interest Rate</p>
                                            <p className="font-medium">{loan.interestRate}% APR</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Duration</p>
                                            <p className="font-medium">{loan.durationMonths} months</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Repaid</p>
                                            <p className="font-medium">{formatCurrency(loan.repaidAmount)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Remaining</p>
                                            <p className="font-medium">{formatCurrency(loan.loanAmount - loan.repaidAmount)}</p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    {loan.status === 'ACTIVE' && (
                                        <div className="mt-4">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>Repayment Progress</span>
                                                <span>{Math.round((loan.repaidAmount / loan.loanAmount) * 100)}%</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                <div
                                                    className="bg-emerald-500 h-2 rounded-full transition-all"
                                                    style={{ width: `${Math.min((loan.repaidAmount / loan.loanAmount) * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-4">
                                        <Link
                                            to={`/loans/${loan.id}`}
                                            className="btn-secondary"
                                        >
                                            View Details
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button
                    onClick={() => navigate('/dashboard/loans')}
                    className="card hover:shadow-lg transition-shadow p-6 text-left"
                >
                    <h3 className="font-semibold text-lg">Find New Investments</h3>
                    <p className="text-slate-500 mt-1">Browse available loan opportunities</p>
                </button>
                <button
                    onClick={() => navigate('/dashboard/portfolio/rebalancing')}
                    className="card hover:shadow-lg transition-shadow p-6 text-left"
                >
                    <h3 className="font-semibold text-lg">Rebalance Portfolio</h3>
                    <p className="text-slate-500 mt-1">Optimize your diversification</p>
                </button>
                <button
                    onClick={() => navigate('/dashboard/wallet')}
                    className="card hover:shadow-lg transition-shadow p-6 text-left"
                >
                    <h3 className="font-semibold text-lg">Manage Wallet</h3>
                    <p className="text-slate-500 mt-1">Add funds to your investment wallet</p>
                </button>
                <button
                    onClick={() => navigate('/dashboard/lender')}
                    className="card hover:shadow-lg transition-shadow p-6 text-left"
                >
                    <h3 className="font-semibold text-lg">View Dashboard</h3>
                    <p className="text-slate-500 mt-1">See your lending overview</p>
                </button>
            </div>
        </div>
    );
}

export default Portfolio;
