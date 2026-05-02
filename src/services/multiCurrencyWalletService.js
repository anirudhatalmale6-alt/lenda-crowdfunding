/**
 * Multi-Currency Wallet Service
 * Provides support for multiple currencies (USD, EUR, GBP, BTC, ETH, etc.)
 */

import api from '../utils/api/client';

const WALLET_API = '/api/wallet';

/**
 * Supported currencies with their properties
 */
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, type: 'fiat', icon: '💵' },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, type: 'fiat', icon: '💶' },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2, type: 'fiat', icon: '💷' },
  { code: 'BTC', name: 'Bitcoin', symbol: '₿', decimals: 8, type: 'crypto', icon: '₿' },
  { code: 'ETH', name: 'Ethereum', symbol: 'Ξ', decimals: 18, type: 'crypto', icon: 'Ξ' },
  { code: 'USDT', name: 'Tether', symbol: '₮', decimals: 6, type: 'stablecoin', icon: '₮' },
  { code: 'USDC', name: 'USD Coin', symbol: '$', decimals: 6, type: 'stablecoin', icon: '$' },
];

/**
 * Exchange rates cache
 */
let exchangeRatesCache = null;
let exchangeRatesTimestamp = null;
const CACHE_DURATION = 60000; // 1 minute

const multiCurrencyWalletService = {
  /**
   * Get all supported currencies
   */
  getSupportedCurrencies: () => {
    return SUPPORTED_CURRENCIES;
  },

  /**
   * Get currency by code
   */
  getCurrencyByCode: (code) => {
    return SUPPORTED_CURRENCIES.find(c => c.code === code);
  },

  /**
   * Check if currency is crypto
   */
  isCryptoCurrency: (code) => {
    const currency = SUPPORTED_CURRENCIES.find(c => c.code === code);
    return currency?.type === 'crypto';
  },

  /**
   * Get wallet for specific currency
   */
  getWalletByCurrency: async (currencyCode) => {
    const response = await api.get(`${WALLET_API}/currency/${currencyCode}`);
    return response.data;
  },

  /**
   * Get all wallets for user
   */
  getAllWallets: async () => {
    const response = await api.get(`${WALLET_API}/multi-currency`);
    return response.data;
  },

  /**
   * Get exchange rates
   */
  getExchangeRates: async (baseCurrency = 'USD') => {
    // Check cache
    if (exchangeRatesCache && exchangeRatesTimestamp) {
      const elapsed = Date.now() - exchangeRatesTimestamp;
      if (elapsed < CACHE_DURATION) {
        return exchangeRatesCache;
      }
    }

    const response = await api.get(`${WALLET_API}/exchange-rates`, {
      params: { base: baseCurrency }
    });
    
    exchangeRatesCache = response.data;
    exchangeRatesTimestamp = Date.now();
    
    return response.data;
  },

  /**
   * Convert amount between currencies
   */
  convertCurrency: async (amount, fromCurrency, toCurrency) => {
    const rates = await multiCurrencyWalletService.getExchangeRates(fromCurrency);
    const rate = rates[toCurrency];
    
    if (!rate) {
      throw new Error(`Exchange rate not available for ${fromCurrency} to ${toCurrency}`);
    }
    
    return {
      originalAmount: amount,
      convertedAmount: amount * rate,
      fromCurrency,
      toCurrency,
      rate,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Get crypto deposit address
   */
  getCryptoDepositAddress: async (currencyCode) => {
    const response = await api.get(`${WALLET_API}/crypto-address/${currencyCode}`);
    return response.data;
  },

  /**
   * Generate new crypto address (for supported chains)
   */
  generateCryptoAddress: async (currencyCode, network = 'mainnet') => {
    const response = await api.post(`${WALLET_API}/generate-address`, {
      currency: currencyCode,
      network
    });
    return response.data;
  },

  /**
   * Get network options for a crypto currency
   */
  getNetworkOptions: (currencyCode) => {
    const networks = {
      BTC: [
        { id: 'mainnet', name: 'Bitcoin Mainnet', symbol: 'BTC' },
        { id: 'testnet', name: 'Bitcoin Testnet', symbol: 'BTC' }
      ],
      ETH: [
        { id: 'mainnet', name: 'Ethereum Mainnet', symbol: 'ETH' },
        { id: 'sepolia', name: 'Sepolia Testnet', symbol: 'ETH' }
      ],
      USDT: [
        { id: 'erc20', name: 'Ethereum (ERC-20)', symbol: 'USDT' },
        { id: 'trc20', name: 'Tron (TRC-20)', symbol: 'USDT' }
      ],
      USDC: [
        { id: 'erc20', name: 'Ethereum (ERC-20)', symbol: 'USDC' },
        { id: 'solana', name: 'Solana', symbol: 'USDC' }
      ]
    };
    
    return networks[currencyCode] || [];
  },

  /**
   * Get fiat withdrawal options
   */
  getFiatWithdrawalMethods: async () => {
    const response = await api.get(`${WALLET_API}/fiat-methods`);
    return response.data;
  },

  /**
   * Request fiat withdrawal
   */
  requestFiatWithdrawal: async (amount, currency, method, accountDetails) => {
    const response = await api.post(`${WALLET_API}/fiat-withdraw`, {
      amount,
      currency,
      method,
      account_details: accountDetails
    });
    return response.data;
  },

  /**
   * Get conversion preview for swap
   */
  getSwapPreview: async (fromCurrency, toCurrency, amount) => {
    const response = await api.get(`${WALLET_API}/swap-preview`, {
      params: {
        from: fromCurrency,
        to: toCurrency,
        amount
      }
    });
    return response.data;
  },

  /**
   * Execute currency swap
   */
  executeSwap: async (fromCurrency, toCurrency, amount) => {
    const response = await api.post(`${WALLET_API}/swap`, {
      from: fromCurrency,
      to: toCurrency,
      amount
    });
    return response.data;
  },

  /**
   * Format amount with currency symbol
   */
  formatAmount: (amount, currencyCode) => {
    const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
    if (!currency) return amount.toString();
    
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals
    }).format(amount);
  },

  /**
   * Parse amount string to number
   */
  parseAmount: (amountString, currencyCode) => {
    const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
    if (!currency) return parseFloat(amountString);
    
    // Remove currency symbols and formatting
    const cleaned = amountString.replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned);
  },

  /**
   * Get total portfolio value in base currency
   */
  getTotalPortfolioValue: async (wallets, baseCurrency = 'USD') => {
    const rates = await multiCurrencyWalletService.getExchangeRates(baseCurrency);
    
    let totalValue = 0;
    
    for (const wallet of wallets) {
      const rate = rates[wallet.currency] || 1;
      totalValue += wallet.balance * rate;
    }
    
    return totalValue;
  }
};

export default multiCurrencyWalletService;
