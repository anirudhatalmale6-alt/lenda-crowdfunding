import { createApiClient } from '../utils/api/client';

const API_URL = '/api/loans';

// Create loan-specific API client
const api = createApiClient(API_URL);

const unwrapData = (response) => response?.data?.data ?? response?.data ?? response;

const normalizeLoanCollection = (payload) => ({
    loans: Array.isArray(payload) ? payload : payload?.loans || [],
    total: payload?.total || 0,
    page: payload?.page || 1,
    pageSize: payload?.pageSize || payload?.limit || 0,
    totalPages: payload?.totalPages || 0,
});

const loanService = {
    // Create loan request (borrower)
    createLoanRequest: async (loanData) => {
        const response = await api.post('/', loanData);
        return unwrapData(response);
    },

    // Get all loan requests (for lenders)
    getLoanRequests: async (filters = {}) => {
        const response = await api.get('/', { params: filters });
        return normalizeLoanCollection(unwrapData(response));
    },

    // Get my loans (as borrower) - alias for getMyLoanRequests for backwards compatibility
    getMyLoans: async () => {
        const response = await api.get('/my-loans');
        return normalizeLoanCollection(unwrapData(response));
    },

    getMyFundedLoans: async () => {
        const response = await api.get('/my-funded');
        return normalizeLoanCollection(unwrapData(response));
    },

    getLoanDetails: async (loanId) => {
        const response = await api.get(`/${loanId}`);
        return unwrapData(response);
    },

    fundLoan: async (loanId, amount) => {
        const response = await api.post(`/${loanId}/fund`, { amount });
        return unwrapData(response);
    },

    makeRepayment: async (loanId, amount) => {
        const response = await api.post(`/${loanId}/repay`, { amount });
        return unwrapData(response);
    },

    getRepaymentSchedule: async (loanId) => {
        const response = await api.get(`/${loanId}/schedule`);
        const data = unwrapData(response);
        return {
            loanId: data?.loanId || loanId,
            schedule: data?.payments || data?.schedule || [],
            totalAmount: data?.totalAmount || 0,
            remainingBalance: data?.remainingBalance || 0,
        };
    },

    // Get pending loans (admin)
    getPendingLoans: async () => {
        const response = await api.get('/pending');
        return unwrapData(response);
    },

    // Approve loan (admin)
    approveLoan: async (loanId) => {
        const response = await api.post(`/${loanId}/approve`);
        return unwrapData(response);
    },

    // Reject loan (admin)
    rejectLoan: async (loanId, reason) => {
        const response = await api.post(`/${loanId}/reject`, { reason });
        return unwrapData(response);
    },

    // Get pending collateral (admin)
    getPendingCollateral: async () => {
        const response = await api.get('/collateral/pending');
        return unwrapData(response);
    },

    // Verify collateral (admin)
    verifyCollateral: async (collateralId) => {
        const response = await api.post(`/collateral/${collateralId}/verify`);
        return unwrapData(response);
    },

    // Reject collateral (admin)
    rejectCollateral: async (collateralId, reason) => {
        const response = await api.post(`/collateral/${collateralId}/reject`, { reason });
        return unwrapData(response);
    },

    // Get defaulted loans (admin)
    getDefaultedLoans: async () => {
        const response = await api.get('/defaulted');
        return unwrapData(response);
    },

    // Initiate default proceedings (admin)
    initiateDefaultProceedings: async (loanId) => {
        const response = await api.post(`/${loanId}/initiate-default`);
        return unwrapData(response);
    },

    // Send to recovery (admin)
    sendToRecovery: async (loanId) => {
        const response = await api.post(`/${loanId}/send-to-recovery`);
        return unwrapData(response);
    },

    // Process guarantee claim
    processGuaranteeClaim: async (loanId, claimData) => {
        const response = await api.post(`/${loanId}/process-claim`, claimData);
        return unwrapData(response);
    },

    // ============================================================
    // GRACE PERIOD VALIDATION (RISK-03)
    // ============================================================

    /**
     * Check if loan is within grace period
     * @param {number} loanId - Loan ID
     * @returns {Promise}
     */
    checkGracePeriod: async (loanId) => {
        const response = await api.get(`/${loanId}/grace-period-status`);
        return unwrapData(response);
    },

    /**
     * Validate repayment within grace period
     * @param {number} loanId - Loan ID
     * @param {number} amount - Repayment amount
     * @returns {Promise}
     */
    validateRepaymentInGracePeriod: async (loanId, amount) => {
        const response = await api.post(`/${loanId}/validate-repayment`, { amount });
        return unwrapData(response);
    },

    /**
     * Get grace period configuration
     * @returns {Promise}
     */
    getGracePeriodConfig: async () => {
        const response = await api.get('/grace-period-config');
        return unwrapData(response);
    },

    /**
     * Update grace period configuration (admin)
     * @param {Object} config - New configuration
     * @returns {Promise}
     */
    updateGracePeriodConfig: async (config) => {
        const response = await api.put('/grace-period-config', config);
        return unwrapData(response);
    },

    /**
     * Get loans approaching grace period
     * @param {number} daysAhead - Days to look ahead
     * @returns {Promise}
     */
    getLoansApproachingGracePeriod: async (daysAhead = 7) => {
        const response = await api.get('/approaching-grace-period', { params: { daysAhead } });
        return unwrapData(response);
    },

    // ============================================================
    // RESERVE COVERAGE (RISK-10, RISK-11, RISK-12)
    // ============================================================

    /**
     * Get reserve fund coverage status
     * @returns {Promise}
     */
    getReserveCoverage: async () => {
        const response = await api.get('/reserve-coverage');
        return unwrapData(response);
    },

    /**
     * Validate minimum coverage ratio before loan approval (RISK-11)
     * @returns {Promise}
     */
    validateMinCoverageRatio: async () => {
        const response = await api.get('/validate-coverage-ratio');
        return unwrapData(response);
    },

    /**
     * Get real-time coverage data (RISK-12)
     * @returns {Promise}
     */
    getRealTimeCoverage: async () => {
        const response = await api.get('/realtime-coverage');
        return unwrapData(response);
    }
};

export default loanService;
