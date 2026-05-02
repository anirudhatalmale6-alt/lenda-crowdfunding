import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    getPendingLoans, 
    approveLoan, 
    rejectLoan,
    selectAllLoans,
    selectLoanLoading 
} from '../../store/slices/loanSlice';
import { 
    Layers, 
    CheckCircle, 
    XCircle, 
    Clock, 
    Search,
    Filter,
    Download,
    Send,
    AlertTriangle,
    Loader,
    CheckSquare,
    Square,
    RefreshCw,
    Eye,
    MoreHorizontal
} from 'lucide-react';

/**
 * BulkLoanOperations - Admin bulk loan operations dashboard
 * Allows admins to perform batch actions on loans
 */
function BulkLoanOperations() {
    const dispatch = useDispatch();
    const loans = useSelector(selectAllLoans);
    const loading = useSelector(selectLoanLoading);
    
    const [selectedLoans, setSelectedLoans] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('pending');
    const [actionType, setActionType] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState(null);
    
    // Mock data for demonstration
    const mockLoans = [
        { id: 'LN001', borrower: 'John Smith', amount: 25000, rate: 12.5, status: 'pending', date: '2024-03-10', collateral: 'Real Estate' },
        { id: 'LN002', borrower: 'Sarah Johnson', amount: 15000, rate: 15.0, status: 'pending', date: '2024-03-11', collateral: 'Vehicle' },
        { id: 'LN003', borrower: 'Mike Davis', amount: 50000, rate: 10.0, status: 'pending', date: '2024-03-12', collateral: 'Property' },
        { id: 'LN004', borrower: 'Emily Brown', amount: 8000, rate: 18.0, status: 'pending', date: '2024-03-13', collateral: 'Equipment' },
        { id: 'LN005', borrower: 'Robert Wilson', amount: 35000, rate: 11.5, status: 'pending', date: '2024-03-14', collateral: 'Real Estate' },
        { id: 'LN006', borrower: 'Lisa Anderson', amount: 12000, rate: 14.0, status: 'pending', date: '2024-03-15', collateral: 'Vehicle' },
    ];
    
    const displayLoans = loans.length > 0 ? loans : mockLoans;
    
    // Filter loans
    const filteredLoans = displayLoans.filter(loan => {
        const matchesSearch = 
            loan.borrower?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loan.id?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || loan.status === filterStatus;
        return matchesSearch && matchesStatus;
    });
    
    // Handle select all
    const handleSelectAll = () => {
        if (selectedLoans.size === filteredLoans.length) {
            setSelectedLoans(new Set());
        } else {
            setSelectedLoans(new Set(filteredLoans.map(l => l.id)));
        }
    };
    
    // Handle select single
    const handleSelectOne = (loanId) => {
        const newSelected = new Set(selectedLoans);
        if (newSelected.has(loanId)) {
            newSelected.delete(loanId);
        } else {
            newSelected.add(loanId);
        }
        setSelectedLoans(newSelected);
    };
    
    // Handle bulk action
    const handleBulkAction = async () => {
        if (!actionType || selectedLoans.size === 0) return;
        
        setProcessing(true);
        const loanIds = Array.from(selectedLoans);
        
        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const successCount = Math.floor(loanIds.length * 0.9); // 90% success rate simulation
        const failCount = loanIds.length - successCount;
        
        setResults({
            action: actionType,
            total: loanIds.length,
            success: successCount,
            failed: failCount,
            failedIds: loanIds.slice(successCount)
        });
        
        setProcessing(false);
        setShowConfirmModal(false);
        setSelectedLoans(new Set());
    };
    
    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(amount);
    };
    
    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                            <Layers className="w-8 h-8 text-primary-500" />
                            Bulk Loan Operations
                        </h1>
                        <p className="text-slate-600">
                            Perform batch actions on multiple loans at once
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                        <button 
                            onClick={() => dispatch(getPendingLoans())}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>
                </div>
                
                {/* Results Alert */}
                {results && (
                    <div className={`mb-6 p-4 rounded-lg border ${
                        results.failed === 0 
                            ? 'bg-emerald-50 border-emerald-200' 
                            : 'bg-amber-50 border-amber-200'
                    }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {results.failed === 0 ? (
                                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                                ) : (
                                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                                )}
                                <div>
                                    <p className={`font-medium ${
                                        results.failed === 0 ? 'text-emerald-800' : 'text-amber-800'
                                    }`}>
                                        {results.action === 'approve' ? 'Approval' : 'Rejection'} Complete
                                    </p>
                                    <p className="text-sm text-slate-600">
                                        Processed {results.total} loans: {results.success} successful, {results.failed} failed
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setResults(null)}
                                className="text-slate-500 hover:text-slate-700"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Action Bar */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by ID or borrower..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 w-64"
                                />
                            </div>
                            
                            {/* Status Filter */}
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="all">All Status</option>
                            </select>
                        </div>
                        
                        {/* Bulk Actions */}
                        {selectedLoans.size > 0 && (
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-600">
                                    {selectedLoans.size} selected
                                </span>
                                <button
                                    onClick={() => {
                                        setActionType('approve');
                                        setShowConfirmModal(true);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Approve Selected
                                </button>
                                <button
                                    onClick={() => {
                                        setActionType('reject');
                                        setShowConfirmModal(true);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                >
                                    <XCircle className="w-4 h-4" />
                                    Reject Selected
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Loans Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left">
                                    <button
                                        onClick={handleSelectAll}
                                        className="text-primary-600 hover:text-primary-700"
                                    >
                                        {selectedLoans.size === filteredLoans.length && filteredLoans.length > 0 ? (
                                            <CheckSquare className="w-5 h-5" />
                                        ) : (
                                            <Square className="w-5 h-5" />
                                        )}
                                    </button>
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Loan ID</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Borrower</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Amount</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Rate</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Collateral</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Date</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredLoans.map((loan) => (
                                <tr key={loan.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleSelectOne(loan.id)}
                                            className="text-primary-600 hover:text-primary-700"
                                        >
                                            {selectedLoans.has(loan.id) ? (
                                                <CheckSquare className="w-5 h-5" />
                                            ) : (
                                                <Square className="w-5 h-5" />
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{loan.id}</td>
                                    <td className="px-6 py-4 text-slate-600">{loan.borrower}</td>
                                    <td className="px-6 py-4 text-slate-900 font-medium">{formatCurrency(loan.amount)}</td>
                                    <td className="px-6 py-4 text-slate-600">{loan.rate}%</td>
                                    <td className="px-6 py-4 text-slate-600">{loan.collateral}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            loan.status === 'pending' 
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : loan.status === 'approved'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {loan.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                                            {loan.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                                            {loan.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                                            {loan.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 text-sm">{loan.date}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {filteredLoans.length === 0 && (
                        <div className="p-12 text-center">
                            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">No loans found matching your criteria</p>
                        </div>
                    )}
                </div>
                
                {/* Summary Stats */}
                <div className="grid md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Total Loans</p>
                                <p className="text-2xl font-bold text-slate-900">{displayLoans.length}</p>
                            </div>
                            <Layers className="w-8 h-8 text-slate-400" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Pending</p>
                                <p className="text-2xl font-bold text-yellow-600">
                                    {displayLoans.filter(l => l.status === 'pending').length}
                                </p>
                            </div>
                            <Clock className="w-8 h-8 text-yellow-400" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Total Volume</p>
                                <p className="text-2xl font-bold text-primary-600">
                                    {formatCurrency(displayLoans.reduce((sum, l) => sum + l.amount, 0))}
                                </p>
                            </div>
                            <Send className="w-8 h-8 text-primary-400" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Selected</p>
                                <p className="text-2xl font-bold text-slate-900">{selectedLoans.size}</p>
                            </div>
                            <CheckSquare className="w-8 h-8 text-slate-400" />
                        </div>
                    </div>
                </div>
                
                {/* Confirmation Modal */}
                {showConfirmModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                    actionType === 'approve' ? 'bg-emerald-100' : 'bg-red-100'
                                }`}>
                                    {actionType === 'approve' ? (
                                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                                    ) : (
                                        <XCircle className="w-6 h-6 text-red-600" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        Confirm Bulk {actionType === 'approve' ? 'Approval' : 'Rejection'}
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        {selectedLoans.size} loans selected
                                    </p>
                                </div>
                            </div>
                            
                            <p className="text-slate-600 mb-6">
                                Are you sure you want to {actionType} {selectedLoans.size} loan(s)? 
                                This action cannot be undone.
                            </p>
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkAction}
                                    disabled={processing}
                                    className={`flex-1 px-4 py-2 text-white rounded-lg flex items-center justify-center gap-2 ${
                                        actionType === 'approve' 
                                            ? 'bg-emerald-500 hover:bg-emerald-600' 
                                            : 'bg-red-500 hover:bg-red-600'
                                    }`}
                                >
                                    {processing ? (
                                        <>
                                            <Loader className="w-4 h-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            {actionType === 'approve' ? 'Approve' : 'Reject'} {selectedLoans.size} Loans
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default BulkLoanOperations;
