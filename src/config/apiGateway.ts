/**
 * API Gateway - Frontend Abstraction Layer
 * 
 * Provides a decoupled interface between the React frontend and PHP backend
 * This abstraction allows the frontend to work with resources rather than
 * specific endpoint URLs, reducing tight coupling
 * 
 * ARCH-04: Addresses tight coupling between React frontend and PHP backend
 */

import api from '../utils/api/client';
import { cachedApi } from '../utils/api/client';

// API Version - centralized for easy updates
const API_VERSION = 'v2';

/**
 * Resource endpoints mapping
 * Centralized endpoint configuration for easy maintenance
 */
const ENDPOINTS = {
  // Authentication
  auth: {
    login: `/api/${API_VERSION}/auth/login`,
    register: `/api/${API_VERSION}/auth/register`,
    logout: `/api/${API_VERSION}/auth/logout`,
    me: `/api/${API_VERSION}/auth/me`,
    profile: `/api/${API_VERSION}/auth/profile`,
    changePassword: `/api/${API_VERSION}/auth/change-password`,
    forgotPassword: `/api/${API_VERSION}/auth/forgot-password`,
    resetPassword: `/api/${API_VERSION}/auth/reset-password`,
    kyc: `/api/${API_VERSION}/auth/kyc`,
    kycStatus: `/api/${API_VERSION}/auth/kyc/status`,
    enable2FA: `/api/${API_VERSION}/auth/enable-2fa`,
    disable2FA: `/api/${API_VERSION}/auth/disable-2fa`,
    verify2FA: `/api/${API_VERSION}/auth/verify-2fa`,
  },

  // Loans
  loans: {
    list: `/api/${API_VERSION}/loans`,
    myLoans: `/api/${API_VERSION}/loans/my-loans`,
    myFunded: `/api/${API_VERSION}/loans/my-funded`,
    get: (id: number) => `/api/${API_VERSION}/loans/${id}`,
    create: `/api/${API_VERSION}/loans`,
    fund: (id: number) => `/api/${API_VERSION}/loans/${id}/fund`,
    repay: (id: number) => `/api/${API_VERSION}/loans/${id}/repay`,
    cancel: (id: number) => `/api/${API_VERSION}/loans/${id}/cancel`,
    topup: (id: number) => `/api/${API_VERSION}/loans/${id}/topup`,
    calculateLTV: `/api/${API_VERSION}/loans/calculate-ltv`,
    riskScore: (userId: number) => `/api/${API_VERSION}/loans/risk-score/${userId}`,
    matches: (id: number) => `/api/${API_VERSION}/loans/${id}/matches`,
    schedule: (id: number) => `/api/${API_VERSION}/loans/${id}/schedule`,
    statistics: `/api/${API_VERSION}/loans/statistics`,
    
    // Admin
    pending: `/api/${API_VERSION}/loans/pending`,
    approve: (id: number) => `/api/${API_VERSION}/loans/${id}/approve`,
    reject: (id: number) => `/api/${API_VERSION}/loans/${id}/reject`,
    initiateDefault: (id: number) => `/api/${API_VERSION}/loans/${id}/initiate-default`,
    sendToRecovery: (id: number) => `/api/${API_VERSION}/loans/${id}/send-to-recovery`,
    defaulted: `/api/${API_VERSION}/loans/defaulted`,
    
    // Collateral
    collateral: (id: number) => `/api/${API_VERSION}/loans/${id}/collateral`,
    pendingCollateral: `/api/${API_VERSION}/loans/collateral/pending`,
    verifyCollateral: (id: number) => `/api/${API_VERSION}/loans/collateral/${id}/verify`,
    rejectCollateral: (id: number) => `/api/${API_VERSION}/loans/collateral/${id}/reject`,
    
    // Reserve Fund
    reserveFundStatus: `/api/${API_VERSION}/loans/reserve-fund/status`,
    depositToReserveFund: `/api/${API_VERSION}/loans/reserve-fund/deposit`,
    
    // Analytics
    analytics: `/api/${API_VERSION}/loans/analytics`,
    dashboardStats: `/api/${API_VERSION}/loans/admin/dashboard-stats`,
    platformStats: `/api/${API_VERSION}/loans/admin/platform-stats`,
  },

  // Wallet
  wallet: {
    info: `/api/${API_VERSION}/wallet`,
    transactions: `/api/${API_VERSION}/wallet/transactions`,
    deposit: `/api/${API_VERSION}/wallet/deposit`,
    withdraw: `/api/${API_VERSION}/wallet/withdraw`,
    transfer: `/api/${API_VERSION}/wallet/transfer`,
    depositAddress: (currency: string) => `/api/${API_VERSION}/wallet/deposit-address/${currency}`,
    balance: (type: string) => `/api/${API_VERSION}/wallet/balance/${type}`,
    history: `/api/${API_VERSION}/wallet/history`,
    requestWithdrawal: `/api/${API_VERSION}/wallet/request-withdrawal`,
    currencies: `/api/${API_VERSION}/wallet/currencies`,
  },

  // Escrow
  escrow: {
    list: `/api/${API_VERSION}/escrow`,
    myTransactions: `/api/${API_VERSION}/escrow/my-transactions`,
    get: (id: number) => `/api/${API_VERSION}/escrow/${id}`,
    fund: (id: number) => `/api/${API_VERSION}/escrow/${id}/fund`,
    ship: (id: number) => `/api/${API_VERSION}/escrow/${id}/ship`,
    confirm: (id: number) => `/api/${API_VERSION}/escrow/${id}/confirm`,
    release: (id: number) => `/api/${API_VERSION}/escrow/${id}/release`,
    dispute: (id: number) => `/api/${API_VERSION}/escrow/${id}/dispute`,
    resolve: (id: number) => `/api/${API_VERSION}/escrow/${id}/resolve`,
    statistics: `/api/${API_VERSION}/escrow/statistics`,
    shippingCarriers: `/api/${API_VERSION}/escrow/shipping-carriers`,
    disputes: `/api/${API_VERSION}/escrow/disputes`,
  },

  // Collateral
  collateral: {
    list: `/api/${API_VERSION}/collateral`,
    my: `/api/${API_VERSION}/collateral/my`,
    add: `/api/${API_VERSION}/collateral/add`,
    get: (id: number) => `/api/${API_VERSION}/collateral/${id}`,
    update: (id: number) => `/api/${API_VERSION}/collateral/${id}/update`,
    delete: (id: number) => `/api/${API_VERSION}/collateral/${id}/delete`,
    linkLoan: (id: number) => `/api/${API_VERSION}/collateral/${id}/link-loan`,
    calculateLTV: `/api/${API_VERSION}/collateral/calculate-ltv`,
    valuation: (id: number) => `/api/${API_VERSION}/collateral/${id}/valuation`,
    uploadDocument: (id: number) => `/api/${API_VERSION}/collateral/${id}/upload-document`,
    pending: `/api/${API_VERSION}/collateral/pending`,
    verify: (id: number) => `/api/${API_VERSION}/collateral/${id}/verify`,
    reject: (id: number) => `/api/${API_VERSION}/collateral/${id}/reject`,
    requestValuation: (id: number) => `/api/${API_VERSION}/collateral/${id}/request-valuation`,
    types: `/api/${API_VERSION}/collateral/types`,
  },

  // Accelerator
  accelerator: {
    trending: `/api/${API_VERSION}/loans/trending`,
    closingSoon: `/api/${API_VERSION}/loans/closing-soon`,
    status: (loanId: number) => `/api/${API_VERSION}/accelerator/status/${loanId}`,
    boostRate: (id: number) => `/api/${API_VERSION}/loan/${id}/boost-rate`,
    hotOpportunities: `/api/${API_VERSION}/accelerator/hot-opportunities`,
    highYield: `/api/${API_VERSION}/accelerator/high-yield`,
    almostFunded: `/api/${API_VERSION}/accelerator/almost-funded`,
    
    // Admin
    adminSettings: `/api/${API_VERSION}/accelerator/admin/settings`,
    adminUpdateSettings: `/api/${API_VERSION}/accelerator/admin/settings/update`,
    adminAnalytics: `/api/${API_VERSION}/accelerator/admin/analytics`,
    adminTrigger: (id: number) => `/api/${API_VERSION}/accelerator/admin/trigger/${id}`,
  },

  // Risk Engine
  risk: {
    borrowerScore: (userId: number) => `/api/${API_VERSION}/risk/borrower/score/${userId}`,
    calculateBorrowerScore: `/api/${API_VERSION}/risk/borrower/calculate`,
    collateralValuation: (collateralId: number) => `/api/${API_VERSION}/risk/collateral/valuation/${collateralId}`,
    verifyCollateral: (id: number) => `/api/${API_VERSION}/risk/collateral/verify/${id}`,
    calculateLTV: `/api/${API_VERSION}/risk/ltv/calculate`,
    validateLTV: `/api/${API_VERSION}/risk/ltv/validate`,
    validateExposure: `/api/${API_VERSION}/risk/exposure/validate`,
    loanStatus: (loanId: number) => `/api/${API_VERSION}/risk/loan/status/${loanId}`,
    analyzeLoan: (loanId: number) => `/api/${API_VERSION}/risk/loan/analyze/${loanId}`,
    startWorkflow: (loanId: number) => `/api/${API_VERSION}/risk/default/start-workflow/${loanId}`,
    advanceWorkflow: (loanId: number) => `/api/${API_VERSION}/risk/default/advance-workflow/${loanId}`,
    checkDefaults: `/api/${API_VERSION}/risk/cron/check-defaults`,
    loansAtRisk: `/api/${API_VERSION}/risk/loans-at-risk`,
    checkLoanDefault: (loanId: number) => `/api/${API_VERSION}/risk/check-loan-default/${loanId}`,
    workflowProgressionStatus: `/api/${API_VERSION}/risk/workflow/progression-status`,
    triggerWorkflowProgress: (loanId: number) => `/api/${API_VERSION}/risk/workflow/progress/${loanId}`,
    defaultPredictionStats: `/api/${API_VERSION}/risk/default-prediction/stats`,
    
    // Grace Period
    gracePeriodConfig: `/api/${API_VERSION}/risk/grace-period/config`,
    gracePeriodStatus: (loanId: number) => `/api/${API_VERSION}/risk/grace-period/status/${loanId}`,
    gracePeriodUpcoming: `/api/${API_VERSION}/risk/grace-period/upcoming`,
    
    // Admin
    adminDashboard: `/api/${API_VERSION}/risk/admin/dashboard`,
    adminDefaultMonitoring: `/api/${API_VERSION}/risk/admin/default-monitoring`,
    validateLoanRequest: `/api/${API_VERSION}/risk/validate-loan-request`,
  },

  // Refinancing
  refinancing: {
    match: `/api/${API_VERSION}/refinancing/match`,
    matchScore: (id: number) => `/api/${API_VERSION}/refinancing/${id}/match-score`,
    recommendations: `/api/${API_VERSION}/refinancing/recommendations`,
    marketAnalytics: `/api/${API_VERSION}/refinancing/market-analytics`,
    borrowerEligibility: (borrowerId: number) => `/api/${API_VERSION}/refinancing/borrower/${borrowerId}/eligibility`,
    apply: `/api/${API_VERSION}/refinancing/apply`,
    accept: (id: number) => `/api/${API_VERSION}/refinancing/${id}/accept`,
    portfolio: `/api/${API_VERSION}/refinancing/portfolio`,
    investorPreferences: `/api/${API_VERSION}/refinancing/investor/preferences`,
  },

  // Discovery
  discovery: {
    recommendations: `/api/${API_VERSION}/discovery/recommendations`,
    loans: `/api/${API_VERSION}/discovery/loans`,
    preferences: `/api/${API_VERSION}/discovery/preferences`,
    analytics: `/api/${API_VERSION}/discovery/analytics`,
  },

  // Rates
  rates: {
    current: `/api/${API_VERSION}/rates/current`,
    historical: `/api/${API_VERSION}/rates/historical`,
    calculate: `/api/${API_VERSION}/rates/calculate`,
    adjust: `/api/${API_VERSION}/rates/adjust`,
  },

  // Capital Protection
  capitalProtection: {
    status: `/api/${API_VERSION}/capital-protection/status`,
    claim: `/api/${API_VERSION}/capital-protection/claim`,
    claims: `/api/${API_VERSION}/capital-protection/claims`,
    claimDetails: (id: number) => `/api/${API_VERSION}/capital-protection/claims/${id}`,
    resolveClaim: (id: number) => `/api/${API_VERSION}/capital-protection/claims/${id}/resolve`,
  },

  // Credit Reputation
  credit: {
    score: (userId: number) => `/api/${API_VERSION}/credit/score/${userId}`,
    history: (userId: number) => `/api/${API_VERSION}/credit/history/${userId}`,
    report: (userId: number) => `/api/${API_VERSION}/credit/report/${userId}`,
    calculate: `/api/${API_VERSION}/credit/calculate`,
  },

  // Revenue
  revenue: {
    overview: `/api/${API_VERSION}/revenue/overview`,
    breakdown: `/api/${API_VERSION}/revenue/breakdown`,
    trends: `/api/${API_VERSION}/revenue/trends`,
    projections: `/api/${API_VERSION}/revenue/projections`,
  },

  // Audit
  audit: {
    logs: `/api/${API_VERSION}/audit/logs`,
    logDetails: (id: number) => `/api/${API_VERSION}/audit/logs/${id}`,
    export: `/api/${API_VERSION}/audit/export`,
  },

  // Tokenization
  tokens: {
    list: `/api/${API_VERSION}/tokens`,
    get: (id: number) => `/api/${API_VERSION}/tokens/${id}`,
    transfer: (id: number) => `/api/${API_VERSION}/tokens/${id}/transfer`,
    holdings: `/api/${API_VERSION}/tokens/holdings`,
    market: `/api/${API_VERSION}/tokens/market`,
  },

  // Recovery Marketplace
  recovery: {
    marketplace: `/api/${API_VERSION}/recovery/marketplace`,
    loans: `/api/${API_VERSION}/recovery/loans`,
    loanDetails: (id: number) => `/api/${API_VERSION}/recovery/loans/${id}`,
    purchase: `/api/${API_VERSION}/recovery/purchase`,
    myPurchases: `/api/${API_VERSION}/recovery/my-purchases`,
    analytics: `/api/${API_VERSION}/recovery/analytics`,
  },

  // API Version info
  version: {
    current: `/api/${API_VERSION}/version`,
    list: `/api/${API_VERSION}/versions`,
    deprecations: `/api/${API_VERSION}/deprecations`,
    migrations: `/api/${API_VERSION}/migrations`,
  },
};

/**
 * API Gateway class
 * Provides a clean abstraction layer for frontend-backend communication
 */
class ApiGateway {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private api: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cachedApi: any;
  private version: string = API_VERSION;

  constructor() {
    this.api = api;
    this.cachedApi = cachedApi;
  }

  /**
   * Get the current API version
   */
  getVersion(): string {
    return this.version;
  }

  /**
   * Check API health and version
   */
  async checkHealth() {
    return this.api.get(ENDPOINTS.version.current);
  }

  /**
   * Get API version information
   */
  async getVersionInfo() {
    return this.api.get(ENDPOINTS.version.list);
  }

  // ==================== AUTHENTICATION ====================
  
  async login(credentials: { email: string; password: string; twoFactorCode?: string }) {
    return this.api.post(ENDPOINTS.auth.login, credentials);
  }

  async register(userData: { email: string; password: string; firstName: string; lastName: string }) {
    return this.api.post(ENDPOINTS.auth.register, userData);
  }

  async logout() {
    return this.api.post(ENDPOINTS.auth.logout);
  }

  async getCurrentUser() {
    return this.api.get(ENDPOINTS.auth.me);
  }

  async updateProfile(profileData: any) {
    return this.api.put(ENDPOINTS.auth.profile, profileData);
  }

  // ==================== LOANS ====================

  async getLoans(params?: { 
    status?: string; 
    page?: number; 
    limit?: number;
    cursor?: string;
  }) {
    const statusKey = params?.status || 'all';
    return this.cachedApi.get(ENDPOINTS.loans.list, { 
      params,
      useCache: true,
      cacheKey: `loans:${statusKey}`
    });
  }

  async getMyLoans(params?: { page?: number; limit?: number }) {
    return this.api.get(ENDPOINTS.loans.myLoans, { params });
  }

  async getMyFundedLoans(params?: { page?: number; limit?: number }) {
    return this.api.get(ENDPOINTS.loans.myFunded, { params });
  }

  async getLoan(id: number) {
    return this.cachedApi.get(ENDPOINTS.loans.get(id), {
      useCache: true,
      cacheKey: `loan:${id}`
    });
  }

  async createLoan(loanData: any) {
    return this.api.post(ENDPOINTS.loans.create, loanData);
  }

  async fundLoan(id: number, amount: number) {
    return this.api.post(ENDPOINTS.loans.fund(id), { amount });
  }

  async repayLoan(id: number, amount: number) {
    return this.api.post(ENDPOINTS.loans.repay(id), { amount });
  }

  async cancelLoan(id: number) {
    return this.api.post(ENDPOINTS.loans.cancel(id));
  }

  async topupLoan(id: number, amount: number) {
    return this.api.post(ENDPOINTS.loans.topup(id), { amount });
  }

  async getLoanStatistics() {
    return this.cachedApi.get(ENDPOINTS.loans.statistics, {
      useCache: true,
      cacheKey: 'loan_statistics',
      cacheTTL: 300000 // 5 minutes
    });
  }

  // ==================== WALLET ====================

  async getWalletInfo() {
    return this.api.get(ENDPOINTS.wallet.info);
  }

  async getWalletTransactions(params?: { page?: number; limit?: number }) {
    return this.api.get(ENDPOINTS.wallet.transactions, { params });
  }

  async deposit(amount: number, currency: string) {
    return this.api.post(ENDPOINTS.wallet.deposit, { amount, currency });
  }

  async withdraw(amount: number, currency: string, address: string) {
    return this.api.post(ENDPOINTS.wallet.withdraw, { amount, currency, address });
  }

  async transfer(toUserId: number, amount: number, currency: string) {
    return this.api.post(ENDPOINTS.wallet.transfer, { toUserId, amount, currency });
  }

  async getDepositAddress(currency: string) {
    return this.api.get(ENDPOINTS.wallet.depositAddress(currency));
  }

  async getBalance(type: string = 'main') {
    return this.api.get(ENDPOINTS.wallet.balance(type));
  }

  // ==================== ESCROW ====================

  async getEscrowTransactions(params?: { status?: string; page?: number; limit?: number }) {
    return this.api.get(ENDPOINTS.escrow.list, { params });
  }

  async getEscrowTransaction(id: number) {
    return this.api.get(ENDPOINTS.escrow.get(id));
  }

  async fundEscrow(id: number, amount: number) {
    return this.api.post(ENDPOINTS.escrow.fund(id), { amount });
  }

  async shipEscrow(id: number, trackingNumber: string) {
    return this.api.post(ENDPOINTS.escrow.ship(id), { trackingNumber });
  }

  async confirmEscrow(id: number) {
    return this.api.post(ENDPOINTS.escrow.confirm(id));
  }

  async releaseEscrow(id: number) {
    return this.api.post(ENDPOINTS.escrow.release(id));
  }

  async disputeEscrow(id: number, reason: string) {
    return this.api.post(ENDPOINTS.escrow.dispute(id), { reason });
  }

  // ==================== COLLATERAL ====================

  async getCollateralList() {
    return this.api.get(ENDPOINTS.collateral.list);
  }

  async getCollateral(id: number) {
    return this.api.get(ENDPOINTS.collateral.get(id));
  }

  async addCollateral(collateralData: any) {
    return this.api.post(ENDPOINTS.collateral.add, collateralData);
  }

  async calculateLTV(loanAmount: number, collateralValue: number) {
    return this.api.get(ENDPOINTS.collateral.calculateLTV, { 
      params: { loanAmount, collateralValue } 
    });
  }

  // ==================== ACCELERATOR ====================

  async getTrendingLoans() {
    return this.cachedApi.get(ENDPOINTS.accelerator.trending, {
      useCache: true,
      cacheKey: 'trending_loans',
      cacheTTL: 60000 // 1 minute
    });
  }

  async getHotOpportunities() {
    return this.cachedApi.get(ENDPOINTS.accelerator.hotOpportunities, {
      useCache: true,
      cacheKey: 'hot_opportunities',
      cacheTTL: 60000
    });
  }

  async getHighYieldOpportunities() {
    return this.cachedApi.get(ENDPOINTS.accelerator.highYield, {
      useCache: true,
      cacheKey: 'high_yield',
      cacheTTL: 60000
    });
  }

  async getAlmostFundedLoans() {
    return this.cachedApi.get(ENDPOINTS.accelerator.almostFunded, {
      useCache: true,
      cacheKey: 'almost_funded',
      cacheTTL: 60000
    });
  }

  // ==================== RISK ====================

  async getBorrowerRiskScore(userId: number) {
    return this.cachedApi.get(ENDPOINTS.risk.borrowerScore(userId), {
      useCache: true,
      cacheKey: `risk_score:${userId}`,
      cacheTTL: 3600000 // 1 hour
    });
  }

  async getLoanRiskStatus(loanId: number) {
    return this.cachedApi.get(ENDPOINTS.risk.loanStatus(loanId), {
      useCache: true,
      cacheKey: `loan_risk:${loanId}`,
      cacheTTL: 300000 // 5 minutes
    });
  }

  async getLoansAtRisk() {
    return this.cachedApi.get(ENDPOINTS.risk.loansAtRisk, {
      useCache: true,
      cacheKey: 'loans_at_risk',
      cacheTTL: 300000
    });
  }

  // ==================== REFINANCING ====================

  async getRefinancingMatches() {
    return this.api.get(ENDPOINTS.refinancing.match);
  }

  async getBorrowerEligibility(borrowerId: number) {
    return this.api.get(ENDPOINTS.refinancing.borrowerEligibility(borrowerId));
  }

  async applyForRefinancing(data: any) {
    return this.api.post(ENDPOINTS.refinancing.apply, data);
  }

  // ==================== DISCOVERY ====================

  async getRecommendations(userId?: number) {
    return this.cachedApi.get(ENDPOINTS.discovery.recommendations, {
      params: userId ? { userId } : undefined,
      useCache: true,
      cacheKey: `recommendations:${userId || 'default'}`,
      cacheTTL: 300000
    });
  }

  // ==================== RECOVERY MARKETPLACE ====================

  async getRecoveryMarketplace(params?: { 
    page?: number; 
    limit?: number;
    minDiscount?: number;
    maxDiscount?: number;
  }) {
    return this.cachedApi.get(ENDPOINTS.recovery.marketplace, { 
      params,
      useCache: true,
      cacheKey: 'recovery_marketplace',
      cacheTTL: 60000
    });
  }

  async getRecoveryLoanDetails(id: number) {
    return this.cachedApi.get(ENDPOINTS.recovery.loanDetails(id), {
      useCache: true,
      cacheKey: `recovery_loan:${id}`,
      cacheTTL: 60000
    });
  }

  async purchaseRecoveryLoan(id: number, offerAmount: number) {
    return this.api.post(ENDPOINTS.recovery.purchase, { 
      loanId: id, 
      offerAmount 
    });
  }

  async getMyRecoveryPurchases() {
    return this.api.get(ENDPOINTS.recovery.myPurchases);
  }
}

// Export singleton instance
const apiGateway = new ApiGateway();

export default apiGateway;

// Export endpoints for direct access if needed
export { ENDPOINTS };

// Export type for TypeScript support
export type ApiGatewayType = typeof apiGateway;
