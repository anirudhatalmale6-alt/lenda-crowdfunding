/**
 * Multi-Currency Wallet Dashboard Component
 * Displays multi-currency wallets with real crypto deposit addresses
 * Addresses Gap: Multi-currency wallet support
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    getMultiCurrencyWallets, 
    getExchangeRates, 
    getCryptoDepositAddress,
    getAllCryptoAddresses,
    setSelectedCurrency 
} from '../../store/slices/walletSlice';
import { 
    selectAuth 
} from '../../store/slices/authSlice';
import multiCurrencyWalletService, { SUPPORTED_CURRENCIES } from '../../services/multiCurrencyWalletService';
import { Copy, ArrowRightLeft, Wallet, RefreshCw, QrCode, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * MultiCurrencyWalletDashboard Component
 * @param {boolean} compact - Show compact version
 * @param {boolean} showAllCurrencies - Show all supported currencies
 */
function MultiCurrencyWalletDashboard({ compact = false, showAllCurrencies = true }) {
    const dispatch = useDispatch();
    const { 
        multiCurrencyWallets, 
        exchangeRates, 
        selectedCurrency, 
        cryptoAddresses,
        isLoading,
        error 
    } = useSelector((state) => state.wallet);
    const { user } = useSelector(selectAuth);
    const [activeTab, setActiveTab] = useState('wallets');
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [selectedCrypto, setSelectedCrypto] = useState(null);

    // Initialize on mount
    useEffect(() => {
        loadWalletData();
    }, []);

    const loadWalletData = async () => {
        try {
            // Fetch multi-currency wallets
            dispatch(getMultiCurrencyWallets());
            // Fetch exchange rates
            dispatch(getExchangeRates('USD'));
            // Fetch crypto addresses if user is logged in
            if (user?.id) {
                dispatch(getAllCryptoAddresses(user.id));
            }
        } catch (error) {
            console.error('Failed to load wallet data:', error);
        }
    };

    // Get crypto address for a currency
    const getCryptoAddress = (currency) => {
        return cryptoAddresses[currency]?.address || null;
    };

    // Format currency with symbol
    const formatCurrency = (amount, currencyCode) => {
        const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
        if (!currency) return amount.toString();
        
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: currency.decimals,
            maximumFractionDigits: currency.decimals
        }).format(amount);
    };

    // Calculate total portfolio value
    const calculateTotalValue = () => {
        let total = 0;
        for (const wallet of multiCurrencyWallets) {
            const rate = exchangeRates[wallet.currency] || 1;
            total += wallet.balance * rate;
        }
        return total;
    };

    // Handle currency selection
    const handleCurrencySelect = (currencyCode) => {
        dispatch(setSelectedCurrency(currencyCode));
    };

    // Generate crypto address
    const handleGenerateAddress = async (currency) => {
        if (!user?.id) {
            alert('Please log in to generate deposit addresses');
            return;
        }
        
        try {
            await dispatch(getCryptoDepositAddress({ 
                currency, 
                userId: user.id 
            })).unwrap();
            setSelectedCrypto(currency);
            setShowDepositModal(true);
        } catch (error) {
            console.error('Failed to generate address:', error);
        }
    };

    // Copy address to clipboard
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('Address copied to clipboard!');
    };

    const totalValue = calculateTotalValue();
    const currencies = showAllCurrencies ? SUPPORTED_CURRENCIES : 
        multiCurrencyWallets.map(w => SUPPORTED_CURRENCIES.find(c => c.code === w.currency)).filter(Boolean);

    if (compact) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        Wallets
                    </h3>
                    <button 
                        onClick={loadWalletData}
                        className="p-1 hover:bg-slate-100 rounded"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                
                <div className="space-y-2">
                    {multiCurrencyWallets.slice(0, 3).map((wallet) => (
                        <div key={wallet.currency} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                            <span className="font-medium">{wallet.currency}</span>
                            <span className="text-slate-600">
                                {formatCurrency(wallet.balance, wallet.currency)}
                            </span>
                        </div>
                    ))}
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">Total Value</span>
                        <span className="font-bold text-slate-800">
                            ${formatCurrency(totalValue, 'USD')}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Multi-Currency Wallet</h3>
                            <p className="text-sm text-white/80">Manage your fiat and crypto assets</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-white/80">Total Portfolio Value</p>
                        <p className="text-2xl font-bold text-white">
                            ${formatCurrency(totalValue, 'USD')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-6 py-3 border-b border-slate-200 bg-slate-50">
                <div className="flex gap-2">
                    {[
                        { id: 'wallets', label: 'Wallets' },
                        { id: 'deposit', label: 'Deposit' },
                        { id: 'exchange', label: 'Exchange' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === tab.id
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-transparent'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {activeTab === 'wallets' && (
                    <div className="space-y-4">
                        {/* Currency Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {currencies.map((currency) => {
                                const wallet = multiCurrencyWallets.find(w => w.currency === currency.code);
                                const balance = wallet?.balance || 0;
                                const rate = exchangeRates[currency.code] || 1;
                                const usdValue = balance * rate;

                                return (
                                    <div 
                                        key={currency.code}
                                        className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow cursor-pointer"
                                        onClick={() => handleCurrencySelect(currency.code)}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">{currency.icon}</span>
                                                <div>
                                                    <p className="font-semibold text-slate-800">{currency.code}</p>
                                                    <p className="text-xs text-slate-500">{currency.name}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 text-xs rounded-full ${
                                                currency.type === 'crypto' ? 'bg-purple-100 text-purple-700' :
                                                currency.type === 'stablecoin' ? 'bg-green-100 text-green-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                {currency.type}
                                            </span>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-slate-500">Balance</span>
                                                <span className="font-medium">{formatCurrency(balance, currency.code)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-slate-500">USD Value</span>
                                                <span className="font-medium">${formatCurrency(usdValue, 'USD')}</span>
                                            </div>
                                            {rate && rate !== 1 && (
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-slate-500">Rate</span>
                                                    <span className="font-medium text-green-600 flex items-center">
                                                        <TrendingUp className="w-3 h-3 mr-1" />
                                                        {rate.toFixed(6)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Crypto-specific actions */}
                                        {currency.type === 'crypto' && (
                                            <div className="mt-4 pt-3 border-t border-slate-100">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleGenerateAddress(currency.code);
                                                    }}
                                                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 flex items-center justify-center gap-2"
                                                >
                                                    <QrCode className="w-4 h-4" />
                                                    {getCryptoAddress(currency.code) ? 'View Address' : 'Generate Address'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'deposit' && (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-slate-800">Crypto Deposit Addresses</h4>
                        <p className="text-sm text-slate-500">
                            Generate unique deposit addresses for each cryptocurrency. 
                            Addresses are deterministically derived from your account for security.
                        </p>
                        
                        <div className="space-y-3">
                            {SUPPORTED_CURRENCIES.filter(c => c.type === 'crypto').map((currency) => {
                                const address = getCryptoAddress(currency.code);
                                
                                return (
                                    <div key={currency.code} className="p-4 border border-slate-200 rounded-xl">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{currency.icon}</span>
                                                <span className="font-semibold">{currency.code}</span>
                                                <span className="text-sm text-slate-500">- {currency.name}</span>
                                            </div>
                                            {!address && (
                                                <button
                                                    onClick={() => handleGenerateAddress(currency.code)}
                                                    disabled={isLoading}
                                                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    Generate
                                                </button>
                                            )}
                                        </div>
                                        
                                        {address && (
                                            <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <code className="flex-1 text-sm font-mono break-all">{address}</code>
                                                    <button
                                                        onClick={() => copyToClipboard(address)}
                                                        className="p-2 hover:bg-slate-200 rounded"
                                                        title="Copy address"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                                                    <span>HD Derived</span>
                                                    <span>•</span>
                                                    <span>BIP-44</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'exchange' && (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-slate-800">Currency Exchange</h4>
                        <p className="text-sm text-slate-500">
                            Exchange between supported currencies using real-time exchange rates.
                        </p>
                        
                        <div className="p-4 bg-slate-50 rounded-xl">
                            <div className="text-center text-slate-400">
                                <ArrowRightLeft className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Exchange functionality coming soon</p>
                                <p className="text-xs mt-1">Connect with our liquidity providers</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="px-6 py-3 bg-red-50 border-t border-red-200">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Deposit Modal */}
            {showDepositModal && selectedCrypto && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Deposit {selectedCrypto}</h3>
                            <button 
                                onClick={() => setShowDepositModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-100 rounded-lg text-center">
                                <p className="text-sm text-slate-500 mb-2">Deposit Address</p>
                                <code className="text-sm font-mono break-all">
                                    {cryptoAddresses[selectedCrypto]?.address}
                                </code>
                            </div>
                            
                            <button
                                onClick={() => copyToClipboard(cryptoAddresses[selectedCrypto]?.address)}
                                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                            >
                                <Copy className="w-4 h-4" />
                                Copy Address
                            </button>
                            
                            <p className="text-xs text-slate-500 text-center">
                                Only send {selectedCrypto} to this address. 
                                Other assets may be lost.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MultiCurrencyWalletDashboard;
