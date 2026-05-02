import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { 
    Calendar, 
    Clock, 
    CreditCard, 
    CheckCircle, 
    AlertCircle,
    Pause,
    Play,
    Settings,
    DollarSign
} from 'lucide-react';
import repaymentSchedulerService, { 
    SCHEDULE_FREQUENCY,
    PAYMENT_STATUS 
} from '../../services/repaymentSchedulerService';
import { formatCurrency, formatDate } from '../../utils/formatters';

/**
 * AutoRepaymentSetup - Component for setting up automatic loan repayments
 * Addresses BF-06: Automatic repayment scheduling
 */
function AutoRepaymentSetup({ loan, onStatusChange }) {
    const [isLoading, setIsLoading] = useState(false);
    const [autoDebitStatus, setAutoDebitStatus] = useState(null);
    const [scheduledPayments, setScheduledPayments] = useState([]);
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [setupData, setSetupData] = useState({
        frequency: SCHEDULE_FREQUENCY.MONTHLY,
        paymentDay: 15,
        startDate: new Date().toISOString().split('T')[0],
        amount: loan?.monthlyPayment || loan?.amount / loan?.duration || 0,
        bankAccountId: '',
    });

    useEffect(() => {
        loadAutoDebitStatus();
        loadScheduledPayments();
    }, [loan?.id]);

    const loadAutoDebitStatus = async () => {
        if (!loan?.id) return;
        try {
            const status = await repaymentSchedulerService.getAutoDebitStatus(loan.id);
            setAutoDebitStatus(status);
        } catch (error) {
            console.error('Failed to load auto-debit status:', error);
        }
    };

    const loadScheduledPayments = async () => {
        if (!loan?.id) return;
        try {
            const payments = await repaymentSchedulerService.getScheduledPayments(loan.id);
            setScheduledPayments(payments);
        } catch (error) {
            console.error('Failed to load scheduled payments:', error);
        }
    };

    const handleSetupAutoDebit = async (e) => {
        e.preventDefault();
        
        if (!setupData.bankAccountId) {
            toast.error('Please select a payment method');
            return;
        }

        setIsLoading(true);
        try {
            await repaymentSchedulerService.setupAutoDebit(loan.id, {
                frequency: setupData.frequency,
                paymentDay: setupData.paymentDay,
                startDate: setupData.startDate,
                amount: setupData.amount,
                bankAccountId: setupData.bankAccountId,
            });
            
            toast.success('Automatic repayment set up successfully!');
            setShowSetupModal(false);
            loadAutoDebitStatus();
            loadScheduledPayments();
            
            if (onStatusChange) onStatusChange(true);
        } catch (error) {
            toast.error(error.message || 'Failed to set up automatic repayment');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePauseResume = async () => {
        setIsLoading(true);
        try {
            if (autoDebitStatus?.enabled) {
                await repaymentSchedulerService.pauseAutoPayments(loan.id);
                toast.success('Automatic payments paused');
            } else {
                await repaymentSchedulerService.resumeAutoPayments(loan.id);
                toast.success('Automatic payments resumed');
            }
            loadAutoDebitStatus();
            
            if (onStatusChange) onStatusChange(!autoDebitStatus?.enabled);
        } catch (error) {
            toast.error(error.message || 'Failed to update payment status');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case PAYMENT_STATUS.COMPLETED:
                return 'bg-green-100 text-green-800';
            case PAYMENT_STATUS.PENDING:
                return 'bg-yellow-100 text-yellow-800';
            case PAYMENT_STATUS.PROCESSING:
                return 'bg-blue-100 text-blue-800';
            case PAYMENT_STATUS.FAILED:
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getFrequencyLabel = (freq) => {
        switch (freq) {
            case SCHEDULE_FREQUENCY.DAILY:
                return 'Daily';
            case SCHEDULE_FREQUENCY.WEEKLY:
                return 'Weekly';
            case SCHEDULE_FREQUENCY.BIWEEKLY:
                return 'Bi-weekly';
            case SCHEDULE_FREQUENCY.MONTHLY:
                return 'Monthly';
            default:
                return freq;
        }
    };

    if (!loan) return null;

    return (
        <>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg text-slate-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary-600" />
                        Automatic Repayments
                    </h3>
                    {autoDebitStatus?.enabled ? (
                        <span className="badge-success flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Active
                        </span>
                    ) : (
                        <span className="badge-warning">Not Set Up</span>
                    )}
                </div>

                {autoDebitStatus?.enabled ? (
                    <>
                        {/* Active Auto-Debit Status */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <div className="text-xs text-slate-500">Frequency</div>
                                    <div className="font-medium">
                                        {getFrequencyLabel(autoDebitStatus.frequency)}
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <div className="text-xs text-slate-500">Next Payment</div>
                                    <div className="font-medium">
                                        {formatDate(autoDebitStatus.nextPaymentDate)}
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-emerald-600" />
                                    <span className="font-medium text-emerald-800">
                                        {formatCurrency(autoDebitStatus.amount)} / {getFrequencyLabel(autoDebitStatus.frequency).toLowerCase()}
                                    </span>
                                </div>
                            </div>

                            {/* Upcoming Payments */}
                            {scheduledPayments.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium text-slate-700 mb-2">Upcoming Payments</h4>
                                    <div className="space-y-2">
                                        {scheduledPayments.slice(0, 3).map((payment) => (
                                            <div key={payment.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-slate-400" />
                                                    <span className="text-sm">{formatDate(payment.dueDate)}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{formatCurrency(payment.amount)}</span>
                                                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(payment.status)}`}>
                                                        {payment.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handlePauseResume}
                                    disabled={isLoading}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium ${
                                        autoDebitStatus.enabled
                                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                                    }`}
                                >
                                    {autoDebitStatus.enabled ? (
                                        <>
                                            <Pause className="w-4 h-4" />
                                            Pause
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4" />
                                            Resume
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowSetupModal(true)}
                                    className="flex-1 btn-secondary flex items-center justify-center gap-2"
                                >
                                    <Settings className="w-4 h-4" />
                                    Modify
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-sm text-slate-600 mb-4">
                            Set up automatic repayments to ensure your loan payments are made on time, every time.
                        </p>

                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                                <div className="text-sm text-blue-700">
                                    <strong>Benefits:</strong>
                                    <ul className="list-disc list-inside mt-1">
                                        <li>Never miss a payment</li>
                                        <li>Build better credit history</li>
                                        <li>Avoid late fees</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowSetupModal(true)}
                            className="w-full btn-primary"
                        >
                            Set Up Automatic Repayment
                        </button>
                    </>
                )}
            </div>

            {/* Setup Modal */}
            {showSetupModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-slate-900 mb-4">
                                Set Up Automatic Repayment
                            </h2>

                            <form onSubmit={handleSetupAutoDebit} className="space-y-4">
                                {/* Frequency */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Payment Frequency
                                    </label>
                                    <select
                                        value={setupData.frequency}
                                        onChange={(e) => setSetupData({ ...setupData, frequency: e.target.value })}
                                        className="input-field"
                                    >
                                        <option value={SCHEDULE_FREQUENCY.MONTHLY}>Monthly</option>
                                        <option value={SCHEDULE_FREQUENCY.BIWEEKLY}>Bi-weekly</option>
                                        <option value={SCHEDULE_FREQUENCY.WEEKLY}>Weekly</option>
                                    </select>
                                </div>

                                {/* Payment Day */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Payment Day of Month
                                    </label>
                                    <select
                                        value={setupData.paymentDay}
                                        onChange={(e) => setSetupData({ ...setupData, paymentDay: parseInt(e.target.value) })}
                                        className="input-field"
                                    >
                                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                            <option key={day} value={day}>
                                                {day}{getOrdinalSuffix(day)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Start Date */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={setupData.startDate}
                                        onChange={(e) => setSetupData({ ...setupData, startDate: e.target.value })}
                                        className="input-field"
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>

                                {/* Amount */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Payment Amount
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="number"
                                            value={setupData.amount}
                                            onChange={(e) => setSetupData({ ...setupData, amount: parseFloat(e.target.value) })}
                                            className="input-field pl-10"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Recommended: {formatCurrency(loan?.monthlyPayment || loan?.amount / loan?.duration || 0)}
                                    </p>
                                </div>

                                {/* Payment Method */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Payment Method
                                    </label>
                                    <select
                                        value={setupData.bankAccountId}
                                        onChange={(e) => setSetupData({ ...setupData, bankAccountId: e.target.value })}
                                        className="input-field"
                                        required
                                    >
                                        <option value="">Select payment method</option>
                                        <option value="bank_1">Bank Account ****1234</option>
                                        <option value="bank_2">Bank Account ****5678</option>
                                        <option value="wallet">LENDA Wallet</option>
                                    </select>
                                </div>

                                {/* Summary */}
                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <h4 className="font-medium text-slate-900 mb-2">Payment Summary</h4>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Frequency:</span>
                                            <span>{getFrequencyLabel(setupData.frequency)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Amount:</span>
                                            <span>{formatCurrency(setupData.amount)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">First payment:</span>
                                            <span>{formatDate(setupData.startDate)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowSetupModal(false)}
                                        className="flex-1 btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-1 btn-primary disabled:opacity-50"
                                    >
                                        {isLoading ? 'Setting Up...' : 'Confirm'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Helper function for ordinal suffix
function getOrdinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

export default AutoRepaymentSetup;
