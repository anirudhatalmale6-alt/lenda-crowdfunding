import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { savePreferences, fetchPreferences } from '../../store/slices/discoverySlice';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

/**
 * InvestmentPreferenceSetup Component
 * Allows investors to set their investment preferences during onboarding
 */
const InvestmentPreferenceSetup = ({ onComplete, isModal = false }) => {
    const dispatch = useDispatch();
    const { preferences, isLoading, error } = useSelector((state) => state.discovery);

    const [formData, setFormData] = useState({
        riskTolerance: 'medium',
        minInterestRate: 5,
        maxInterestRate: 25,
        minLoanSize: 500,
        maxLoanSize: 50000,
        preferredCollateralTypes: [],
        maxLoanExposure: 25000,
        investmentStrategy: 'balanced',
        autoInvestEnabled: false,
        minInvestmentAmount: 100,
    });

    const [step, setStep] = useState(1);
    const [saved, setSaved] = useState(false);

    // Collateral type options
    const collateralTypes = [
        { value: 'real_estate', label: 'Real Estate' },
        { value: 'vehicle', label: 'Vehicle' },
        { value: 'equipment', label: 'Equipment' },
        { value: 'inventory', label: 'Inventory' },
        { value: 'accounts_receivable', label: 'Accounts Receivable' },
        { value: 'cash', label: 'Cash' },
        { value: 'stocks', label: 'Stocks/Securities' },
        { value: 'commodities', label: 'Commodities' },
    ];

    // Risk tolerance options with descriptions
    const riskOptions = [
        {
            value: 'low',
            label: 'Low Risk',
            description: 'Prefer stable borrowers with excellent credit history. Lower returns but higher security.',
            color: 'green',
        },
        {
            value: 'medium',
            label: 'Medium Risk',
            description: 'Balance between returns and security. Include some moderate-risk opportunities.',
            color: 'blue',
        },
        {
            value: 'high',
            label: 'High Risk',
            description: 'Target higher returns with acceptable risk. Diversification recommended.',
            color: 'yellow',
        },
        {
            value: 'very_high',
            label: 'Very High Risk',
            description: 'Maximum return potential. Accept significant risk exposure.',
            color: 'red',
        },
    ];

    // Investment strategy options
    const strategyOptions = [
        { value: 'conservative', label: 'Conservative', description: 'Focus on low-risk loans with stable returns' },
        { value: 'balanced', label: 'Balanced', description: 'Mix of risk levels for portfolio stability' },
        { value: 'aggressive', label: 'Aggressive', description: 'Target highest returns across all risk levels' },
        { value: 'income', label: 'Income', description: 'Focus on steady income from interest payments' },
    ];

    useEffect(() => {
        // Load existing preferences on mount
        dispatch(fetchPreferences());
    }, [dispatch]);

    useEffect(() => {
        if (preferences && Object.keys(preferences).length > 0) {
            setFormData({
                riskTolerance: preferences.riskTolerance || 'medium',
                minInterestRate: preferences.minInterestRate || 5,
                maxInterestRate: preferences.maxInterestRate || 25,
                minLoanSize: preferences.minLoanSize || 500,
                maxLoanSize: preferences.maxLoanSize || 50000,
                preferredCollateralTypes: preferences.preferredCollateralTypes || [],
                maxLoanExposure: preferences.maxLoanExposure || 25000,
                investmentStrategy: preferences.investmentStrategy || 'balanced',
                autoInvestEnabled: preferences.autoInvestEnabled || false,
                minInvestmentAmount: preferences.minInvestmentAmount || 100,
            });
        }
    }, [preferences]);

    const handleChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
        setSaved(false);
    };

    const handleCollateralToggle = (type) => {
        setFormData((prev) => {
            const current = prev.preferredCollateralTypes || [];
            const updated = current.includes(type)
                ? current.filter((t) => t !== type)
                : [...current, type];
            return {
                ...prev,
                preferredCollateralTypes: updated,
            };
        });
        setSaved(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await dispatch(savePreferences(formData)).unwrap();
            setSaved(true);
            if (onComplete) {
                onComplete(formData);
            }
        } catch (err) {
            console.error('Failed to save preferences:', err);
        }
    };

    const renderStepIndicator = () => (
        <div className="flex items-center justify-center mb-8">
            {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center">
                    <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                            step >= s
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-500'
                        }`}
                    >
                        {step > s ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        ) : (
                            s
                        )}
                    </div>
                    {s < 4 && (
                        <div
                            className={`w-16 h-1 ${
                                step > s ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                        />
                    )}
                </div>
            ))}
        </div>
    );

    const renderStep1 = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Step 1: Select Your Risk Tolerance
                </h3>
                <p className="text-gray-600 mb-6">
                    This helps us recommend loans that match your risk appetite. Remember,
                    higher returns typically come with higher risk.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {riskOptions.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => handleChange('riskTolerance', option.value)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                            formData.riskTolerance === option.value
                                ? `border-${option.color}-500 bg-${option.color}-50`
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className={`font-semibold text-${option.color}-700`}>
                                {option.label}
                            </span>
                            {formData.riskTolerance === option.value && (
                                <svg
                                    className={`w-5 h-5 text-${option.color}-600`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            )}
                        </div>
                        <p className="text-sm text-gray-600">{option.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Step 2: Set Your Interest Rate Preferences
                </h3>
                <p className="text-gray-600 mb-6">
                    Choose the interest rate range you prefer. Higher rates mean higher returns
                    but may indicate higher risk borrowers.
                </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Interest Rate: {formData.minInterestRate}%
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="30"
                        step="0.5"
                        value={formData.minInterestRate}
                        onChange={(e) =>
                            handleChange(
                                'minInterestRate',
                                parseFloat(e.target.value)
                            )
                        }
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0%</span>
                        <span>30%</span>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Interest Rate: {formData.maxInterestRate}%
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="50"
                        step="0.5"
                        value={formData.maxInterestRate}
                        onChange={(e) =>
                            handleChange(
                                'maxInterestRate',
                                parseFloat(e.target.value)
                            )
                        }
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0%</span>
                        <span>50%</span>
                    </div>
                </div>

                {formData.minInterestRate > formData.maxInterestRate && (
                    <div className="text-red-600 text-sm">
                        Minimum rate cannot be higher than maximum rate
                    </div>
                )}

                <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-600">
                        Your preferred range:{' '}
                        <span className="font-semibold text-gray-900">
                            {formData.minInterestRate}% - {formData.maxInterestRate}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Step 3: Set Your Loan Size Preferences
                </h3>
                <p className="text-gray-600 mb-6">
                    Define the minimum and maximum loan sizes you want to invest in.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Loan Size
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            $
                        </span>
                        <input
                            type="number"
                            min="0"
                            step="100"
                            value={formData.minLoanSize}
                            onChange={(e) =>
                                handleChange('minLoanSize', parseFloat(e.target.value) || 0)
                            }
                            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Loan Size
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            $
                        </span>
                        <input
                            type="number"
                            min="0"
                            step="1000"
                            value={formData.maxLoanSize}
                            onChange={(e) =>
                                handleChange('maxLoanSize', parseFloat(e.target.value) || 0)
                            }
                            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Exposure Per Loan
                </label>
                <p className="text-xs text-gray-500 mb-2">
                    The maximum amount you'll invest in any single loan
                </p>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        $
                    </span>
                    <input
                        type="number"
                        min="0"
                        step="500"
                        value={formData.maxLoanExposure}
                        onChange={(e) =>
                            handleChange('maxLoanExposure', parseFloat(e.target.value) || 0)
                        }
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Investment Amount
                </label>
                <p className="text-xs text-gray-500 mb-2">
                    The smallest amount you can invest in a single loan
                </p>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        $
                    </span>
                    <input
                        type="number"
                        min="0"
                        step="50"
                        value={formData.minInvestmentAmount}
                        onChange={(e) =>
                            handleChange('minInvestmentAmount', parseFloat(e.target.value) || 0)
                        }
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Step 4: Additional Preferences
                </h3>
                <p className="text-gray-600 mb-6">
                    Fine-tune your investment preferences.
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                    Investment Strategy
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {strategyOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => handleChange('investmentStrategy', option.value)}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${
                                formData.investmentStrategy === option.value
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div className="font-medium text-gray-900">{option.label}</div>
                            <div className="text-xs text-gray-500">{option.description}</div>
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                    Preferred Collateral Types (Optional)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {collateralTypes.map((type) => (
                        <button
                            key={type.value}
                            onClick={() => handleCollateralToggle(type.value)}
                            className={`p-2 rounded-lg border text-sm transition-all ${
                                formData.preferredCollateralTypes?.includes(type.value)
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    Leave empty to see all collateral types
                </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                    <div className="font-medium text-gray-900">Enable Auto-Invest</div>
                    <div className="text-sm text-gray-500">
                        Automatically invest in loans matching your preferences
                    </div>
                </div>
                <button
                    onClick={() =>
                        handleChange('autoInvestEnabled', !formData.autoInvestEnabled)
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.autoInvestEnabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.autoInvestEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                </button>
            </div>
        </div>
    );

    const renderSummary = () => (
        <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                    <svg
                        className="w-6 h-6 text-green-600 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <div>
                        <div className="font-semibold text-green-800">
                            Preferences Saved Successfully!
                        </div>
                        <div className="text-sm text-green-700">
                            Your personalized loan feed is ready.
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4">Your Investment Profile</h3>
                <div className="space-y-3">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Risk Tolerance:</span>
                        <span className="font-medium text-gray-900 capitalize">
                            {formData.riskTolerance}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Interest Rate Range:</span>
                        <span className="font-medium text-gray-900">
                            {formData.minInterestRate}% - {formData.maxInterestRate}%
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Loan Size Range:</span>
                        <span className="font-medium text-gray-900">
                            {formatCurrency(formData.minLoanSize)} -{' '}
                            {formatCurrency(formData.maxLoanSize)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Max Exposure per Loan:</span>
                        <span className="font-medium text-gray-900">
                            {formatCurrency(formData.maxLoanExposure)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Strategy:</span>
                        <span className="font-medium text-gray-900 capitalize">
                            {formData.investmentStrategy}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className={`${isModal ? 'max-w-2xl' : 'max-w-4xl'} mx-auto`}>
            {!isModal && (
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Set Up Your Investment Preferences
                    </h2>
                    <p className="text-gray-600 mt-2">
                        Customize your loan discovery feed to find the best opportunities
                    </p>
                </div>
            )}

            {renderStepIndicator()}

            <form onSubmit={handleSubmit}>
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
                {saved && renderSummary()}

                {!saved && (
                    <div className="flex justify-between mt-8">
                        {step > 1 ? (
                            <button
                                type="button"
                                onClick={() => setStep(step - 1)}
                                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Back
                            </button>
                        ) : (
                            <div />
                        )}

                        {step < 4 ? (
                            <button
                                type="button"
                                onClick={() => setStep(step + 1)}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Continue
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {isLoading ? 'Saving...' : 'Save Preferences'}
                            </button>
                        )}
                    </div>
                )}

                {saved && !isModal && (
                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                if (onComplete) onComplete(formData);
                            }}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            View Your Personalized Loans
                        </button>
                    </div>
                )}
            </form>

            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                </div>
            )}
        </div>
    );
};

export default InvestmentPreferenceSetup;
