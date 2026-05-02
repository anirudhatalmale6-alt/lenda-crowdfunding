import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import {
    getDefaultedLoans,
    initiateDefaultProceedings,
    processGuaranteeClaim,
    sendToRecovery
} from '../../store/slices/loanSlice';
import {
    getWorkflowProgressionStatus,
    triggerWorkflowProgression,
    getGracePeriodConfig,
    updateGracePeriodConfig
} from '../../services/riskService';
import GracePeriodConfig from '../../components/admin/GracePeriodConfig';

function DefaultManagement() {
    const dispatch = useDispatch();
    const { defaultedLoans, isLoading } = useSelector((state) => state.loans);
    const { reserveFund } = useSelector((state) => state.wallet);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [actionType, setActionType] = useState(null);
    const [notes, setNotes] = useState('');
    const [showActionModal, setShowActionModal] = useState(false);
    const [filter, setFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('defaults'); // 'defaults', 'gracePeriod', 'automation'
    const [workflowStatus, setWorkflowStatus] = useState(null);

    useEffect(() => {
        dispatch(getDefaultedLoans());
    }, [dispatch]);

    // Load workflow progression status
    useEffect(() => {
        const loadWorkflowStatus = async () => {
            try {
                const status = await getWorkflowProgressionStatus();
                setWorkflowStatus(status);
            } catch (error) {
                console.error('Error loading workflow status:', error);
            }
        };
        if (activeTab === 'automation') {
            loadWorkflowStatus();
        }
    }, [activeTab]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount || 0);
    };

    const getStatusColor = (status) => {
        const colors = {
            DEFAULTED: 'bg-red-100 text-red-800',
            IN_RECOVERY: 'bg-orange-100 text-orange-800',
            GUARANTEE_CLAIMED: 'bg-yellow-100 text-yellow-800',
            RECOVERED: 'bg-green-100 text-green-800',
            WRITE_OFF: 'bg-slate-100 text-slate-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const handleAction = async () => {
        if (!selectedLoan || !actionType) return;

        try {
            switch (actionType) {
                case 'initiate':
                    await dispatch(initiateDefaultProceedings({
                        loanId: selectedLoan.id,
                        notes
                    })).unwrap();
                    toast.success('Default proceedings initiated');
                    break;
                case 'guarantee':
                    await dispatch(processGuaranteeClaim({
                        loanId: selectedLoan.id
                    })).unwrap();
                    toast.success('Guarantee claim processed');
                    break;
                case 'recovery':
                    await dispatch(sendToRecovery({
                        loanId: selectedLoan.id,
                        notes
                    })).unwrap();
                    toast.success('Sent to recovery marketplace');
                    break;
                default:
                    break;
            }
            setShowActionModal(false);
            setSelectedLoan(null);
            setNotes('');
            dispatch(getDefaultedLoans());
        } catch (error) {
            toast.error(error.message || 'Action failed');
        }
    };

    const openActionModal = (loan, type) => {
        setSelectedLoan(loan);
        setActionType(type);
        setShowActionModal(true);
    };

    const filteredLoans = defaultedLoans?.filter(loan => {
        if (filter === 'all') return true;
        return loan.status === filter;
    }) || [];

    const getStats = () => {
        if (!defaultedLoans) return {
            total: 0,
            totalValue: 0,
            guaranteeClaims: 0,
            inRecovery: 0,
            recoverable: 0
        };

        return {
            total: defaultedLoans.length,
            totalValue: defaultedLoans.reduce((sum, l) => sum + (l.loanAmount || 0), 0),
            guaranteeClaims: defaultedLoans.filter(l => l.status === 'GUARANTEE_CLAIMED').length,
            inRecovery: defaultedLoans.filter(l => l.status === 'IN_RECOVERY').length,
            recoverable: defaultedLoans.filter(l => l.hasCollateral && l.collateralValue > 0).length,
        };
    };

    const stats = getStats();
    const guaranteeCoverage = reserveFund?.balance ?
        Math.min((reserveFund.balance / stats.totalValue) * 100, 100) : 0;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Default Management</h1>
                <button
                    onClick={() => dispatch(getDefaultedLoans())}
                    className="btn-secondary"
                >
                    🔄 Refresh
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-slate-200 pb-2">
                <button
                    onClick={() => setActiveTab('defaults')}
                    className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                        activeTab === 'defaults'
                            ? 'bg-emerald-500 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                    ⚠️ Default Loans
                </button>
                <button
                    onClick={() => setActiveTab('gracePeriod')}
                    className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                        activeTab === 'gracePeriod'
                            ? 'bg-emerald-500 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                    ⏰ Grace Period
                </button>
                <button
                    onClick={() => setActiveTab('automation')}
                    className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                        activeTab === 'automation'
                            ? 'bg-emerald-500 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                    🤖 Automation
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'defaults' && (
            <>
            <div className="card bg-red-50 border border-red-200">
                <div className="p-4 flex items-center gap-4">
                    <span className="text-3xl">⚠️</span>
                    <div>
                        <p className="font-semibold text-red-800">Active Defaults Require Attention</p>
                        <p className="text-sm text-red-600">
                            {stats.total} loans totaling {formatCurrency(stats.totalValue)} are in default status.
                            Immediate action may be required for guarantee claims and recovery.
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold">{stats.total}</p>
                        <p className="text-sm text-slate-500">Total Defaults</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalValue)}</p>
                        <p className="text-sm text-slate-500">Total Value</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-yellow-600">{stats.guaranteeClaims}</p>
                        <p className="text-sm text-slate-500">Guarantee Claims</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-orange-600">{stats.inRecovery}</p>
                        <p className="text-sm text-slate-500">In Recovery</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{stats.recoverable}</p>
                        <p className="text-sm text-slate-500">With Collateral</p>
                    </div>
                </div>
            </div>

            {/* Reserve Fund Status */}
            <div className="card">
                <div className="p-6">
                    <h2 className="text-lg font-semibold mb-4">LENDA Guarantee Reserve Fund</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <p className="text-sm text-slate-500">Current Balance</p>
                            <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(reserveFund?.balance || 0)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Coverage Ratio</p>
                            <div className="flex items-center gap-2">
                                <p className={`text-2xl font-bold ${guaranteeCoverage >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                                    {guaranteeCoverage.toFixed(1)}%
                                </p>
                                <span className={`text-xs px-2 py-1 rounded-full ${guaranteeCoverage >= 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    {guaranteeCoverage >= 50 ? '✓ Healthy' : '⚠ Low'}
                                </span>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Required (80% coverage)</p>
                            <p className="text-2xl font-bold">
                                {formatCurrency(stats.totalValue * 0.8)}
                            </p>
                        </div>
                    </div>

                    {/* Coverage Progress Bar */}
                    <div className="mt-4">
                        <div className="w-full bg-slate-200 rounded-full h-3">
                            <div
                                className={`h-3 rounded-full transition-all ${guaranteeCoverage >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${guaranteeCoverage}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Reserve fund covers {guaranteeCoverage.toFixed(1)}% of defaulted loan value
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2">
                {['all', 'DEFAULTED', 'IN_RECOVERY', 'GUARANTEE_CLAIMED', 'RECOVERED'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === status
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
                    </button>
                ))}
            </div>

            {/* Defaulted Loans List */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Defaulted Loans</h2>

                {isLoading ? (
                    <div className="card p-6 text-center">
                        <div className="animate-pulse">Loading defaulted loans...</div>
                    </div>
                ) : filteredLoans.length === 0 ? (
                    <div className="card p-6 text-center text-slate-500">
                        <p>No defaulted loans found.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredLoans.map((loan) => (
                            <div key={loan.id} className="card hover:shadow-lg transition-shadow border-l-4 border-red-500">
                                <div className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-lg font-semibold">Loan #{loan.id}</h3>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                                                    {loan.status?.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                            <p className="text-slate-500 mt-1">
                                                Borrower: {loan.borrowerName || 'Anonymous'} |
                                                Defaulted: {loan.defaultedAt ? new Date(loan.defaultedAt).toLocaleDateString() : 'N/A'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold">{formatCurrency(loan.loanAmount)}</p>
                                            <p className="text-sm text-slate-500">Principal Outstanding</p>
                                        </div>
                                    </div>

                                    {/* Default Details */}
                                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500">Amount Defaulted</p>
                                            <p className="font-semibold text-red-600">{formatCurrency(loan.outstandingAmount)}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500">Days in Default</p>
                                            <p className="font-semibold">{loan.daysInDefault || 0}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500">Guarantee Claim</p>
                                            <p className={`font-semibold ${loan.guaranteeClaimed ? 'text-green-600' : 'text-yellow-600'}`}>
                                                {loan.guaranteeClaimed ? 'Claimed' : 'Pending'}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500">Collateral Value</p>
                                            <p className={`font-semibold ${loan.collateralValue > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                                                {loan.collateralValue > 0 ? formatCurrency(loan.collateralValue) : 'None'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Lender Impact */}
                                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-sm text-yellow-800">
                                            <strong>Impact:</strong> {loan.lenderCount || 0} lender(s) affected |
                                            Total repayment due: {formatCurrency(loan.totalDueToLenders)} |
                                            {loan.guaranteeClaimed ? ' Guarantee claimed' : ' Guarantee not yet claimed'}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-4 flex gap-3 flex-wrap">
                                        {loan.status === 'DEFAULTED' && !loan.guaranteeClaimed && (
                                            <button
                                                onClick={() => openActionModal(loan, 'guarantee')}
                                                className="btn-primary"
                                            >
                                                🛡️ Process Guarantee Claim
                                            </button>
                                        )}
                                        {loan.status === 'DEFAULTED' && (
                                            <button
                                                onClick={() => openActionModal(loan, 'initiate')}
                                                className="btn-secondary"
                                            >
                                                📋 Initiate Proceedings
                                            </button>
                                        )}
                                        {(loan.status === 'DEFAULTED' || loan.status === 'GUARANTEE_CLAIMED') && loan.collateralValue > 0 && (
                                            <button
                                                onClick={() => openActionModal(loan, 'recovery')}
                                                className="btn-secondary text-orange-600 border-orange-300 hover:bg-orange-50"
                                            >
                                                🔨 Send to Recovery
                                            </button>
                                        )}
                                        <button className="btn-secondary">
                                            Contact Borrower
                                        </button>
                                        <button className="btn-secondary">
                                            View Full Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            </>
            )}

            {/* Grace Period Config Tab */}
            {activeTab === 'gracePeriod' && (
                <GracePeriodConfig />
            )}

            {/* Automation Tab */}
            {activeTab === 'automation' && (
                <div className="card">
                    <div className="p-6">
                        <h2 className="text-xl font-bold mb-4">Workflow Automation Status</h2>
                        {workflowStatus ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-lg">
                                        <p className="text-sm text-slate-500">Active Workflows</p>
                                        <p className="text-2xl font-bold">{workflowStatus.activeWorkflows || 0}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-lg">
                                        <p className="text-sm text-slate-500">Pending Actions</p>
                                        <p className="text-2xl font-bold">{workflowStatus.pendingActions || 0}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-lg">
                                        <p className="text-sm text-slate-500">Completed Today</p>
                                        <p className="text-2xl font-bold">{workflowStatus.completedToday || 0}</p>
                                    </div>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                    <p className="text-blue-800">
                                        <strong>Automation Enabled:</strong> Default workflows are automatically 
                                        progressed based on configured timeframes. Use the cron service to 
                                        trigger automatic checks.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-500">Loading workflow status...</p>
                        )}
                    </div>
                </div>
            )}

            {/* Action Modal */}
            {showActionModal && selectedLoan && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="card max-w-md w-full mx-4">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">
                                {actionType === 'guarantee' && 'Process Guarantee Claim'}
                                {actionType === 'initiate' && 'Initiate Default Proceedings'}
                                {actionType === 'recovery' && 'Send to Recovery Marketplace'}
                            </h2>
                            <div className="space-y-4">
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-sm text-slate-500">Loan ID</p>
                                    <p className="font-semibold">#{selectedLoan.id}</p>
                                    <p className="text-sm text-slate-500 mt-2">Amount</p>
                                    <p className="font-semibold">{formatCurrency(selectedLoan.outstandingAmount)}</p>
                                </div>

                                {actionType !== 'guarantee' && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Notes</label>
                                        <textarea
                                            className="input-field w-full h-24"
                                            placeholder="Add notes about this action..."
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                        />
                                    </div>
                                )}

                                {actionType === 'guarantee' && (
                                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                                        <p className="text-sm text-yellow-800">
                                            This will trigger a payout from the LENDA Guarantee Reserve Fund
                                            to reimburse affected lenders. The reserve fund balance will be reduced accordingly.
                                        </p>
                                    </div>
                                )}

                                {actionType === 'recovery' && (
                                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                                        <p className="text-sm text-orange-800">
                                            The collateral will be listed on the Recovery Marketplace
                                            to recover the outstanding amount. Any proceeds will be used to replenish the reserve fund.
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        className="btn-secondary flex-1"
                                        onClick={() => {
                                            setShowActionModal(false);
                                            setSelectedLoan(null);
                                            setNotes('');
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn-primary flex-1"
                                        onClick={handleAction}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Processing...' : 'Confirm'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DefaultManagement;
