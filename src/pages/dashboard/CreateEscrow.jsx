import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { createEscrow } from '../../store/slices/escrowSlice';
import { createEscrowSchema, validateForm } from '../../utils/validation';
import { formatCurrency } from '../../utils/formatters';

function CreateEscrow() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { wallet } = useSelector((state) => state.wallet);
    const { isLoading } = useSelector((state) => state.escrow);

    const [formData, setFormData] = useState({
        transactionType: 'purchase',
        amount: '',
        shippingFee: '10',
        sellerAddress: '',
        description: '',
        expectedDeliveryDays: '7',
    });
    const [errors, setErrors] = useState({});

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate with Zod
        const validationErrors = validateForm(createEscrowSchema, formData);

        // Check wallet balance
        const total = parseFloat(formData.amount) + parseFloat(formData.shippingFee || 0);
        if (wallet && wallet.balance < total) {
            validationErrors.amount = 'Insufficient wallet balance';
        }

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error('Please fix the errors in the form');
            return;
        }

        try {
            const result = await dispatch(createEscrow({
                transactionType: formData.transactionType,
                amount: parseFloat(formData.amount),
                shippingFee: parseFloat(formData.shippingFee) || 0,
                sellerAddress: formData.sellerAddress,
                description: formData.description,
                expectedDeliveryDays: parseInt(formData.expectedDeliveryDays),
            })).unwrap();

            toast.success('Escrow transaction created successfully!');
            navigate('/dashboard/escrow');
        } catch (error) {
            toast.error(error.message || 'Failed to create escrow transaction');
        }
    };

    const totalAmount = parseFloat(formData.amount || 0) + parseFloat(formData.shippingFee || 0);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Create Escrow Transaction</h1>

            {/* Escrow Info Banner */}
            <div className="card bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                <div className="p-6">
                    <h2 className="text-xl font-semibold mb-2">Secure Escrow Service</h2>
                    <p className="text-sm opacity-90">
                        Your funds are protected until you confirm delivery. If there are any issues,
                        you can open a dispute and our team will help resolve it.
                    </p>
                </div>
            </div>

            {/* Wallet Balance */}
            <div className="card">
                <div className="p-4 flex justify-between items-center">
                    <div>
                        <p className="text-sm text-slate-500">Your Wallet Balance</p>
                        <p className="text-2xl font-bold">{formatCurrency(wallet?.balance || 0)}</p>
                    </div>
                    <button className="btn-secondary">
                        Add Funds
                    </button>
                </div>
            </div>

            {/* Transaction Form */}
            <div className="card">
                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Transaction Type */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Transaction Type</label>
                            <div className="grid grid-cols-2 gap-4">
                                <label className={`cursor-pointer border-2 rounded-lg p-4 transition-colors ${formData.transactionType === 'purchase'
                                    ? 'border-emerald-500 bg-emerald-50'
                                    : 'border-slate-200 hover:border-slate-300'
                                    }`}>
                                    <input
                                        type="radio"
                                        name="transactionType"
                                        value="purchase"
                                        checked={formData.transactionType === 'purchase'}
                                        onChange={(e) => setFormData({ ...formData, transactionType: e.target.value })}
                                        className="sr-only"
                                    />
                                    <div className="text-center">
                                        <span className="text-2xl">🛒</span>
                                        <p className="font-semibold mt-2">Purchase</p>
                                        <p className="text-xs text-slate-500">Buy goods or services</p>
                                    </div>
                                </label>
                                <label className={`cursor-pointer border-2 rounded-lg p-4 transition-colors ${formData.transactionType === 'custom'
                                    ? 'border-emerald-500 bg-emerald-50'
                                    : 'border-slate-200 hover:border-slate-300'
                                    }`}>
                                    <input
                                        type="radio"
                                        name="transactionType"
                                        value="custom"
                                        checked={formData.transactionType === 'custom'}
                                        onChange={(e) => setFormData({ ...formData, transactionType: e.target.value })}
                                        className="sr-only"
                                    />
                                    <div className="text-center">
                                        <span className="text-2xl">📝</span>
                                        <p className="font-semibold mt-2">Custom</p>
                                        <p className="text-xs text-slate-500">Custom agreement</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Transaction Amount (NGN) *</label>
                            <input
                                type="number"
                                className={`input-field w-full ${errors.amount ? 'border-red-500' : ''}`}
                                placeholder="Enter amount"
                                value={formData.amount}
                                onChange={(e) => {
                                    setFormData({ ...formData, amount: e.target.value });
                                    if (errors.amount) setErrors(prev => ({ ...prev, amount: '' }));
                                }}
                                min="1"
                                step="0.01"
                            />
                            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
                        </div>

                        {/* Shipping Fee */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Shipping Fee (NGN)</label>
                            <input
                                type="number"
                                className="input-field w-full"
                                placeholder="Shipping cost"
                                value={formData.shippingFee}
                                onChange={(e) => setFormData({ ...formData, shippingFee: e.target.value })}
                                min="0"
                                step="0.01"
                            />
                        </div>

                        {/* Total Preview */}
                        {formData.amount && (
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <div className="flex justify-between text-sm">
                                    <span>Transaction Amount:</span>
                                    <span>{formatCurrency(parseFloat(formData.amount) || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-2">
                                    <span>Shipping Fee:</span>
                                    <span>{formatCurrency(parseFloat(formData.shippingFee) || 0)}</span>
                                </div>
                                <div className="flex justify-between font-semibold mt-2 pt-2 border-t">
                                    <span>Total:</span>
                                    <span>{formatCurrency(totalAmount)}</span>
                                </div>
                                {wallet && (
                                    <div className={`text-sm mt-2 ${wallet.balance >= totalAmount ? 'text-green-600' : 'text-red-600'}`}>
                                        {wallet.balance >= totalAmount ? '✓ Sufficient balance' : '✕ Insufficient balance'}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Seller Address */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Seller Wallet Address *</label>
                            <input
                                type="text"
                                className={`input-field w-full font-mono text-sm ${errors.sellerAddress ? 'border-red-500' : ''}`}
                                placeholder="0x..."
                                value={formData.sellerAddress}
                                onChange={(e) => {
                                    setFormData({ ...formData, sellerAddress: e.target.value });
                                    if (errors.sellerAddress) setErrors(prev => ({ ...prev, sellerAddress: '' }));
                                }}
                            />
                            {errors.sellerAddress && <p className="text-red-500 text-xs mt-1">{errors.sellerAddress}</p>}
                            <p className="text-xs text-slate-500 mt-1">
                                Enter the Ethereum wallet address of the seller
                            </p>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Transaction Description *</label>
                            <textarea
                                className={`input-field w-full h-24 ${errors.description ? 'border-red-500' : ''}`}
                                placeholder="Describe what you're paying for..."
                                value={formData.description}
                                onChange={(e) => {
                                    setFormData({ ...formData, description: e.target.value });
                                    if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
                                }}
                            />
                            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                        </div>

                        {/* Expected Delivery */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Expected Delivery (Days)</label>
                            <select
                                className="input-field w-full"
                                value={formData.expectedDeliveryDays}
                                onChange={(e) => setFormData({ ...formData, expectedDeliveryDays: e.target.value })}
                            >
                                <option value="3">3 days</option>
                                <option value="5">5 days</option>
                                <option value="7">7 days</option>
                                <option value="14">14 days</option>
                                <option value="21">21 days</option>
                                <option value="30">30 days</option>
                            </select>
                        </div>

                        {/* Terms Notice */}
                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                            <p className="text-sm text-yellow-800">
                                <strong>Important:</strong> By creating this escrow transaction, you agree that:
                            </p>
                            <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside">
                                <li>Funds will be held securely until you confirm delivery</li>
                                <li>You must confirm delivery within 14 days or funds will be released automatically</li>
                                <li>You can open a dispute at any time before confirmation</li>
                            </ul>
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                className="btn-secondary flex-1"
                                onClick={() => navigate('/dashboard/escrow')}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary flex-1"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Creating...' : 'Create Escrow'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* How It Works */}
            <div className="card">
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">How Escrow Works</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-xl">1</span>
                            </div>
                            <p className="font-medium">Fund Escrow</p>
                            <p className="text-sm text-slate-500">You send funds to secure escrow</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-xl">2</span>
                            </div>
                            <p className="font-medium">Seller Ships</p>
                            <p className="text-sm text-slate-500">Seller ships goods/services</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-xl">3</span>
                            </div>
                            <p className="font-medium">You Verify</p>
                            <p className="text-sm text-slate-500">You confirm delivery received</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-xl">4</span>
                            </div>
                            <p className="font-medium">Funds Released</p>
                            <p className="text-sm text-slate-500">Payment sent to seller</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CreateEscrow;
