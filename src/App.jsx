import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Layouts
import MainLayout from './components/layouts/MainLayout';
import DashboardLayout from './components/layouts/DashboardLayout';
import AuthLayout from './components/layouts/AuthLayout';

// Public Pages
import LandingPage from './pages/LandingPage';
import LoanDetail from './pages/LoanDetail';
import RecoveryMarketplace from './pages/RecoveryMarketplace';
import ItemDetail from './pages/ItemDetail';
import EscrowLanding from './pages/EscrowLanding';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Verify2FA from './pages/auth/Verify2FA';

// Dashboard Pages
import BorrowerDashboard from './pages/dashboard/BorrowerDashboard';
import LenderDashboard from './pages/dashboard/LenderDashboard';
import MyLoans from './pages/dashboard/MyLoans';
import LoanRequests from './pages/dashboard/LoanRequests';
import FundLoan from './pages/dashboard/FundLoan';
import Portfolio from './pages/dashboard/Portfolio';
import CollateralManager from './pages/dashboard/CollateralManager';
import Repayments from './pages/dashboard/Repayments';
import BorrowerTransactions from './pages/dashboard/BorrowerTransactions';
import WalletDashboard from './pages/dashboard/WalletDashboard';
import EscrowDashboard from './pages/dashboard/EscrowDashboard';
import CreateEscrow from './pages/dashboard/CreateEscrow';

// New Pages for Phase 4
import AuctionMarketplace from './pages/AuctionMarketplace';
import GDPRSettings from './pages/GDPRSettings';

// Tokenization Pages
import InvestorDashboard from './pages/dashboard/InvestorDashboard';
import LenderTransactions from './pages/dashboard/LenderTransactions';
import TokenMarketplace from './pages/TokenMarketplace';
import Refinancing from './pages/Refinancing';

// Market Rate System Pages
import LendingMarketplace from './pages/loans/LendingMarketplace';
import CreateLoan from './pages/loans/CreateLoan';

// UX Features
import BorrowerOnboardingWizard from './pages/BorrowerOnboardingWizard';
import PortfolioRebalancing from './pages/dashboard/PortfolioRebalancing';

// Discovery Engine Pages
import InvestmentOpportunities from './pages/InvestmentOpportunities';
import DiscoveryAnalytics from './pages/admin/DiscoveryAnalytics';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import LoanApprovals from './pages/admin/LoanApprovals';
import CollateralVerification from './pages/admin/CollateralVerification';
import DefaultManagement from './pages/admin/DefaultManagement';
import RecoveryManagement from './pages/admin/RecoveryManagement';
import EscrowDisputes from './pages/admin/EscrowDisputes';
import Analytics from './pages/admin/Analytics';
import UserManagement from './pages/admin/UserManagement';
import RiskControls from './pages/admin/RiskControls';
import RiskMonitoring from './pages/admin/RiskMonitoring';
import RateControls from './pages/admin/RateControls';
import FeeControls from './pages/admin/FeeControls';
import BulkLoanOperations from './pages/admin/BulkLoanOperations';
import AutomatedReports from './pages/admin/AutomatedReports';
import AuditLogs from './pages/admin/AuditLogs';
import SystemHealth from './pages/admin/SystemHealth';
import ReserveFundManagement from './pages/admin/ReserveFundManagement';
import MarketMakerDashboard from './pages/admin/MarketMakerDashboard';
import AcceleratorSettings from './pages/admin/AcceleratorSettings';
import CapitalProtection from './pages/admin/CapitalProtection';
import StressTestEngine from './pages/admin/StressTestEngine';
import RevenueAnalyticsDashboard from './pages/admin/RevenueAnalyticsDashboard';

// Components
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminRoute from './components/common/AdminRoute';

function App() {
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const defaultDashboardRoute = user?.role === 'admin'
        ? '/admin/dashboard'
        : user?.role === 'lender'
            ? '/dashboard/lender'
            : '/dashboard/borrower';

    return (
        <Routes>
            {/* Public Routes */}
            <Route element={<MainLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/loans/:id" element={<LoanDetail />} />
                <Route path="/marketplace" element={<LendingMarketplace />} />
                <Route path="/recovery-marketplace" element={<RecoveryMarketplace />} />
                <Route path="/recovery-marketplace/:id" element={<ItemDetail />} />
                <Route path="/escrow" element={<EscrowLanding />} />
                <Route path="/auctions" element={<AuctionMarketplace />} />
            </Route>

            {/* Auth Routes */}
            <Route element={<AuthLayout />}>
                <Route
                    path="/login"
                    element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
                />
                <Route
                    path="/register"
                    element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />}
                />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route
                    path="/verify-2fa"
                    element={
                        isAuthenticated ? <Navigate to="/dashboard" /> : <Verify2FA />
                    }
                />
            </Route>

            {/* Protected Dashboard Routes */}
            <Route
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <DashboardLayout />
                    </ProtectedRoute>
                }
            >
                <Route path="/dashboard" element={<Navigate to={defaultDashboardRoute} replace />} />

                {/* Borrower Routes */}
                <Route
                    path="/dashboard/borrower"
                    element={
                        user?.role === 'borrower' || user?.role === 'both' ? (
                            <BorrowerDashboard />
                        ) : (
                            <Navigate to="/dashboard/lender" />
                        )
                    }
                />
                <Route
                    path="/dashboard/my-loans"
                    element={
                        user?.role === 'borrower' || user?.role === 'both' ? (
                            <MyLoans />
                        ) : (
                            <Navigate to="/dashboard/lender" />
                        )
                    }
                />
                <Route
                    path="/dashboard/create-loan"
                    element={
                        user?.role === 'borrower' || user?.role === 'both' ? (
                            <CreateLoan />
                        ) : (
                            <Navigate to="/dashboard/lender" />
                        )
                    }
                />
                <Route
                    path="/dashboard/collateral"
                    element={
                        user?.role === 'borrower' || user?.role === 'both' ? (
                            <CollateralManager />
                        ) : (
                            <Navigate to="/dashboard/lender" />
                        )
                    }
                />
                <Route
                    path="/dashboard/repayments"
                    element={
                        user?.role === 'borrower' || user?.role === 'both' ? (
                            <Repayments />
                        ) : (
                            <Navigate to="/dashboard/lender" />
                        )
                    }
                />
                <Route
                    path="/dashboard/borrower/transactions"
                    element={
                        user?.role === 'borrower' || user?.role === 'both' ? (
                            <BorrowerTransactions />
                        ) : (
                            <Navigate to="/dashboard/lender" />
                        )
                    }
                />
                <Route
                    path="/dashboard/loan-requests"
                    element={
                        user?.role === 'borrower' || user?.role === 'both' ? (
                            <LoanRequests />
                        ) : (
                            <Navigate to="/dashboard/lender" />
                        )
                    }
                />

                {/* Lender Routes */}
                <Route
                    path="/dashboard/lender"
                    element={
                        user?.role === 'lender' || user?.role === 'both' ? (
                            <LenderDashboard />
                        ) : (
                            <Navigate to="/dashboard/borrower" />
                        )
                    }
                />
                <Route
                    path="/dashboard/loans"
                    element={
                        user?.role === 'lender' || user?.role === 'both' ? (
                            <LendingMarketplace />
                        ) : (
                            <Navigate to="/dashboard/borrower" />
                        )
                    }
                />
                <Route
                    path="/dashboard/portfolio"
                    element={
                        user?.role === 'lender' || user?.role === 'both' ? (
                            <Portfolio />
                        ) : (
                            <Navigate to="/dashboard/borrower" />
                        )
                    }
                />
                <Route
                    path="/dashboard/lender/transactions"
                    element={
                        user?.role === 'lender' || user?.role === 'both' ? (
                            <LenderTransactions />
                        ) : (
                            <Navigate to="/dashboard/borrower" />
                        )
                    }
                />
                <Route
                    path="/dashboard/fund-loan"
                    element={
                        user?.role === 'lender' || user?.role === 'both' ? (
                            <FundLoan />
                        ) : (
                            <Navigate to="/dashboard/borrower" />
                        )
                    }
                />

                {/* Common Routes */}
                <Route path="/dashboard/wallet" element={<WalletDashboard />} />
                <Route path="/dashboard/escrow" element={<EscrowDashboard />} />
                <Route path="/dashboard/escrow/create" element={<CreateEscrow />} />
                
                {/* Phase 4: Auction & GDPR Routes */}
                <Route path="/dashboard/auctions" element={<AuctionMarketplace />} />
                <Route path="/dashboard/privacy" element={<GDPRSettings />} />
                
                {/* Tokenization Routes */}
                <Route path="/dashboard/investor" element={<InvestorDashboard />} />
                <Route path="/dashboard/tokens" element={<TokenMarketplace />} />
                <Route path="/dashboard/refinancing" element={<Refinancing />} />
                
                {/* UX-03 & UX-04: Onboarding & Rebalancing */}
                <Route path="/borrower-onboarding" element={<BorrowerOnboardingWizard />} />
                <Route path="/dashboard/portfolio/rebalancing" element={<PortfolioRebalancing />} />
                
                {/* Discovery Engine Routes */}
                <Route path="/dashboard/investment-opportunities" element={<InvestmentOpportunities />} />
            </Route>

            {/* Admin Routes */}
            <Route
                element={
                    <AdminRoute isAuthenticated={isAuthenticated} user={user}>
                        <DashboardLayout />
                    </AdminRoute>
                }
            >
                <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/loans" element={<LoanApprovals />} />
                <Route path="/admin/collateral" element={<CollateralVerification />} />
                <Route path="/admin/defaults" element={<DefaultManagement />} />
                <Route path="/admin/recovery" element={<RecoveryManagement />} />
                <Route path="/admin/escrow" element={<EscrowDisputes />} />
                <Route path="/admin/analytics" element={<Analytics />} />
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/admin/risk" element={<RiskControls />} />
                <Route path="/admin/risk-monitoring" element={<RiskMonitoring />} />
                <Route path="/admin/rates" element={<RateControls />} />
                <Route path="/admin/fees" element={<FeeControls />} />
                <Route path="/admin/bulk-loans" element={<BulkLoanOperations />} />
                <Route path="/admin/reports" element={<AutomatedReports />} />
                <Route path="/admin/audit-logs" element={<AuditLogs />} />
                <Route path="/admin/system-health" element={<SystemHealth />} />
                <Route path="/admin/reserve-fund" element={<ReserveFundManagement />} />
                <Route path="/admin/capital-protection" element={<CapitalProtection />} />
                <Route path="/admin/stress-test" element={<StressTestEngine />} />
                <Route path="/admin/market-maker" element={<MarketMakerDashboard />} />
                <Route path="/admin/accelerator" element={<AcceleratorSettings />} />
                <Route path="/admin/revenue" element={<RevenueAnalyticsDashboard />} />
                
                {/* Discovery Engine Admin Routes */}
                <Route path="/admin/discovery-analytics" element={<DiscoveryAnalytics />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}

export default App;
