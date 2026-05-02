import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Wallet,
    TrendingUp,
    Clock,
    AlertCircle,
    ArrowRight,
    Plus,
    FileText,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { BorrowerReputationCard, CreditImprovementPanel } from '../../components/reputation';
import BorrowerProtectionNotification from '../../components/risk/BorrowerProtectionNotification';
import MilestoneTimeline from '../../components/dashboard/MilestoneTimeline';
import { getMyLoans } from '../../store/slices/loanSlice';
import { getTransactionHistory } from '../../store/slices/walletSlice';
import { selectCreditScore } from '../../store/slices/creditReputationSlice';
import {
    buildBorrowerRepaymentMilestones,
    buildBorrowerTransactionTimeline,
    normalizeLoan,
} from '../../utils/dashboardTransactions';

function BorrowerDashboard() {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { myLoans } = useSelector((state) => state.loans);
    const { transactionHistory } = useSelector((state) => state.wallet);
    const creditScore = useSelector(selectCreditScore);

    useEffect(() => {
        dispatch(getMyLoans());
        dispatch(getTransactionHistory());
    }, [dispatch]);

    const normalizedLoans = (myLoans || []).map(normalizeLoan);
    const repaymentMilestones = buildBorrowerRepaymentMilestones(normalizedLoans);
    const borrowerTransactions = buildBorrowerTransactionTimeline(normalizedLoans, transactionHistory);
    const recentLoans = normalizedLoans.slice(0, 3).map((loan) => {
        const nextPendingRepayment = repaymentMilestones.find(
            (item) => item.meta?.includes(`Loan ${loan.id}`) && (item.status === 'pending' || item.status === 'overdue')
        );

        return {
            id: loan.id,
            title: loan.title,
            amount: loan.loanAmount,
            status: loan.status,
            nextPayment: nextPendingRepayment?.amount || 0,
        };
    });

    const nextRepayment = repaymentMilestones.find((item) => item.status === 'pending' || item.status === 'overdue');

    const stats = {
        activeLoans: normalizedLoans.filter((loan) => loan.status === 'ACTIVE').length,
        totalBorrowed: normalizedLoans.reduce((total, loan) => total + loan.loanAmount, 0),
        nextRepayment: nextRepayment?.amount || 0,
        nextDueDate: nextRepayment ? new Date(nextRepayment.date).toISOString().split('T')[0] : 'No due date',
    };

    const repaymentSummary = {
        pendingCount: repaymentMilestones.filter((item) => item.status === 'pending').length,
        completedCount: repaymentMilestones.filter((item) => item.status === 'completed').length,
        pendingAmount: repaymentMilestones
            .filter((item) => item.status === 'pending')
            .reduce((total, item) => total + item.amount, 0),
    };

    return (
        <div className="space-y-6">
            {/* Welcome */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Welcome back, {user?.name || 'Borrower'}!
                    </h1>
                    <p className="text-slate-600">Here&apos;s your borrowing overview</p>
                </div>
                <Link to="/dashboard/create-loan" className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Request New Loan
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="stat-card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                            <FileText className="w-6 h-6 text-primary-600" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">{stats.activeLoans}</div>
                    <div className="text-sm text-slate-500">Active Loans</div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <Wallet className="w-6 h-6 text-emerald-600" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">
                        {formatCurrency(stats.totalBorrowed)}
                    </div>
                    <div className="text-sm text-slate-500">Total Borrowed</div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-amber-600" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">
                        {formatCurrency(stats.nextRepayment)}
                    </div>
                    <div className="text-sm text-slate-500">Next Payment</div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">{stats.nextDueDate}</div>
                    <div className="text-sm text-slate-500">Next Due Date</div>
                </div>
            </div>

            {/* Borrower Protection Notification */}
            <BorrowerProtectionNotification />

            {/* Credit Reputation Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Credit Score Card */}
                <div>
                    {user?.id ? (
                        <BorrowerReputationCard 
                            borrowerId={user.id} 
                            showDetails={true}
                            compact={false}
                        />
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                            <h2 className="text-lg font-semibold text-slate-900 mb-4">Credit Reputation</h2>
                            <p className="text-slate-500">Login to view your credit score</p>
                        </div>
                    )}
                </div>
                
                {/* Credit Improvement Panel */}
                <div>
                    {user?.id ? (
                        <CreditImprovementPanel 
                            creditScore={creditScore}
                            statistics={creditScore?.statistics || null}
                        />
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                            <h2 className="text-lg font-semibold text-slate-900 mb-4">Improve Your Credit</h2>
                            <p className="text-slate-500">Login to get personalized recommendations</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Active Loans */}
            <div className="card">
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900">Active Loans</h2>
                        <Link
                            to="/dashboard/my-loans"
                            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        >
                            View All <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
                <div className="divide-y divide-slate-100">
                    {recentLoans.map((loan) => (
                        <div key={loan.id} className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-primary-600" />
                                </div>
                                <div>
                                    <div className="font-medium text-slate-900">{loan.title}</div>
                                    <div className="text-sm text-slate-500">
                                        {formatCurrency(loan.amount)} • {loan.status}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-medium text-slate-900">
                                    {formatCurrency(loan.nextPayment)}/mo
                                </div>
                                <div className="text-sm text-slate-500">Next payment</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.15fr,0.85fr] gap-6">
                <MilestoneTimeline
                    title="Repayment Milestones"
                    subtitle="Track pending installments, next due dates, and repayments already completed."
                    items={repaymentMilestones}
                    emptyMessage="Your repayment schedule will appear here once a loan is active."
                />

                <div className="card p-6">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Repayment Snapshot</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Quick status for what still needs action on your borrowing side.
                            </p>
                        </div>
                        <Link to="/dashboard/borrower/transactions" className="text-sm text-primary-600 hover:text-primary-700">
                            View all
                        </Link>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                        <div className="rounded-2xl bg-amber-50 p-4">
                            <div className="text-sm text-amber-700">Pending repayments</div>
                            <div className="mt-2 text-2xl font-bold text-slate-900">{repaymentSummary.pendingCount}</div>
                            <div className="mt-1 text-sm text-slate-600">
                                {formatCurrency(repaymentSummary.pendingAmount)} waiting to settle
                            </div>
                        </div>
                        <div className="rounded-2xl bg-emerald-50 p-4">
                            <div className="text-sm text-emerald-700">Completed repayments</div>
                            <div className="mt-2 text-2xl font-bold text-slate-900">{repaymentSummary.completedCount}</div>
                            <div className="mt-1 text-sm text-slate-600">Latest payment cleared on Apr 20, 2026</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                            <div className="text-sm text-slate-600">Next repayment window</div>
                            <div className="mt-2 text-2xl font-bold text-slate-900">5 days</div>
                            <div className="mt-1 text-sm text-slate-600">Business Expansion installment due first</div>
                        </div>
                    </div>
                </div>
            </div>

            <MilestoneTimeline
                title="Loan Transaction Timeline"
                subtitle="Every disbursement, repayment, and pending settlement for your borrower account."
                items={borrowerTransactions.slice(0, 6)}
                emptyMessage="Borrower transactions will appear here after your first loan event."
            />

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link
                    to="/dashboard/create-loan"
                    className="card p-6 card-hover flex items-center gap-4"
                >
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                        <Plus className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <div className="font-medium text-slate-900">Request New Loan</div>
                        <div className="text-sm text-slate-500">Apply for funding</div>
                    </div>
                </Link>

                <Link
                    to="/dashboard/repayments"
                    className="card p-6 card-hover flex items-center gap-4"
                >
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <div className="font-medium text-slate-900">Make Payment</div>
                        <div className="text-sm text-slate-500">Repay your loans</div>
                    </div>
                </Link>

                <Link
                    to="/dashboard/collateral"
                    className="card p-6 card-hover flex items-center gap-4"
                >
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <div className="font-medium text-slate-900">Manage Collateral</div>
                        <div className="text-sm text-slate-500">View your assets</div>
                    </div>
                </Link>
            </div>
        </div>
    );
}

export default BorrowerDashboard;
