import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useState } from 'react';
import {
    LayoutDashboard,
    Wallet,
    FileText,
    Shield,
    Building2,
    ArrowUpDown,
    Package,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronDown,
    Users,
    BarChart3,
    AlertTriangle,
    CheckCircle,
    Scale,
    TrendingUp,
    RefreshCw,
    Activity,
    Zap,
} from 'lucide-react';
import { logout } from '../../store/slices/authSlice';
import { toggleSidebar } from '../../store/slices/uiSlice';
import Breadcrumb from '../common/Breadcrumb';

const borrowerLinks = [
    { path: '/dashboard/borrower', label: 'Overview', icon: LayoutDashboard },
    { path: '/dashboard/my-loans', label: 'My Loans', icon: FileText },
    { path: '/dashboard/create-loan', label: 'Request Loan', icon: ArrowUpDown },
    { path: '/dashboard/collateral', label: 'Collateral', icon: Shield },
    { path: '/dashboard/repayments', label: 'Repayments', icon: CheckCircle },
    { path: '/dashboard/borrower/transactions', label: 'Transactions', icon: BarChart3 },
];

const lenderLinks = [
    { path: '/dashboard/lender', label: 'Overview', icon: LayoutDashboard },
    { path: '/dashboard/loans', label: 'Find Loans', icon: FileText },
    { path: '/dashboard/portfolio', label: 'Portfolio', icon: Building2 },
    { path: '/dashboard/lender/transactions', label: 'Transactions', icon: BarChart3 },
    { path: '/dashboard/portfolio/rebalancing', label: 'Rebalancing', icon: RefreshCw },
    { path: '/dashboard/investor', label: 'Investor Dashboard', icon: TrendingUp },
    { path: '/dashboard/tokens', label: 'Token Market', icon: RefreshCw },
    { path: '/dashboard/refinancing', label: 'Refinancing', icon: ArrowUpDown },
];

const adminLinks = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/loans', label: 'Loan Approvals', icon: FileText },
    { path: '/admin/collateral', label: 'Collateral', icon: Shield },
    { path: '/admin/defaults', label: 'Defaults', icon: AlertTriangle },
    { path: '/admin/recovery', label: 'Recovery', icon: Package },
    { path: '/admin/escrow', label: 'Escrow Disputes', icon: Scale },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/admin/risk', label: 'Risk Controls', icon: Activity },
    { path: '/admin/risk-monitoring', label: 'Risk Monitoring', icon: Activity },
    { path: '/admin/rates', label: 'Rate Controls', icon: TrendingUp },
    { path: '/admin/capital-protection', label: 'Capital Protection', icon: Shield },
    { path: '/admin/stress-test', label: 'Stress Test', icon: AlertTriangle },
    { path: '/admin/market-maker', label: 'Market Maker', icon: TrendingUp },
    { path: '/admin/accelerator', label: 'Accelerator', icon: Zap },
    { path: '/admin/revenue', label: 'Revenue', icon: BarChart3 },
    { path: '/admin/discovery-analytics', label: 'Discovery', icon: RefreshCw },
];

function DashboardLayout() {
    const dispatch = useDispatch();
    const location = useLocation();
    const { user } = useSelector((state) => state.auth);
    const { sidebarOpen } = useSelector((state) => state.ui);
    const [profileOpen, setProfileOpen] = useState(false);

    const isAdmin = user?.role === 'admin';
    const isBorrower = user?.role === 'borrower' || user?.role === 'both';
    const isLender = user?.role === 'lender' || user?.role === 'both';

    const getLinks = () => {
        if (isAdmin) return adminLinks;
        if (isBorrower && isLender) return [...borrowerLinks, ...lenderLinks];
        if (isBorrower) return borrowerLinks;
        if (isLender) return lenderLinks;
        return [];
    };

    const handleLogout = () => {
        dispatch(logout());
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={() => dispatch(toggleSidebar())}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-slate-200 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:translate-x-0`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200">
                        <a href="/" className="flex items-center gap-2">
                            <img src="/lenda-logo.png" alt="LENDA" className="h-8 w-auto" />
                        </a>
                        <button
                            onClick={() => dispatch(toggleSidebar())}
                            className="lg:hidden p-2 rounded-md hover:bg-slate-100"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                        {getLinks().map((link) => (
                            <NavLink
                                key={link.path}
                                to={link.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? 'bg-primary-50 text-primary-600'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`
                                }
                            >
                                <link.icon className="w-5 h-5" />
                                {link.label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Common Links */}
                    <div className="px-3 py-4 border-t border-slate-200 space-y-1">
                        <NavLink
                            to="/dashboard/wallet"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-primary-50 text-primary-600'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`
                            }
                        >
                            <Wallet className="w-5 h-5" />
                            Wallet
                        </NavLink>
                        <NavLink
                            to="/dashboard/escrow"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-primary-50 text-primary-600'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`
                            }
                        >
                            <Package className="w-5 h-5" />
                            Escrow
                        </NavLink>
                        <NavLink
                            to="/dashboard/auctions"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-primary-50 text-primary-600'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`
                            }
                        >
                            <Scale className="w-5 h-5" />
                            Auctions
                        </NavLink>
                        <NavLink
                            to="/dashboard/investment-opportunities"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-primary-50 text-primary-600'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`
                            }
                        >
                            <TrendingUp className="w-5 h-5" />
                            Investment
                        </NavLink>
                    </div>

                    {/* User Section */}
                    <div className="p-4 border-t border-slate-200">
                        <div className="relative">
                            <button
                                onClick={() => setProfileOpen(!profileOpen)}
                                className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                    <span className="text-primary-600 font-medium">
                                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-medium text-slate-900">
                                        {user?.name || 'User'}
                                    </p>
                                    <p className="text-xs text-slate-500 capitalize">
                                        {user?.role || 'Member'}
                                    </p>
                                </div>
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            </button>

                            {profileOpen && (
                                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                                    <a
                                        href="/settings"
                                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                                    >
                                        <Settings className="w-4 h-4" />
                                        Settings
                                    </a>
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="lg:pl-64">
                {/* Top Bar */}
                <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200">
                    <div className="flex items-center justify-between h-full px-4">
                        <button
                            onClick={() => dispatch(toggleSidebar())}
                            className="lg:hidden p-2 rounded-md hover:bg-slate-100"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex-1" />
                        <div className="flex items-center gap-4">
                            <a href="/dashboard/wallet" className="btn-primary text-sm py-2 hidden sm:inline-block">
                                Add Funds
                            </a>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-4 md:p-6">
                    {/* Breadcrumb navigation - NAV-01 */}
                    <div className="mb-4">
                        <Breadcrumb />
                    </div>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default DashboardLayout;
