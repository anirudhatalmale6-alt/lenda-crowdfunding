import { createApiClient } from '../utils/api/client';

const API_URL = '/api/tokens';

const api = createApiClient(API_URL);

const tokenService = {
    // Get loan tokens for a specific loan
    getLoanTokens: async (loanId) => {
        const response = await api.get(`/loan/${loanId}`);
        return response.data;
    },

    // Purchase tokens for a loan
    purchaseTokens: async (loanId, amount) => {
        const response = await api.post(`/loan/${loanId}/purchase`, { amount });
        return response.data;
    },

    // Get my token holdings
    getMyHoldings: async () => {
        const response = await api.get('/holdings');
        return response.data;
    },

    // Get token details
    getTokenDetails: async (tokenId) => {
        const response = await api.get(`/${tokenId}`);
        return response.data;
    },

    // Calculate token purchase
    calculatePurchase: async (loanId, amount) => {
        const response = await api.get(`/loan/${loanId}/calculate`, {
            params: { amount }
        });
        return response.data;
    },

    // Get expected return for investment
    getExpectedReturn: async (loanId, investmentAmount) => {
        const response = await api.get(`/loan/${loanId}/expected-return`, {
            params: { investmentAmount }
        });
        return response.data;
    },

    // Redeem tokens after loan repayment
    redeemTokens: async (tokenId) => {
        const response = await api.post(`/${tokenId}/redeem`);
        return response.data;
    },

    // Get token marketplace listings
    getTokenListings: async (filters = {}) => {
        const response = await api.get('/marketplace', { params: filters });
        return response.data;
    },

    // Get my active investments
    getMyInvestments: async () => {
        const response = await api.get('/my-investments');
        return response.data;
    },

    // Get investment performance
    getInvestmentPerformance: async (investmentId) => {
        const response = await api.get(`/investment/${investmentId}/performance`);
        return response.data;
    },

    // Get secondary market listings
    getSecondaryListings: async () => {
        const response = await api.get('/secondary');
        return response.data;
    },

    // List tokens on secondary market
    listOnSecondary: async (tokenId, price) => {
        const response = await api.post(`/secondary/list`, { tokenId, price });
        return response.data;
    },

    // Buy from secondary market
    buyFromSecondary: async (listingId) => {
        const response = await api.post(`/secondary/buy`, { listingId });
        return response.data;
    },

    // Get order book for a loan
    getOrderBook: async (loanId) => {
        const response = await api.get(`/orderbook/${loanId}`);
        return response.data;
    },

    // Create a limit order
    createOrder: async (orderData) => {
        const response = await api.post(`/orderbook/order`, orderData);
        return response.data;
    },

    // Fill an existing order
    fillOrder: async (orderId, tokenCount) => {
        const response = await api.post(`/orderbook/fill`, { orderId, tokenCount });
        return response.data;
    },

    // Get user's active orders
    getMyOrders: async () => {
        const response = await api.get(`/orderbook/my-orders`);
        return response.data;
    },

    // Get market maker instant quote
    getQuote: async (loanId, tokenCount) => {
        const response = await api.get(`/orderbook/quote`, {
            params: { loanId, tokenCount }
        });
        return response.data;
    },

    // Execute market maker trade
    executeMarketMakerTrade: async (loanId, tokenCount, isBuy) => {
        const response = await api.post(`/orderbook/market-maker`, {
            loanId,
            tokenCount,
            isBuy
        });
        return response.data;
    },
};

export default tokenService;
