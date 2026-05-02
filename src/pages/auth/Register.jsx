import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { register, loginWithGoogle, clearError } from '../../store/slices/authSlice';
import { registerSchema, validateForm } from '../../utils/validation';

function Register() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isLoading, error } = useSelector((state) => state.auth);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'lender', // lender, borrower, both
        agreeTerms: false,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        // Clear error for this field
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
        if (error) dispatch(clearError());
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate form with Zod
        const validationErrors = validateForm(registerSchema, formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const { confirmPassword, agreeTerms, ...registerData } = formData;
        const result = await dispatch(register(registerData));
        if (!result.error) {
            // Redirect borrowers to onboarding wizard
            if (formData.role === 'borrower' || formData.role === 'both') {
                navigate('/borrower-onboarding');
            } else {
                navigate('/dashboard');
            }
        }
    };

    const passwordRequirements = [
        { met: formData.password.length >= 8, text: 'At least 8 characters' },
        { met: /[A-Z]/.test(formData.password), text: 'One uppercase letter' },
        { met: /[a-z]/.test(formData.password), text: 'One lowercase letter' },
        { met: /[0-9]/.test(formData.password), text: 'One number' },
    ];

    const handleGoogleSignup = async () => {
        if (error) dispatch(clearError());
        const result = await dispatch(loginWithGoogle(formData.role));
        if (!result.error) {
            if (formData.role === 'borrower' || formData.role === 'both') {
                navigate('/borrower-onboarding');
            } else {
                navigate('/dashboard');
            }
        }
    };

    return (
        <div>
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h1>
                <p className="text-slate-600">Join the LENDA P2P lending platform</p>
            </div>

            {(error || Object.keys(errors).length > 0) && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error || Object.values(errors)[0]}
                </div>
            )}

            <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">Google sign-up</p>
                <p className="mt-1 text-xs text-slate-500">Dev mode uses the selected role to create a mocked Google session.</p>
                <button
                    type="button"
                    onClick={handleGoogleSignup}
                    disabled={isLoading}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60"
                >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">G</span>
                    Sign up with Google
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                        Full Name
                    </label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`input-field ${errors.name ? 'border-red-500' : ''}`}
                        placeholder="John Doe"
                    />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                    )}
                </div>

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                        Email Address
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                        placeholder="you@example.com"
                    />
                    {errors.email && (
                        <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                    )}
                </div>

                <div>
                    <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-2">
                        I want to
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { value: 'lender', label: 'Lend', desc: 'Earn interest' },
                            { value: 'borrower', label: 'Borrow', desc: 'Get funded' },
                            { value: 'both', label: 'Both', desc: 'Do both' },
                        ].map((option) => (
                            <label
                                key={option.value}
                                className={`cursor-pointer border-2 rounded-lg p-3 text-center transition-colors ${formData.role === option.value
                                    ? 'border-primary-500 bg-primary-50'
                                    : 'border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="role"
                                    value={option.value}
                                    checked={formData.role === option.value}
                                    onChange={handleChange}
                                    className="sr-only"
                                />
                                <div className="font-medium text-slate-900">{option.label}</div>
                                <div className="text-xs text-slate-500">{option.desc}</div>
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                        Password
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className={`input-field pr-10 ${errors.password ? 'border-red-500' : ''}`}
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                    {errors.password && (
                        <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                    )}
                    <div className="mt-2 grid grid-cols-2 gap-2">
                        {passwordRequirements.map((req, index) => (
                            <div
                                key={index}
                                className={`flex items-center gap-1 text-xs ${req.met ? 'text-emerald-600' : 'text-slate-400'
                                    }`}
                            >
                                {req.met ? <Check className="w-3 h-3" /> : <span className="w-3 h-3" />}
                                {req.text}
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                        Confirm Password
                    </label>
                    <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`input-field ${errors.confirmPassword ? 'border-red-500' : ''}`}
                        placeholder="••••••••"
                    />
                    {errors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
                    )}
                </div>

                <label className={`flex items-start ${errors.agreeTerms ? 'border-red-500 rounded-lg p-2' : ''}`}>
                    <input
                        type="checkbox"
                        name="agreeTerms"
                        checked={formData.agreeTerms}
                        onChange={handleChange}
                        className="mt-1 w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-slate-600">
                        I agree to the{' '}
                        <Link to="/terms" className="text-primary-600 hover:text-primary-700">
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy" className="text-primary-600 hover:text-primary-700">
                            Privacy Policy
                        </Link>
                    </span>
                </label>
                {errors.agreeTerms && (
                    <p className="text-sm text-red-500">{errors.agreeTerms}</p>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Creating account...
                        </>
                    ) : (
                        'Create Account'
                    )}
                </button>

                <div className="text-center text-sm text-slate-600">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                        Sign in
                    </Link>
                </div>
            </form>
        </div>
    );
}

export default Register;
