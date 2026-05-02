import { useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import {
    Shield,
    Users,
    CheckCircle,
    Clock,
    AlertCircle,
    XCircle,
    DollarSign,
    FileText,
    Send,
    X,
    Loader,
    UserPlus,
    UserCheck,
    Lock
} from 'lucide-react';

/**
 * EscrowMultiSigApproval - Multi-signature approval for high-value transactions
 * Addresses FEAT-012: Multi-Signature Approval
 * 
 * Also includes FEAT-013: Partial Release capability
 */
function EscrowMultiSigApproval({ transaction, onApprove, onReject, onPartialRelease, onComplete }) {
    const { user } = useSelector(state => state.auth);
    
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showPartialModal, setShowPartialModal] = useState(false);
    const [partialAmount, setPartialAmount] = useState('');
    const [approvalNotes, setApprovalNotes] = useState('');
    const [processing, setProcessing] = useState(false);
    
    // Mock multi-sig data
    const multiSigConfig = {
        requiredSignatures: 2,
        totalSignatories: 3,
        threshold: 10000, // Amount requiring multi-sig
        signatories: [
            { id: 1, name: 'Platform Admin', role: 'admin', approved: true, timestamp: '2026-03-15 10:30:00' },
            { id: 2, name: 'Risk Officer', role: 'risk', approved: false, timestamp: null },
            { id: 3, name: 'Finance Team', role: 'finance', approved: false, timestamp: null },
        ]
    };
    
    // Mock transaction with partial release capability
    const tx = transaction || {
        id: 'TX-2026-001',
        amount: 25000,
        status: 'PENDING_APPROVAL',
        type: 'ESCROW_RELEASE',
        createdAt: '2026-03-14 09:15:00',
        requiredSignatures: 2,
        currentSignatures: 1,
        approvals: [
            { signatory: 'Platform Admin', role: 'admin', status: 'approved', timestamp: '2026-03-15 10:30:00' }
        ],
        partialReleases: [],
        isHighValue: true
    };
    
    const isHighValue = tx.amount >= multiSigConfig.threshold;
    const canApprove = tx.currentSignatures < tx.requiredSignatures;
    const canRelease = tx.status === 'FUNDED' || tx.status === 'PARTIAL';
    
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };
    
    const getStatusColor = (status) => {
        const colors = {
            'PENDING_APPROVAL': 'bg-yellow-100 text-yellow-800',
            'PARTIAL': 'bg-blue-100 text-blue-800',
            'APPROVED': 'bg-green-100 text-green-800',
            'REJECTED': 'bg-red-100 text-red-800',
            'COMPLETED': 'bg-emerald-100 text-emerald-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };
    
    const handleApprove = async () => {
        setProcessing(true);
        
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            toast.success('Approval submitted successfully!');
            
            if (onApprove) {
                onApprove({
                    transactionId: tx.id,
                    approvedBy: user?.name || 'User',
                    notes: approvalNotes,
                    timestamp: new Date().toISOString()
                });
            }
            
            setShowApprovalModal(false);
            setApprovalNotes('');
            
        } catch (error) {
            toast.error(error.message || 'Failed to submit approval');
        }
        
        setProcessing(false);
    };
    
    const handlePartialRelease = async () => {
        const amount = parseFloat(partialAmount);
        
        if (isNaN(amount) || amount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        
        if (amount > tx.amount) {
            toast.error('Amount exceeds transaction total');
            return;
        }
        
        if (amount < tx.amount * 0.1) {
            toast.error('Minimum partial release is 10% of transaction amount');
            return;
        }
        
        setProcessing(true);
        
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            toast.success(`Partial release of ${formatCurrency(amount)} initiated!`);
            
            if (onPartialRelease) {
                onPartialRelease({
                    transactionId: tx.id,
                    amount,
                    timestamp: new Date().toISOString()
                });
            }
            
            setShowPartialModal(false);
            setPartialAmount('');
            
        } catch (error) {
            toast.error(error.message || 'Failed to process partial release');
        }
        
        setProcessing(false);
    };
    
    const handleReject = async () => {
        const reason = prompt('Please provide a reason for rejection:');
        if (!reason) return;
        
        setProcessing(true);
        
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            toast.error('Transaction rejected');
            
            if (onReject) {
                onReject({
                    transactionId: tx.id,
                    reason,
                    rejectedBy: user?.name || 'User',
                    timestamp: new Date().toISOString()
                });
            }
            
        } catch (error) {
            toast.error(error.message || 'Failed to reject transaction');
        }
        
        setProcessing(false);
    };
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary-500" />
                        Transaction Security
                    </h2>
                    <p className="text-slate-500 mt-1">
                        Multi-signature approval & partial release controls
                    </p>
                </div>
            </div>
            
            {/* High Value Warning */}
            {isHighValue && (
                <div className="card bg-amber-50 border border-amber-200 p-4">
                    <div className="flex items-center gap-3">
                        <Lock className="w-6 h-6 text-amber-600" />
                        <div>
                            <p className="font-medium text-amber-800">High-Value Transaction</p>
                            <p className="text-sm text-amber-600">
                                This transaction requires {multiSigConfig.requiredSignatures} of {multiSigConfig.totalSignatories} signatures 
                                due to amount exceeding {formatCurrency(multiSigConfig.threshold)}
                            </p>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Transaction Summary */}
            <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900">Transaction #{tx.id}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(tx.status)}`}>
                        {tx.status.replace(/_/g, ' ')}
                    </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <span className="text-slate-500">Amount</span>
                        <p className="font-bold text-lg">{formatCurrency(tx.amount)}</p>
                    </div>
                    <div>
                        <span className="text-slate-500">Type</span>
                        <p className="font-medium">{tx.type}</p>
                    </div>
                    <div>
                        <span className="text-slate-500">Created</span>
                        <p className="font-medium">{tx.createdAt}</p>
                    </div>
                    <div>
                        <span className="text-slate-500">Signatures</span>
                        <p className="font-medium">{tx.currentSignatures} / {tx.requiredSignatures}</p>
                    </div>
                </div>
            </div>
            
            {/* Multi-Signature Section */}
            <div className="card p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Approval Signatures
                </h3>
                
                {/* Signature Progress */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-500">Signature Progress</span>
                        <span className="text-sm font-medium">{tx.currentSignatures} of {tx.requiredSignatures}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                            className={`h-2 rounded-full transition-all ${
                                tx.currentSignatures >= tx.requiredSignatures 
                                    ? 'bg-green-500' 
                                    : 'bg-primary-500'
                            }`}
                            style={{ width: `${(tx.currentSignatures / tx.requiredSignatures) * 100}%` }}
                        />
                    </div>
                </div>
                
                {/* Signatories */}
                <div className="space-y-3">
                    {multiSigConfig.signatories.map((signatory, idx) => {
                        const approval = tx.approvals.find(a => a.signatory === signatory.name);
                        const isApproved = !!approval;
                        
                        return (
                            <div 
                                key={signatory.id} 
                                className={`p-4 border rounded-lg ${
                                    isApproved 
                                        ? 'border-green-200 bg-green-50' 
                                        : 'border-slate-200 bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                            isApproved ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-600'
                                        }`}>
                                            {isApproved ? (
                                                <CheckCircle className="w-5 h-5" />
                                            ) : (
                                                <Clock className="w-5 h-5" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium">{signatory.name}</p>
                                            <p className="text-xs text-slate-500 capitalize">{signatory.role}</p>
                                        </div>
                                    </div>
                                    
                                    {isApproved ? (
                                        <div className="text-right">
                                            <p className="text-sm text-green-600 font-medium">Approved</p>
                                            <p className="text-xs text-slate-500">{approval?.timestamp}</p>
                                        </div>
                                    ) : (
                                        <div className="text-right">
                                            <p className="text-sm text-slate-500">Pending</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* Action Buttons */}
                {canApprove && (
                    <div className="mt-6 flex gap-3">
                        <button
                            onClick={() => setShowApprovalModal(true)}
                            className="btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                            <UserCheck className="w-4 h-4" />
                            Add My Approval
                        </button>
                        <button
                            onClick={handleReject}
                            className="btn-secondary flex items-center justify-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
                        >
                            <XCircle className="w-4 h-4" />
                            Reject
                        </button>
                    </div>
                )}
                
                {tx.currentSignatures >= tx.requiredSignatures && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700">
                            All required signatures collected - transaction ready for processing
                        </span>
                    </div>
                )}
            </div>
            
            {/* Partial Release Section */}
            <div className="card p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Partial Release
                </h3>
                
                <p className="text-sm text-slate-500 mb-4">
                    Release funds in portions instead of a single full release. 
                    Useful for milestone-based payments or staged deliverables.
                </p>
                
                {/* Partial Release History */}
                {tx.partialReleases && tx.partialReleases.length > 0 ? (
                    <div className="mb-4 space-y-2">
                        {tx.partialReleases.map((release, idx) => (
                            <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-medium">{formatCurrency(release.amount)} released</p>
                                    <p className="text-xs text-slate-500">{release.date}</p>
                                </div>
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                    Complete
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="mb-4 p-4 bg-slate-50 rounded-lg text-center">
                        <p className="text-sm text-slate-500">No partial releases yet</p>
                    </div>
                )}
                
                {/* Remaining Amount */}
                <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Total Amount:</span>
                        <span className="font-medium">{formatCurrency(tx.amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-slate-500">Already Released:</span>
                        <span className="font-medium text-green-600">
                            {formatCurrency(tx.partialReleases?.reduce((sum, r) => sum + r.amount, 0) || 0)}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1 pt-2 border-t">
                        <span className="font-medium">Remaining:</span>
                        <span className="font-bold">
                            {formatCurrency(
                                tx.amount - (tx.partialReleases?.reduce((sum, r) => sum + r.amount, 0) || 0)
                            )}
                        </span>
                    </div>
                </div>
                
                {canRelease && (
                    <button
                        onClick={() => setShowPartialModal(true)}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        <Send className="w-4 h-4" />
                        Release Partial Funds
                    </button>
                )}
            </div>
            
            {/* Approval Modal */}
            {showApprovalModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Add Approval</h3>
                            <button 
                                onClick={() => setShowApprovalModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-500">Approving transaction</p>
                            <p className="font-bold text-lg">{formatCurrency(tx.amount)}</p>
                        </div>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Notes (optional)
                            </label>
                            <textarea
                                value={approvalNotes}
                                onChange={(e) => setApprovalNotes(e.target.value)}
                                placeholder="Add approval notes..."
                                className="input-field w-full"
                                rows={3}
                            />
                        </div>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowApprovalModal(false)}
                                className="btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={processing}
                                className="btn-primary flex-1 flex items-center justify-center gap-2"
                            >
                                {processing ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4" />
                                        Approve
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Partial Release Modal */}
            {showPartialModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Partial Release</h3>
                            <button 
                                onClick={() => setShowPartialModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Release Amount
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                <input
                                    type="number"
                                    value={partialAmount}
                                    onChange={(e) => setPartialAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="input-field w-full pl-8"
                                    min={tx.amount * 0.1}
                                    max={tx.amount}
                                />
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={() => setPartialAmount((tx.amount * 0.25).toString())}
                                    className="text-xs text-primary-600 hover:underline"
                                >
                                    25%
                                </button>
                                <button
                                    onClick={() => setPartialAmount((tx.amount * 0.5).toString())}
                                    className="text-xs text-primary-600 hover:underline"
                                >
                                    50%
                                </button>
                                <button
                                    onClick={() => setPartialAmount((tx.amount * 0.75).toString())}
                                    className="text-xs text-primary-600 hover:underline"
                                >
                                    75%
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                Minimum: 10% ({formatCurrency(tx.amount * 0.1)})
                            </p>
                        </div>
                        
                        {/* Preview */}
                        {partialAmount && (
                            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex justify-between text-sm">
                                    <span className="text-blue-700">This Release:</span>
                                    <span className="font-medium">{formatCurrency(parseFloat(partialAmount) || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span className="text-blue-700">Remaining After:</span>
                                    <span className="font-medium">
                                        {formatCurrency(tx.amount - (parseFloat(partialAmount) || 0))}
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowPartialModal(false)}
                                className="btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePartialRelease}
                                disabled={processing || !partialAmount}
                                className="btn-primary flex-1 flex items-center justify-center gap-2"
                            >
                                {processing ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <DollarSign className="w-4 h-4" />
                                        Release Funds
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EscrowMultiSigApproval;
