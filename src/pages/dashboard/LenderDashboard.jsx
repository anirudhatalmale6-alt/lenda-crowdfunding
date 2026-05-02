import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Wallet,
    TrendingUp,
    PieChart,
    ArrowRight,
    Plus,
    BarChart3,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { LoanReputationIndicator } from '../../components/reputation';
import PlatformStabilityPanel from '../../components/risk/PlatformStabilityPanel';
import MilestoneTimeline from '../../components/dashboard/MilestoneTimeline';
import { getMyFundedLoans } from '../../store/slices/loanSlice';
import { getTransactionHistory } from '../../store/slices/walletSlice';
import {
    buildLenderMilestones,
    buildLenderTransactionTimeline,
    normalizeLoan,
} from '../../utils/dashboardTransactions';

function LenderDashboard() {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { myFundedLoans } = useSelector((state) => state.loans);
    const { transactionHistory } = useSelector((state) => state.wallet);

    useEffect(() => {
        dispatch(getMyFundedLoans());
        dispatch(getTransactionHistory());
    }, [dispatch]);

    const fundedLoans = (myFundedLoans || []).map(normalizeLoan);
    const investmentMilestones = buildLenderMilestones(fundedLoans);
    const investorTransactions = buildLenderTransactionTimeline(fundedLoans, transactionHistory);
    const topInvestments = fundedLoans.slice(0, 3).map((loan) => ({
        id: loan.id,
        title: loan.title,
        borrowerId: loan.borrowerId,
        invested: loan.fundedAmount || loan.loanAmount,
        earned: loan.earnedAmount,
        return: loan.loanAmount ? (((loan.earnedAmount || 0) / (loan.fundedAmount || loan.loanAmount || 1)) * 100).toFixed(1) : 0,
        status: loan.status,
    }));

    const totalInvested = fundedLoans.reduce((total, loan) => total + (loan.fundedAmount || loan.loanAmount), 0);
    const totalEarned = fundedLoans.reduce((total, loan) => total + (loan.earnedAmount || 0), 0);
    const activeInvestments = fundedLoans.filter((loan) => loan.status === 'ACTIVE').length;
    const averageReturn = totalInvested > 0 ? ((totalEarned / totalInvested) * 100).toFixed(1) : '0.0';

    const stats = {
        totalInvested,
        totalEarned,
        activeInvestments,
        averageReturn,
    };

    const investorSummary = {
        pendingInflows: investmentMilestones
            .filter((item) => item.status === 'pending')
            .reduce((total, item) => total + item.amount, 0),
        receivedInflows: investorTransactions
            .filter((item) => item.direction === 'inflow' && item.status === 'completed')
            .reduce((total, item) => total + item.amount, 0),
    };

    return (
        <div className="space-y-6">
            {/* Welcome */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Welcome back, {user?.name || 'Lender'}!
                    </h1>
                    <p className="text-slate-600">Here&apos;s your investment overview</p>
                </div>
                <Link to="/dashboard/loans" className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Find Loans
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="stat-card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                            <Wallet className="w-6 h-6 text-primary-600" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">
                        {formatCurrency(stats.totalInvested)}
                    </div>
                    <div className="text-sm text-slate-500">Total Invested</div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-emerald-600" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">
                        {formatCurrency(stats.totalEarned)}
                    </div>
                    <div className="text-sm text-slate-500">Total Earned</div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <PieChart className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">{stats.activeInvestments}</div>
                    <div className="text-sm text-slate-500">Active Investments</div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                            <BarChart3 className="w-6 h-6 text-amber-600" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">{stats.averageReturn}%</div>
                    <div className="text-sm text-slate-500">Avg. Return</div>
                </div>
            </div>

            {/* Platform Stability for Lenders */}
            <PlatformStabilityPanel />

            {/* Top Investments */}
            <div className="card">
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900">Top Investments</h2>
                        <Link
                            to="/dashboard/portfolio"
                            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        >
                            View All <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Loan
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Borrower Credit
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Invested
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Earned
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Return
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {topInvestments.map((investment) => (
                                <tr key={investment.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{investment.title}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {investment.borrowerId && (
                                            <LoanReputationIndicator
                                                borrowerId={investment.borrowerId}
                                                loanId={investment.id}
                                                showFullDetails={false}
                                            />
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-600">
                                        {formatCurrency(investment.invested)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-emerald-600">
                                        {formatCurrency(investment.earned)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-600">
                                        {investment.return}%
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="badge-success">{investment.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.15fr,0.85fr] gap-6">
                <MilestoneTimeline
                    title="Investor Cashflow Milestones"
                    subtitle="Watch each investment move from funding to expected and received repayments."
                    items={investmentMilestones}
                    emptyMessage="Investment milestones will appear once you back your first loan."
                />

                <div className="card p-6">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Portfolio Cashflow Snapshot</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Pending inflows, realized receipts, and the next review point for your lender account.
                            </p>
                        </div>
                        <Link to="/dashboard/lender/transactions" className="text-sm text-primary-600 hover:text-primary-700">
                            View all
                        </Link>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                        <div className="rounded-2xl bg-blue-50 p-4">
                            <div className="text-sm text-blue-700">Pending repayments</div>
                            <div className="mt-2 text-2xl font-bold text-slate-900">
                                {formatCurrency(investorSummary.pendingInflows)}
                            </div>
                            <div className="mt-1 text-sm text-slate-600">Next inflow due May 7, 2026</div>
                        </div>
                        <div className="rounded-2xl bg-emerald-50 p-4">
                            <div className="text-sm text-emerald-700">Repayments received</div>
                            <div className="mt-2 text-2xl font-bold text-slate-900">
                                {formatCurrency(investorSummary.receivedInflows)}
                            </div>
                            <div className="mt-1 text-sm text-slate-600">Across wallet funding and loan cashflows</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                            <div className="text-sm text-slate-600">Next milestone</div>
                            <div className="mt-2 text-2xl font-bold text-slate-900">Rebalance</div>
                            <div className="mt-1 text-sm text-slate-600">Window opens on May 20, 2026</div>
                        </div>
                    </div>
                </div>
            </div>

            <MilestoneTimeline
                title="Investor Transaction Timeline"
                subtitle="Every wallet funding event, deployment, and repayment tied to your lending activity."
                items={investorTransactions.slice(0, 6)}
                emptyMessage="Investor transactions will appear here after your first funding event."
            />

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link
                    to="/dashboard/loans"
                    className="card p-6 card-hover flex items-center gap-4"
                >
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                        <Plus className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <div className="font-medium text-slate-900">Find Loans</div>
                        <div className="text-sm text-slate-500">Browse opportunities</div>
                    </div>
                </Link>

                <Link
                    to="/dashboard/portfolio"
                    className="card p-6 card-hover flex items-center gap-4"
                >
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <PieChart className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <div className="font-medium text-slate-900">View Portfolio</div>
                        <div className="text-sm text-slate-500">Track investments</div>
                    </div>
                </Link>

                <Link
                    to="/dashboard/wallet"
                    className="card p-6 card-hover flex items-center gap-4"
                >
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <div className="font-medium text-slate-900">Manage Funds</div>
                        <div className="text-sm text-slate-500">Add or withdraw</div>
                    </div>
                </Link>
            </div>
        </div>
    );
}

export default LenderDashboard;
