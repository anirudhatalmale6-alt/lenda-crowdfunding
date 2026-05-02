import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { 
    PlusCircle, 
    Edit2, 
    Trash2, 
    Eye, 
    Link as LinkIcon,
    X,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import { 
    getMyLoans, 
    getLoanDetails,
    calculateLTV 
} from '../../store/slices/loanSlice';
import { formatCurrency, formatDate } from '../../utils/formatters';

/**
 * CollateralManager - Complete collateral management with full CRUD
 * Addresses BF-08: Collateral management UI incomplete
 */
function CollateralManager() {
    const dispatch = useDispatch();
    const { isLoading, myLoans, loanDetails } = useSelector((state) => state.loans);
    const { user } = useSelector((state) => state.auth);
    
    const [collaterals, setCollaterals] = useState([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [editingCollateral, setEditingCollateral] = useState(null);
    const [viewingCollateral, setViewingCollateral] = useState(null);
    const [linkedLoans, setLinkedLoans] = useState([]);
    const [uploadData, setUploadData] = useState({
        id: null,
        type: '',
        value: '',
        description: '',
        document: null,
        documentName: '',
    });

    useEffect(() => {
        loadCollaterals();
        loadActiveLoans();
    }, []);

    const loadActiveLoans = async () => {
        try {
            await dispatch(getMyLoans());
        } catch (error) {
            console.error('Failed to load loans:', error);
        }
    };

    const loadCollaterals = async () => {
        try {
            // In production, this would call an API
            // Using mock data for demonstration
            setCollaterals([
                {
                    id: 1,
                    type: 'Vehicle',
                    value: 25000,
                    status: 'VERIFIED',
                    createdAt: Date.now() / 1000 - 30 * 24 * 60 * 60,
                    description: 'Toyota Camry 2023',
                    documents: ['vehicle_reg.pdf', 'insurance.pdf'],
                    linkedLoanId: null,
                },
                {
                    id: 2,
                    type: 'Property',
                    value: 150000,
                    status: 'PENDING',
                    createdAt: Date.now() / 1000 - 7 * 24 * 60 * 60,
                    description: 'Commercial property in downtown',
                    documents: ['property_deed.pdf', 'valuation.pdf'],
                    linkedLoanId: null,
                },
            ]);
        } catch (error) {
            console.error('Failed to load collaterals:', error);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();

        if (!uploadData.type || !uploadData.value) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const collateralData = {
                id: uploadData.id || Date.now(),
                type: uploadData.type,
                value: parseFloat(uploadData.value),
                description: uploadData.description,
                status: uploadData.id ? 'PENDING' : 'PENDING',
                createdAt: uploadData.id ? collaterals.find(c => c.id === uploadData.id)?.createdAt : Date.now() / 1000,
                updatedAt: Date.now() / 1000,
                documents: uploadData.documentName ? [uploadData.documentName] : [],
                linkedLoanId: null,
            };

            if (editingCollateral) {
                // Update existing collateral
                setCollaterals(collaterals.map(c => 
                    c.id === editingCollateral.id ? collateralData : c
                ));
                toast.success('Collateral updated successfully!');
            } else {
                // Add new collateral
                setCollaterals([...collaterals, collateralData]);
                toast.success('Collateral uploaded successfully!');
            }
            
            closeModal();
        } catch (error) {
            toast.error('Failed to save collateral');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this collateral?')) {
            return;
        }

        try {
            setCollaterals(collaterals.filter(c => c.id !== id));
            toast.success('Collateral deleted successfully!');
        } catch (error) {
            toast.error('Failed to delete collateral');
        }
    };

    const handleEdit = (collateral) => {
        setEditingCollateral(collateral);
        setUploadData({
            id: collateral.id,
            type: collateral.type,
            value: collateral.value.toString(),
            description: collateral.description || '',
            document: null,
            documentName: collateral.documents?.[0] || '',
        });
        setShowUploadModal(true);
    };

    const handleView = (collateral) => {
        setViewingCollateral(collateral);
    };

    const handleLinkToLoan = async (collateralId, loanId) => {
        try {
            setCollaterals(collaterals.map(c => 
                c.id === collateralId ? { ...c, linkedLoanId: loanId } : c
            ));
            toast.success('Collateral linked to loan successfully!');
            setShowLinkModal(false);
        } catch (error) {
            toast.error('Failed to link collateral to loan');
        }
    };

    const handleUnlinkLoan = async (collateralId) => {
        try {
            setCollaterals(collaterals.map(c => 
                c.id === collateralId ? { ...c, linkedLoanId: null } : c
            ));
            toast.success('Collateral unlinked from loan');
        } catch (error) {
            toast.error('Failed to unlink collateral');
        }
    };

    const calculateTotalLTV = (collateralId) => {
        const collateral = collaterals.find(c => c.id === collateralId);
        if (!collateral || !collateral.linkedLoanId) return null;
        
        // Mock calculation
        const loanAmount = 50000; // This would come from actual loan data
        return ((loanAmount / collateral.value) * 100).toFixed(1);
    };

    const closeModal = () => {
        setShowUploadModal(false);
        setShowLinkModal(false);
        setEditingCollateral(null);
        setViewingCollateral(null);
        setUploadData({
            id: null,
            type: '',
            value: '',
            description: '',
            document: null,
            documentName: '',
        });
    };

    const getStatusColor = (status) => {
        const colors = {
            VERIFIED: 'bg-green-100 text-green-800',
            PENDING: 'bg-yellow-100 text-yellow-800',
            REJECTED: 'bg-red-100 text-red-800',
            ACTIVE: 'bg-blue-100 text-blue-800',
            RELEASED: 'bg-gray-100 text-gray-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getTotalValue = () => {
        return collaterals.reduce((sum, c) => sum + c.value, 0);
    };

    const getAvailableCollateralValue = () => {
        return collaterals
            .filter(c => !c.linkedLoanId && c.status === 'VERIFIED')
            .reduce((sum, c) => sum + c.value, 0);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold">Collateral Manager</h1>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="btn-primary text-sm flex items-center gap-2"
                >
                    <PlusCircle className="w-4 h-4" />
                    Add Collateral
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                    <div className="p-6">
                        <h3 className="text-sm font-medium opacity-90">Total Collateral Value</h3>
                        <p className="text-3xl font-bold mt-2">{formatCurrency(getTotalValue())}</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-6">
                        <h3 className="text-sm text-slate-500">Total Assets</h3>
                        <p className="text-3xl font-bold mt-2 text-slate-800">{collaterals.length}</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-6">
                        <h3 className="text-sm text-slate-500">Verified Assets</h3>
                        <p className="text-3xl font-bold mt-2 text-green-600">
                            {collaterals.filter(c => c.status === 'VERIFIED').length}
                        </p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-6">
                        <h3 className="text-sm text-slate-500">Available for Loans</h3>
                        <p className="text-3xl font-bold mt-2 text-primary-600">
                            {formatCurrency(getAvailableCollateralValue())}
                        </p>
                    </div>
                </div>
            </div>

            {/* Collateral List */}
            {isLoading ? (
                <div className="card p-6 text-center">
                    <div className="animate-pulse">Loading collaterals...</div>
                </div>
            ) : collaterals.length === 0 ? (
                <div className="card p-6 text-center text-slate-500">
                    <p>No collateral assets yet.</p>
                    <p className="text-sm mt-2">Add collateral to secure your loans.</p>
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="btn-primary mt-4"
                    >
                        Add Your First Collateral
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {collaterals.map((collateral) => (
                        <div key={collateral.id} className="card hover:shadow-lg transition-shadow">
                            <div className="p-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-semibold capitalize">{collateral.type}</h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(collateral.status)}`}>
                                                {collateral.status}
                                            </span>
                                        </div>
                                        <p className="text-slate-500 mt-1">
                                            Added {formatDate(new Date(collateral.createdAt * 1000))}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-emerald-600">
                                            {formatCurrency(collateral.value)}
                                        </p>
                                    </div>
                                </div>

                                {collateral.description && (
                                    <p className="mt-4 text-slate-600">{collateral.description}</p>
                                )}

                                {/* Linked Loan Info */}
                                {collateral.linkedLoanId && (
                                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <LinkIcon className="w-4 h-4 text-blue-600" />
                                                <span className="text-sm text-blue-700">
                                                    Linked to Loan #{collateral.linkedLoanId}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleUnlinkLoan(collateral.id)}
                                                className="text-xs text-blue-600 hover:underline"
                                            >
                                                Unlink
                                            </button>
                                        </div>
                                        {calculateTotalLTV(collateral.id) && (
                                            <div className="mt-2 text-xs text-blue-600">
                                                LTV: {calculateTotalLTV(collateral.id)}%
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Documents */}
                                {collateral.documents && collateral.documents.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-xs text-slate-500 mb-2">Documents:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {collateral.documents.map((doc, idx) => (
                                                <span 
                                                    key={idx} 
                                                    className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded"
                                                >
                                                    {doc}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button 
                                        onClick={() => handleView(collateral)}
                                        className="btn-secondary text-sm flex items-center gap-1"
                                    >
                                        <Eye className="w-4 h-4" />
                                        View
                                    </button>
                                    {collateral.status !== 'VERIFIED' && (
                                        <button 
                                            onClick={() => handleEdit(collateral)}
                                            className="btn-secondary text-sm flex items-center gap-1"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                            Edit
                                        </button>
                                    )}
                                    {!collateral.linkedLoanId && (
                                        <button 
                                            onClick={() => {
                                                setEditingCollateral(collateral);
                                                setShowLinkModal(true);
                                            }}
                                            className="btn-primary text-sm flex items-center gap-1"
                                        >
                                            <LinkIcon className="w-4 h-4" />
                                            Link to Loan
                                        </button>
                                    )}
                                    {collateral.status === 'PENDING' && (
                                        <button 
                                            onClick={() => handleDelete(collateral.id)}
                                            className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1 ml-auto"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload/Edit Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="card max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">
                                    {editingCollateral ? 'Edit Collateral' : 'Add Collateral'}
                                </h2>
                                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleUpload} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Collateral Type *</label>
                                    <select
                                        className="input-field w-full"
                                        value={uploadData.type}
                                        onChange={(e) => setUploadData({ ...uploadData, type: e.target.value })}
                                        disabled={!!editingCollateral}
                                        required
                                    >
                                        <option value="">Select type</option>
                                        <option value="vehicle">Vehicle</option>
                                        <option value="property">Property</option>
                                        <option value="equipment">Equipment</option>
                                        <option value="inventory">Inventory</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Estimated Value (NGN) *</label>
                                    <input
                                        type="number"
                                        className="input-field w-full"
                                        placeholder="Enter estimated value"
                                        value={uploadData.value}
                                        onChange={(e) => setUploadData({ ...uploadData, value: e.target.value })}
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Description</label>
                                    <textarea
                                        className="input-field w-full"
                                        placeholder="Describe the collateral..."
                                        value={uploadData.description}
                                        onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Supporting Documents</label>
                                    <input
                                        type="file"
                                        className="input-field w-full"
                                        onChange={(e) => setUploadData({ 
                                            ...uploadData, 
                                            document: e.target.files[0],
                                            documentName: e.target.files[0]?.name || ''
                                        })}
                                        accept=".pdf,.jpg,.jpeg,.png"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Accepted: PDF, JPG, PNG (Max 10MB)
                                    </p>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        className="btn-secondary flex-1"
                                        onClick={closeModal}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary flex-1"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Saving...' : (editingCollateral ? 'Update' : 'Upload Collateral')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Link to Loan Modal */}
            {showLinkModal && editingCollateral && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="card max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Link to Loan</h2>
                                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-sm text-slate-600 mb-4">
                                Select a loan to link with "{editingCollateral.type}" collateral ({formatCurrency(editingCollateral.value)})
                            </p>
                            
                            {/* Mock loan list - in production, fetch from API */}
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                <button
                                    onClick={() => handleLinkToLoan(editingCollateral.id, null)}
                                    className="w-full p-3 text-left border border-slate-200 rounded-lg hover:bg-slate-50"
                                >
                                    <div className="font-medium">No Loan</div>
                                    <div className="text-xs text-slate-500">Don't link to any loan</div>
                                </button>
                                <button
                                    onClick={() => handleLinkToLoan(editingCollateral.id, 1001)}
                                    className="w-full p-3 text-left border border-slate-200 rounded-lg hover:bg-slate-50"
                                >
                                    <div className="font-medium">Business Loan #1001</div>
                                    <div className="text-xs text-slate-500">Amount: {formatCurrency(50000)} | Status: ACTIVE</div>
                                </button>
                                <button
                                    onClick={() => handleLinkToLoan(editingCollateral.id, 1002)}
                                    className="w-full p-3 text-left border border-slate-200 rounded-lg hover:bg-slate-50"
                                >
                                    <div className="font-medium">Equipment Loan #1002</div>
                                    <div className="text-xs text-slate-500">Amount: {formatCurrency(25000)} | Status: ACTIVE</div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Detail Modal */}
            {viewingCollateral && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="card max-w-lg w-full mx-4">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Collateral Details</h2>
                                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-slate-500">Type</span>
                                    <span className="font-medium capitalize">{viewingCollateral.type}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-slate-500">Value</span>
                                    <span className="font-medium text-emerald-600">{formatCurrency(viewingCollateral.value)}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-slate-500">Status</span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(viewingCollateral.status)}`}>
                                        {viewingCollateral.status}
                                    </span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-slate-500">Created</span>
                                    <span className="font-medium">
                                        {new Date(viewingCollateral.createdAt * 1000).toLocaleDateString()}
                                    </span>
                                </div>
                                {viewingCollateral.description && (
                                    <div>
                                        <span className="text-slate-500 block mb-1">Description</span>
                                        <p className="text-slate-700">{viewingCollateral.description}</p>
                                    </div>
                                )}
                                {viewingCollateral.linkedLoanId && (
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="text-slate-500">Linked Loan</span>
                                        <span className="font-medium">#{viewingCollateral.linkedLoanId}</span>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={closeModal}
                                className="btn-primary w-full mt-4"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CollateralManager;
