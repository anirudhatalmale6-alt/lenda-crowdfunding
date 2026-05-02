import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    setLoanFormAmount,
    setLoanFormDuration,
    setLoanFormCollateralValue,
    setLoanFormCollateralType,
    setLoanFormRiskCategory,
    calculateLTV,
    fetchPlatformSettings,
    resetLoanForm,
} from '../../store/slices/rateSlice';
import { createLoanRequest } from '../../store/slices/loanSlice';
import RateSelector from '../../components/loans/RateSelector';
import RateRecommendationCard from '../../components/loans/RateRecommendationCard';
import MarketDemandMeter from '../../components/loans/MarketDemandMeter';
import LoanSummaryCard from '../../components/loans/LoanSummaryCard';
import CollateralUploader from '../../components/loans/CollateralUploader';
import { LoanFeePreview } from '../../components/revenue';
import { formatCurrency } from '../../utils/formatters';
import { 
    DollarSign, 
    Calendar, 
    Shield, 
    ArrowRight, 
    ArrowLeft,
    CheckCircle,
    Loader,
    AlertTriangle,
    Building2,
    Car,
    Gem,
    Briefcase,
    Home
} from 'lucide-react';

/**
 * CreateLoan - Borrower loan creation page
 */
function CreateLoan() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector(state => state.auth);
    const { isLoading, error } = useSelector(state => state.loans);
    const { 
        loanForm, 
        platformSettings, 
        loanProjections,
        rateValidation 
    } = useSelector(state => state.rates);
    
    const [step, setStep] = useState(1);
    const [collateralFiles, setCollateralFiles] = useState([]);
    const [formErrors, setFormErrors] = useState({});
    const [success, setSuccess] = useState(false);
    const [createdLoanId, setCreatedLoanId] = useState(null);
    
    // Load platform settings on mount
    useEffect(() => {
        dispatch(fetchPlatformSettings());
        dispatch(resetLoanForm());
        
        return () => {
            dispatch(resetLoanForm());
        };
    }, [dispatch]);
    
    // Calculate LTV when amount or collateral changes
    useEffect(() => {
        if (loanForm.amount > 0 && loanForm.collateralValue > 0) {
            dispatch(calculateLTV({
                loanAmount: loanForm.amount,
                collateralValue: loanForm.collateralValue,
            }));
        }
    }, [dispatch, loanForm.amount, loanForm.collateralValue]);
    
    // Set risk category based on credit score (mock)
    useEffect(() => {
        // In real app, fetch from user profile
        dispatch(setLoanFormRiskCategory('A'));
    }, [dispatch]);
    
    // Validate form step
    const validateStep = (currentStep) => {
        const errors = {};
        
        if (currentStep === 1) {
            if (!loanForm.amount || loanForm.amount < 1000) {
                errors.amount = `Minimum loan amount is ${formatCurrency(1000)}`;
            }
            if (loanForm.amount > 100000) {
                errors.amount = `Maximum loan amount is ${formatCurrency(100000)}`;
            }
            if (!loanForm.duration || loanForm.duration < 1) {
                errors.duration = 'Minimum duration is 1 month';
            }
            if (loanForm.duration > 60) {
                errors.duration = 'Maximum duration is 60 months';
            }
        }
        
        if (currentStep === 2) {
            if (loanForm.interestRate < (platformSettings?.min_interest_rate || 5)) {
                errors.rate = 'Rate below minimum allowed';
            }
            if (loanForm.interestRate > (platformSettings?.max_interest_rate || 35)) {
                errors.rate = 'Rate above maximum allowed';
            }
        }
        
        if (currentStep === 3) {
            if (!loanForm.collateralValue || loanForm.collateralValue <= 0) {
                errors.collateral = 'Collateral value is required';
            }
            if (loanForm.ltvRatio > 60) {
                errors.ltv = 'Loan-to-Value ratio exceeds 60% limit';
            }
            if (collateralFiles.length === 0) {
                errors.files = 'Please upload collateral documents';
            }
        }
        
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };
    
    // Handle next step
    const handleNext = () => {
        if (validateStep(step)) {
            setStep(step + 1);
        }
    };
    
    // Handle previous step
    const handlePrev = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };
    
    // Handle form submission
    const handleSubmit = async () => {
        if (!validateStep(3)) return;
        
        const loanData = {
            title: `Loan Request - ${formatCurrency(loanForm.amount)}`,
            loan_amount: loanForm.amount,
            interest_rate: loanForm.interestRate,
            duration_months: loanForm.duration,
            collateral_value: loanForm.collateralValue,
            collateral_type: loanForm.collateralType,
            risk_category: loanForm.riskCategory,
            ltv_ratio: loanForm.ltvRatio,
            collateral_documents: collateralFiles,
        };
        
        try {
            const result = await dispatch(createLoanRequest(loanData)).unwrap();
            setCreatedLoanId(result.id);
            setSuccess(true);
        } catch (err) {
            console.error('Failed to create loan:', err);
        }
    };
    
    // Collateral type options
    const collateralTypes = [
        { value: 'real_estate', label: 'Real Estate', icon: Home },
        { value: 'vehicle', label: 'Vehicle', icon: Car },
        { value: 'equipment', label: 'Equipment', icon: Briefcase },
        { value: 'jewelry', label: 'Jewelry', icon: Gem },
        { value: 'stocks', label: 'Stocks/Bonds', icon: Building2 },
    ];
    
    // Duration options
    const durations = [6, 12, 18, 24, 36, 48, 60];
    
    // Success state
    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 py-12">
                <div className="max-w-2xl mx-auto px-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">
                            Loan Request Created!
                        </h1>
                        <p className="text-slate-600 mb-6">
                            Your loan request for {formatCurrency(loanForm.amount)} at {loanForm.interestRate}% 
                            has been submitted successfully.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                                Go to Dashboard
                            </button>
                            <button
                                onClick={() => navigate('/marketplace')}
                                className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                            >
                                View Marketplace
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        Create Loan Request
                    </h1>
                    <p className="text-slate-600">
                        Set your terms and let the marketplace decide if your rate is attractive enough.
                    </p>
                </div>
                
                {/* Progress Steps */}
                <div className="flex items-center justify-center mb-8">
                    {[1, 2, 3].map((s, i) => (
                        <div key={s} className="flex items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                                step >= s 
                                    ? 'bg-primary-500 text-white' 
                                    : 'bg-slate-200 text-slate-500'
                            }`}>
                                {step > s ? <CheckCircle className="w-5 h-5" /> : s}
                            </div>
                            {i < 2 && (
                                <div className={`w-20 h-1 ${
                                    step > s ? 'bg-primary-500' : 'bg-slate-200'
                                }`} />
                            )}
                        </div>
                    ))}
                </div>
                
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Step 1: Basic Details */}
                        {step === 1 && (
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <h2 className="text-xl font-semibold text-slate-900 mb-6">
                                    Loan Details
                                </h2>
                                
                                {/* Loan Amount */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Loan Amount
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                            <DollarSign className="w-5 h-5" />
                                        </span>
                                        <input
                                            type="number"
                                            value={loanForm.amount || ''}
                                            onChange={(e) => dispatch(setLoanFormAmount(parseFloat(e.target.value) || 0))}
                                            min={1000}
                                            max={100000}
                                            step={1000}
                                            className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                            placeholder="Enter loan amount"
                                        />
                                    </div>
                                    {formErrors.amount && (
                                        <p className="text-red-500 text-sm mt-1">{formErrors.amount}</p>
                                    )}
                                    <div className="flex gap-2 mt-2">
                                        {[10000, 25000, 50000, 75000].map(amount => (
                                            <button
                                                key={amount}
                                                onClick={() => dispatch(setLoanFormAmount(amount))}
                                                className={`px-3 py-1 text-sm rounded-full ${
                                                    loanForm.amount === amount
                                                        ? 'bg-primary-500 text-white'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                            >
                                                {formatCurrency(amount)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Duration */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        <Calendar className="w-4 h-4 inline mr-1" />
                                        Loan Duration
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {durations.map(d => (
                                            <button
                                                key={d}
                                                onClick={() => dispatch(setLoanFormDuration(d))}
                                                className={`py-3 rounded-lg font-medium ${
                                                    loanForm.duration === d
                                                        ? 'bg-primary-500 text-white'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                            >
                                                {d} mo
                                            </button>
                                        ))}
                                    </div>
                                    {formErrors.duration && (
                                        <p className="text-red-500 text-sm mt-1">{formErrors.duration}</p>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {/* Step 2: Interest Rate */}
                        {step === 2 && (
                            <div className="space-y-6">
                                <RateSelector 
                                    initialRate={loanForm.interestRate}
                                    onChange={(rate) => dispatch({ type: 'rates/setLoanFormRate', payload: rate })}
                                />
                                
                                {/* Market Demand Preview */}
                                <MarketDemandMeter 
                                    demandData={{
                                        demandLevel: loanForm.interestRate >= 20 ? 'high' : 
                                                     loanForm.interestRate >= 15 ? 'moderate' : 'low',
                                        demandScore: loanForm.interestRate >= 20 ? 85 : 
                                                     loanForm.interestRate >= 15 ? 60 : 35,
                                    }}
                                />
                                
                                {formErrors.rate && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                        <span className="text-sm text-red-700">{formErrors.rate}</span>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Step 3: Collateral */}
                        {step === 3 && (
                            <div className="space-y-6">
                                {/* Collateral Type */}
                                <div className="bg-white rounded-xl border border-slate-200 p-6">
                                    <h2 className="text-xl font-semibold text-slate-900 mb-6">
                                        Collateral Information
                                    </h2>
                                    
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Collateral Type
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {collateralTypes.map(({ value, label, icon: Icon }) => (
                                                <button
                                                    key={value}
                                                    onClick={() => dispatch(setLoanFormCollateralType(value))}
                                                    className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                                                        loanForm.collateralType === value
                                                            ? 'border-primary-500 bg-primary-50'
                                                            : 'border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <Icon className={`w-6 h-6 ${
                                                        loanForm.collateralType === value
                                                            ? 'text-primary-600'
                                                            : 'text-slate-400'
                                                    }`} />
                                                    <span className={`text-sm font-medium ${
                                                        loanForm.collateralType === value
                                                            ? 'text-primary-700'
                                                            : 'text-slate-600'
                                                    }`}>
                                                        {label}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Collateral Value */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            <Shield className="w-4 h-4 inline mr-1" />
                                            Estimated Collateral Value (NGN)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                                ₦
                                            </span>
                                            <input
                                                type="number"
                                                value={loanForm.collateralValue || ''}
                                                onChange={(e) => dispatch(setLoanFormCollateralValue(parseFloat(e.target.value) || 0))}
                                                min={0}
                                                step={1000}
                                                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                                placeholder="Enter collateral value"
                                            />
                                        </div>
                                        {loanForm.amount > 0 && loanForm.collateralValue > 0 && (
                                            <p className="text-sm mt-2">
                                                LTV Ratio: 
                                                <span className={`font-semibold ml-1 ${
                                                    loanForm.ltvRatio > 60 ? 'text-red-600' : 'text-emerald-600'
                                                }`}>
                                                    {loanForm.ltvRatio.toFixed(1)}%
                                                </span>
                                            </p>
                                        )}
                                        {formErrors.ltv && (
                                            <p className="text-red-500 text-sm mt-1">{formErrors.ltv}</p>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Collateral Upload */}
                                <CollateralUploader 
                                    onUpload={setCollateralFiles}
                                />
                                {formErrors.files && (
                                    <p className="text-red-500 text-sm">{formErrors.files}</p>
                                )}
                            </div>
                        )}
                        
                        {/* Navigation Buttons */}
                        <div className="flex justify-between">
                            <button
                                onClick={handlePrev}
                                disabled={step === 1}
                                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium ${
                                    step === 1 
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                }`}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Previous
                            </button>
                            
                            {step < 3 ? (
                                <button
                                    onClick={handleNext}
                                    className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600"
                                >
                                    Next
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader className="w-4 h-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            Submit Request
                                            <CheckCircle className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                        
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Loan Fee Preview */}
                        {loanForm.amount > 0 && (
                            <LoanFeePreview 
                                loanAmount={loanForm.amount} 
                                interestRate={loanForm.interestRate}
                            />
                        )}
                        
                        {/* Rate Recommendation */}
                        {step >= 2 && (
                            <RateRecommendationCard 
                                loanAmount={loanForm.amount}
                                collateralValue={loanForm.collateralValue}
                                riskCategory={loanForm.riskCategory}
                            />
                        )}
                        
                        {/* Loan Summary */}
                        <LoanSummaryCard showCollateral={step >= 3} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CreateLoan;
