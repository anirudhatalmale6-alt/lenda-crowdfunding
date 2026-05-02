import { useState, useEffect } from 'react';

/**
 * LoanFilters Component
 * Smart filter panel for refining loan search results
 */
const LoanFilters = ({ filters = {}, onFilterChange, onReset }) => {
    const [localFilters, setLocalFilters] = useState(filters);
    const [isExpanded, setIsExpanded] = useState({
        interestRate: true,
        loanSize: true,
        risk: true,
        collateral: true,
        funding: true,
    });

    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

    const handleChange = (field, value) => {
        const newFilters = { ...localFilters, [field]: value };
        setLocalFilters(newFilters);
    };

    const handleApply = () => {
        onFilterChange(localFilters);
    };

    const handleReset = () => {
        setLocalFilters({
            interestRateMin: 0,
            interestRateMax: 30,
            loanSizeMin: 0,
            loanSizeMax: 1000000,
            riskCategory: 'all',
            collateralType: 'all',
            fundingProgressMin: 0,
            fundingProgressMax: 100,
        });
        if (onReset) {
            onReset();
        }
    };

    const toggleSection = (section) => {
        setIsExpanded((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    const riskCategories = [
        { value: 'all', label: 'All Risk Levels' },
        { value: 'low', label: 'Low Risk (Score ≤ 30)' },
        { value: 'medium', label: 'Medium Risk (Score 31-50)' },
        { value: 'high', label: 'High Risk (Score 51-70)' },
        { value: 'very_high', label: 'Very High Risk (Score > 70)' },
    ];

    const collateralTypes = [
        { value: 'all', label: 'All Collateral Types' },
        { value: 'real_estate', label: 'Real Estate' },
        { value: 'vehicle', label: 'Vehicle' },
        { value: 'equipment', label: 'Equipment' },
        { value: 'inventory', label: 'Inventory' },
        { value: 'accounts_receivable', label: 'Accounts Receivable' },
        { value: 'cash', label: 'Cash' },
        { value: 'stocks', label: 'Stocks/Securities' },
        { value: 'none', label: 'No Collateral' },
    ];

    const fundingRanges = [
        { value: 'all', label: 'Any Funding Stage' },
        { value: 'just_started', label: 'Just Started (0-25%)' },
        { value: 'in_progress', label: 'In Progress (25-50%)' },
        { value: 'halfway', label: 'Halfway (50-75%)' },
        { value: 'almost_there', label: 'Almost There (75-99%)' },
    ];

    const renderSection = (key, title, children) => (
        <div className="border-b border-gray-100 last:border-b-0">
            <button
                type="button"
                onClick={() => toggleSection(key)}
                className="w-full flex items-center justify-between py-4 text-left"
            >
                <span className="font-medium text-gray-900">{title}</span>
                <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                        isExpanded[key] ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </button>
            {isExpanded[key] && <div className="pb-4">{children}</div>}
        </div>
    );

    return (
        <div className="space-y-2">
            {/* Interest Rate Range */}
            {renderSection(
                'interestRate',
                'Interest Rate',
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Min</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={localFilters.interestRateMin || 0}
                                    onChange={(e) =>
                                        handleChange('interestRateMin', parseFloat(e.target.value) || 0)
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                    %
                                </span>
                            </div>
                        </div>
                        <span className="text-gray-400 mt-5">to</span>
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Max</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={localFilters.interestRateMax || 30}
                                    onChange={(e) =>
                                        handleChange('interestRateMax', parseFloat(e.target.value) || 30)
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                    %
                                </span>
                            </div>
                        </div>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="50"
                        value={localFilters.interestRateMax || 30}
                        onChange={(e) =>
                            handleChange('interestRateMax', parseFloat(e.target.value))
                        }
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            )}

            {/* Loan Size Range */}
            {renderSection(
                'loanSize',
                'Loan Size',
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Min</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                    $
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={localFilters.loanSizeMin || 0}
                                    onChange={(e) =>
                                        handleChange('loanSizeMin', parseFloat(e.target.value) || 0)
                                    }
                                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                        <span className="text-gray-400 mt-5">to</span>
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Max</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                    $
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={localFilters.loanSizeMax || 1000000}
                                    onChange={(e) =>
                                        handleChange('loanSizeMax', parseFloat(e.target.value) || 1000000)
                                    }
                                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { min: 0, max: 5000, label: '< $5K' },
                            { min: 5000, max: 25000, label: '$5K - $25K' },
                            { min: 25000, max: 100000, label: '$25K+' },
                        ].map((preset) => (
                            <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                    handleChange('loanSizeMin', preset.min);
                                    handleChange('loanSizeMax', preset.max);
                                }}
                                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                                    localFilters.loanSizeMin === preset.min &&
                                    localFilters.loanSizeMax === preset.max
                                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Risk Category */}
            {renderSection(
                'risk',
                'Risk Category',
                <select
                    value={localFilters.riskCategory || 'all'}
                    onChange={(e) => handleChange('riskCategory', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    {riskCategories.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            )}

            {/* Collateral Type */}
            {renderSection(
                'collateral',
                'Collateral Type',
                <select
                    value={localFilters.collateralType || 'all'}
                    onChange={(e) => handleChange('collateralType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    {collateralTypes.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            )}

            {/* Funding Progress */}
            {renderSection(
                'funding',
                'Funding Progress',
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Min</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={localFilters.fundingProgressMin || 0}
                                    onChange={(e) =>
                                        handleChange('fundingProgressMin', parseFloat(e.target.value) || 0)
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                    %
                                </span>
                            </div>
                        </div>
                        <span className="text-gray-400 mt-5">to</span>
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Max</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={localFilters.fundingProgressMax || 100}
                                    onChange={(e) =>
                                        handleChange('fundingProgressMax', parseFloat(e.target.value) || 100)
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                    %
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {fundingRanges.slice(1).map((preset) => (
                            <button
                                key={preset.value}
                                type="button"
                                onClick={() => {
                                    const ranges = {
                                        just_started: [0, 25],
                                        in_progress: [25, 50],
                                        halfway: [50, 75],
                                        almost_there: [75, 99],
                                    };
                                    const [min, max] = ranges[preset.value] || [0, 100];
                                    handleChange('fundingProgressMin', min);
                                    handleChange('fundingProgressMax', max);
                                }}
                                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 transition-colors"
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Reset
                </button>
                <button
                    type="button"
                    onClick={handleApply}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Apply Filters
                </button>
            </div>

            {/* Active Filters Summary */}
            {Object.values(localFilters).some(
                (v) => v !== undefined && v !== 'all' && !(typeof v === 'number' && v === 0)
            ) && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-500 mb-2">Active Filters:</div>
                    <div className="flex flex-wrap gap-2">
                        {localFilters.interestRateMin > 0 && (
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                                Min Rate: {localFilters.interestRateMin}%
                            </span>
                        )}
                        {localFilters.interestRateMax < 30 && (
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                                Max Rate: {localFilters.interestRateMax}%
                            </span>
                        )}
                        {localFilters.riskCategory !== 'all' && (
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                                Risk: {localFilters.riskCategory}
                            </span>
                        )}
                        {localFilters.collateralType !== 'all' && (
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                                Collateral: {localFilters.collateralType}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoanFilters;
