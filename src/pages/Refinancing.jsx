import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { 
    getRefinancingOpportunities,
    requestRefinancing,
    investRefinancing
} from '../store/slices/tokenSlice';
import { formatCurrency, formatPercentage, formatDate } from '../utils/formatters';
import riskService from '../services/riskService';

const Refinancing = () => {
    const dispatch = useDispatch();
    const { refinancingOpportunities, isLoading, isProcessing } = useSelector(
        (state) => state.tokens
    );
    const { user } = useSelector((state) => state.auth);
    
    const [activeTab, setActiveTab] = useState('opportunities');
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [newRate, setNewRate] = useState('');
    const [newDuration, setNewDuration] = useState('');
    const [validationErrors, setValidationErrors] = useState({});
    const [riskAssessment, setRiskAssessment] = useState(null);
    const [isValidating, setIsValidating] = useState(false);
    
    // RISK-04: Enhanced refinancing with credit check and validation
    useEffect(() => {
        dispatch(getRefinancingOpportunities());
    }, [dispatch]);

    // RISK-05: Validate refinancing terms including credit check (RISK-05, RISK-06)
    const validateRefinancingTerms = async (loanId, rate, duration) => {
        const errors = {};
        setIsValidating(true);
        
        try {
            // RISK-06: Backend term validation
            // Call the backend API for comprehensive validation
            const validationResponse = await riskService.validateRefinancingTerms(
                loanId,
                rate,
                duration
            );
            
            if (validationResponse.validation && !validationResponse.validation.valid) {
                // Add backend validation errors
                Object.assign(errors, validationResponse.validation.errors);
            }
            
            // Also check client-side validations as backup
            if (rate && (rate < 5 || rate > 30)) {
                errors.rate = 'Interest rate must be between 5% and 30%';
            }
            if (duration && (duration < 6 || duration > 60)) {
                errors.duration = 'Duration must be between 6 and 60 months';
            }
            
            // RISK-05: Get risk assessment from backend
            let riskData = null;
            if (validationResponse.risk_assessment) {
                riskData = validationResponse.risk_assessment;
            } else {
                // Fallback to local risk analysis
                riskData = await riskService.analyzeLoanRisk(loanId);
            }
            setRiskAssessment(riskData);
            
            // Check default probability (RISK-05)
            const defaultProb = riskData?.default_probability || riskData?.defaultProbability || 0;
            if (defaultProb > 40) {
                errors.risk = 'High risk - refinancing may not be approved';
            }
            
            // Check LTV (RISK-05)
            const ltvPct = riskData?.ltv_percentage || riskData?.ltvPercentage || 0;
            if (ltvPct > 80) {
                errors.ltv = 'LTV too high for refinancing - consider reducing principal';
            }
            
            // Add warnings from backend
            if (validationResponse.validation?.warnings) {
                Object.assign(errors, validationResponse.validation.warnings);
            }
            
            setValidationErrors(errors);
        } catch (error) {
            console.error('Error validating refinancing:', error);
            // Fallback to local validation if API fails
            if (rate && (rate < 5 || rate > 30)) {
                errors.rate = 'Interest rate must be between 5% and 30%';
            }
            if (duration && (duration < 6 || duration > 60)) {
                errors.duration = 'Duration must be between 6 and 60 months';
            }
            setValidationErrors(errors);
        } finally {
            setIsValidating(false);
        }
        
        return Object.keys(errors).length === 0;
    };
    
    const handleLoanChange = async (loanId) => {
        setSelectedLoan(loanId);
        if (loanId && newRate && newDuration) {
            await validateRefinancingTerms(loanId, parseFloat(newRate), parseInt(newDuration));
        }
    };

    const handleRateChange = async (value) => {
        setNewRate(value);
        if (selectedLoan && value) {
            await validateRefinancingTerms(selectedLoan, parseFloat(value), parseInt(newDuration));
        }
    };

    const handleDurationChange = async (value) => {
        setNewDuration(value);
        if (selectedLoan && value) {
            await validateRefinancingTerms(selectedLoan, parseFloat(newRate), parseInt(value));
        }
    };

    const handleRequestRefinancing = async (e) => {
        e.preventDefault();
        if (!selectedLoan || !newRate || !newDuration) return;
        
        await dispatch(requestRefinancing({
            loanId: selectedLoan,
            newInterestRate: parseFloat(newRate),
            newDurationMonths: parseInt(newDuration)
        }));
        
        setShowRequestForm(false);
        setSelectedLoan('');
        setNewRate('');
        setNewDuration('');
        dispatch(getRefinancingOpportunities());
    };

    const handleInvest = async (refinancingId, amount) => {
        await dispatch(investRefinancing({ refinancingId, amount }));
        dispatch(getRefinancingOpportunities());
    };

    const renderOpportunities = () => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {refinancingOpportunities?.map((opportunity) => (
                <div key={opportunity.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h4 className="font-semibold text-gray-900">Loan #{opportunity.loanId}</h4>
                            <p className="text-sm text-gray-500">{opportunity.borrowerName}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                            opportunity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            opportunity.status === 'active' ? 'bg-blue-100 text-blue-800' :
                            opportunity.status === 'funded' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                            {opportunity.status}
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p className="text-sm text-gray-500">Current Balance</p>
                            <p className="font-semibold text-gray-900">{formatCurrency(opportunity.currentBalance)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">New Rate</p>
                            <p className="font-semibold text-green-600">{formatPercentage(opportunity.newInterestRate)}</p>
                            <p className="text-xs text-gray-500 line-through">{formatPercentage(opportunity.originalRate)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">New Duration</p>
                            <p className="font-semibold text-gray-900">{opportunity.newDurationMonths} months</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Funding Progress</p>
                            <div className="mt-1">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{ width: `${(opportunity.raisedAmount / opportunity.targetAmount) * 100}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formatCurrency(opportunity.raisedAmount)} / {formatCurrency(opportunity.targetAmount)}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                        <div>
                            <p className="text-sm text-gray-500">Investors</p>
                            <p className="font-medium text-gray-900">{opportunity.investorCount}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Expires</p>
                            <p className="font-medium text-gray-900">{formatDate(opportunity.expiresAt)}</p>
                        </div>
                        {opportunity.status === 'active' && (
                            <button
                                onClick={() => handleInvest(opportunity.id, opportunity.targetAmount - opportunity.raisedAmount)}
                                disabled={isProcessing}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                Invest
                            </button>
                        )}
                    </div>
                </div>
            ))}
            
            {(!refinancingOpportunities || refinancingOpportunities.length === 0) && (
                <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500">No refinancing opportunities available</p>
                </div>
            )}
        </div>
    );

    const renderRequestForm = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Refinancing</h3>
            
            {/* RISK-04: Enhanced form with validation feedback */}
            <form onSubmit={handleRequestRefinancing} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Loan</label>
                    <select
                        value={selectedLoan}
                        onChange={(e) => handleLoanChange(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                    >
                        <option value="">Select a loan</option>
                        <option value="1">Loan #1 - {formatCurrency(50000)}</option>
                        <option value="2">Loan #2 - {formatCurrency(100000)}</option>
                        <option value="3">Loan #3 - {formatCurrency(75000)}</option>
                    </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Interest Rate (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={newRate}
                            onChange={(e) => handleRateChange(e.target.value)}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                validationErrors.rate ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="e.g., 12.5"
                            required
                        />
                        {validationErrors.rate && (
                            <p className="text-red-500 text-xs mt-1">{validationErrors.rate}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Duration (months)</label>
                        <input
                            type="number"
                            value={newDuration}
                            onChange={(e) => handleDurationChange(e.target.value)}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                validationErrors.duration ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="e.g., 24"
                            required
                        />
                        {validationErrors.duration && (
                            <p className="text-red-500 text-xs mt-1">{validationErrors.duration}</p>
                        )}
                    </div>
                </div>
                
                {/* RISK-05: Display risk assessment */}
                {riskAssessment && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Risk Assessment</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-gray-600">Default Probability:</span>
                                <span className={`ml-2 font-medium ${
                                    riskAssessment.defaultProbability > 30 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                    {riskAssessment.defaultProbability?.toFixed(1)}%
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600">LTV:</span>
                                <span className={`ml-2 font-medium ${
                                    riskAssessment.ltvPercentage > 70 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                    {riskAssessment.ltvPercentage?.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                        {(validationErrors.risk || validationErrors.ltv) && (
                            <div className="mt-2 text-red-600 text-sm">
                                {validationErrors.risk && <p>{validationErrors.risk}</p>}
                                {validationErrors.ltv && <p>{validationErrors.ltv}</p>}
                            </div>
                        )}
                    </div>
                )}
                
                {isValidating && (
                    <div className="flex items-center justify-center py-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                        <span className="text-gray-500">Validating...</span>
                    </div>
                )}
                
                <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Your request will be listed on the marketplace. New investors can participate to refinance your loan at the new terms.</p>
                </div>
                
                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={isProcessing || !selectedLoan || !newRate || !newDuration || isValidating || Object.keys(validationErrors).length > 0}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isProcessing ? 'Processing...' : 'Submit Request'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setShowRequestForm(false);
                            setValidationErrors({});
                            setRiskAssessment(null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );

    const renderHowItWorks = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">How Refinancing Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-xl font-bold text-blue-600">1</span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-2">Request Refinancing</h4>
                    <p className="text-sm text-gray-600">
                        Borrowers can request better terms when they're unable to meet current repayment obligations.
                    </p>
                </div>
                <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-xl font-bold text-blue-600">2</span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-2">New Investors Fund</h4>
                    <p className="text-sm text-gray-600">
                        New investors can purchase refinancing tokens to take over the loan at new terms.
                    </p>
                </div>
                <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-xl font-bold text-blue-600">3</span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-2">Loan Refinanced</h4>
                    <p className="text-sm text-gray-600">
                        Original lenders receive their principal, and the loan continues with new terms.
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Refinancing Marketplace</h1>
                        <p className="text-gray-600 mt-2">Invest in loan refinancing or request better terms</p>
                    </div>
                    <button
                        onClick={() => setShowRequestForm(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Request Refinancing
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('opportunities')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'opportunities'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Opportunities
                        </button>
                        <button
                            onClick={() => setActiveTab('how-it-works')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'how-it-works'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            How It Works
                        </button>
                    </nav>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'opportunities' && (
                            showRequestForm ? renderRequestForm() : renderOpportunities()
                        )}
                        {activeTab === 'how-it-works' && renderHowItWorks()}
                    </>
                )}
            </div>
        </div>
    );
};

export default Refinancing;
