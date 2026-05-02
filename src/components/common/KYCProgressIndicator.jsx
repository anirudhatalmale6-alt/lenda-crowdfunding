import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-hot-toast';
import { updateKYCStatus } from '../../store/slices/authSlice';

/**
 * KYCProgressIndicator - UX-004: Multi-step KYC progress UI during onboarding
 * Shows the progress of KYC verification with step-by-step guidance
 */
function KYCProgressIndicator({ compact = false, onComplete }) {
    const dispatch = useDispatch();
    const { user, kycStatus } = useSelector((state) => state.auth);
    
    const steps = [
        {
            id: 'basic_info',
            title: 'Basic Information',
            description: 'Personal details and contact info',
            icon: 'user',
        },
        {
            id: 'identity_verification',
            title: 'Identity Verification',
            description: 'Upload government ID',
            icon: 'id-card',
        },
        {
            id: 'address_verification',
            title: 'Address Verification',
            description: 'Proof of residence',
            icon: 'home',
        },
        {
            id: 'financial_info',
            title: 'Financial Information',
            description: 'Income and investment experience',
            icon: 'wallet',
        },
        {
            id: 'review',
            title: 'Review & Submit',
            description: 'Verify all information',
            icon: 'check',
        },
    ];

    const getCurrentStepIndex = () => {
        const statusMap = {
            not_started: -1,
            basic_info: 0,
            identity_verification: 1,
            address_verification: 2,
            financial_info: 3,
            review: 4,
            verified: 5,
        };
        return statusMap[kycStatus?.status] ?? -1;
    };

    const currentStepIndex = getCurrentStepIndex();
    const progressPercentage = Math.min(100, ((currentStepIndex + 1) / steps.length) * 100);

    const getStepStatus = (index) => {
        if (index < currentStepIndex) return 'completed';
        if (index === currentStepIndex) return 'current';
        return 'pending';
    };

    const getIcon = (iconName, status) => {
        const iconClass = status === 'completed' ? 'text-white' : 'text-gray-500';
        
        switch (iconName) {
            case 'user':
                return (
                    <svg className={`w-5 h-5 ${iconClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                );
            case 'id-card':
                return (
                    <svg className={`w-5 h-5 ${iconClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                );
            case 'home':
                return (
                    <svg className={`w-5 h-5 ${iconClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                );
            case 'wallet':
                return (
                    <svg className={`w-5 h-5 ${iconClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                );
            case 'check':
                return (
                    <svg className={`w-5 h-5 ${iconClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            default:
                return null;
        }
    };

    // If KYC is complete, show success state
    if (kycStatus?.status === 'verified') {
        if (compact) {
            return (
                <div className="flex items-center gap-2 text-emerald-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-sm font-medium">KYC Verified</span>
                </div>
            );
        }
        
        return (
            <div className="card p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-semibold text-emerald-800">Verification Complete</h3>
                        <p className="text-sm text-emerald-600">Your identity has been verified successfully.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Compact view (for header/sidebar)
    if (compact) {
        return (
            <div className="flex items-center gap-3">
                <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">KYC Progress</span>
                        <span className="font-medium text-gray-900">{Math.round(progressPercentage)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                            className="bg-emerald-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>
                {currentStepIndex < steps.length && (
                    <span className="text-xs text-gray-500">
                        Step {currentStepIndex + 1}/{steps.length}
                    </span>
                )}
            </div>
        );
    }

    // Full view
    return (
        <div className="card p-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Complete Your Verification</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Please complete all steps to access full platform features
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-600">{Math.round(progressPercentage)}%</p>
                    <p className="text-xs text-gray-500">Complete</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
            </div>

            {/* Steps */}
            <div className="space-y-4">
                {steps.map((step, index) => {
                    const status = getStepStatus(index);
                    
                    return (
                        <div 
                            key={step.id}
                            className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${
                                status === 'current' ? 'bg-emerald-50 border border-emerald-200' :
                                status === 'completed' ? 'bg-gray-50' :
                                'bg-white border border-gray-100'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                status === 'completed' ? 'bg-emerald-500' :
                                status === 'current' ? 'bg-emerald-100' :
                                'bg-gray-200'
                            }`}>
                                {status === 'completed' ? (
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    getIcon(step.icon, status)
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className={`font-medium ${
                                    status === 'completed' ? 'text-gray-500' :
                                    status === 'current' ? 'text-emerald-800' :
                                    'text-gray-700'
                                }`}>
                                    {step.title}
                                </h3>
                                <p className="text-sm text-gray-500">{step.description}</p>
                            </div>
                            {status === 'completed' && (
                                <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                            {status === 'current' && (
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                                    In Progress
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* CTA */}
            {currentStepIndex < steps.length && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <p className="text-sm font-medium text-amber-800">Complete verification to unlock:</p>
                            <ul className="text-xs text-amber-700 mt-1 space-y-1">
                                <li>• Full investment capabilities</li>
                                <li>• Borrowing privileges</li>
                                <li>• Token trading on secondary market</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default KYCProgressIndicator;
