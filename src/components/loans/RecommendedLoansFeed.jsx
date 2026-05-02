import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
    fetchFullFeed,
    fetchFilteredLoans,
    setFilters,
    resetFilters,
} from '../../store/slices/discoverySlice';
import LoanOpportunityCard from './LoanOpportunityCard';
import LoanFilters from './LoanFilters';

/**
 * RecommendedLoansFeed Component
 * Displays personalized loan recommendations in different sections
 */
const RecommendedLoansFeed = ({ showFilters = true, onInvest }) => {
    const dispatch = useDispatch();
    const {
        recommendedLoans,
        highYieldLoans,
        lowRiskLoans,
        closingSoonLoans,
        filteredLoans,
        filters,
        isLoading,
        preferences,
    } = useSelector((state) => state.discovery);

    const [activeSection, setActiveSection] = useState('all');
    const [showFilterPanel, setShowFilterPanel] = useState(showFilters);

    useEffect(() => {
        // Load full feed on mount
        dispatch(fetchFullFeed());
    }, [dispatch]);

    useEffect(() => {
        // Apply filters when they change
        if (showFilters) {
            dispatch(fetchFilteredLoans(filters));
        }
    }, [dispatch, filters, showFilters]);

    const handleFilterChange = (newFilters) => {
        dispatch(setFilters(newFilters));
    };

    const handleResetFilters = () => {
        dispatch(resetFilters());
    };

    const renderSection = (title, loans, description, icon) => {
        if (!loans || loans.length === 0) return null;

        return (
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        {icon}
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                        <p className="text-sm text-gray-500">{description}</p>
                    </div>
                    <span className="ml-auto bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                        {loans.length}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loans.slice(0, 6).map((loan) => (
                        <LoanOpportunityCard
                            key={loan.id}
                            loan={loan}
                            discoveryScore={loan.discoveryScore}
                            onInvest={onInvest}
                        />
                    ))}
                </div>

                {loans.length > 6 && (
                    <div className="mt-4 text-center">
                        <Link
                            to={`/marketplace?section=${title.toLowerCase().replace(/\s+/g, '-')}`}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            View all {loans.length} {title} →
                        </Link>
                    </div>
                )}
            </div>
        );
    };

    const renderFilteredView = () => {
        if (filteredLoans.length === 0) {
            return (
                <div className="text-center py-12">
                    <svg
                        className="w-16 h-16 mx-auto text-gray-400 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No loans match your filters
                    </h3>
                    <p className="text-gray-500 mb-4">
                        Try adjusting your filter criteria to see more opportunities
                    </p>
                    <button
                        onClick={handleResetFilters}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Reset Filters
                    </button>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLoans.map((loan) => (
                    <LoanOpportunityCard
                        key={loan.id}
                        loan={loan}
                        discoveryScore={loan.discoveryScore}
                        onInvest={onInvest}
                    />
                ))}
            </div>
        );
    };

    const sections = [
        {
            id: 'all',
            label: 'All',
            count: recommendedLoans.length + highYieldLoans.length + lowRiskLoans.length + closingSoonLoans.length,
        },
        {
            id: 'recommended',
            label: 'Recommended',
            count: recommendedLoans.length,
        },
        {
            id: 'high_yield',
            label: 'High Yield',
            count: highYieldLoans.length,
        },
        {
            id: 'low_risk',
            label: 'Low Risk',
            count: lowRiskLoans.length,
        },
        {
            id: 'closing_soon',
            label: 'Closing Soon',
            count: closingSoonLoans.length,
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        Investment Opportunities
                    </h2>
                    <p className="text-gray-600 mt-1">
                        {preferences?.riskTolerance
                            ? `Personalized for your ${preferences.riskTolerance} risk tolerance`
                            : 'Discover loans that match your investment preferences'}
                    </p>
                </div>

                <button
                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                        />
                    </svg>
                    {showFilterPanel ? 'Hide Filters' : 'Show Filters'}
                </button>
            </div>

            {/* Filters Panel */}
            {showFilterPanel && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <LoanFilters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onReset={handleResetFilters}
                    />
                </div>
            )}

            {/* Section Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeSection === section.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {section.label}
                            {section.count > 0 && (
                                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                                    {section.count}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <>
                    {/* All Sections View */}
                    {activeSection === 'all' && (
                        <div className="space-y-8">
                            {renderSection(
                                'Recommended for You',
                                recommendedLoans,
                                'Loans that best match your investment preferences',
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                            )}

                            {renderSection(
                                'High Yield Opportunities',
                                highYieldLoans,
                                'Loans with higher interest rates for greater returns',
                                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            )}

                            {renderSection(
                                'Low Risk Loans',
                                lowRiskLoans,
                                'Loans with excellent credit scores and strong collateral',
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            )}

                            {renderSection(
                                'Almost Fully Funded',
                                closingSoonLoans,
                                'Loans that are close to reaching their funding goal',
                                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                        </div>
                    )}

                    {/* Single Section Views */}
                    {activeSection === 'recommended' && renderFilteredView()}
                    {activeSection === 'high_yield' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {highYieldLoans.map((loan) => (
                                <LoanOpportunityCard
                                    key={loan.id}
                                    loan={loan}
                                    discoveryScore={loan.discoveryScore}
                                    onInvest={onInvest}
                                />
                            ))}
                        </div>
                    )}
                    {activeSection === 'low_risk' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {lowRiskLoans.map((loan) => (
                                <LoanOpportunityCard
                                    key={loan.id}
                                    loan={loan}
                                    discoveryScore={loan.discoveryScore}
                                    onInvest={onInvest}
                                />
                            ))}
                        </div>
                    )}
                    {activeSection === 'closing_soon' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {closingSoonLoans.map((loan) => (
                                <LoanOpportunityCard
                                    key={loan.id}
                                    loan={loan}
                                    discoveryScore={loan.discoveryScore}
                                    onInvest={onInvest}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default RecommendedLoansFeed;
