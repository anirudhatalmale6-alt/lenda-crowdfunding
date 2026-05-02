import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { forgotPasswordSchema, validateForm } from '../../utils/validation';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errors, setErrors] = useState({});

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate with Zod
        const validationErrors = validateForm(forgotPasswordSchema, { email });
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsLoading(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setIsLoading(false);
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-2xl">✓</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Check Your Email</h1>
                <p className="text-slate-600 mb-6">
                    We&apos;ve sent password reset instructions to <strong>{email}</strong>
                </p>
                <Link to="/login" className="btn-primary">
                    Back to Sign In
                </Link>
            </div>
        );
    }

    return (
        <div>
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Forgot Password?</h1>
                <p className="text-slate-600">
                    Enter your email and we&apos;ll send you instructions to reset your password
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                        Email Address
                    </label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            if (errors.email) setErrors({});
                        }}
                        className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                        placeholder="you@example.com"
                    />
                    {errors.email && (
                        <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Sending...
                        </>
                    ) : (
                        'Send Reset Link'
                    )}
                </button>

                <div className="text-center">
                    <Link to="/login" className="text-sm text-primary-600 hover:text-primary-700">
                        Back to Sign In
                    </Link>
                </div>
            </form>
        </div>
    );
}

export default ForgotPassword;
