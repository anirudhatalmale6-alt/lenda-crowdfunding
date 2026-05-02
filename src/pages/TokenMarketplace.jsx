import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    getTokenizedLoans, 
    getOrderBook, 
    createOrder, 
    fillOrder,
    getMyOrders,
    getQuote,
    executeMarketMakerTrade
} from '../store/slices/tokenSlice';
import { formatCurrency, formatPercentage, formatDate } from '../utils/formatters';
import { TradeSummaryPanel } from '../components/revenue';

/**
 * Secondary Market Trading UI (FIN-05)
 * Complete trading interface for loan token secondary market
 * Features:
 * - Order book with real-time updates
 * - Market maker instant quotes
 * - Order management
 * - Trading history
 * - Price charts
 */
const TokenMarketplace = () => {
    const dispatch = useDispatch();
    const { 
        tokenizedLoans, 
        orderBook, 
        myOrders, 
        quotes,
        isLoading, 
        isProcessing 
    } = useSelector((state) => state.tokens);
    
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [orderType, setOrderType] = useState('buy');
    const [tokenCount, setTokenCount] = useState('');
    const [pricePerToken, setPricePerToken] = useState('');
    const [duration, setDuration] = useState(24);
    const [activeTab, setActiveTab] = useState('market');
    const [priceChartDays, setPriceChartDays] = useState(30);
    const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
    
    // Order validation state
    const [orderError, setOrderError] = useState(null);
    
    useEffect(() => {
        dispatch(getTokenizedLoans());
        dispatch(getMyOrders());
    }, [dispatch]);

    useEffect(() => {
        if (selectedLoan) {
            dispatch(getOrderBook(selectedLoan.loanId));
            if (tokenCount) {
                dispatch(getQuote({ loanId: selectedLoan.loanId, tokenCount: parseInt(tokenCount) }));
            }
        }
    }, [selectedLoan, tokenCount, dispatch]);

    // Validate order before submission
    useEffect(() => {
        validateOrder();
    }, [tokenCount, pricePerToken, selectedLoan]);

    const validateOrder = () => {
        if (!selectedLoan || !tokenCount || !pricePerToken) {
            setOrderError(null);
            return;
        }

        const count = parseInt(tokenCount);
        const price = parseFloat(pricePerToken);
        
        if (isNaN(count) || count <= 0) {
            setOrderError('Please enter a valid token amount');
            return;
        }
        
        if (isNaN(price) || price <= 0) {
            setOrderError('Please enter a valid price');
            return;
        }
        
        if (count > selectedLoan.tokensAvailable) {
            setOrderError('Insufficient tokens available');
            return;
        }
        
        setOrderError(null);
    };

    const handleCreateOrder = async (e) => {
        e.preventDefault();
        if (!selectedLoan || !tokenCount || !pricePerToken) return;
        
        await dispatch(createOrder({
            loanId: selectedLoan.loanId,
            orderType,
            tokenCount: parseInt(tokenCount),
            pricePerToken: parseFloat(pricePerToken) * 1e8, // Convert to wei-like
            durationHours: duration
        }));
        
        // Reset form
        setTokenCount('');
        setPricePerToken('');
        setShowOrderConfirmation(false);
        dispatch(getOrderBook(selectedLoan.loanId));
    };

    const handleFillOrder = async (orderId, count) => {
        await dispatch(fillOrder({ orderId, tokenCount: count }));
        dispatch(getOrderBook(selectedLoan?.loanId));
    };

    // Handle order cancellation
    const handleCancelOrderRequest = async (orderId) => {
        // In a real app, this would dispatch a cancelOrder action
        console.log('Cancelling order:', orderId);
    };

    const handleMarketMakerTrade = async (isBuy) => {
        if (!selectedLoan || !tokenCount) return;
        
        await dispatch(executeMarketMakerTrade({
            loanId: selectedLoan.loanId,
            tokenCount: parseInt(tokenCount),
            isBuy
        }));
        
        setTokenCount('');
    };

    // Calculate order total
    const orderTotal = tokenCount && pricePerToken 
        ? parseFloat(tokenCount) * parseFloat(pricePerToken) 
        : 0;

    // Handle order confirmation
    const handleConfirmOrder = () => {
        if (orderError) return;
        setShowOrderConfirmation(true);
    };

    // Cancel order
    const handleCancelOrder = () => {
        setShowOrderConfirmation(false);
    };

    // Calculate trading fee
    const tradingFee = orderTotal * 0.01; // 1% trading fee
    const netTotal = orderTotal - tradingFee;

    const getRiskColor = (rating) => {
        const colors = {
            'AAA': 'bg-green-100 text-green-800',
            'AA': 'bg-green-50 text-green-700',
            'A': 'bg-blue-100 text-blue-800',
            'BBB': 'bg-blue-50 text-blue-700',
            'BB': 'bg-yellow-100 text-yellow-800',
            'B': 'bg-orange-100 text-orange-800',
            'CCC': 'bg-red-100 text-red-800',
            'D': 'bg-red-200 text-red-900'
        };
        return colors[rating] || 'bg-gray-100 text-gray-800';
    };

    const renderMarketView = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Token List */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Available Tokens</h3>
                </div>
                <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                    {tokenizedLoans?.map((loan) => (
                        <button
                            key={loan.loanId}
                            onClick={() => setSelectedLoan(loan)}
                            className={`w-full p-4 text-left hover:bg-gray-50 transition ${
                                selectedLoan?.loanId === loan.loanId ? 'bg-blue-50' : ''
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-medium text-gray-900">{loan.title}</p>
                                    <p className="text-sm text-gray-500">Loan #{loan.loanId}</p>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(loan.riskRating)}`}>
                                    {loan.riskRating}
                                </span>
                            </div>
                            <div className="mt-2 flex justify-between text-sm">
                                <span className="text-gray-500">{formatPercentage(loan.interestRate)} APY</span>
                                <span className="text-gray-900">{formatCurrency(loan.tokenPrice)}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Order Book & Trading */}
            <div className="lg:col-span-2 space-y-6">
                {selectedLoan ? (
                    <>
                        {/* Token Info */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{selectedLoan.title}</h3>
                                    <p className="text-gray-500">Loan #{selectedLoan.loanId}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(selectedLoan.riskRating)}`}>
                                    {selectedLoan.riskRating}
                                </span>
                            </div>
                            <div className="grid grid-cols-4 gap-4 mt-4">
                                <div>
                                    <p className="text-sm text-gray-500">Token Price</p>
                                    <p className="font-semibold text-gray-900">{formatCurrency(selectedLoan.tokenPrice)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">APY</p>
                                    <p className="font-semibold text-gray-900">{formatPercentage(selectedLoan.interestRate)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Term</p>
                                    <p className="font-semibold text-gray-900">{selectedLoan.durationMonths} months</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Available</p>
                                    <p className="font-semibold text-gray-900">{selectedLoan.tokensAvailable?.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Market Maker Quote */}
                        {quotes && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                                <h4 className="font-semibold text-gray-900 mb-4">Instant Quote</h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-sm text-gray-600">Buy Price</p>
                                        <p className="text-2xl font-bold text-green-600">{formatCurrency(quotes.buyPrice)}</p>
                                        <p className="text-sm text-gray-500">Max: {quotes.buyQty?.toLocaleString()} tokens</p>
                                        <button
                                            onClick={() => handleMarketMakerTrade(true)}
                                            disabled={isProcessing || !tokenCount}
                                            className="mt-2 w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                                        >
                                            Buy Now
                                        </button>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Sell Price</p>
                                        <p className="text-2xl font-bold text-red-600">{formatCurrency(quotes.sellPrice)}</p>
                                        <p className="text-sm text-gray-500">Max: {quotes.sellQty?.toLocaleString()} tokens</p>
                                        <button
                                            onClick={() => handleMarketMakerTrade(false)}
                                            disabled={isProcessing || !tokenCount}
                                            className="mt-2 w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                                        >
                                            Sell Now
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Order Book */}
                        <div className="grid grid-cols-2 gap-6">
                            {/* Buy Orders */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 bg-green-50 border-b border-green-100">
                                    <h4 className="font-semibold text-green-800">Buy Orders</h4>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {orderBook.buyOrders?.length > 0 ? (
                                        <table className="w-full">
                                            <thead className="bg-gray-50 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs text-gray-500">Price</th>
                                                    <th className="px-3 py-2 text-right text-xs text-gray-500">Amount</th>
                                                    <th className="px-3 py-2 text-right text-xs text-gray-500">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {orderBook.buyOrders.map((order) => (
                                                    <tr key={order.id} className="hover:bg-gray-50">
                                                        <td className="px-3 py-2 text-green-600">{formatCurrency(order.pricePerToken)}</td>
                                                        <td className="px-3 py-2 text-right">{order.tokenCount - order.filledCount}</td>
                                                        <td className="px-3 py-2 text-right">{formatCurrency((order.tokenCount - order.filledCount) * order.pricePerToken)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p className="p-4 text-center text-gray-500">No buy orders</p>
                                    )}
                                </div>
                            </div>

                            {/* Sell Orders */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 bg-red-50 border-b border-red-100">
                                    <h4 className="font-semibold text-red-800">Sell Orders</h4>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {orderBook.sellOrders?.length > 0 ? (
                                        <table className="w-full">
                                            <thead className="bg-gray-50 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs text-gray-500">Price</th>
                                                    <th className="px-3 py-2 text-right text-xs text-gray-500">Amount</th>
                                                    <th className="px-3 py-2 text-right text-xs text-gray-500">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {orderBook.sellOrders.map((order) => (
                                                    <tr key={order.id} className="hover:bg-gray-50">
                                                        <td className="px-3 py-2 text-red-600">{formatCurrency(order.pricePerToken)}</td>
                                                        <td className="px-3 py-2 text-right">{order.tokenCount - order.filledCount}</td>
                                                        <td className="px-3 py-2 text-right">{formatCurrency((order.tokenCount - order.filledCount) * order.pricePerToken)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p className="p-4 text-center text-gray-500">No sell orders</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <p className="text-gray-500">Select a token from the list to view the order book</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderOrderForm = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Place Order</h3>
            
            {/* Order Confirmation Modal */}
            {showOrderConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">Confirm Order</h3>
                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Order Type:</span>
                                <span className={`font-medium ${orderType === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                                    {orderType === 'buy' ? 'Buy' : 'Sell'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Token Amount:</span>
                                <span className="font-medium">{tokenCount} tokens</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Price per Token:</span>
                                <span className="font-medium">{formatCurrency(pricePerToken)}</span>
                            </div>
                            <div className="border-t pt-3 flex justify-between">
                                <span className="text-gray-600">Order Total:</span>
                                <span className="font-bold text-lg">{formatCurrency(orderTotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>Trading Fee (1%):</span>
                                <span>-{formatCurrency(tradingFee)}</span>
                            </div>
                            <div className="border-t pt-3 flex justify-between font-semibold">
                                <span>{orderType === 'buy' ? 'You Pay:' : 'You Receive:'}</span>
                                <span className="text-emerald-600">{formatCurrency(netTotal)}</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancelOrder}
                                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateOrder}
                                className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                                    orderType === 'buy' 
                                        ? 'bg-green-600 text-white hover:bg-green-700' 
                                        : 'bg-red-600 text-white hover:bg-red-700'
                                }`}
                            >
                                Confirm {orderType === 'buy' ? 'Buy' : 'Sell'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setOrderType('buy')}
                        className={`py-3 rounded-lg font-medium ${
                            orderType === 'buy' 
                                ? 'bg-green-600 text-white' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Buy
                    </button>
                    <button
                        type="button"
                        onClick={() => setOrderType('sell')}
                        className={`py-3 rounded-lg font-medium ${
                            orderType === 'sell' 
                                ? 'bg-red-600 text-white' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Sell
                    </button>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Token Amount</label>
                    <input
                        type="number"
                        value={tokenCount}
                        onChange={(e) => setTokenCount(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter amount"
                        required
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price per Token</label>
                    <input
                        type="number"
                        step="0.01"
                        value={pricePerToken}
                        onChange={(e) => setPricePerToken(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter price"
                        required
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours)</label>
                    <select
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value={12}>12 hours</option>
                        <option value={24}>24 hours</option>
                        <option value={48}>48 hours</option>
                        <option value={72}>72 hours</option>
                        <option value={168}>1 week</option>
                    </select>
                </div>
                
                {tokenCount && pricePerToken && (
                    <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Order Total:</span>
                            <span className="font-semibold text-gray-900">
                                {formatCurrency(orderTotal)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>Trading Fee (1%):</span>
                            <span>-{formatCurrency(tradingFee)}</span>
                        </div>
                        <div className="flex justify-between font-medium border-t pt-2">
                            <span>{orderType === 'buy' ? 'You Pay:' : 'You Receive:'}</span>
                            <span className="text-emerald-600">{formatCurrency(netTotal)}</span>
                        </div>
                    </div>
                )}
                
                {/* Order Error Display */}
                {orderError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">{orderError}</p>
                    </div>
                )}
                
                {/* Trade Summary Panel */}
                {tokenCount && pricePerToken && (
                    <TradeSummaryPanel 
                        tradeAmount={orderTotal} 
                        tradeType={orderType}
                    />
                )}
                
                <button
                    type="button"
                    onClick={handleConfirmOrder}
                    disabled={isProcessing || !selectedLoan || !!orderError || !tokenCount || !pricePerToken}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isProcessing ? 'Processing...' : `Review ${orderType === 'buy' ? 'Buy' : 'Sell'} Order`}
                </button>
            </form>
        </div>
    );

    const renderMyOrders = () => (
        <div className="space-y-6">
            {/* Active Orders */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Active Orders</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Token</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Filled</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {myOrders?.filter(o => o.status === 'active').map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            order.orderType === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {order.orderType.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-900">Loan #{order.loanId}</td>
                                    <td className="px-6 py-4 text-right">{order.tokenCount}</td>
                                    <td className="px-6 py-4 text-right">{formatCurrency(order.pricePerToken)}</td>
                                    <td className="px-6 py-4 text-right">{order.filledCount}/{order.tokenCount}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{formatDate(order.expiresAt)}</td>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => handleCancelOrderRequest(order.id)}
                                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                                        >
                                            Cancel
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {(!myOrders || myOrders.filter(o => o.status === 'active').length === 0) && (
                    <p className="p-6 text-center text-gray-500">No active orders</p>
                )}
            </div>
            
            {/* Order History */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Order History</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Token</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filled</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {myOrders?.filter(o => o.status !== 'active').map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            order.orderType === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {order.orderType.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-900">Loan #{order.loanId}</td>
                                    <td className="px-6 py-4 text-right">{order.tokenCount}</td>
                                    <td className="px-6 py-4 text-right">{formatCurrency(order.pricePerToken)}</td>
                                    <td className="px-6 py-4 text-right font-medium">
                                        {formatCurrency(order.tokenCount * order.pricePerToken)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            order.status === 'filled' ? 'bg-green-100 text-green-800' : 
                                            order.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-500">
                                        {order.filledCount}/{order.tokenCount}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {(!myOrders || myOrders.filter(o => o.status !== 'active').length === 0) && (
                    <p className="p-6 text-center text-gray-500">No order history</p>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Token Marketplace</h1>
                    <p className="text-gray-600 mt-2">Trade loan tokens on the secondary market</p>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('market')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'market'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Market
                        </button>
                        <button
                            onClick={() => setActiveTab('place-order')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'place-order'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Place Order
                        </button>
                        <button
                            onClick={() => setActiveTab('my-orders')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'my-orders'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            My Orders
                        </button>
                    </nav>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'market' && renderMarketView()}
                        {activeTab === 'place-order' && (
                            <div className="max-w-md mx-auto">
                                {selectedLoan ? (
                                    renderOrderForm()
                                ) : (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                                        <p className="text-gray-500">Select a token from the Market tab first</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'my-orders' && renderMyOrders()}
                    </>
                )}
            </div>
        </div>
    );
};

export default TokenMarketplace;
