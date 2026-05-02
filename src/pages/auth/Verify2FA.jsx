import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Loader2 } from 'lucide-react';
import { verify2FA } from '../../store/slices/authSlice';
import { verify2FASchema, validateForm } from '../../utils/validation';

function Verify2FA() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrors({});

        // Validate with Zod
        const validationErrors = validateForm(verify2FASchema, { code });
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setIsLoading(false);
            return;
        }

        try {
            const result = await dispatch(verify2FA({ code, userId: 'temp' }));
            if (!result.error) {
                navigate('/dashboard');
            } else {
                setErrors({ code: 'Invalid verification code' });
            }
        } catch (err) {
            setErrors({ code: 'Invalid verification code' });
        }
        setIsLoading(false);
    };

    return (
        <div>
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-2xl">🔐</span>
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Two-Factor Authentication</h1>
                <p className="text-slate-600">Enter the 6-digit code from your authenticator app</p>
            </div>

            {errors.code && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {errors.code}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-2">
                        Verification Code
                    </label>
                    <input
                        type="text"
                        id="code"
                        value={code}
                        onChange={(e) => {
                            setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                            if (errors.code) setErrors({});
                        }}
                        className={`input-field text-center text-2xl tracking-widest ${errors.code ? 'border-red-500' : ''}`}
                        placeholder="000000"
                        maxLength={6}
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading || code.length !== 6}
                    className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Verifying...
                        </>
                    ) : (
                        'Verify'
                    )}
                </button>

                <div className="text-center">
                    <Link to="/login" className="text-sm text-primary-600 hover:text-primary-700">
                        Back to Login
                    </Link>
                </div>
            </form>

            <div className="mt-8 p-4 bg-slate-50 rounded-lg text-center">
                <p className="text-xs text-slate-500">
                    Demo code: 123456
                </p>
            </div>
        </div>
    );
}

export default Verify2FA;
