import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import walletService from '../../services/walletService';
import multiCurrencyWalletService, { SUPPORTED_CURRENCIES } from '../../services/multiCurrencyWalletService';
import cryptoDepositService from '../../services/cryptoDepositService';

const initialState = {
    wallets: {
        main: { balance: 0, locked: 0, available: 0 },
        escrow: { balance: 0, locked: 0, available: 0 },
        investment: { balance: 0, locked: 0, available: 0 },
    },
    // Multi-currency support
    multiCurrencyWallets: [],
    supportedCurrencies: SUPPORTED_CURRENCIES,
    selectedCurrency: 'NGN',
    exchangeRates: {},
    totalPortfolioValue: 0,
    // Crypto deposit addresses
    cryptoAddresses: {},
    // Current wallet
    wallet: null,
    transactions: [],
    transactionHistory: [],
    isLoading: false,
    error: null,
    depositAddress: null,
};

export const getWallets = createAsyncThunk(
    'wallet/getWallets',
    async (_, { rejectWithValue }) => {
        try {
            const response = await walletService.getWallets();
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const getTransactions = createAsyncThunk(
    'wallet/getTransactions',
    async (params, { rejectWithValue }) => {
        try {
            const response = await walletService.getTransactions(params);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const deposit = createAsyncThunk(
    'wallet/deposit',
    async ({ amount, currency }, { rejectWithValue }) => {
        try {
            const response = await walletService.deposit(amount, currency);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const withdraw = createAsyncThunk(
    'wallet/withdraw',
    async ({ amount, address }, { rejectWithValue }) => {
        try {
            const response = await walletService.withdraw(amount, address);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const transfer = createAsyncThunk(
    'wallet/transfer',
    async ({ toWallet, amount }, { rejectWithValue }) => {
        try {
            const response = await walletService.transfer(toWallet, amount);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const getDepositAddress = createAsyncThunk(
    'wallet/getDepositAddress',
    async ({ currency, userId }, { rejectWithValue }) => {
        try {
            // Use real crypto deposit service for crypto currencies
            if (multiCurrencyWalletService.isCryptoCurrency(currency)) {
                const addressInfo = cryptoDepositService.generateDepositAddress(userId, currency);
                return { address: addressInfo.address, currency, ...addressInfo };
            }
            // For fiat, use API
            const response = await walletService.getDepositAddress(currency);
            return { ...response, currency };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get wallet balance
export const getWalletBalance = createAsyncThunk(
    'wallet/getBalance',
    async (walletType = 'main', { rejectWithValue }) => {
        try {
            const response = await walletService.getWalletBalance(walletType);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Deposit funds
export const depositFunds = createAsyncThunk(
    'wallet/depositFunds',
    async (amount, { rejectWithValue }) => {
        try {
            const response = await walletService.depositFunds(amount);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Withdraw funds
export const withdrawFunds = createAsyncThunk(
    'wallet/withdrawFunds',
    async (amount, { rejectWithValue }) => {
        try {
            const response = await walletService.withdrawFunds(amount, '');
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get transaction history
export const getTransactionHistory = createAsyncThunk(
    'wallet/getTransactionHistory',
    async (params, { rejectWithValue }) => {
        try {
            const response = await walletService.getTransactionHistory(params);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get multi-currency wallets
export const getMultiCurrencyWallets = createAsyncThunk(
    'wallet/getMultiCurrencyWallets',
    async (_, { rejectWithValue }) => {
        try {
            const response = await multiCurrencyWalletService.getAllWallets();
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get exchange rates
export const getExchangeRates = createAsyncThunk(
    'wallet/getExchangeRates',
    async (baseCurrency = 'NGN', { rejectWithValue }) => {
        try {
            const response = await multiCurrencyWalletService.getExchangeRates(baseCurrency);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Convert currency
export const convertCurrency = createAsyncThunk(
    'wallet/convertCurrency',
    async ({ amount, fromCurrency, toCurrency }, { rejectWithValue }) => {
        try {
            const response = await multiCurrencyWalletService.convertCurrency(amount, fromCurrency, toCurrency);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get wallet by currency
export const getWalletByCurrency = createAsyncThunk(
    'wallet/getWalletByCurrency',
    async (currencyCode, { rejectWithValue }) => {
        try {
            const response = await multiCurrencyWalletService.getWalletByCurrency(currencyCode);
            return { currency: currencyCode, wallet: response };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get crypto deposit address with full details
export const getCryptoDepositAddress = createAsyncThunk(
    'wallet/getCryptoDepositAddress',
    async ({ currency, userId }, { rejectWithValue }) => {
        try {
            // Check if we already have an address for this user+currency
            const existingAddress = cryptoDepositService.getDepositAddress(userId, currency);
            if (existingAddress) {
                return existingAddress;
            }
            // Generate new address
            const addressInfo = cryptoDepositService.generateDepositAddress(userId, currency);
            return addressInfo;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get all crypto addresses for a user
export const getAllCryptoAddresses = createAsyncThunk(
    'wallet/getAllCryptoAddresses',
    async (userId, { rejectWithValue }) => {
        try {
            const addresses = cryptoDepositService.getAllDepositAddresses(userId);
            return addresses;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const walletSlice = createSlice({
    name: 'wallet',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        clearDepositAddress: (state) => {
            state.depositAddress = null;
        },
        setSelectedCurrency: (state, action) => {
            state.selectedCurrency = action.payload;
        },
        updateExchangeRates: (state, action) => {
            state.exchangeRates = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            // Get wallets
            .addCase(getWallets.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getWallets.fulfilled, (state, action) => {
                state.isLoading = false;
                state.wallets = action.payload.wallets;
            })
            .addCase(getWallets.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Get multi-currency wallets
            .addCase(getMultiCurrencyWallets.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getMultiCurrencyWallets.fulfilled, (state, action) => {
                state.isLoading = false;
                state.multiCurrencyWallets = action.payload.wallets || action.payload;
            })
            .addCase(getMultiCurrencyWallets.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Get exchange rates
            .addCase(getExchangeRates.fulfilled, (state, action) => {
                state.exchangeRates = action.payload;
            })
            // Convert currency
            .addCase(convertCurrency.fulfilled, (state, action) => {
                state.lastConversion = action.payload;
            })
            // Get wallet by currency
            .addCase(getWalletByCurrency.fulfilled, (state, action) => {
                const { currency, wallet } = action.payload;
                const existingIndex = state.multiCurrencyWallets.findIndex(w => w.currency === currency);
                if (existingIndex >= 0) {
                    state.multiCurrencyWallets[existingIndex] = wallet;
                } else {
                    state.multiCurrencyWallets.push(wallet);
                }
            })
            // Get crypto deposit address
            .addCase(getCryptoDepositAddress.fulfilled, (state, action) => {
                const { address, crypto, derivationPath, qrData } = action.payload;
                state.cryptoAddresses[crypto] = {
                    address,
                    currency: crypto,
                    derivationPath,
                    qrData,
                    createdAt: new Date().toISOString()
                };
                state.depositAddress = address;
            })
            // Get all crypto addresses
            .addCase(getAllCryptoAddresses.fulfilled, (state, action) => {
                const addresses = action.payload;
                addresses.forEach(addr => {
                    state.cryptoAddresses[addr.crypto] = {
                        address: addr.address,
                        currency: addr.crypto,
                        derivationPath: addr.derivationPath,
                        qrData: addr.qrData,
                        createdAt: addr.createdAt
                    };
                });
            })
            .addCase(getTransactions.fulfilled, (state, action) => {
                state.transactions = action.payload?.transactions || [];
            })
            .addCase(deposit.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(deposit.fulfilled, (state, action) => {
                state.isLoading = false;
                state.wallets.main = action.payload.wallet;
            })
            .addCase(deposit.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(withdraw.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(withdraw.fulfilled, (state, action) => {
                state.isLoading = false;
                state.wallets.main = action.payload.wallet;
            })
            .addCase(withdraw.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(transfer.fulfilled, (state, action) => {
                state.wallets = action.payload.wallets;
            })
            .addCase(getDepositAddress.fulfilled, (state, action) => {
                state.depositAddress = action.payload.address;
                if (action.payload.currency) {
                    state.cryptoAddresses[action.payload.currency] = action.payload;
                }
            })
            // Get wallet balance
            .addCase(getWalletBalance.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getWalletBalance.fulfilled, (state, action) => {
                state.isLoading = false;
                state.wallet = action.payload?.wallet || action.payload || null;
            })
            .addCase(getWalletBalance.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Deposit funds
            .addCase(depositFunds.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(depositFunds.fulfilled, (state, action) => {
                state.isLoading = false;
                state.wallet = action.payload.wallet;
            })
            .addCase(depositFunds.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Withdraw funds
            .addCase(withdrawFunds.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(withdrawFunds.fulfilled, (state, action) => {
                state.isLoading = false;
                state.wallet = action.payload.wallet;
            })
            .addCase(withdrawFunds.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Transaction history
            .addCase(getTransactionHistory.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getTransactionHistory.fulfilled, (state, action) => {
                state.isLoading = false;
                state.transactionHistory = action.payload?.transactions || [];
            })
            .addCase(getTransactionHistory.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    },
});

export const { clearError, clearDepositAddress, setSelectedCurrency, updateExchangeRates } = walletSlice.actions;
export default walletSlice.reducer;
