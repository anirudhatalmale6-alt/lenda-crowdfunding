import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { createLoanRequest, getMyLoanRequests } from '../../store/slices/loanSlice';
import { formatCurrency } from '../../utils/formatters';

function LoanRequests() {
    const dispatch = useDispatch();
    const { myLoanRequests, isLoading } = useSelector((state) => state.loans);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        amount: '',
        purpose: '',
        durationMonths: '12',
        collateralType: 'real_estate',
        collateralDescription: '',
        collateralValue: '',
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        dispatch(getMyLoanRequests());
    }, [dispatch]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.amount || parseFloat(formData.amount) < 100) {
            newErrors.amount = 'Minimum loan amount is ₦100';
        }

        if (!formData.purpose || formData.purpose.length < 10) {
            newErrors.purpose = 'Please provide a detailed purpose (at least 10 characters)';
        }

        if (!formData.durationMonths || parseInt(formData.durationMonths) < 1) {
            newErrors.durationMonths = 'Duration must be at least 1 month';
        }

        if (!formData.collateralDescription) {
            newErrors.collateralDescription = 'Collateral description is required';
        }

        if (!formData.collateralValue || parseFloat(formData.collateralValue) < 100) {
            newErrors.collateralValue = 'Collateral value must be at least ₦100';
        }

        // Collateral must be at least 120% of loan amount
        const collateralRatio = parseFloat(formData.collateralValue) / parseFloat(formData.amount);
        if (collateralRatio < 1.2) {
            newErrors.collateralValue = 'Collateral value must be at least 120% of loan amount';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Please fix the errors in the form');
            return;
        }

        try {
            await dispatch(createLoanRequest({
                loanAmount: parseFloat(formData.amount),
                purpose: formData.purpose,
                durationMonths: parseInt(formData.durationMonths),
                collateralType: formData.collateralType,
                collateralDescription: formData.collateralDescription,
                collateralValue: parseFloat(formData.collateralValue),
            })).unwrap();

            toast.success('Loan request submitted successfully!');
            setShowCreateModal(false);
            setFormData({
                amount: '',
                purpose: '',
                durationMonths: '12',
                collateralType: 'real_estate',
                collateralDescription: '',
                collateralValue: '',
            });
            dispatch(getMyLoanRequests());
        } catch (error) {
            toast.error(error.message || 'Failed to submit loan request');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            PENDING: 'bg-yellow-100 text-yellow-800',
            VERIFIED: 'bg-blue-100 text-blue-800',
            FUNDED: 'bg-green-100 text-green-800',
            REJECTED: 'bg-red-100 text-red-800',
            CANCELLED: 'bg-slate-100 text-slate-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getInterestRate = (amount) => {
        if (amount < 5000) return 12;
        if (amount < 20000) return 10;
        if (amount < 50000) return 8;
        return 6;
    };

    const calculateMonthlyPayment = (amount, months, rate) => {
        const monthlyRate = rate / 100 / 12;
        return (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold">Loan Requests</h1>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary text-sm"
                >
                    New Request
                </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold">{myLoanRequests?.length || 0}</p>
                        <p className="text-sm text-slate-500">Total Requests</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-yellow-600">
                            {myLoanRequests?.filter(r => r.status === 'PENDING').length || 0}
                        </p>
                        <p className="text-sm text-slate-500">Pending</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">
                            {myLoanRequests?.filter(r => r.status === 'FUNDED').length || 0}
                        </p>
                        <p className="text-sm text-slate-500">Funded</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-red-600">
                            {myLoanRequests?.filter(r => r.status === 'REJECTED').length || 0}
                        </p>
                        <p className="text-sm text-slate-500">Rejected</p>
                    </div>
                </div>
            </div>

            {/* Loan Requests List */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Your Loan Requests</h2>

                {isLoading ? (
                    <div className="card p-6 text-center">
                        <div className="animate-pulse">Loading requests...</div>
                    </div>
                ) : !myLoanRequests || myLoanRequests.length === 0 ? (
                    <div className="card p-6 text-center text-slate-500">
                        <p>No loan requests found.</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="text-emerald-600 hover:underline mt-2 inline-block"
                        >
                            Create your first request
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {myLoanRequests.map((request) => {
                            const interestRate = getInterestRate(request.loanAmount);
                            const monthlyPayment = calculateMonthlyPayment(
                                request.loanAmount,
                                request.durationMonths,
                                interestRate
                            );
                            const collateralRatio = (request.collateralValue / request.loanAmount) * 100;

                            return (
                                <div key={request.id} className="card hover:shadow-lg transition-shadow">
                                    <div className="p-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-semibold">Loan Request #{request.id}</h3>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                                        {request.status}
                                                    </span>
                                                </div>
                                                <p className="text-slate-500 mt-1">
                                                    {request.purpose}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-bold">{formatCurrency(request.loanAmount)}</p>
                                                <p className="text-sm text-slate-500">{interestRate}% APR</p>
                                            </div>
                                        </div>

                                        {/* Details Grid */}
                                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-slate-50 p-3 rounded-lg">
                                                <p className="text-xs text-slate-500">Duration</p>
                                                <p className="font-semibold">{request.durationMonths} months</p>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-lg">
                                                <p className="text-xs text-slate-500">Monthly Payment</p>
                                                <p className="font-semibold">{formatCurrency(monthlyPayment)}</p>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-lg">
                                                <p className="text-xs text-slate-500">Collateral Type</p>
                                                <p className="font-semibold capitalize">{request.collateralType?.replace('_', ' ')}</p>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-lg">
                                                <p className="text-xs text-slate-500">Collateral Ratio</p>
                                                <p className={`font-semibold ${collateralRatio >= 120 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {collateralRatio.toFixed(0)}%
                                                </p>
                                            </div>
                                        </div>

                                        {/* Timeline/Status */}
                                        {request.status === 'PENDING' && (
                                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                <p className="text-sm text-yellow-800">
                                                    ⏳ Your loan request is being reviewed. This typically takes 1-3 business days.
                                                </p>
                                            </div>
                                        )}
                                        {request.status === 'VERIFIED' && (
                                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                <p className="text-sm text-blue-800">
                                                    ✓ Your collateral has been verified. Waiting for lenders to fund.
                                                </p>
                                            </div>
                                        )}
                                        {request.status === 'FUNDED' && (
                                            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                                <p className="text-sm text-green-800">
                                                    🎉 Congratulations! Your loan has been funded. Check your wallet for the disbursement.
                                                </p>
                                            </div>
                                        )}
                                        {request.status === 'REJECTED' && (
                                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <p className="text-sm text-red-800">
                                                    ✕ Your loan request was rejected. Reason: {request.rejectionReason || 'Not specified'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
                    <div className="card max-w-2xl w-full mx-4 my-8">
                        <div className="p-6 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold">Create Loan Request</h2>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Loan Amount */}
                                <div>
                                    <label className="block text-sm font-medium mb-1">Loan Amount (NGN) *</label>
                                    <input
                                        type="number"
                                        className={`input-field w-full ${errors.amount ? 'border-red-500' : ''}`}
                                        placeholder="Enter amount"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        min="100"
                                    />
                                    {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
                                </div>

                                {/* Purpose */}
                                <div>
                                    <label className="block text-sm font-medium mb-1">Loan Purpose *</label>
                                    <textarea
                                        className={`input-field w-full h-24 ${errors.purpose ? 'border-red-500' : ''}`}
                                        placeholder="Describe the purpose of your loan..."
                                        value={formData.purpose}
                                        onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                    />
                                    {errors.purpose && <p className="text-red-500 text-xs mt-1">{errors.purpose}</p>}
                                </div>

                                {/* Duration */}
                                <div>
                                    <label className="block text-sm font-medium mb-1">Loan Duration *</label>
                                    <select
                                        className={`input-field w-full ${errors.durationMonths ? 'border-red-500' : ''}`}
                                        value={formData.durationMonths}
                                        onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value })}
                                    >
                                        <option value="3">3 months</option>
                                        <option value="6">6 months</option>
                                        <option value="12">12 months</option>
                                        <option value="18">18 months</option>
                                        <option value="24">24 months</option>
                                        <option value="36">36 months</option>
                                        <option value="48">48 months</option>
                                        <option value="60">60 months</option>
                                    </select>
                                    {errors.durationMonths && <p className="text-red-500 text-xs mt-1">{errors.durationMonths}</p>}
                                </div>

                                {/* Interest Rate Preview */}
                                {formData.amount && (
                                    <div className="bg-slate-50 p-3 rounded-lg">
                                        <p className="text-sm text-slate-600">
                                            Estimated Interest Rate: <span className="font-semibold">{getInterestRate(parseFloat(formData.amount) || 0)}% APR</span>
                                            {formData.amount && formData.durationMonths && (
                                                <span className="ml-2">
                                                    | Monthly: ~{formatCurrency(calculateMonthlyPayment(
                                                        parseFloat(formData.amount) || 0,
                                                        parseInt(formData.durationMonths),
                                                        getInterestRate(parseFloat(formData.amount) || 0)
                                                    ))}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                )}

                                {/* Collateral Type */}
                                <div>
                                    <label className="block text-sm font-medium mb-1">Collateral Type *</label>
                                    <select
                                        className="input-field w-full"
                                        value={formData.collateralType}
                                        onChange={(e) => setFormData({ ...formData, collateralType: e.target.value })}
                                    >
                                        <option value="real_estate">Real Estate</option>
                                        <option value="vehicle">Vehicle</option>
                                        <option value="equipment">Equipment</option>
                                        <option value="inventory">Inventory</option>
                                        <option value="invoice">Invoice</option>
                                        <option value="stocks">Stocks/Securities</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                {/* Collateral Description */}
                                <div>
                                    <label className="block text-sm font-medium mb-1">Collateral Description *</label>
                                    <textarea
                                        className={`input-field w-full h-20 ${errors.collateralDescription ? 'border-red-500' : ''}`}
                                        placeholder="Describe your collateral in detail..."
                                        value={formData.collateralDescription}
                                        onChange={(e) => setFormData({ ...formData, collateralDescription: e.target.value })}
                                    />
                                    {errors.collateralDescription && <p className="text-red-500 text-xs mt-1">{errors.collateralDescription}</p>}
                                </div>

                                {/* Collateral Value */}
                                <div>
                                    <label className="block text-sm font-medium mb-1">Collateral Value (NGN) *</label>
                                    <input
                                        type="number"
                                        className={`input-field w-full ${errors.collateralValue ? 'border-red-500' : ''}`}
                                        placeholder="Estimated value"
                                        value={formData.collateralValue}
                                        onChange={(e) => setFormData({ ...formData, collateralValue: e.target.value })}
                                        min="100"
                                    />
                                    {errors.collateralValue && <p className="text-red-500 text-xs mt-1">{errors.collateralValue}</p>}
                                    {formData.amount && formData.collateralValue && (
                                        <p className={`text-xs mt-1 ${(parseFloat(formData.collateralValue) / parseFloat(formData.amount)) >= 1.2
                                            ? 'text-green-600'
                                            : 'text-red-500'
                                            }`}>
                                            Collateral ratio: {((parseFloat(formData.collateralValue) / parseFloat(formData.amount)) * 100).toFixed(0)}%
                                            (minimum 120% required)
                                        </p>
                                    )}
                                </div>

                                {/* Submit Buttons */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        className="btn-secondary flex-1"
                                        onClick={() => setShowCreateModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary flex-1"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Submitting...' : 'Submit Request'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LoanRequests;
