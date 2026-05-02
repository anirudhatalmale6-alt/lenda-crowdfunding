import { createApiClient } from '../utils/api/client';

const WALLET_API = '/api/wallet';
const api = createApiClient(WALLET_API);

const unwrapData = (response) => response?.data?.data ?? response?.data ?? response;

const walletService = {
    // Get all wallets
    getWallets: async () => {
        const response = await api.get('/');
        return unwrapData(response);
    },

    // Get wallet transactions
    getTransactions: async (params = {}) => {
        const response = await api.get('/transactions', { params });
        const data = unwrapData(response);
        return {
            transactions: data?.transactions || [],
            total: data?.total || 0,
            page: data?.page || 1,
        };
    },

    // Deposit funds
    deposit: async (amount, currency = 'USD') => {
        const response = await api.post('/deposit', { amount, currency });
        return unwrapData(response);
    },

    // Withdraw funds
    withdraw: async (amount, address) => {
        const response = await api.post('/withdraw', { amount, address });
        return unwrapData(response);
    },

    // Transfer between wallets
    transfer: async (toWallet, amount) => {
        const response = await api.post('/transfer', { toWallet, amount });
        return unwrapData(response);
    },

    // Get deposit address (for crypto)
    getDepositAddress: async (currency = 'ETH') => {
        const response = await api.get(`/deposit-address/${currency}`);
        return unwrapData(response);
    },

    // Get wallet balance
    getBalance: async (walletType = 'main') => {
        const response = await api.get(`/balance/${walletType}`);
        return { wallet: unwrapData(response) };
    },

    // Get transaction history
    getHistory: async (params = {}) => {
        const response = await api.get('/history', { params });
        const data = unwrapData(response);
        return {
            transactions: data?.transactions || [],
            total: data?.total || 0,
        };
    },

    getTransactionHistory: async (params = {}) => walletService.getHistory(params),

    getWalletBalance: async (walletType = 'main') => walletService.getBalance(walletType),

    depositFunds: async (amount, currency = 'NGN') => {
        const wallet = await walletService.deposit(amount, currency);
        return { wallet };
    },

    withdrawFunds: async (amount, address = '') => {
        const wallet = await walletService.withdraw(amount, address);
        return { wallet };
    },

    // Request withdrawal
    requestWithdrawal: async (amount, address, method = 'bank') => {
        const response = await api.post('/request-withdrawal', {
            amount,
            address,
            method,
        });
        return unwrapData(response);
    },

    // Get supported currencies
    getCurrencies: async () => {
        const response = await api.get('/currencies');
        return unwrapData(response);
    },
};

export default walletService;
