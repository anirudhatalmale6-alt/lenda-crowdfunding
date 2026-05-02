import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { login, loginWithGoogle, clearError } from '../../store/slices/authSlice';
import { loginSchema, validateForm, getErrorMessage } from '../../utils/validation';

function Login() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isLoading, error } = useSelector((state) => state.auth);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false,
    });
    const [googleRole, setGoogleRole] = useState('borrower');
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
        const validationErrors = validateForm(loginSchema, formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const result = await dispatch(login(formData));
        if (!result.error) {
            navigate('/dashboard');
        }
    };

    const handleGoogleAuth = async () => {
        if (error) dispatch(clearError());
        const result = await dispatch(loginWithGoogle(googleRole));
        if (!result.error) {
            navigate('/dashboard');
        }
    };

    return (
        <div>
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h1>
                <p className="text-slate-600">Sign in to your LENDA account</p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                </div>
            )}

            <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-medium text-slate-900">Google sign-in</p>
                        <p className="text-xs text-slate-500">Dev mode uses a mocked Google account and selected role.</p>
                    </div>
                    <select
                        value={googleRole}
                        onChange={(e) => setGoogleRole(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                        <option value="borrower">Borrower</option>
                        <option value="lender">Lender</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={isLoading}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60"
                >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">G</span>
                    Continue with Google
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                </div>

                <div className="flex items-center justify-between">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            name="rememberMe"
                            checked={formData.rememberMe}
                            onChange={handleChange}
                            className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-slate-600">Remember me</span>
                    </label>
                    <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
                        Forgot password?
                    </Link>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Signing in...
                        </>
                    ) : (
                        'Sign In'
                    )}
                </button>

                <div className="text-center text-sm text-slate-600">
                    Don&apos;t have an account?{' '}
                    <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                        Create one
                    </Link>
                </div>
            </form>

            {/* Demo Credentials */}
            <div className="mt-8 p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 text-center mb-2">Demo Credentials</p>
                <div className="grid grid-cols-1 gap-2 text-xs">
                    <div>
                        <span className="text-slate-500">Borrower:</span>
                        <div className="font-mono text-slate-700">testuser@lenda.com</div>
                    </div>
                    <div>
                        <span className="text-slate-500">Lender:</span>
                        <div className="font-mono text-slate-700">lender@lenda.com</div>
                    </div>
                    <div>
                        <span className="text-slate-500">Admin:</span>
                        <div className="font-mono text-slate-700">admin@lenda.com</div>
                    </div>
                </div>
                <p className="text-xs text-slate-400 text-center mt-2">Password: password123</p>
            </div>
        </div>
    );
}

export default Login;
