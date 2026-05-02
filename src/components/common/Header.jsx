import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Menu, X, ChevronDown, Wallet } from 'lucide-react';
import NetworkSwitcher from './NetworkSwitcher';

function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const { isAuthenticated, user } = useSelector((state) => state.auth);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownOpen && !event.target.closest('.dropdown-container')) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [dropdownOpen]);

    const navLinks = [
        { path: '/', label: 'Home' },
        { path: '/loans', label: 'Loans' },
        { path: '/marketplace', label: 'Recovery Marketplace' },
        { path: '/escrow', label: 'Escrow' },
        { path: '/auctions', label: 'Auctions' },
        { path: '/dashboard/tokens', label: 'Token Market' },
        { path: '/dashboard/refinancing', label: 'Refinancing' },
        { path: '/dashboard/investment-opportunities', label: 'Investment' },
    ];

    return (
        <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/lenda-logo.png" alt="LENDA" className="h-10 w-auto" />
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <NavLink
                                key={link.path}
                                to={link.path}
                                className={({ isActive }) =>
                                    `text-sm font-medium transition-colors ${isActive
                                        ? 'text-primary-600'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`
                                }
                            >
                                {link.label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Auth Buttons */}
                    <div className="hidden md:flex items-center gap-4">
                        {/* Network Switcher */}
                        <NetworkSwitcher />
                        
                        {isAuthenticated ? (
                            <div className="relative">
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                        <span className="text-primary-600 font-medium">
                                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                                        </span>
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">
                                        {user?.name || 'User'}
                                    </span>
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                </button>

                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden dropdown-container">
                                        <Link
                                            to="/dashboard"
                                            className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                                        >
                                            Dashboard
                                        </Link>
                                        <Link
                                            to="/dashboard/wallet"
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                                        >
                                            <Wallet className="w-4 h-4" />
                                            Wallet
                                        </Link>
                                        <Link
                                            to="/settings"
                                            className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                                        >
                                            Settings
                                        </Link>
                                        <Link
                                            to="/logout"
                                            className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                        >
                                            Logout
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                                    Sign In
                                </Link>
                                <Link to="/register" className="btn-primary text-sm py-2">
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-md hover:bg-slate-100"
                    >
                        {mobileMenuOpen ? (
                            <X className="w-6 h-6 text-slate-600" />
                        ) : (
                            <Menu className="w-6 h-6 text-slate-600" />
                        )}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-slate-200 py-4">
                        <nav className="space-y-2">
                            {navLinks.map((link) => (
                                <NavLink
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={({ isActive }) =>
                                        `block px-3 py-2 rounded-lg text-sm font-medium ${isActive
                                            ? 'bg-primary-50 text-primary-600'
                                            : 'text-slate-600 hover:bg-slate-50'
                                        }`
                                    }
                                >
                                    {link.label}
                                </NavLink>
                            ))}
                            {!isAuthenticated && (
                                <div className="pt-4 space-y-2">
                                    <Link
                                        to="/login"
                                        className="block w-full text-center px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
                                    >
                                        Sign In
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="block w-full text-center btn-primary text-sm py-2"
                                    >
                                        Get Started
                                    </Link>
                                </div>
                            )}
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
}

Header.propTypes = {
    // Component doesn't accept props, but kept for consistency
};

export default Header;
