<?php
/**
 * API Routes Configuration
 * 
 * Unified API routing with version enforcement
 * All /api/* routes redirect to /api/v2/* (latest version)
 * 
 * @package Lenda.Config
 */

// Enable JSON extension for all API responses
Router::parseExtensions('json');

// ============================================================
// VERSION ENFORCEMENT - Redirect non-versioned to v2
// ============================================================

// Catch-all for non-versioned API routes and redirect to v2
// This ensures backward compatibility while enforcing versioning
Router::connect('/api/*', array('controller' => 'ApiVersioning', 'action' => 'redirectToVersioned'));

// ============================================================
// VERSIONED API ROUTES (v2 - Current/Latest)
// ============================================================

// Version info endpoints (no auth required)
Router::connect('/api/v2/version', array('controller' => 'ApiVersioning', 'action' => 'version'));
Router::connect('/api/v2/versions', array('controller' => 'ApiVersioning', 'action' => 'versions'));
Router::connect('/api/v2/deprecations', array('controller' => 'ApiVersioning', 'action' => 'deprecations'));
Router::connect('/api/v2/migrations', array('controller' => 'ApiVersioning', 'action' => 'migrations'));

// ==================== AUTHENTICATION v2 ====================
Router::connect('/api/v2/auth/login', array('controller' => 'ApiAuth', 'action' => 'login'));
Router::connect('/api/v2/auth/register', array('controller' => 'ApiAuth', 'action' => 'register'));
Router::connect('/api/v2/auth/logout', array('controller' => 'ApiAuth', 'action' => 'logout'));
Router::connect('/api/v2/auth/me', array('controller' => 'ApiAuth', 'action' => 'me'));
Router::connect('/api/v2/auth/verify-2fa', array('controller' => 'ApiAuth', 'action' => 'verify2FA'));
Router::connect('/api/v2/auth/enable-2fa', array('controller' => 'ApiAuth', 'action' => 'enable2FA'));
Router::connect('/api/v2/auth/disable-2fa', array('controller' => 'ApiAuth', 'action' => 'disable2FA'));
Router::connect('/api/v2/auth/profile', array('controller' => 'ApiAuth', 'action' => 'updateProfile'));
Router::connect('/api/v2/auth/change-password', array('controller' => 'ApiAuth', 'action' => 'changePassword'));
Router::connect('/api/v2/auth/forgot-password', array('controller' => 'ApiAuth', 'action' => 'forgotPassword'));
Router::connect('/api/v2/auth/reset-password', array('controller' => 'ApiAuth', 'action' => 'resetPassword'));
Router::connect('/api/v2/auth/kyc', array('controller' => 'ApiAuth', 'action' => 'submitKYC'));
Router::connect('/api/v2/auth/kyc/status', array('controller' => 'ApiAuth', 'action' => 'getKYCStatus'));

// ==================== LOANS v2 ====================
Router::connect('/api/v2/loans', array('controller' => 'ApiLoans', 'action' => 'index'));
Router::connect('/api/v2/loans/my-loans', array('controller' => 'ApiLoans', 'action' => 'myLoans'));
Router::connect('/api/v2/loans/my-funded', array('controller' => 'ApiLoans', 'action' => 'myFundedLoans'));
Router::connect('/api/v2/loans/:id', array('controller' => 'ApiLoans', 'action' => 'view'), array('pass' => array('id')));
Router::connect('/api/v2/loans/:id/fund', array('controller' => 'ApiLoans', 'action' => 'fund'), array('pass' => array('id')));
Router::connect('/api/v2/loans/:id/repay', array('controller' => 'ApiLoans', 'action' => 'repay'), array('pass' => array('id')));
Router::connect('/api/v2/loans/:id/cancel', array('controller' => 'ApiLoans', 'action' => 'cancel'), array('pass' => array('id')));
Router::connect('/api/v2/loans/calculate-ltv', array('controller' => 'ApiLoans', 'action' => 'calculateLTV'));
Router::connect('/api/v2/loans/risk-score/:userId', array('controller' => 'ApiLoans', 'action' => 'getRiskScore'), array('pass' => array('userId')));
Router::connect('/api/v2/loans/:id/matches', array('controller' => 'ApiLoans', 'action' => 'matches'), array('pass' => array('id')));
Router::connect('/api/v2/loans/:id/schedule', array('controller' => 'ApiLoans', 'action' => 'repaymentSchedule'), array('pass' => array('id')));
Router::connect('/api/v2/loans/:id/collateral', array('controller' => 'ApiLoans', 'action' => 'uploadCollateral'), array('pass' => array('id')));
Router::connect('/api/v2/loans/statistics', array('controller' => 'ApiLoans', 'action' => 'statistics'));
Router::connect('/api/v2/loans/:id/topup', array('controller' => 'ApiLoans', 'action' => 'topup'), array('pass' => array('id')));

// Admin loan endpoints
Router::connect('/api/v2/loans/admin/dashboard-stats', array('controller' => 'ApiLoans', 'action' => 'adminDashboardStats'));
Router::connect('/api/v2/loans/admin/platform-stats', array('controller' => 'ApiLoans', 'action' => 'adminPlatformStats'));
Router::connect('/api/v2/loans/pending', array('controller' => 'ApiLoans', 'action' => 'pendingLoans'));
Router::connect('/api/v2/loans/:id/approve', array('controller' => 'ApiLoans', 'action' => 'approve'), array('pass' => array('id')));
Router::connect('/api/v2/loans/:id/reject', array('controller' => 'ApiLoans', 'action' => 'reject'), array('pass' => array('id')));
Router::connect('/api/v2/loans/collateral/pending', array('controller' => 'ApiLoans', 'action' => 'pendingCollateral'));
Router::connect('/api/v2/loans/collateral/:id/verify', array('controller' => 'ApiLoans', 'action' => 'verifyCollateral'), array('pass' => array('id')));
Router::connect('/api/v2/loans/collateral/:id/reject', array('controller' => 'ApiLoans', 'action' => 'rejectCollateral'), array('pass' => array('id')));
Router::connect('/api/v2/loans/defaulted', array('controller' => 'ApiLoans', 'action' => 'defaultedLoans'));
Router::connect('/api/v2/loans/:id/initiate-default', array('controller' => 'ApiLoans', 'action' => 'initiateDefault'), array('pass' => array('id')));
Router::connect('/api/v2/loans/:id/send-to-recovery', array('controller' => 'ApiLoans', 'action' => 'sendToRecovery'), array('pass' => array('id')));
Router::connect('/api/v2/loans/:id/process-claim', array('controller' => 'ApiLoans', 'action' => 'processClaim'), array('pass' => array('id')));

// Reserve Fund endpoints
Router::connect('/api/v2/loans/reserve-fund/status', array('controller' => 'ApiLoans', 'action' => 'reserveFundStatus'));
Router::connect('/api/v2/loans/reserve-fund/deposit', array('controller' => 'ApiLoans', 'action' => 'depositToReserveFund'), array('method' => 'POST'));

// Analytics
Router::connect('/api/v2/loans/analytics', array('controller' => 'ApiLoans', 'action' => 'analyticsData'));

// ==================== WALLET v2 ====================
Router::connect('/api/v2/wallet', array('controller' => 'ApiWallet', 'action' => 'index'));
Router::connect('/api/v2/wallet/transactions', array('controller' => 'ApiWallet', 'action' => 'transactions'));
Router::connect('/api/v2/wallet/deposit', array('controller' => 'ApiWallet', 'action' => 'deposit'));
Router::connect('/api/v2/wallet/withdraw', array('controller' => 'ApiWallet', 'action' => 'withdraw'));
Router::connect('/api/v2/wallet/transfer', array('controller' => 'ApiWallet', 'action' => 'transfer'));
Router::connect('/api/v2/wallet/deposit-address/:currency', array('controller' => 'ApiWallet', 'action' => 'getDepositAddress'), array('pass' => array('currency')));
Router::connect('/api/v2/wallet/balance/:type', array('controller' => 'ApiWallet', 'action' => 'getBalance'), array('pass' => array('type')));
Router::connect('/api/v2/wallet/history', array('controller' => 'ApiWallet', 'action' => 'history'));
Router::connect('/api/v2/wallet/request-withdrawal', array('controller' => 'ApiWallet', 'action' => 'requestWithdrawal'));
Router::connect('/api/v2/wallet/currencies', array('controller' => 'ApiWallet', 'action' => 'currencies'));

// ==================== ESCROW v2 ====================
Router::connect('/api/v2/escrow', array('controller' => 'ApiEscrow', 'action' => 'index'));
Router::connect('/api/v2/escrow/my-transactions', array('controller' => 'ApiEscrow', 'action' => 'myTransactions'));
Router::connect('/api/v2/escrow/:id', array('controller' => 'ApiEscrow', 'action' => 'view'), array('pass' => array('id')));
Router::connect('/api/v2/escrow/:id/fund', array('controller' => 'ApiEscrow', 'action' => 'fund'), array('pass' => array('id')));
Router::connect('/api/v2/escrow/:id/ship', array('controller' => 'ApiEscrow', 'action' => 'ship'), array('pass' => array('id')));
Router::connect('/api/v2/escrow/:id/confirm', array('controller' => 'ApiEscrow', 'action' => 'confirm'), array('pass' => array('id')));
Router::connect('/api/v2/escrow/:id/release', array('controller' => 'ApiEscrow', 'action' => 'release'), array('pass' => array('id')));
Router::connect('/api/v2/escrow/:id/dispute', array('controller' => 'ApiEscrow', 'action' => 'dispute'), array('pass' => array('id')));
Router::connect('/api/v2/escrow/:id/resolve', array('controller' => 'ApiEscrow', 'action' => 'resolve'), array('pass' => array('id')));
Router::connect('/api/v2/escrow/statistics', array('controller' => 'ApiEscrow', 'action' => 'statistics'));
Router::connect('/api/v2/escrow/shipping-carriers', array('controller' => 'ApiEscrow', 'action' => 'shippingCarriers'));
Router::connect('/api/v2/escrow/disputes', array('controller' => 'ApiEscrow', 'action' => 'disputes'));

// ==================== COLLATERAL v2 ====================
Router::connect('/api/v2/collateral', array('controller' => 'ApiCollateral', 'action' => 'index'));
Router::connect('/api/v2/collateral/my', array('controller' => 'ApiCollateral', 'action' => 'myCollateral'));
Router::connect('/api/v2/collateral/add', array('controller' => 'ApiCollateral', 'action' => 'add'));
Router::connect('/api/v2/collateral/:id', array('controller' => 'ApiCollateral', 'action' => 'view'), array('pass' => array('id')));
Router::connect('/api/v2/collateral/:id/update', array('controller' => 'ApiCollateral', 'action' => 'update'), array('pass' => array('id')));
Router::connect('/api/v2/collateral/:id/delete', array('controller' => 'ApiCollateral', 'action' => 'delete'), array('pass' => array('id')));
Router::connect('/api/v2/collateral/:id/link-loan', array('controller' => 'ApiCollateral', 'action' => 'linkToLoan'), array('pass' => array('id')));
Router::connect('/api/v2/collateral/calculate-ltv', array('controller' => 'ApiCollateral', 'action' => 'calculateLTV'));
Router::connect('/api/v2/collateral/:id/valuation', array('controller' => 'ApiCollateral', 'action' => 'getValuation'), array('pass' => array('id')));
Router::connect('/api/v2/collateral/:id/upload-document', array('controller' => 'ApiCollateral', 'action' => 'uploadDocument'), array('pass' => array('id')));
Router::connect('/api/v2/collateral/pending', array('controller' => 'ApiCollateral', 'action' => 'pending'));
Router::connect('/api/v2/collateral/:id/verify', array('controller' => 'ApiCollateral', 'action' => 'verify'), array('pass' => array('id')));
Router::connect('/api/v2/collateral/:id/reject', array('controller' => 'ApiCollateral', 'action' => 'reject'), array('pass' => array('id')));
Router::connect('/api/v2/collateral/:id/request-valuation', array('controller' => 'ApiCollateral', 'action' => 'requestValuation'), array('pass' => array('id')));
Router::connect('/api/v2/collateral/types', array('controller' => 'ApiCollateral', 'action' => 'types'));

// ==================== BLOCKCHAIN v2 ====================
Router::connect('/api/v2/blockchain/sync-event', array('controller' => 'ApiBlockchain', 'action' => 'syncEvent'));
Router::connect('/api/v2/blockchain/health', array('controller' => 'ApiBlockchain', 'action' => 'health'));

// ==================== ACCELERATOR v2 ====================
Router::connect('/api/v2/loans/trending', array('controller' => 'ApiAccelerator', 'action' => 'getTrendingLoans'));
Router::connect('/api/v2/loans/closing-soon', array('controller' => 'ApiAccelerator', 'action' => 'getClosingSoonLoans'));
Router::connect('/api/v2/accelerator/status/:loan_id', array('controller' => 'ApiAccelerator', 'action' => 'getAcceleratorStatus'), array('pass' => array('loan_id')));
Router::connect('/api/v2/loan/:id/boost-rate', array('controller' => 'ApiAccelerator', 'action' => 'boostRate'), array('pass' => array('id')));
Router::connect('/api/v2/accelerator/hot-opportunities', array('controller' => 'ApiAccelerator', 'action' => 'getHotOpportunities'));
Router::connect('/api/v2/accelerator/high-yield', array('controller' => 'ApiAccelerator', 'action' => 'getHighYieldOpportunities'));
Router::connect('/api/v2/accelerator/almost-funded', array('controller' => 'ApiAccelerator', 'action' => 'getAlmostFundedLoans'));

// Accelerator Admin Routes
Router::connect('/api/v2/accelerator/admin/settings', array('controller' => 'ApiAccelerator', 'action' => 'adminGetSettings'));
Router::connect('/api/v2/accelerator/admin/settings/update', array('controller' => 'ApiAccelerator', 'action' => 'adminUpdateSettings'));
Router::connect('/api/v2/accelerator/admin/analytics', array('controller' => 'ApiAccelerator', 'action' => 'adminGetAnalytics'));
Router::connect('/api/v2/accelerator/admin/trigger/:id', array('controller' => 'ApiAccelerator', 'action' => 'adminTriggerAccelerator'), array('pass' => array('id')));

// ==================== RISK ENGINE v2 ====================

// Borrower Risk Scoring
Router::connect('/api/v2/risk/borrower/score/:userId', array('controller' => 'ApiRiskEngine', 'action' => 'getBorrowerRiskScore'), array('pass' => array('userId')));
Router::connect('/api/v2/risk/borrower/calculate', array('controller' => 'ApiRiskEngine', 'action' => 'calculateBorrowerRiskScore'));

// Collateral Valuation
Router::connect('/api/v2/risk/collateral/valuation/:collateralId', array('controller' => 'ApiRiskEngine', 'action' => 'getCollateralValuation'), array('pass' => array('collateralId')));
Router::connect('/api/v2/risk/collateral/verify/:id', array('controller' => 'ApiRiskEngine', 'action' => 'verifyCollateral'), array('pass' => array('id')));

// Loan-to-Value
Router::connect('/api/v2/risk/ltv/calculate', array('controller' => 'ApiRiskEngine', 'action' => 'calculateLTV'));
Router::connect('/api/v2/risk/ltv/validate', array('controller' => 'ApiRiskEngine', 'action' => 'validateLTV'));

// Exposure Limits
Router::connect('/api/v2/risk/exposure/validate', array('controller' => 'ApiRiskEngine', 'action' => 'validateExposure'));

// Default Prediction
Router::connect('/api/v2/risk/loan/status/:loanId', array('controller' => 'ApiRiskEngine', 'action' => 'getLoanRiskStatus'), array('pass' => array('loanId')));
Router::connect('/api/v2/risk/loan/analyze/:loanId', array('controller' => 'ApiRiskEngine', 'action' => 'analyzeLoanRisk'), array('pass' => array('loanId')));

// Default Workflow
Router::connect('/api/v2/risk/default/start-workflow/:loanId', array('controller' => 'ApiRiskEngine', 'action' => 'startDefaultWorkflow'), array('pass' => array('loanId')));
Router::connect('/api/v2/risk/default/advance-workflow/:loanId', array('controller' => 'ApiRiskEngine', 'action' => 'advanceDefaultWorkflow'), array('pass' => array('loanId')));

// Automatic Default Detection
Router::connect('/api/v2/risk/cron/check-defaults', array('controller' => 'ApiRiskEngine', 'action' => 'runAutomaticDefaultCheck'));
Router::connect('/api/v2/risk/loans-at-risk', array('controller' => 'ApiRiskEngine', 'action' => 'getLoansAtRisk'));
Router::connect('/api/v2/risk/check-loan-default/:loanId', array('controller' => 'ApiRiskEngine', 'action' => 'checkLoanDefault'), array('pass' => array('loanId')));
Router::connect('/api/v2/risk/workflow/progression-status', array('controller' => 'ApiRiskEngine', 'action' => 'getWorkflowProgressionStatus'));
Router::connect('/api/v2/risk/workflow/progress/:loanId', array('controller' => 'ApiRiskEngine', 'action' => 'triggerWorkflowProgression'), array('pass' => array('loanId')));
Router::connect('/api/v2/risk/default-prediction/stats', array('controller' => 'ApiRiskEngine', 'action' => 'getDefaultPredictionStats'));

// Grace Period Configuration
Router::connect('/api/v2/risk/grace-period/config', array('controller' => 'ApiRiskEngine', 'action' => 'getGracePeriodConfig'));
Router::connect('/api/v2/risk/grace-period/config', array('controller' => 'ApiRiskEngine', 'action' => 'updateGracePeriodConfig'), array('method' => 'PUT'));
Router::connect('/api/v2/risk/grace-period/status/:loanId', array('controller' => 'ApiRiskEngine', 'action' => 'checkGracePeriodStatus'), array('pass' => array('loanId')));
Router::connect('/api/v2/risk/grace-period/upcoming', array('controller' => 'ApiRiskEngine', 'action' => 'getUpcomingGracePeriodLoans'));

// Risk Monitoring Dashboard
Router::connect('/api/v2/risk/admin/dashboard', array('controller' => 'ApiRiskEngine', 'action' => 'getRiskDashboard'));
Router::connect('/api/v2/risk/admin/default-monitoring', array('controller' => 'ApiRiskEngine', 'action' => 'getDefaultMonitoring'));

// Loan Validation
Router::connect('/api/v2/risk/validate-loan-request', array('controller' => 'ApiRiskEngine', 'action' => 'validateLoanRequest'));

// ==================== REFINANCING v2 ====================
Router::connect('/api/v2/refinancing/match', array('controller' => 'ApiRefinancing', 'action' => 'getMatchedOpportunities'));
Router::connect('/api/v2/refinancing/:id/match-score', array('controller' => 'ApiRefinancing', 'action' => 'getMatchScore'), array('pass' => array('id')));
Router::connect('/api/v2/refinancing/recommendations', array('controller' => 'ApiRefinancing', 'action' => 'getRecommendations'));
Router::connect('/api/v2/refinancing/market-analytics', array('controller' => 'ApiRefinancing', 'action' => 'getMarketAnalytics'));
Router::connect('/api/v2/refinancing/borrower/:borrowerId/eligibility', array('controller' => 'ApiRefinancing', 'action' => 'getBorrowerEligibility'), array('pass' => array('borrowerId')));
Router::connect('/api/v2/refinancing/apply', array('controller' => 'ApiRefinancing', 'action' => 'submitApplication'));
Router::connect('/api/v2/refinancing/:id/accept', array('controller' => 'ApiRefinancing', 'action' => 'acceptOpportunity'), array('pass' => array('id')));
Router::connect('/api/v2/refinancing/portfolio', array('controller' => 'ApiRefinancing', 'action' => 'getPortfolio'));
Router::connect('/api/v2/refinancing/investor/preferences', array('controller' => 'ApiRefinancing', 'action' => 'updateInvestorPreferences'), array('method' => 'PUT'));

// ==================== AUCTION v2 ====================
Router::connect('/api/v2/auctions/hybrid', array('controller' => 'ApiAuction', 'action' => 'index'));
Router::connect('/api/v2/auctions/hybrid/active', array('controller' => 'ApiAuction', 'action' => 'getActive'));
Router::connect('/api/v2/auctions/hybrid/:id', array('controller' => 'ApiAuction', 'action' => 'view'), array('pass' => array('id')));
Router::connect('/api/v2/auctions/hybrid/:id/bid', array('controller' => 'ApiAuction', 'action' => 'placeBid'), array('pass' => array('id'), 'method' => 'POST'));
Router::connect('/api/v2/auctions/hybrid/:id/settle', array('controller' => 'ApiAuction', 'action' => 'settle'), array('pass' => array('id'), 'method' => 'POST'));
Router::connect('/api/v2/auctions/hybrid/:id/cancel', array('controller' => 'ApiAuction', 'action' => 'cancel'), array('pass' => array('id'), 'method' => 'POST'));
Router::connect('/api/v2/auctions/hybrid/stats', array('controller' => 'ApiAuction', 'action' => 'stats'));
Router::connect('/api/v2/auctions/hybrid/loan/:loanId/timeline', array('controller' => 'ApiAuction', 'action' => 'getLoanTimeline'), array('pass' => array('loanId')));
Router::connect('/api/v2/auctions/hybrid/my-activity', array('controller' => 'ApiAuction', 'action' => 'myActivity'));
Router::connect('/api/v2/auctions/hybrid/cron/check-completion', array('controller' => 'ApiAuction', 'action' => 'checkCompletion'), array('method' => 'POST'));
Router::connect('/api/v2/auctions/hybrid/:id/bids', array('controller' => 'ApiAuction', 'action' => 'getBids'), array('pass' => array('id')));

// ==================== LIQUIDATION v2 ====================
Router::connect('/api/v2/liquidation/rules', array('controller' => 'ApiLiquidation', 'action' => 'index'));
Router::connect('/api/v2/liquidation/rules', array('controller' => 'ApiLiquidation', 'action' => 'create'), array('method' => 'POST'));
Router::connect('/api/v2/liquidation/rules/:id', array('controller' => 'ApiLiquidation', 'action' => 'view'), array('pass' => array('id')));
Router::connect('/api/v2/liquidation/rules/:id', array('controller' => 'ApiLiquidation', 'action' => 'update'), array('pass' => array('id'), 'method' => 'PUT'));
Router::connect('/api/v2/liquidation/rules/:id', array('controller' => 'ApiLiquidation', 'action' => 'delete'), array('pass' => array('id'), 'method' => 'DELETE'));
Router::connect('/api/v2/liquidation/evaluate/:loanId', array('controller' => 'ApiLiquidation', 'action' => 'evaluate'), array('pass' => array('loanId')));
Router::connect('/api/v2/liquidation/trigger/:loanId', array('controller' => 'ApiLiquidation', 'action' => 'trigger'), array('pass' => array('loanId'), 'method' => 'POST'));
Router::connect('/api/v2/liquidation/history', array('controller' => 'ApiLiquidation', 'action' => 'history'));
Router::connect('/api/v2/liquidation/active', array('controller' => 'ApiLiquidation', 'action' => 'getActive'));
Router::connect('/api/v2/liquidation/run-evaluation', array('controller' => 'ApiLiquidation', 'action' => 'runEvaluation'), array('method' => 'POST'));
Router::connect('/api/v2/liquidation/stats', array('controller' => 'ApiLiquidation', 'action' => 'stats'));
Router::connect('/api/v2/liquidation/preview', array('controller' => 'ApiLiquidation', 'action' => 'preview'), array('method' => 'POST'));

// ==================== DISCOVERY ENGINE v2 ====================
Router::connect('/api/v2/discovery/recommendations', array('controller' => 'ApiDiscovery', 'action' => 'getRecommendations'));
Router::connect('/api/v2/discovery/loans', array('controller' => 'ApiDiscovery', 'action' => 'getLoanMatches'));
Router::connect('/api/v2/discovery/preferences', array('controller' => 'ApiDiscovery', 'action' => 'getUserPreferences'));
Router::connect('/api/v2/discovery/preferences', array('controller' => 'ApiDiscovery', 'action' => 'updateUserPreferences'), array('method' => 'PUT'));
Router::connect('/api/v2/discovery/analytics', array('controller' => 'ApiDiscovery', 'action' => 'getAnalytics'));

// ==================== RATES v2 ====================
Router::connect('/api/v2/rates/current', array('controller' => 'ApiRates', 'action' => 'getCurrentRates'));
Router::connect('/api/v2/rates/historical', array('controller' => 'ApiRates', 'action' => 'getHistoricalRates'));
Router::connect('/api/v2/rates/calculate', array('controller' => 'ApiRates', 'action' => 'calculateRate'));
Router::connect('/api/v2/rates/adjust', array('controller' => 'ApiRates', 'action' => 'adjustRate'), array('method' => 'POST'));

// ==================== CAPITAL PROTECTION v2 ====================
Router::connect('/api/v2/capital-protection/status', array('controller' => 'ApiCapitalProtection', 'action' => 'getStatus'));
Router::connect('/api/v2/capital-protection/claim', array('controller' => 'ApiCapitalProtection', 'action' => 'fileClaim'), array('method' => 'POST'));
Router::connect('/api/v2/capital-protection/claims', array('controller' => 'ApiCapitalProtection', 'action' => 'getClaims'));
Router::connect('/api/v2/capital-protection/claims/:id', array('controller' => 'ApiCapitalProtection', 'action' => 'getClaimDetails'), array('pass' => array('id')));
Router::connect('/api/v2/capital-protection/claims/:id/resolve', array('controller' => 'ApiCapitalProtection', 'action' => 'resolveClaim'), array('pass' => array('id'), 'method' => 'POST'));

// ==================== CREDIT REPUTATION v2 ====================
Router::connect('/api/v2/credit/score/:userId', array('controller' => 'ApiCreditReputation', 'action' => 'getCreditScore'), array('pass' => array('userId')));
Router::connect('/api/v2/credit/history/:userId', array('controller' => 'ApiCreditReputation', 'action' => 'getCreditHistory'), array('pass' => array('userId')));
Router::connect('/api/v2/credit/report/:userId', array('controller' => 'ApiCreditReputation', 'action' => 'getCreditReport'), array('pass' => array('userId')));
Router::connect('/api/v2/credit/calculate', array('controller' => 'ApiCreditReputation', 'action' => 'calculateScore'));

// ==================== REVENUE v2 ====================
Router::connect('/api/v2/revenue/overview', array('controller' => 'ApiRevenue', 'action' => 'getOverview'));
Router::connect('/api/v2/revenue/breakdown', array('controller' => 'ApiRevenue', 'action' => 'getBreakdown'));
Router::connect('/api/v2/revenue/trends', array('controller' => 'ApiRevenue', 'action' => 'getTrends'));
Router::connect('/api/v2/revenue/projections', array('controller' => 'ApiRevenue', 'action' => 'getProjections'));

// ==================== AUDIT v2 ====================
Router::connect('/api/v2/audit/logs', array('controller' => 'ApiAudit', 'action' => 'getLogs'));
Router::connect('/api/v2/audit/logs/:id', array('controller' => 'ApiAudit', 'action' => 'getLogDetails'), array('pass' => array('id')));
Router::connect('/api/v2/audit/export', array('controller' => 'ApiAudit', 'action' => 'exportLogs'));

// ==================== TOKENIZATION v2 ====================
Router::connect('/api/v2/tokens', array('controller' => 'ApiTokenization', 'action' => 'index'));
Router::connect('/api/v2/tokens/:id', array('controller' => 'ApiTokenization', 'action' => 'view'), array('pass' => array('id')));
Router::connect('/api/v2/tokens/:id/transfer', array('controller' => 'ApiTokenization', 'action' => 'transfer'), array('pass' => array('id'), 'method' => 'POST'));
Router::connect('/api/v2/tokens/holdings', array('controller' => 'ApiTokenization', 'action' => 'getHoldings'));
Router::connect('/api/v2/tokens/market', array('controller' => 'ApiTokenization', 'action' => 'getMarketData'));

// ==================== RECOVERY MARKETPLACE v2 ====================
Router::connect('/api/v2/recovery/marketplace', array('controller' => 'ApiRecovery', 'action' => 'getMarketplace'));
Router::connect('/api/v2/recovery/loans', array('controller' => 'ApiRecovery', 'action' => 'getRecoveryLoans'));
Router::connect('/api/v2/recovery/loans/:id', array('controller' => 'ApiRecovery', 'action' => 'getRecoveryLoanDetails'), array('pass' => array('id')));
Router::connect('/api/v2/recovery/purchase', array('controller' => 'ApiRecovery', 'action' => 'purchaseLoan'), array('method' => 'POST'));
Router::connect('/api/v2/recovery/my-purchases', array('controller' => 'ApiRecovery', 'action' => 'getMyPurchases'));
Router::connect('/api/v2/recovery/analytics', array('controller' => 'ApiRecovery', 'action' => 'getAnalytics'));
