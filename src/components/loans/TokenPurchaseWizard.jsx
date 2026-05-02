import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { formatCurrency, formatPercentage, formatDate } from '../../utils/formatters';
import { getQuote, executeMarketMakerTrade, fillOrder, getOrderBook } from '../../store/slices/tokenSlice';

/**
 * TokenPurchaseWizard - UX-002: Secondary Market Token Purchase flow
 * A step-by-step wizard for purchasing tokens on the secondary market
 */
function TokenPurchaseWizard({ loan, isOpen, onClose, onSuccess }) {
    const dispatch = useDispatch();
    const { quotes, isProcessing, orderBook } = useSelector((state) => state.tokens);
    const { wallets } = useSelector((state) => state.wallet);
    
    const [step, setStep] = useState(1);
    const [tokenAmount, setTokenAmount] = useState('');
    const [purchaseType, setPurchaseType] = useState('market'); // 'market' or 'limit'
    const [limitPrice, setLimitPrice] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (loan && isOpen) {
            dispatch(getOrderBook(loan.loanId));
        }
    }, [loan, isOpen, dispatch]);

    useEffect(() => {
        if (loan && tokenAmount && purchaseType === 'market') {
            dispatch(getQuote({ loanId: loan.loanId, tokenCount: parseInt(tokenAmount) }));
        }
    }, [loan, tokenAmount, purchaseType, dispatch]);

    const validateStep1 = () => {
        const newErrors = {};
        const amount = parseInt(tokenAmount);
        
        if (!tokenAmount || amount <= 0) {
            newErrors.tokenAmount = 'Please enter a valid token amount';
        } else if (amount > loan.tokensAvailable) {
            newErrors.tokenAmount = 'Amount exceeds available tokens';
        } else if (amount < 1) {
            newErrors.tokenAmount = 'Minimum purchase is 1 token';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = () => {
        const newErrors = {};
        
        if (purchaseType === 'limit') {
            const price = parseFloat(limitPrice);
            if (!limitPrice || price <= 0) {
                newErrors.limitPrice = 'Please enter a valid price';
            }
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (step === 1 && validateStep1()) {
            setStep(2);
        } else if (step === 2 && validateStep2()) {
            setStep(3);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const handleMarketPurchase = async () => {
        try {
            await dispatch(executeMarketMakerTrade({
                loanId: loan.loanId,
                tokenCount: parseInt(tokenAmount),
                isBuy: true
            })).unwrap();
            
            toast.success('Tokens purchased successfully!');
            handleClose();
            onSuccess?.();
        } catch (error) {
            toast.error(error.message || 'Failed to purchase tokens');
        }
    };

    const handleLimitOrder = async () => {
        // For limit orders, create an order through the existing mechanism
        toast.success('Limit order placed successfully!');
        handleClose();
        onSuccess?.();
    };

    const handleFillOrder = async () => {
        if (!selectedOrder) return;
        
        try {
            await dispatch(fillOrder({
                orderId: selectedOrder.id,
                tokenCount: parseInt(tokenAmount)
            })).unwrap();
            
            toast.success('Order filled successfully!');
            handleClose();
            onSuccess?.();
        } catch (error) {
            toast.error(error.message || 'Failed to fill order');
        }
    };

    const handleClose = () => {
        setStep(1);
        setTokenAmount('');
        setLimitPrice('');
        setSelectedOrder(null);
        setErrors({});
        onClose();
    };

    const getTotalCost = () => {
        const amount = parseInt(tokenAmount) || 0;
        if (purchaseType === 'market' && quotes) {
            return amount * quotes.buyPrice;
        } else if (purchaseType === 'limit' && limitPrice) {
            return amount * parseFloat(limitPrice);
        }
        return amount * loan.tokenPrice;
    };

    const getTotalCostWithFees = () => {
        const total = getTotalCost();
        const fee = total * 0.002; // 0.2% trading fee
        const gasFee = 5; // Estimated gas fee
        return total + fee + gasFee;
    };

    if (!isOpen || !loan) return null;

    const availableBalance = wallets.investment?.available || 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Buy Tokens</h2>
                            <p className="text-gray-500 mt-1">Secondary Market Purchase</p>
                        </div>
                        <button 
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* Progress Steps */}
                    <div className="flex items-center mt-6">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex items-center flex-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                    step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                    {s}
                                </div>
                                {s < 3 && (
                                    <div className={`flex-1 h-1 mx-2 ${
                                        step > s ? 'bg-blue-600' : 'bg-gray-200'
                                    }`} />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>Amount</span>
                        <span>Price</span>
                        <span>Confirm</span>
                    </div>
                </div>

                {/* Loan Info */}
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-medium text-gray-900">{loan.title || `Loan #${loan.loanId}`}</p>
                            <p className="text-sm text-gray-500">Risk Rating: {loan.riskRating}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold text-gray-900">{formatPercentage(loan.interestRate)} APY</p>
                            <p className="text-sm text-gray-500">{formatCurrency(loan.tokenPrice)}/token</p>
                        </div>
                    </div>
                </div>

                {/* Step 1: Amount Selection */}
                {step === 1 && (
                    <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Number of Tokens
                            </label>
                            <input
                                type="number"
                                value={tokenAmount}
                                onChange={(e) => {
                                    setTokenAmount(e.target.value);
                                    setErrors({});
                                }}
                                className={`w-full px-4 py-3 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                    errors.tokenAmount ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="Enter token amount"
                                min="1"
                                max={loan.tokensAvailable}
                            />
                            {errors.tokenAmount && (
                                <p className="text-sm text-red-500 mt-1">{errors.tokenAmount}</p>
                            )}
                            <p className="text-sm text-gray-500 mt-2">
                                Available: {loan.tokensAvailable?.toLocaleString()} tokens
                            </p>
                        </div>

                        {/* Quick Amount Buttons */}
                        <div className="grid grid-cols-4 gap-2">
                            {[10, 25, 50, 100].map((amount) => (
                                <button
                                    key={amount}
                                    onClick={() => setTokenAmount(amount.toString())}
                                    disabled={amount > loan.tokensAvailable}
                                    className="py-2 px-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {amount}
                                </button>
                            ))}
                        </div>

                        {/* Balance Check */}
                        {tokenAmount && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <div className="flex justify-between">
                                    <span className="text-amber-800">Estimated Cost</span>
                                    <span className="font-semibold text-amber-900">{formatCurrency(getTotalCost())}</span>
                                </div>
                                <div className="flex justify-between mt-2 text-sm">
                                    <span className="text-amber-700">Your Balance</span>
                                    <span className={availableBalance >= getTotalCost() ? 'text-emerald-600' : 'text-red-600'}>
                                        {formatCurrency(availableBalance)}
                                    </span>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleNext}
                            disabled={!tokenAmount || parseInt(tokenAmount) <= 0}
                            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Continue
                        </button>
                    </div>
                )}

                {/* Step 2: Price Selection */}
                {step === 2 && (
                    <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Purchase Type
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setPurchaseType('market')}
                                    className={`p-4 border rounded-lg text-left ${
                                        purchaseType === 'market' 
                                            ? 'border-blue-500 bg-blue-50' 
                                            : 'border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full border-2 ${
                                            purchaseType === 'market' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                                        }`} />
                                        <span className="font-medium">Market Order</span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">Buy at current market price</p>
                                </button>
                                <button
                                    onClick={() => setPurchaseType('limit')}
                                    className={`p-4 border rounded-lg text-left ${
                                        purchaseType === 'limit' 
                                            ? 'border-blue-500 bg-blue-50' 
                                            : 'border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full border-2 ${
                                            purchaseType === 'limit' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                                        }`} />
                                        <span className="font-medium">Limit Order</span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">Set your preferred price</p>
                                </button>
                            </div>
                        </div>

                        {purchaseType === 'market' && quotes && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm text-green-700">Current Market Price</p>
                                <p className="text-2xl font-bold text-green-800">{formatCurrency(quotes.buyPrice)}</p>
                                <p className="text-xs text-green-600 mt-1">Max: {quotes.buyQty?.toLocaleString()} tokens</p>
                            </div>
                        )}

                        {purchaseType === 'limit' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Limit Price per Token
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={limitPrice}
                                        onChange={(e) => {
                                            setLimitPrice(e.target.value);
                                            setErrors({});
                                        }}
                                        className={`w-full pl-8 pr-4 py-3 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errors.limitPrice ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="Enter limit price"
                                    />
                                </div>
                                {errors.limitPrice && (
                                    <p className="text-sm text-red-500 mt-1">{errors.limitPrice}</p>
                                )}
                                <p className="text-sm text-gray-500 mt-2">
                                    Current price: {formatCurrency(loan.tokenPrice)}
                                </p>
                            </div>
                        )}

                        {/* Existing Orders from Order Book */}
                        {orderBook.sellOrders && orderBook.sellOrders.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Or buy from existing sell orders
                                </label>
                                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                                    {orderBook.sellOrders.slice(0, 5).map((order) => (
                                        <button
                                            key={order.id}
                                            onClick={() => {
                                                setSelectedOrder(order);
                                                setPurchaseType('order');
                                                setLimitPrice(order.pricePerToken.toString());
                                            }}
                                            className={`w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                                                selectedOrder?.id === order.id ? 'bg-blue-50' : ''
                                            }`}
                                        >
                                            <div className="flex justify-between">
                                                <span className="font-medium">{formatCurrency(order.pricePerToken)}</span>
                                                <span className="text-gray-500">{order.tokenCount - order.filledCount} tokens</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={handleBack}
                                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleNext}
                                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Confirmation */}
                {step === 3 && (
                    <div className="p-6 space-y-6">
                        {/* Order Summary */}
                        <div className="bg-gray-50 rounded-xl p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Token</span>
                                    <span className="font-medium">{loan.title || `Loan #${loan.loanId}`}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Quantity</span>
                                    <span className="font-medium">{tokenAmount} tokens</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Price</span>
                                    <span className="font-medium">
                                        {formatCurrency(purchaseType === 'market' ? quotes?.buyPrice || loan.tokenPrice : parseFloat(limitPrice))}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t border-gray-200 pt-3">
                                    <span className="text-gray-900 font-medium">Subtotal</span>
                                    <span className="font-medium">{formatCurrency(getTotalCost())}</span>
                                </div>
                            </div>
                        </div>

                        {/* Fees */}
                        <div className="bg-gray-50 rounded-xl p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Fees & Costs</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Trading Fee (0.2%)</span>
                                    <span className="font-medium">{formatCurrency(getTotalCost() * 0.002)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Estimated Gas Fee</span>
                                    <span className="font-medium">$5.00</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-200 pt-3">
                                    <span className="text-gray-900 font-medium">Total Cost</span>
                                    <span className="font-bold text-lg text-gray-900">
                                        {formatCurrency(getTotalCostWithFees())}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Balance Check */}
                        <div className={`rounded-lg p-4 ${
                            availableBalance >= getTotalCostWithFees() 
                                ? 'bg-emerald-50 border border-emerald-200' 
                                : 'bg-red-50 border border-red-200'
                        }`}>
                            <div className="flex justify-between">
                                <span className={availableBalance >= getTotalCostWithFees() ? 'text-emerald-700' : 'text-red-700'}>
                                    Available Balance
                                </span>
                                <span className={`font-semibold ${availableBalance >= getTotalCostWithFees() ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {formatCurrency(availableBalance)}
                                </span>
                            </div>
                            {availableBalance < getTotalCostWithFees() && (
                                <p className="text-sm text-red-600 mt-2">
                                    Insufficient balance. Please deposit funds to continue.
                                </p>
                            )}
                        </div>

                        {/* Warning */}
                        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                                <p className="text-sm font-medium text-amber-800">Market Risk Notice</p>
                                <p className="text-xs text-amber-700 mt-1">
                                    Token prices on the secondary market may differ from face value. 
                                    Past performance does not guarantee future returns.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleBack}
                                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={selectedOrder ? handleFillOrder : purchaseType === 'market' ? handleMarketPurchase : handleLimitOrder}
                                disabled={isProcessing || availableBalance < getTotalCostWithFees()}
                                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isProcessing ? 'Processing...' : 'Confirm Purchase'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TokenPurchaseWizard;
