import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import loanService from '../../services/loanService';
import repaymentSchedulerService from '../../services/repaymentSchedulerService';
import blockchainLoanService from '../../services/blockchainLoanService';

const initialState = {
    loans: [],
    myLoans: [],
    myFundedLoans: [],
    myLoanRequests: [],
    loanDetails: null,
    loanRequests: [],
    fundingOpportunities: [],
    pendingLoans: [],
    pendingCollateral: [],
    defaultedLoans: [],
    refinancingOpportunities: [], // UX-003: Refinancing opportunities for investors
    isLoading: false,
    error: null,
    riskScore: null,
    ltvRatio: 0,
    adminStats: null,
    platformStats: null,
    // Loan status: REQUESTED, FUNDED, ACTIVE, REPAID, DEFAULTED, PLATFORM_SETTLED, RECOVERY_SALE
    filters: {
        status: 'all',
        minAmount: 0,
        maxAmount: 1000000,
        minRate: 0,
        maxRate: 30,
        duration: 'all',
    },
    pagination: {
        page: 1,
        limit: 10,
        total: 0,
    },
};

// Create a new loan request
export const createLoanRequest = createAsyncThunk(
    'loans/createRequest',
    async (loanData, { rejectWithValue }) => {
        try {
            const response = await loanService.createLoanRequest(loanData);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get all loan requests (for lenders)
export const getLoanRequests = createAsyncThunk(
    'loans/getRequests',
    async (filters, { rejectWithValue }) => {
        try {
            const response = await loanService.getLoanRequests(filters);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get my loans (as borrower) - uses getMyLoans from loanService
// CQ-01 Fix: Consolidated from duplicate getMyLoanRequests
export const getMyLoans = createAsyncThunk(
    'loans/getMyLoans',
    async (_, { rejectWithValue }) => {
        try {
            const response = await loanService.getMyLoans();
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const getMyLoanRequests = getMyLoans;

export const getLoanDetails = createAsyncThunk(
    'loans/getDetails',
    async (loanId, { rejectWithValue }) => {
        try {
            const response = await loanService.getLoanDetails(loanId);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Fund a loan (lender invests)
export const fundLoan = createAsyncThunk(
    'loans/fund',
    async ({ loanId, amount }, { rejectWithValue }) => {
        try {
            const response = await loanService.fundLoan(loanId, amount);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Make a repayment
export const makeRepayment = createAsyncThunk(
    'loans/repay',
    async ({ loanId, amount }, { rejectWithValue }) => {
        try {
            const response = await loanService.makeRepayment(loanId, amount);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Calculate LTV
export const calculateLTV = createAsyncThunk(
    'loans/calculateLTV',
    async ({ loanAmount, collateralValue }, { rejectWithValue }) => {
        try {
            const response = await loanService.calculateLTV(loanAmount, collateralValue);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get risk score
export const getRiskScore = createAsyncThunk(
    'loans/getRiskScore',
    async (userId, { rejectWithValue }) => {
        try {
            const response = await loanService.getRiskScore(userId);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Cancel loan request
export const cancelLoanRequest = createAsyncThunk(
    'loans/cancel',
    async (loanId, { rejectWithValue }) => {
        try {
            const response = await loanService.cancelLoanRequest(loanId);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Request loan top-up (BF-05: Fixed with proper processing)
export const requestLoanTopup = createAsyncThunk(
    'loans/requestTopup',
    async (loanId, amount, purpose = '', additionalCollateral = false) => {
        try {
            const response = await loanService.requestLoanTopup(loanId, amount, purpose, additionalCollateral);
            return response;
        } catch (error) {
            throw error;
        }
    }
);

// Auto-schedule repayments for a loan (BF-06: New feature)
export const autoScheduleRepayments = createAsyncThunk(
    'loans/autoScheduleRepayments',
    async ({ loanId, frequency = 'monthly', startDate = null }, { rejectWithValue }) => {
        try {
            // Get loan details to calculate payment amounts
            const loanDetails = await loanService.getLoanDetails(loanId);
            
            if (!loanDetails) {
                return rejectWithValue('Loan not found');
            }
            
            // Calculate payment amount
            const paymentAmount = repaymentSchedulerService.calculatePaymentAmount(
                parseFloat(loanDetails.loanAmount),
                parseFloat(loanDetails.interestRate),
                frequency
            );
            
            // Schedule the payments
            const scheduleData = {
                loanId,
                frequency,
                amount: paymentAmount,
                startDate: startDate || new Date().toISOString(),
                enabled: true,
                autoDebit: true,
            };
            
            const response = await repaymentSchedulerService.schedulePayment(scheduleData);
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Enable/disable auto-payments for a loan
export const toggleAutoPayments = createAsyncThunk(
    'loans/toggleAutoPayments',
    async ({ loanId, enabled }, { rejectWithValue }) => {
        try {
            if (enabled) {
                const response = await repaymentSchedulerService.resumeAutoPayments(loanId);
                return { loanId, enabled: true, ...response };
            } else {
                const response = await repaymentSchedulerService.pauseAutoPayments(loanId);
                return { loanId, enabled: false, ...response };
            }
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Get repayment schedule for a loan
export const fetchRepaymentSchedule = createAsyncThunk(
    'loans/fetchRepaymentSchedule',
    async (loanId, { rejectWithValue }) => {
        try {
            const response = await loanService.getRepaymentSchedule(loanId);
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Get admin dashboard stats
export const getAdminDashboardStats = createAsyncThunk(
    'loans/getAdminDashboardStats',
    async (_, { rejectWithValue }) => {
        try {
            const response = await loanService.getAdminDashboardStats();
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get platform stats for analytics
export const getPlatformStats = createAsyncThunk(
    'loans/getPlatformStats',
    async (timeRange, { rejectWithValue }) => {
        try {
            const response = await loanService.getPlatformStats(timeRange);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get my funded loans (as lender)
export const getMyFundedLoans = createAsyncThunk(
    'loans/getMyFundedLoans',
    async (_, { rejectWithValue }) => {
        try {
            const response = await loanService.getMyFundedLoans();
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get pending loans (admin)
export const getPendingLoans = createAsyncThunk(
    'loans/getPendingLoans',
    async (_, { rejectWithValue }) => {
        try {
            const response = await loanService.getPendingLoans();
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Approve loan (admin)
export const approveLoan = createAsyncThunk(
    'loans/approve',
    async (loanId, { rejectWithValue }) => {
        try {
            const response = await loanService.approveLoan(loanId);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Reject loan (admin)
export const rejectLoan = createAsyncThunk(
    'loans/reject',
    async ({ loanId, reason }, { rejectWithValue }) => {
        try {
            const response = await loanService.rejectLoan(loanId, reason);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get pending collateral (admin)
export const getPendingCollateral = createAsyncThunk(
    'loans/getPendingCollateral',
    async (_, { rejectWithValue }) => {
        try {
            const response = await loanService.getPendingCollateral();
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Verify collateral (admin)
export const verifyCollateral = createAsyncThunk(
    'loans/verifyCollateral',
    async (collateralId, { rejectWithValue }) => {
        try {
            const response = await loanService.verifyCollateral(collateralId);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Reject collateral (admin)
export const rejectCollateral = createAsyncThunk(
    'loans/rejectCollateral',
    async ({ collateralId, reason }, { rejectWithValue }) => {
        try {
            const response = await loanService.rejectCollateral(collateralId, reason);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get defaulted loans (admin)
export const getDefaultedLoans = createAsyncThunk(
    'loans/getDefaultedLoans',
    async (_, { rejectWithValue }) => {
        try {
            const response = await loanService.getDefaultedLoans();
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Initiate default proceedings (admin)
export const initiateDefaultProceedings = createAsyncThunk(
    'loans/initiateDefaultProceedings',
    async (loanId, { rejectWithValue }) => {
        try {
            const response = await loanService.initiateDefaultProceedings(loanId);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Send to recovery (admin)
export const sendToRecovery = createAsyncThunk(
    'loans/sendToRecovery',
    async (loanId, { rejectWithValue }) => {
        try {
            const response = await loanService.sendToRecovery(loanId);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Process guarantee claim
export const processGuaranteeClaim = createAsyncThunk(
    'loans/processGuaranteeClaim',
    async ({ loanId, claimData }, { rejectWithValue }) => {
        try {
            const response = await loanService.processGuaranteeClaim(loanId, claimData);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// UX-003: Get refinancing opportunities for investors
export const getRefinancingOpportunities = createAsyncThunk(
    'loans/getRefinancingOpportunities',
    async (_, { rejectWithValue }) => {
        try {
            const response = await loanService.getRefinancingOpportunities();
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// UX-003: Invest in refinancing opportunity
export const investInRefinancing = createAsyncThunk(
    'loans/investInRefinancing',
    async ({ opportunityId, amount }, { rejectWithValue }) => {
        try {
            const response = await loanService.investInRefinancing(opportunityId, amount);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// UX-011: Bulk approve loans
export const bulkApproveLoans = createAsyncThunk(
    'loans/bulkApprove',
    async ({ loanIds }, { rejectWithValue }) => {
        try {
            const response = await loanService.bulkApproveLoans(loanIds);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const loanSlice = createSlice({
    name: 'loans',
    initialState,
    reducers: {
        setFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        resetFilters: (state) => {
            state.filters = initialState.filters;
        },
        setPage: (state, action) => {
            state.pagination.page = action.payload;
        },
        clearLoanDetails: (state) => {
            state.loanDetails = null;
        },
        clearError: (state) => {
            state.error = null;
        },
        resetLoading: (state) => {
            state.isLoading = false;
        },
    },
    extraReducers: (builder) => {
        builder
            // Create loan request
            .addCase(createLoanRequest.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(createLoanRequest.fulfilled, (state, action) => {
                state.isLoading = false;
                state.myLoans.unshift(action.payload);
            })
            .addCase(createLoanRequest.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Get loan requests
            .addCase(getLoanRequests.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getLoanRequests.fulfilled, (state, action) => {
                state.isLoading = false;
                state.loanRequests = action.payload?.loans ?? action.payload ?? [];
                state.pagination = action.payload?.pagination || state.pagination;
            })
            .addCase(getLoanRequests.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Get my loans - CQ-01 Fix: consolidated from duplicate getMyLoanRequests
            .addCase(getMyLoans.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getMyLoans.fulfilled, (state, action) => {
                state.isLoading = false;
                // CQ-01 Fix: Update both myLoans and myLoanRequests for backwards compatibility
                state.myLoans = action.payload?.loans ?? action.payload ?? [];
                state.myLoanRequests = action.payload?.loans ?? action.payload ?? [];
            })
            .addCase(getMyLoans.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Get loan details
            .addCase(getLoanDetails.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getLoanDetails.fulfilled, (state, action) => {
                state.isLoading = false;
                state.loanDetails = action.payload;
            })
            .addCase(getLoanDetails.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Fund loan
            .addCase(fundLoan.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fundLoan.fulfilled, (state, action) => {
                state.isLoading = false;
                // Update the loan in the list
                const index = state.loanRequests.findIndex(l => l.id === action.payload.id);
                if (index !== -1) {
                    state.loanRequests[index] = action.payload;
                }
            })
            .addCase(fundLoan.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Make repayment
            .addCase(makeRepayment.fulfilled, (state, action) => {
                if (state.loanDetails?.id === action.payload.id) {
                    state.loanDetails = action.payload;
                }
            })
            // Calculate LTV
            .addCase(calculateLTV.fulfilled, (state, action) => {
                state.ltvRatio = action.payload.ltv;
            })
            // Get risk score
            .addCase(getRiskScore.fulfilled, (state, action) => {
                state.riskScore = action.payload;
            })
            // Cancel loan
            .addCase(cancelLoanRequest.fulfilled, (state, action) => {
                const index = state.myLoans.findIndex(l => l.id === action.payload.id);
                if (index !== -1) {
                    state.myLoans[index] = action.payload;
                }
            })
            // Request top-up
            .addCase(requestLoanTopup.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(requestLoanTopup.fulfilled, (state, action) => {
                state.isLoading = false;
                if (state.loanDetails?.id === action.payload.id) {
                    state.loanDetails = action.payload;
                }
            })
            .addCase(requestLoanTopup.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Auto-schedule repayments
            .addCase(autoScheduleRepayments.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(autoScheduleRepayments.fulfilled, (state, action) => {
                state.isLoading = false;
                if (state.loanDetails?.id === action.payload.loanId) {
                    state.loanDetails.scheduledPayments = action.payload;
                }
            })
            .addCase(autoScheduleRepayments.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Toggle auto-payments
            .addCase(toggleAutoPayments.fulfilled, (state, action) => {
                if (state.loanDetails?.id === action.payload.loanId) {
                    state.loanDetails.autoPaymentsEnabled = action.payload.enabled;
                }
            })
            // Fetch repayment schedule
            .addCase(fetchRepaymentSchedule.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchRepaymentSchedule.fulfilled, (state, action) => {
                state.isLoading = false;
                if (state.loanDetails?.id === action.payload.loanId) {
                    state.loanDetails.repaymentSchedule = action.payload.schedule;
                }
            })
            .addCase(fetchRepaymentSchedule.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Admin dashboard stats
            .addCase(getAdminDashboardStats.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getAdminDashboardStats.fulfilled, (state, action) => {
                state.isLoading = false;
                state.adminStats = action.payload;
            })
            .addCase(getAdminDashboardStats.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Platform stats
            .addCase(getPlatformStats.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getPlatformStats.fulfilled, (state, action) => {
                state.isLoading = false;
                state.platformStats = action.payload;
            })
            .addCase(getPlatformStats.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // My funded loans (as lender)
            .addCase(getMyFundedLoans.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getMyFundedLoans.fulfilled, (state, action) => {
                state.isLoading = false;
                state.myFundedLoans = action.payload?.loans ?? action.payload ?? [];
                state.fundingOpportunities = action.payload?.loans ?? action.payload ?? [];
            })
            .addCase(getMyFundedLoans.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Get pending loans (admin)
            .addCase(getPendingLoans.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getPendingLoans.fulfilled, (state, action) => {
                state.isLoading = false;
                state.pendingLoans = action.payload.loans;
            })
            .addCase(getPendingLoans.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Approve loan (admin)
            .addCase(approveLoan.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(approveLoan.fulfilled, (state, action) => {
                state.isLoading = false;
                const index = state.pendingLoans.findIndex(l => l.id === action.payload.id);
                if (index !== -1) {
                    state.pendingLoans.splice(index, 1);
                }
            })
            .addCase(approveLoan.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Reject loan (admin)
            .addCase(rejectLoan.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(rejectLoan.fulfilled, (state, action) => {
                state.isLoading = false;
                const index = state.pendingLoans.findIndex(l => l.id === action.payload.id);
                if (index !== -1) {
                    state.pendingLoans.splice(index, 1);
                }
            })
            .addCase(rejectLoan.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Get pending collateral (admin)
            .addCase(getPendingCollateral.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getPendingCollateral.fulfilled, (state, action) => {
                state.isLoading = false;
                state.pendingCollateral = action.payload.collateral;
            })
            .addCase(getPendingCollateral.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Verify collateral (admin)
            .addCase(verifyCollateral.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(verifyCollateral.fulfilled, (state, action) => {
                state.isLoading = false;
                const index = state.pendingCollateral.findIndex(c => c.id === action.payload.id);
                if (index !== -1) {
                    state.pendingCollateral.splice(index, 1);
                }
            })
            .addCase(verifyCollateral.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Reject collateral (admin)
            .addCase(rejectCollateral.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(rejectCollateral.fulfilled, (state, action) => {
                state.isLoading = false;
                const index = state.pendingCollateral.findIndex(c => c.id === action.payload.id);
                if (index !== -1) {
                    state.pendingCollateral.splice(index, 1);
                }
            })
            .addCase(rejectCollateral.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Get defaulted loans (admin)
            .addCase(getDefaultedLoans.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getDefaultedLoans.fulfilled, (state, action) => {
                state.isLoading = false;
                state.defaultedLoans = action.payload.loans;
            })
            .addCase(getDefaultedLoans.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Initiate default proceedings (admin)
            .addCase(initiateDefaultProceedings.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(initiateDefaultProceedings.fulfilled, (state, action) => {
                state.isLoading = false;
                const index = state.defaultedLoans.findIndex(l => l.id === action.payload.id);
                if (index !== -1) {
                    state.defaultedLoans[index] = action.payload;
                }
            })
            .addCase(initiateDefaultProceedings.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Send to recovery (admin)
            .addCase(sendToRecovery.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(sendToRecovery.fulfilled, (state, action) => {
                state.isLoading = false;
                const index = state.defaultedLoans.findIndex(l => l.id === action.payload.id);
                if (index !== -1) {
                    state.defaultedLoans.splice(index, 1);
                }
            })
            .addCase(sendToRecovery.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Process guarantee claim
            .addCase(processGuaranteeClaim.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(processGuaranteeClaim.fulfilled, (state, action) => {
                state.isLoading = false;
                const index = state.defaultedLoans.findIndex(l => l.id === action.payload.id);
                if (index !== -1) {
                    state.defaultedLoans[index] = action.payload;
                }
            })
            .addCase(processGuaranteeClaim.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // UX-003: Get refinancing opportunities
            .addCase(getRefinancingOpportunities.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getRefinancingOpportunities.fulfilled, (state, action) => {
                state.isLoading = false;
                state.refinancingOpportunities = action.payload.opportunities || action.payload;
            })
            .addCase(getRefinancingOpportunities.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // UX-003: Invest in refinancing
            .addCase(investInRefinancing.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(investInRefinancing.fulfilled, (state, action) => {
                state.isLoading = false;
                // Remove from opportunities after successful investment
                state.refinancingOpportunities = state.refinancingOpportunities.filter(
                    opp => opp.id !== action.payload.opportunityId
                );
            })
            .addCase(investInRefinancing.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // UX-011: Bulk approve loans
            .addCase(bulkApproveLoans.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(bulkApproveLoans.fulfilled, (state, action) => {
                state.isLoading = false;
                // Remove approved loans from pending
                const approvedIds = action.payload.approved || [];
                state.pendingLoans = state.pendingLoans.filter(
                    loan => !approvedIds.includes(loan.id)
                );
            })
            .addCase(bulkApproveLoans.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    },
});

export const { setFilters, resetFilters, setPage, clearLoanDetails, clearError, resetLoading } = loanSlice.actions;

// Selectors - CQ-02 Fix: Consistent naming (isLoading)
export const selectAllLoans = (state) => state.loans.loans;
export const selectLoanLoading = (state) => state.loans.isLoading;
export default loanSlice.reducer;
