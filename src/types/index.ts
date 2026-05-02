// User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  kycStatus: KYCStatus;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  profile?: UserProfile;
}

export type UserRole = 'borrower' | 'lender' | 'admin' | 'super_admin';

export type KYCStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  dateOfBirth?: string;
  nationalId?: string;
  avatar?: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  phone?: string;
}

// Loan Types
export interface Loan {
  id: string;
  borrowerId: string;
  borrower?: User;
  amount: number;
  interestRate: number;
  duration: number; // in days
  status: LoanStatus;
  collateralId?: string;
  collateral?: Collateral;
  fundedAmount: number;
  repaidAmount: number;
  createdAt: string;
  updatedAt: string;
  repaymentSchedule?: RepaymentSchedule[];
  fundingDeadline?: string;
  auctionEnabled?: boolean;
  auctionEndTime?: string;
  startingBid?: number;
  currentBid?: number;
  highestBidderId?: string;
}

export type LoanStatus = 
  | 'REQUESTED'
  | 'FUNDED'
  | 'ACTIVE'
  | 'REPAID'
  | 'DEFAULTED'
  | 'PLATFORM_SETTLED'
  | 'RECOVERY_SALE'
  | 'CANCELLED'
  | 'AUCTION'
  | 'AUCTION_COMPLETED';

export interface LoanFilters {
  status?: string;
  minAmount?: number;
  maxAmount?: number;
  minRate?: number;
  maxRate?: number;
  duration?: string;
}

export interface CreateLoanData {
  amount: number;
  interestRate: number;
  duration: number;
  purpose: string;
  collateralData?: CollateralData;
}

export interface RepaymentSchedule {
  id: string;
  loanId: string;
  dueDate: string;
  amount: number;
  principal: number;
  interest: number;
  status: 'pending' | 'paid' | 'overdue';
  paidAt?: string;
}

export interface Collateral {
  id: string;
  loanId: string;
  type: CollateralType;
  value: number;
  description: string;
  documents: string[];
  status: CollateralStatus;
  verifiedAt?: string;
  verifiedBy?: string;
}

export type CollateralType = 'real_estate' | 'vehicle' | 'equipment' | 'inventory' | 'receivables' | 'other';

export type CollateralStatus = 'pending' | 'verified' | 'rejected' | 'released';

export interface CollateralData {
  type: CollateralType;
  value: number;
  description: string;
  documents: File[];
}

// Escrow Types
export interface Escrow {
  id: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  status: EscrowStatus;
  terms: string;
  createdAt: string;
  releasedAt?: string;
  blockchainTxHash?: string;
}

export type EscrowStatus = 
  | 'PENDING'
  | 'FUNDED'
  | 'RELEASED'
  | 'DISPUTED'
  | 'REFUNDED'
  | 'CANCELLED';

// Wallet Types
export interface Wallet {
  id: string;
  userId: string;
  address: string;
  balance: number;
  currency: string;
  type: WalletType;
}

export type WalletType = 'internal' | 'external' | 'metamask';

// Auction Types
export interface Auction {
  id: string;
  loanId: string;
  loan?: Loan;
  startingBid: number;
  currentBid: number;
  highestBidderId: string;
  highestBidder?: User;
  startTime: string;
  endTime: string;
  status: AuctionStatus;
  minIncrement: number;
  bids: AuctionBid[];
}

export type AuctionStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface AuctionBid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidder?: User;
  amount: number;
  timestamp: string;
}

export interface CreateAuctionData {
  loanId: string;
  startingBid: number;
  minIncrement?: number;
  duration: number; // in hours
}

export interface PlaceBidData {
  auctionId: string;
  amount: number;
}

// GDPR Types
export interface GDPRConsent {
  id: string;
  userId: string;
  consentType: GDPRConsentType;
  granted: boolean;
  grantedAt?: string;
  withdrawnAt?: string;
  version: string;
}

export type GDPRConsentType = 
  | 'terms_of_service'
  | 'privacy_policy'
  | 'marketing_emails'
  | 'data_processing'
  | 'third_party_sharing'
  | 'cookies';

export interface GDPRDataRequest {
  id: string;
  userId: string;
  requestType: GDPRRequestType;
  status: GDPRRequestStatus;
  createdAt: string;
  completedAt?: string;
  data?: Record<string, unknown>;
}

export type GDPRRequestType = 'EXPORT' | 'DELETION' | 'RECTIFICATION';
export type GDPRRequestStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Stats Types
export interface AdminStats {
  totalUsers: number;
  activeLoans: number;
  totalVolume: number;
  defaultRate: number;
  pendingApprovals: number;
}

export interface PlatformStats {
  totalVolume: number;
  activeLoans: number;
  defaultRate: number;
  averageInterestRate: number;
  totalUsers: number;
  newUsers: number;
  timeRange: number;
}

// Transaction Types
export interface Transaction {
  id: string;
  userId: string;
  loanId?: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  description?: string;
  createdAt: string;
  confirmedAt?: string;
  blockchainTxHash?: string;
}

export type TransactionType = 
  | 'LOAN_FUNDED'
  | 'LOAN_REPAID'
  | 'COLLATERAL_RELEASE'
  | 'DEFAULT_SETTLEMENT'
  | 'WALLET_DEPOSIT'
  | 'WALLET_WITHDRAWAL'
  | 'AUCTION_BID'
  | 'AUCTION_PAYOUT';

export type TransactionStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
