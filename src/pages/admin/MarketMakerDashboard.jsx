import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    fetchPools, 
    fetchPositions, 
    fetchAnalytics,
    fetchQuote,
    executeTrade,
    updateParameters,
    triggerStabilization,
    setActivePool
} from '../../store/slices/marketMakerSlice';
import { 
    RISK_CATEGORIES, 
    calculateDCFPrice, 
    calculateSpread, 
    calculatePrices,
    RISK_LIMITS 
} from '../../services/marketMakerService';
import { formatCurrency, formatPercentage, formatNumber } from '../../utils/formatters';

const MarketMakerDashboard = () => {
    const dispatch = useDispatch();
    const { 
        pools, 
        positions, 
        analytics, 
        currentQuote,
        parameters,
        isLoading, 
        isProcessing,
        riskAlerts,
        exposureReport 
    } = useSelector((state) => state.marketMaker);

    const [activeTab, setActiveTab] = useState('overview');
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [tradeAmount, setTradeAmount] = useState('');
    const [showParamModal, setShowParamModal] = useState(false);
    const [newParams, setNewParams] = useState(parameters);

    useEffect(() => {
        dispatch(fetchPools());
        dispatch(fetchPositions());
        dispatch(fetchAnalytics());
    }, [dispatch]);

    // Calculate simulated DCF price for display
    const calculateSamplePrice = (loan) => {
        const mockLoan = {
            remainingPayments: Array.from({ length: loan.remainingMonths }, (_, i) => ({
                amount: loan.monthlyPayment
            })),
            monthsElapsed: loan.monthsElapsed || 0,
            tokensOutstanding: loan.tokensOutstanding || 1,
            remainingRepayment: loan.remainingRepayment
        };
        return calculateDCFPrice(mockLoan, loan.riskRating);
    };

    const handleTrade = async (isBuy) => {
        if (!selectedLoan || !tradeAmount) return;
        
        await dispatch(executeTrade({
            loanId: selectedLoan.loanId,
            tokenCount: parseInt(tradeAmount),
            isBuy
        }));
        
        setTradeAmount('');
    };

    const handleStabilize = async (loanId) => {
        await dispatch(triggerStabilization(loanId));
    };

    const handleUpdateParams = async () => {
        await dispatch(updateParameters(newParams));
        setShowParamModal(false);
    };

    const getRiskColor = (rating) => {
        return RISK_CATEGORIES[rating]?.color || 'bg-gray-100 text-gray-800';
    };

    const renderOverview = () => (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <p className="text-sm text-gray-500">Total Pool Capital</p>
                    <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(pools.reduce((sum, p) => sum + (p.totalCapital || 0), 0))}
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                        {formatCurrency(pools.reduce((sum, p) => sum + (p.availableCapital || 0), 0))} available
                    </p>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <p className="text-sm text-gray-500">Total Positions</p>
                    <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(positions.reduce((sum, p) => sum + (p.value || 0), 0))}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                        {positions.length} tokens
                    </p>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <p className="text-sm text-gray-500">24h Trading Volume</p>
                    <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(analytics?.volume24h || 0)}
                    </p>
                    <p className={`text-sm mt-1 ${(analytics?.volumeChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(analytics?.volumeChange || 0)} vs yesterday
                    </p>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <p className="text-sm text-gray-500">Avg Bid-Ask Spread</p>
                    <p className="text-2xl font-bold text-gray-900">
                        {formatPercentage(parameters.baseSpread)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                        Range: {formatPercentage(parameters.baseSpread * 0.5)} - {formatPercentage(parameters.baseSpread * 2)}
                    </p>
                </div>
            </div>

            {/* Performance Chart Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Maker Performance</h3>
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-gray-400">Performance Chart</p>
                        <p className="text-sm text-gray-400">Real-time P&L and volume visualization</p>
                    </div>
                </div>
            </div>

            {/* Risk Alerts */}
            {riskAlerts.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-3">Risk Alerts</h3>
                    <div className="space-y-2">
                        {riskAlerts.slice(-5).map((alert, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                                <span className="text-yellow-700">{alert.message}</span>
                                <span className="text-yellow-500">
                                    {new Date(alert.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderPools = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Liquidity Pools</h3>
                <button
                    onClick={() => setShowParamModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Configure Parameters
                </button>
            </div>

            <div className="grid gap-4">
                {pools.map((pool) => (
                    <div 
                        key={pool.id}
                        className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer transition ${
                            pool.isActive ? 'border-blue-200 hover:border-blue-400' : 'border-gray-200 opacity-60'
                        }`}
                        onClick={() => dispatch(setActivePool(pool.id))}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-semibold text-gray-900">{pool.name}</h4>
                                <p className="text-sm text-gray-500">Pool #{pool.id}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                pool.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                                {pool.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4 mt-4">
                            <div>
                                <p className="text-xs text-gray-500">Total Capital</p>
                                <p className="font-semibold">{formatCurrency(pool.totalCapital)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Available</p>
                                <p className="font-semibold text-green-600">{formatCurrency(pool.availableCapital)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Locked</p>
                                <p className="font-semibold text-orange-600">{formatCurrency(pool.lockedCapital)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Spread</p>
                                <p className="font-semibold">{formatPercentage(pool.spreadBps / 10000)}</p>
                            </div>
                        </div>
                    </div>
                ))}
                
                {pools.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No liquidity pools configured yet
                    </div>
                )}
            </div>

            {/* Exposure Report */}
            {exposureReport && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Exposure</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(exposureReport.byRiskCategory || {}).map(([category, value]) => (
                            <div key={category} className="text-center">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(category)}`}>
                                    {category}
                                </span>
                                <p className="mt-2 font-semibold">{formatPercentage(value / 10000)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderPositions = () => (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Token Positions</h3>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Token</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tokens</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Price</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">P&L</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {positions.map((position) => (
                            <tr key={position.tokenAddress} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <p className="font-medium text-gray-900">Loan #{position.loanId}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(position.riskRating)}`}>
                                        {position.riskRating}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">{formatNumber(position.tokenCount)}</td>
                                <td className="px-6 py-4 text-right font-medium">{formatCurrency(position.value)}</td>
                                <td className="px-6 py-4 text-right">{formatCurrency(position.avgPrice)}</td>
                                <td className={`px-6 py-4 text-right ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(position.pnl)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button
                                        onClick={() => handleStabilize(position.loanId)}
                                        className="text-blue-600 hover:text-blue-800 text-sm"
                                    >
                                        Stabilize
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {positions.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No positions yet
                    </div>
                )}
            </div>
        </div>
    );

    const renderTrading = () => {
        // Mock loans for demonstration
        const mockLoans = [
            { loanId: 1, title: 'Business Expansion Loan', riskRating: 'A', monthlyPayment: 8333, remainingMonths: 10, tokensOutstanding: 100000, remainingRepayment: 83330 },
            { loanId: 2, title: 'Equipment Financing', riskRating: 'BBB', monthlyPayment: 5000, remainingMonths: 8, tokensOutstanding: 50000, remainingRepayment: 40000 },
            { loanId: 3, title: 'Real Estate Development', riskRating: 'AA', monthlyPayment: 15000, remainingMonths: 12, tokensOutstanding: 200000, remainingRepayment: 180000 },
            { loanId: 4, title: 'Working Capital', riskRating: 'BB', monthlyPayment: 10000, remainingMonths: 6, tokensOutstanding: 75000, remainingRepayment: 60000 },
        ];

        return (
            <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Manual Trading</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Loan Selection */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h4 className="font-medium text-gray-900 mb-4">Select Loan Token</h4>
                        <div className="space-y-2">
                            {mockLoans.map((loan) => (
                                <button
                                    key={loan.loanId}
                                    onClick={() => {
                                        setSelectedLoan(loan);
                                        const price = calculateSamplePrice(loan);
                                        dispatch(fetchQuote({ loanId: loan.loanId, tokenCount: 1 }));
                                    }}
                                    className={`w-full p-3 rounded-lg border text-left transition ${
                                        selectedLoan?.loanId === loan.loanId 
                                            ? 'border-blue-500 bg-blue-50' 
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-gray-900">{loan.title}</p>
                                            <p className="text-sm text-gray-500">Loan #{loan.loanId}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(loan.riskRating)}`}>
                                                {loan.riskRating}
                                            </span>
                                            <p className="text-sm font-medium text-gray-900 mt-1">
                                                {formatCurrency(calculateSamplePrice(loan))}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Trading Panel */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        {selectedLoan ? (
                            <>
                                <h4 className="font-medium text-gray-900 mb-4">Trade {selectedLoan.title}</h4>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Token Amount
                                        </label>
                                        <input
                                            type="number"
                                            value={tradeAmount}
                                            onChange={(e) => setTradeAmount(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="Enter amount"
                                        />
                                    </div>

                                    {currentQuote && (
                                        <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Buy Price (Bid)</span>
                                                <span className="font-medium text-green-600">
                                                    {formatCurrency(currentQuote.buyPrice)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Sell Price (Ask)</span>
                                                <span className="font-medium text-red-600">
                                                    {formatCurrency(currentQuote.sellPrice)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Spread</span>
                                                <span className="font-medium">
                                                    {formatPercentage(currentQuote.spread || parameters.baseSpread)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Max Buy</span>
                                                <span className="font-medium">{formatNumber(currentQuote.buyQty)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Max Sell</span>
                                                <span className="font-medium">{formatNumber(currentQuote.sellQty)}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => handleTrade(true)}
                                            disabled={isProcessing || !tradeAmount}
                                            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                                        >
                                            Buy Tokens
                                        </button>
                                        <button
                                            onClick={() => handleTrade(false)}
                                            disabled={isProcessing || !tradeAmount}
                                            className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                                        >
                                            Sell Tokens
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                Select a loan token to trade
                            </div>
                        )}
                    </div>
                </div>

                {/* Pricing Model Info */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Pricing Model: Discounted Cash Flow (DCF)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Formula</h5>
                            <code className="block bg-gray-50 p-3 rounded-lg text-sm">
                                Token Price = PV of Remaining Repayments<br/>
                                PV = Σ(Repayment_t / (1 + risk_rate)^t)
                            </code>
                        </div>
                        <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Risk Premiums</h5>
                            <div className="space-y-1 text-sm">
                                {Object.entries(RISK_CATEGORIES).slice(0, 5).map(([rating, data]) => (
                                    <div key={rating} className="flex justify-between">
                                        <span className={getRiskColor(rating)}>{rating}</span>
                                        <span className="text-gray-600">{formatPercentage(data.premium)} discount</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderRiskManagement = () => (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Risk Management</h3>
            
            {/* Risk Limits */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h4 className="font-medium text-gray-900 mb-4">Exposure Limits</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-sm text-gray-500">Max per Loan</p>
                        <p className="text-xl font-bold text-gray-900">
                            {formatPercentage(RISK_LIMITS.maxExposurePerLoan)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Max per Borrower</p>
                        <p className="text-xl font-bold text-gray-900">
                            {formatPercentage(RISK_LIMITS.maxExposurePerBorrower)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Min Reserve Ratio</p>
                        <p className="text-xl font-bold text-gray-900">
                            {formatPercentage(RISK_LIMITS.minReserveRatio)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Max Position Size</p>
                        <p className="text-xl font-bold text-gray-900">
                            {formatCurrency(RISK_LIMITS.maxPositionSize)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Risk Category Limits */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h4 className="font-medium text-gray-900 mb-4">Risk Category Limits</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {Object.entries(RISK_LIMITS.maxExposurePerRiskCategory).map(([category, limit]) => (
                        <div key={category} className="text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(category)}`}>
                                {category}
                            </span>
                            <p className="mt-2 font-semibold">{formatPercentage(limit)}</p>
                            <p className="text-xs text-gray-500">max exposure</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Stabilization Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h4 className="font-medium text-gray-900 mb-4">Stabilization Parameters</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-sm text-gray-500">Max Price Move</p>
                        <p className="font-semibold">5% per update</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Trigger Threshold</p>
                        <p className="font-semibold">3% deviation</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Buy Pressure Multiplier</p>
                        <p className="font-semibold">1.2x</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Cooling Period</p>
                        <p className="font-semibold">5 minutes</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Market Maker Dashboard</h1>
                    <p className="text-gray-600 mt-2">Manage liquidity pools, positions, and pricing</p>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        {[
                            { id: 'overview', label: 'Overview' },
                            { id: 'pools', label: 'Liquidity Pools' },
                            { id: 'positions', label: 'Positions' },
                            { id: 'trading', label: 'Trading' },
                            { id: 'risk', label: 'Risk Management' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'pools' && renderPools()}
                        {activeTab === 'positions' && renderPositions()}
                        {activeTab === 'trading' && renderTrading()}
                        {activeTab === 'risk' && renderRiskManagement()}
                    </>
                )}
            </div>

            {/* Parameters Modal */}
            {showParamModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Market Maker Parameters
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Base Spread (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={newParams.baseSpread * 100}
                                    onChange={(e) => setNewParams({ ...newParams, baseSpread: parseFloat(e.target.value) / 100 })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Max Position Size ($)
                                </label>
                                <input
                                    type="number"
                                    value={newParams.maxPositionSize}
                                    onChange={(e) => setNewParams({ ...newParams, maxPositionSize: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Min Liquidity Ratio (%)
                                </label>
                                <input
                                    type="number"
                                    step="1"
                                    value={newParams.minLiquidityRatio * 100}
                                    onChange={(e) => setNewParams({ ...newParams, minLiquidityRatio: parseFloat(e.target.value) / 100 })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Stabilization Enabled</span>
                                <button
                                    onClick={() => setNewParams({ ...newParams, stabilizationEnabled: !newParams.stabilizationEnabled })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                                        newParams.stabilizationEnabled ? 'bg-blue-600' : 'bg-gray-200'
                                    }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white ${
                                        newParams.stabilizationEnabled ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowParamModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateParams}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketMakerDashboard;
