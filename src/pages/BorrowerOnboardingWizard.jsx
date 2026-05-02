import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    User,
    Shield,
    Wallet,
    FileText,
    CheckCircle,
    ArrowRight,
    ArrowLeft,
    Loader,
    Building2,
    Phone,
    Mail,
    MapPin,
    Upload,
    AlertCircle,
    TrendingUp,
    DollarSign,
    Calendar,
    Gem,
    Car,
    Home,
    Briefcase,
} from 'lucide-react';
import {
    setLoanFormAmount,
    setLoanFormDuration,
    setLoanFormCollateralValue,
    setLoanFormCollateralType,
    setLoanFormRiskCategory,
    calculateLTV,
    resetLoanForm,
} from '../store/slices/rateSlice';
import { createLoanRequest } from '../store/slices/loanSlice';
import { updateKYCStatus } from '../store/slices/authSlice';
import KYCProgressIndicator from '../components/common/KYCProgressIndicator';

/**
 * BorrowerOnboardingWizard - UX-03: Complete multi-step onboarding flow for new borrowers
 * Guides users through: Profile -> KYC -> Financial Info -> First Loan -> Review
 */
function BorrowerOnboardingWizard() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const { isLoading, error } = useSelector((state) => state.loans);
    const { loanForm, ltvRatio } = useSelector((state) => state.rates);

    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        // Profile Step
        firstName: '',
        lastName: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        dateOfBirth: '',
        // KYC Step
        idType: 'passport',
        idNumber: '',
        idDocument: null,
        // Financial Step
        annualIncome: '',
        employmentStatus: 'employed',
        employerName: '',
        businessType: '',
        yearsInBusiness: '',
        // Loan Step
        loanAmount: 10000,
        loanPurpose: 'business',
        loanDuration: 12,
        collateralType: 'real_estate',
        collateralValue: 15000,
    });
    const [kycStatus, setKycStatus] = useState('not_started');
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [completedSteps, setCompletedSteps] = useState([]);

    const totalSteps = 5;

    const steps = [
        {
            id: 1,
            title: 'Profile Setup',
            description: 'Personal information',
            icon: User,
        },
        {
            id: 2,
            title: 'Identity Verification',
            description: 'KYC verification',
            icon: Shield,
        },
        {
            id: 3,
            title: 'Financial Details',
            description: 'Income & employment',
            icon: Wallet,
        },
        {
            id: 4,
            title: 'First Loan',
            description: 'Create your loan request',
            icon: FileText,
        },
        {
            id: 5,
            title: 'Review & Submit',
            description: 'Confirm your application',
            icon: CheckCircle,
        },
    ];

    // Reset loan form on mount
    useEffect(() => {
        dispatch(resetLoanForm());
        return () => {
            dispatch(resetLoanForm());
        };
    }, [dispatch]);

    // Calculate LTV when loan details change
    useEffect(() => {
        if (formData.loanAmount > 0 && formData.collateralValue > 0) {
            dispatch(calculateLTV({
                loanAmount: formData.loanAmount,
                collateralValue: formData.collateralValue,
            }));
        }
    }, [dispatch, formData.loanAmount, formData.collateralValue]);

    const validateStep = (step) => {
        const errors = {};

        if (step === 1) {
            if (!formData.firstName.trim()) errors.firstName = 'First name is required';
            if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
            if (!formData.phone.trim()) errors.phone = 'Phone number is required';
            if (!formData.address.trim()) errors.address = 'Address is required';
            if (!formData.city.trim()) errors.city = 'City is required';
            if (!formData.country.trim()) errors.country = 'Country is required';
            if (!formData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
        }

        if (step === 2) {
            if (!formData.idNumber.trim()) errors.idNumber = 'ID number is required';
            if (!formData.idDocument) errors.idDocument = 'Please upload your ID document';
        }

        if (step === 3) {
            if (!formData.annualIncome) errors.annualIncome = 'Annual income is required';
            if (formData.employmentStatus === 'self-employed' && !formData.businessType) {
                errors.businessType = 'Business type is required';
            }
        }

        if (step === 4) {
            if (formData.loanAmount < 1000) errors.loanAmount = 'Minimum loan amount is $1,000';
            if (formData.loanAmount > 100000) errors.loanAmount = 'Maximum loan amount is $100,000';
            if (formData.collateralValue < formData.loanAmount) {
                errors.collateralValue = 'Collateral must be at least equal to loan amount';
            }
            if (ltvRatio > 60) {
                errors.ltv = 'Loan-to-Value ratio exceeds 60% maximum';
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            if (!completedSteps.includes(currentStep)) {
                setCompletedSteps([...completedSteps, currentStep]);
            }
            setCurrentStep(currentStep + 1);
        } else {
            toast.error('Please fill in all required fields');
        }
    };

    const handlePrev = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        if (formErrors[field]) {
            setFormErrors({ ...formErrors, [field]: null });
        }
    };

    const handleFileUpload = (field, file) => {
        setFormData({ ...formData, [field]: file });
        if (formErrors[field]) {
            setFormErrors({ ...formErrors, [field]: null });
        }
    };

    const handleSubmit = async () => {
        if (!validateStep(4)) return;

        setIsSubmitting(true);
        try {
            // Simulate KYC completion
            setKycStatus('verified');
            dispatch(updateKYCStatus({ status: 'verified' }));

            // Create loan request
            const loanData = {
                title: `${formData.firstName}'s ${formData.loanPurpose} Loan`,
                loan_amount: formData.loanAmount,
                interest_rate: 15, // Default rate, will be adjusted
                duration_months: formData.loanDuration,
                collateral_value: formData.collateralValue,
                collateral_type: formData.collateralType,
                risk_category: 'A',
                ltv_ratio: ltvRatio,
            };

            await dispatch(createLoanRequest(loanData)).unwrap();
            setCompletedSteps([...completedSteps, 5]);
            toast.success('Welcome to Lenda! Your loan application has been submitted.');
            navigate('/dashboard');
        } catch (err) {
            toast.error('Failed to complete onboarding. Please try again.');
            console.error('Onboarding error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const collateralTypes = [
        { value: 'real_estate', label: 'Real Estate', icon: Home },
        { value: 'vehicle', label: 'Vehicle', icon: Car },
        { value: 'equipment', label: 'Equipment', icon: Briefcase },
        { value: 'jewelry', label: 'Jewelry', icon: Gem },
    ];

    const durations = [6, 12, 18, 24, 36, 48, 60];

    const calculateMonthlyPayment = () => {
        const principal = formData.loanAmount;
        const rate = 0.15 / 12; // 15% annual rate
        const months = formData.loanDuration;
        const payment = (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
        return payment.toFixed(2);
    };

    // Progress indicator
    const getStepStatus = (stepId) => {
        if (completedSteps.includes(stepId)) return 'completed';
        if (stepId === currentStep) return 'current';
        return 'pending';
    };

    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-5xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        Welcome to Lenda
                    </h1>
                    <p className="text-slate-600">
                        Complete your borrower profile to get started
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="mb-10">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => {
                            const status = getStepStatus(step.id);
                            const Icon = step.icon;
                            return (
                                <div key={step.id} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                                            status === 'completed' ? 'bg-emerald-500 text-white' :
                                            status === 'current' ? 'bg-primary-500 text-white' :
                                            'bg-slate-200 text-slate-400'
                                        }`}>
                                            {status === 'completed' ? (
                                                <CheckCircle className="w-6 h-6" />
                                            ) : (
                                                <Icon className="w-6 h-6" />
                                            )}
                                        </div>
                                        <div className="mt-2 text-center">
                                            <p className={`text-sm font-medium ${
                                                status === 'current' ? 'text-primary-600' :
                                                status === 'completed' ? 'text-emerald-600' :
                                                'text-slate-400'
                                            }`}>
                                                {step.title}
                                            </p>
                                            <p className="text-xs text-slate-400 hidden sm:block">
                                                {step.description}
                                            </p>
                                        </div>
                                    </div>
                                    {index < steps.length - 1 && (
                                        <div className={`flex-1 h-1 mx-2 rounded ${
                                            completedSteps.includes(step.id) ? 'bg-emerald-500' : 'bg-slate-200'
                                        }`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Step Content */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                    {/* Step 1: Profile */}
                    {currentStep === 1 && (
                        <div className="p-8">
                            <h2 className="text-xl font-semibold text-slate-900 mb-6">
                                Personal Information
                            </h2>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        First Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                                            formErrors.firstName ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                        placeholder="Enter first name"
                                    />
                                    {formErrors.firstName && (
                                        <p className="text-red-500 text-sm mt-1">{formErrors.firstName}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Last Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                                            formErrors.lastName ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                        placeholder="Enter last name"
                                    />
                                    {formErrors.lastName && (
                                        <p className="text-red-500 text-sm mt-1">{formErrors.lastName}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        <Phone className="w-4 h-4 inline mr-1" />
                                        Phone Number *
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => handleInputChange('phone', e.target.value)}
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                                            formErrors.phone ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                        placeholder="+1 (555) 000-0000"
                                    />
                                    {formErrors.phone && (
                                        <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        <Calendar className="w-4 h-4 inline mr-1" />
                                        Date of Birth *
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.dateOfBirth}
                                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                                            formErrors.dateOfBirth ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                    />
                                    {formErrors.dateOfBirth && (
                                        <p className="text-red-500 text-sm mt-1">{formErrors.dateOfBirth}</p>
                                    )}
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        <MapPin className="w-4 h-4 inline mr-1" />
                                        Address *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => handleInputChange('address', e.target.value)}
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                                            formErrors.address ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                        placeholder="Street address"
                                    />
                                    {formErrors.address && (
                                        <p className="text-red-500 text-sm mt-1">{formErrors.address}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        City *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => handleInputChange('city', e.target.value)}
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                                            formErrors.city ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                        placeholder="City"
                                    />
                                    {formErrors.city && (
                                        <p className="text-red-500 text-sm mt-1">{formErrors.city}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Country *
                                    </label>
                                    <select
                                        value={formData.country}
                                        onChange={(e) => handleInputChange('country', e.target.value)}
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                                            formErrors.country ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                    >
                                        <option value="">Select country</option>
                                        <option value="US">United States</option>
                                        <option value="UK">United Kingdom</option>
                                        <option value="CA">Canada</option>
                                        <option value="AU">Australia</option>
                                        <option value="NG">Nigeria</option>
                                        <option value="KE">Kenya</option>
                                        <option value="GH">Ghana</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                    {formErrors.country && (
                                        <p className="text-red-500 text-sm mt-1">{formErrors.country}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: KYC */}
                    {currentStep === 2 && (
                        <div className="p-8">
                            <h2 className="text-xl font-semibold text-slate-900 mb-2">
                                Identity Verification
                            </h2>
                            <p className="text-slate-600 mb-6">
                                Please verify your identity to comply with regulatory requirements
                            </p>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-blue-800">Secure Verification</p>
                                        <p className="text-sm text-blue-600">
                                            Your documents are encrypted and securely stored. We never share your data.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        ID Type
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['passport', 'national_id', 'drivers_license'].map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => handleInputChange('idType', type)}
                                                className={`p-3 rounded-lg border-2 text-center transition-colors ${
                                                    formData.idType === type
                                                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                        : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                            >
                                                {type === 'passport' ? 'Passport' :
                                                 type === 'national_id' ? 'National ID' : 'Driver License'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        {formData.idType === 'passport' ? 'Passport Number' :
                                         formData.idType === 'national_id' ? 'National ID Number' : 'Driver License Number'} *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.idNumber}
                                        onChange={(e) => handleInputChange('idNumber', e.target.value)}
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                                            formErrors.idNumber ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                        placeholder={`Enter your ${formData.idType.replace('_', ' ')} number`}
                                    />
                                    {formErrors.idNumber && (
                                        <p className="text-red-500 text-sm mt-1">{formErrors.idNumber}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Upload Document *
                                    </label>
                                    <div className={`border-2 border-dashed rounded-lg p-8 text-center ${
                                        formErrors.idDocument ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-primary-400'
                                    }`}>
                                        <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                                        <p className="text-slate-600 mb-2">
                                            Drag and drop your document here, or click to browse
                                        </p>
                                        <p className="text-sm text-slate-400">
                                            Supported formats: JPG, PNG, PDF (Max 10MB)
                                        </p>
                                        <input
                                            type="file"
                                            accept=".jpg,.jpeg,.png,.pdf"
                                            className="hidden"
                                            id="id-upload"
                                            onChange={(e) => handleFileUpload('idDocument', e.target.files[0])}
                                        />
                                        <label
                                            htmlFor="id-upload"
                                            className="mt-4 inline-block px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 cursor-pointer"
                                        >
                                            Choose File
                                        </label>
                                    </div>
                                    {formData.idDocument && (
                                        <p className="text-emerald-600 text-sm mt-2">
                                            ✓ {formData.idDocument.name}
                                        </p>
                                    )}
                                    {formErrors.idDocument && (
                                        <p className="text-red-500 text-sm mt-1">{formErrors.idDocument}</p>
                                    )}
                                </div>
                            </div>

                            {/* KYC Progress Indicator */}
                            <div className="mt-8">
                                <KYCProgressIndicator />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Financial */}
                    {currentStep === 3 && (
                        <div className="p-8">
                            <h2 className="text-xl font-semibold text-slate-900 mb-6">
                                Financial Information
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        <DollarSign className="w-4 h-4 inline mr-1" />
                                        Annual Income *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                        <input
                                            type="number"
                                            value={formData.annualIncome}
                                            onChange={(e) => handleInputChange('annualIncome', e.target.value)}
                                            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                                                formErrors.annualIncome ? 'border-red-500' : 'border-slate-300'
                                            }`}
                                            placeholder="0"
                                            min="0"
                                            step="1000"
                                        />
                                    </div>
                                    {formErrors.annualIncome && (
                                        <p className="text-red-500 text-sm mt-1">{formErrors.annualIncome}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Employment Status *
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { value: 'employed', label: 'Employed' },
                                            { value: 'self-employed', label: 'Self-Employed' },
                                            { value: 'business_owner', label: 'Business Owner' },
                                        ].map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => handleInputChange('employmentStatus', option.value)}
                                                className={`p-3 rounded-lg border-2 text-center transition-colors ${
                                                    formData.employmentStatus === option.value
                                                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                        : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {formData.employmentStatus === 'employed' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Employer Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.employerName}
                                            onChange={(e) => handleInputChange('employerName', e.target.value)}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                            placeholder="Company name"
                                        />
                                    </div>
                                )}

                                {formData.employmentStatus === 'self-employed' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Business Type *
                                            </label>
                                            <select
                                                value={formData.businessType}
                                                onChange={(e) => handleInputChange('businessType', e.target.value)}
                                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                                                    formErrors.businessType ? 'border-red-500' : 'border-slate-300'
                                                }`}
                                            >
                                                <option value="">Select business type</option>
                                                <option value="retail">Retail</option>
                                                <option value="services">Services</option>
                                                <option value="technology">Technology</option>
                                                <option value="manufacturing">Manufacturing</option>
                                                <option value="agriculture">Agriculture</option>
                                                <option value="other">Other</option>
                                            </select>
                                            {formErrors.businessType && (
                                                <p className="text-red-500 text-sm mt-1">{formErrors.businessType}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Years in Business
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.yearsInBusiness}
                                                onChange={(e) => handleInputChange('yearsInBusiness', e.target.value)}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                                placeholder="0"
                                                min="0"
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <TrendingUp className="w-5 h-5 text-emerald-600 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-emerald-800">Why we need this information</p>
                                            <p className="text-sm text-emerald-600">
                                                We use your financial details to assess your creditworthiness and determine the best loan terms for you.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: First Loan */}
                    {currentStep === 4 && (
                        <div className="p-8">
                            <h2 className="text-xl font-semibold text-slate-900 mb-6">
                                Create Your First Loan Request
                            </h2>
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            <DollarSign className="w-4 h-4 inline mr-1" />
                                            Loan Amount *
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.loanAmount}
                                            onChange={(e) => handleInputChange('loanAmount', parseFloat(e.target.value) || 0)}
                                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                                                formErrors.loanAmount ? 'border-red-500' : 'border-slate-300'
                                            }`}
                                            min="1000"
                                            max="100000"
                                            step="1000"
                                        />
                                        {formErrors.loanAmount && (
                                            <p className="text-red-500 text-sm mt-1">{formErrors.loanAmount}</p>
                                        )}
                                        <div className="flex gap-2 mt-2">
                                            {[10000, 25000, 50000, 75000].map((amount) => (
                                                <button
                                                    key={amount}
                                                    onClick={() => handleInputChange('loanAmount', amount)}
                                                    className={`px-3 py-1 text-sm rounded-full ${
                                                        formData.loanAmount === amount
                                                            ? 'bg-primary-500 text-white'
                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    ${amount.toLocaleString()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            <Calendar className="w-4 h-4 inline mr-1" />
                                            Loan Duration
                                        </label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {durations.map((d) => (
                                                <button
                                                    key={d}
                                                    onClick={() => handleInputChange('loanDuration', d)}
                                                    className={`py-2 rounded-lg font-medium ${
                                                        formData.loanDuration === d
                                                            ? 'bg-primary-500 text-white'
                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {d} mo
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Loan Purpose
                                        </label>
                                        <select
                                            value={formData.loanPurpose}
                                            onChange={(e) => handleInputChange('loanPurpose', e.target.value)}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                        >
                                            <option value="business">Business</option>
                                            <option value="personal">Personal</option>
                                            <option value="education">Education</option>
                                            <option value="home_improvement">Home Improvement</option>
                                            <option value="debt_consolidation">Debt Consolidation</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            <Building2 className="w-4 h-4 inline mr-1" />
                                            Collateral Type
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {collateralTypes.map(({ value, label, icon: Icon }) => (
                                                <button
                                                    key={value}
                                                    onClick={() => handleInputChange('collateralType', value)}
                                                    className={`p-3 rounded-lg border-2 flex items-center gap-2 transition-colors ${
                                                        formData.collateralType === value
                                                            ? 'border-primary-500 bg-primary-50'
                                                            : 'border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <Icon className="w-5 h-5 text-slate-500" />
                                                    <span className="text-sm">{label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            <Shield className="w-4 h-4 inline mr-1" />
                                            Collateral Value *
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                            <input
                                                type="number"
                                                value={formData.collateralValue}
                                                onChange={(e) => handleInputChange('collateralValue', parseFloat(e.target.value) || 0)}
                                                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                                                    formErrors.collateralValue ? 'border-red-500' : 'border-slate-300'
                                                }`}
                                                min="0"
                                                step="1000"
                                            />
                                        </div>
                                        {formErrors.collateralValue && (
                                            <p className="text-red-500 text-sm mt-1">{formErrors.collateralValue}</p>
                                        )}
                                        {formErrors.ltv && (
                                            <p className="text-red-500 text-sm mt-1">{formErrors.ltv}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Loan Summary */}
                                <div className="bg-slate-50 rounded-xl p-6">
                                    <h3 className="font-semibold text-slate-900 mb-4">Loan Summary</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Amount</span>
                                            <span className="font-medium">${formData.loanAmount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Duration</span>
                                            <span className="font-medium">{formData.loanDuration} months</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Interest Rate</span>
                                            <span className="font-medium">15% APR (estimated)</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Collateral</span>
                                            <span className="font-medium">${formData.collateralValue.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">LTV Ratio</span>
                                            <span className={`font-medium ${
                                                ltvRatio > 60 ? 'text-red-600' : 'text-emerald-600'
                                            }`}>
                                                {ltvRatio.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="border-t pt-3 mt-3">
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Est. Monthly Payment</span>
                                                <span className="text-xl font-bold text-primary-600">
                                                    ${calculateMonthlyPayment()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                                            <p className="text-sm text-amber-800">
                                                Interest rate is estimated. Your final rate will be determined by market demand and your credit profile.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Review */}
                    {currentStep === 5 && (
                        <div className="p-8">
                            <h2 className="text-xl font-semibold text-slate-900 mb-6">
                                Review & Submit
                            </h2>
                            
                            <div className="space-y-6">
                                {/* Profile Summary */}
                                <div className="bg-slate-50 rounded-xl p-6">
                                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                        <User className="w-5 h-5 text-primary-500" />
                                        Profile Information
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-slate-500">Full Name</p>
                                            <p className="font-medium">{formData.firstName} {formData.lastName}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Email</p>
                                            <p className="font-medium">{user?.email || 'user@example.com'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Phone</p>
                                            <p className="font-medium">{formData.phone}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Location</p>
                                            <p className="font-medium">{formData.city}, {formData.country}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Summary */}
                                <div className="bg-slate-50 rounded-xl p-6">
                                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                        <Wallet className="w-5 h-5 text-primary-500" />
                                        Financial Information
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-slate-500">Annual Income</p>
                                            <p className="font-medium">${parseInt(formData.annualIncome || 0).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Employment Status</p>
                                            <p className="font-medium capitalize">{formData.employmentStatus.replace('_', ' ')}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Loan Summary */}
                                <div className="bg-slate-50 rounded-xl p-6">
                                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-primary-500" />
                                        Loan Details
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-slate-500">Loan Amount</p>
                                            <p className="font-medium">${formData.loanAmount.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Duration</p>
                                            <p className="font-medium">{formData.loanDuration} months</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Purpose</p>
                                            <p className="font-medium capitalize">{formData.loanPurpose.replace('_', ' ')}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Collateral</p>
                                            <p className="font-medium capitalize">{formData.collateralType.replace('_', ' ')} - ${formData.collateralValue.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Est. Monthly Payment</p>
                                            <p className="font-medium text-primary-600">${calculateMonthlyPayment()}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">LTV Ratio</p>
                                            <p className={`font-medium ${ltvRatio > 60 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {ltvRatio.toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Terms */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input type="checkbox" className="mt-1" />
                                        <div>
                                            <p className="text-sm font-medium text-blue-800">
                                                I agree to the Terms of Service and Privacy Policy
                                            </p>
                                            <p className="text-sm text-blue-600">
                                                By submitting, I confirm that all information provided is accurate and complete.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="px-8 py-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                        <div className="flex justify-between">
                            <button
                                onClick={handlePrev}
                                disabled={currentStep === 1}
                                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium ${
                                    currentStep === 1
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                }`}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Previous
                            </button>

                            {currentStep < 5 ? (
                                <button
                                    onClick={handleNext}
                                    className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600"
                                >
                                    Continue
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 px-8 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader className="w-4 h-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            Complete Onboarding
                                            <CheckCircle className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Skip for existing borrowers */}
                <div className="mt-6 text-center">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-slate-500 hover:text-slate-700 text-sm"
                    >
                        Already have an account? Skip to dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BorrowerOnboardingWizard;
