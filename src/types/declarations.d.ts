// Declaration file for JavaScript modules without TypeScript support
declare module '*.js' {
  const content: any;
  export default content;
}

declare module '*.jsx' {
  const content: any;
  export default content;
}

// Extend module declarations
declare module '../services/authService' {
  const authService: any;
  export default authService;
}

declare module '../services/loanService' {
  const loanService: any;
  export default loanService;
}

declare module '../services/walletService' {
  const walletService: any;
  export default walletService;
}

declare module '../services/escrowService' {
  const escrowService: any;
  export default escrowService;
}

declare module '../services/marketplaceService' {
  const marketplaceService: any;
  export default marketplaceService;
}

declare module '../services/blockchainEscrowService' {
  const blockchainEscrowService: any;
  export default blockchainEscrowService;
}

declare module '../services/blockchainLoanService' {
  const blockchainLoanService: any;
  export default blockchainLoanService;
}

declare module '../services/web3Service' {
  const web3Service: any;
  export default web3Service;
}

declare module '../store/slices/authSlice' {
  const authReducer: any;
  export { authReducer as default };
  export const login: any;
  export const register: any;
  export const logout: any;
  export const verify2FA: any;
  export const updateProfile: any;
  export const submitKYC: any;
  export const getAllUsers: any;
  export const updateUserStatus: any;
  export const verifyUserKYC: any;
}

declare module '../store/slices/loanSlice' {
  const loanReducer: any;
  export { loanReducer as default };
  export const createLoanRequest: any;
  export const getLoanRequests: any;
  export const getMyLoans: any;
  export const getLoanDetails: any;
  export const fundLoan: any;
  export const makeRepayment: any;
  export const calculateLTV: any;
  export const getRiskScore: any;
  export const cancelLoanRequest: any;
  export const requestLoanTopup: any;
  export const getAdminDashboardStats: any;
  export const getPlatformStats: any;
}

declare module '../store/slices/walletSlice' {
  const walletReducer: any;
  export { walletReducer as default };
}

declare module '../store/slices/marketplaceSlice' {
  const marketplaceReducer: any;
  export { marketplaceReducer as default };
}

declare module '../store/slices/escrowSlice' {
  const escrowReducer: any;
  export { escrowReducer as default };
}

declare module '../store/slices/uiSlice' {
  const uiReducer: any;
  export { uiReducer as default };
}

// Store slice declarations for relative paths used in src/store/index.ts
declare module './slices/authSlice' {
  const authReducer: any;
  export { authReducer as default };
}

declare module './slices/loanSlice' {
  const loanReducer: any;
  export { loanReducer as default };
}

declare module './slices/walletSlice' {
  const walletReducer: any;
  export { walletReducer as default };
}

declare module './slices/marketplaceSlice' {
  const marketplaceReducer: any;
  export { marketplaceReducer as default };
}

declare module './slices/escrowSlice' {
  const escrowReducer: any;
  export { escrowReducer as default };
}

declare module './slices/uiSlice' {
  const uiReducer: any;
  export { uiReducer as default };
}

declare module './slices/auctionSlice' {
  const auctionReducer: any;
  export { auctionReducer as default };
}

declare module './slices/gdprSlice' {
  const gdprReducer: any;
  export { gdprReducer as default };
}

declare module '../services/auctionService' {
  const auctionService: any;
  export default auctionService;
}

declare module '../services/gdprService' {
  const gdprService: any;
  export { gdprService as default, CONSENT_TYPES, REQUIRED_CONSENTS };
}

declare module '../store/slices/auctionSlice' {
  const auctionReducer: any;
  export { auctionReducer as default };
  export const getAuctions: any;
  export const getActiveAuctions: any;
  export const getAuctionById: any;
  export const placeBid: any;
  export const getMyBids: any;
  export const getAuctionStats: any;
  export const cancelAuction: any;
  export const endAuction: any;
  export const withdrawBid: any;
  export const createAuction: any;
}

declare module '../store/slices/gdprSlice' {
  const gdprReducer: any;
  export { gdprReducer as default };
  export const getConsents: any;
  export const grantConsent: any;
  export const withdrawConsent: any;
  export const grantRequiredConsents: any;
  export const checkRequiredConsents: any;
  export const requestDataExport: any;
  export const requestDataDeletion: any;
  export const cancelDataDeletion: any;
  export const getDataRequests: any;
  export const getPolicyVersion: any;
  export const acceptPolicyVersion: any;
}
