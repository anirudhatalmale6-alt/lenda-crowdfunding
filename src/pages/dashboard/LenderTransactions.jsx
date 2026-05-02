import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Download, Filter } from 'lucide-react';
import { getMyFundedLoans } from '../../store/slices/loanSlice';
import { getTransactionHistory } from '../../store/slices/walletSlice';
import MilestoneTimeline from '../../components/dashboard/MilestoneTimeline';
import {
    buildLenderMilestones,
    buildLenderTransactionTimeline,
    downloadMilestonesCsv,
    normalizeLoan,
} from '../../utils/dashboardTransactions';

function LenderTransactions() {
    const dispatch = useDispatch();
    const { myFundedLoans, isLoading: loansLoading } = useSelector((state) => state.loans);
    const { transactionHistory, isLoading: walletLoading } = useSelector((state) => state.wallet);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        dispatch(getMyFundedLoans());
        dispatch(getTransactionHistory());
    }, [dispatch]);

    const loans = (myFundedLoans || []).map(normalizeLoan);
    const milestones = buildLenderMilestones(loans);
    const transactions = buildLenderTransactionTimeline(loans, transactionHistory);

    const applyFilter = (items) => {
        if (filter === 'all') return items;
        if (filter === 'pending') return items.filter((item) => item.status === 'pending' || item.status === 'overdue');
        if (filter === 'completed') return items.filter((item) => item.status === 'completed');
        if (filter === 'inflow') return items.filter((item) => item.direction === 'inflow');
        if (filter === 'outflow') return items.filter((item) => item.direction === 'outflow');
        return items;
    };

    const filteredMilestones = applyFilter(milestones);
    const filteredTransactions = applyFilter(transactions);
    const isLoading = loansLoading || walletLoading;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Investor Transactions</h1>
                    <p className="mt-1 text-slate-600">
                        Review every investment deployment, expected repayment, and realized investor cashflow.
                    </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative">
                        <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <select className="input-field min-w-[180px] pl-10" value={filter} onChange={(event) => setFilter(event.target.value)}>
                            <option value="all">All activity</option>
                            <option value="pending">Pending only</option>
                            <option value="completed">Completed only</option>
                            <option value="inflow">Inflows only</option>
                            <option value="outflow">Outflows only</option>
                        </select>
                    </div>
                    <button
                        className="btn-secondary flex items-center gap-2"
                        onClick={() => downloadMilestonesCsv([...filteredMilestones, ...filteredTransactions], 'lender-transactions.csv')}
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card p-5">
                    <div className="text-sm text-slate-500">Funded positions</div>
                    <div className="mt-2 text-3xl font-bold text-slate-900">{loans.length}</div>
                </div>
                <div className="card p-5">
                    <div className="text-sm text-slate-500">Pending inflows</div>
                    <div className="mt-2 text-3xl font-bold text-slate-900">
                        {milestones.filter((item) => item.status === 'pending' || item.status === 'overdue').length}
                    </div>
                </div>
                <div className="card p-5">
                    <div className="text-sm text-slate-500">Completed cashflow events</div>
                    <div className="mt-2 text-3xl font-bold text-slate-900">
                        {transactions.filter((item) => item.status === 'completed').length}
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="card p-6 text-center text-slate-500">Loading investor activity...</div>
            ) : (
                <div className="space-y-6">
                    <MilestoneTimeline
                        title="Repayment Pipeline"
                        subtitle="Expected and received investor repayments across all funded positions."
                        items={filteredMilestones}
                        emptyMessage="No investor milestones match the current filter."
                    />
                    <MilestoneTimeline
                        title="Transaction History"
                        subtitle="Wallet funding, deployments, and lender repayment events."
                        items={filteredTransactions}
                        emptyMessage="No investor transactions match the current filter."
                    />
                </div>
            )}
        </div>
    );
}

export default LenderTransactions;