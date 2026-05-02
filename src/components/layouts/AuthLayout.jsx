import PropTypes from 'prop-types';
import { Outlet } from 'react-router-dom';

function AuthLayout() {
    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Left Side - Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <Outlet />
                </div>
            </div>

            {/* Right Side - Decorative */}
            <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary-600 to-primary-800 items-center justify-center p-12">
                <div className="text-center text-white">
                    <div className="flex items-center justify-center mx-auto mb-8">
                        <img src="/lenda-logo.png" alt="LENDA" className="h-24 w-auto" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Welcome to LENDA</h2>
                    <p className="text-primary-100 text-lg max-w-md">
                        Your trusted peer-to-peer lending platform. Connect with borrowers,
                        invest in loans, and grow your wealth securely.
                    </p>
                </div>
            </div>
        </div>
    );
}

AuthLayout.propTypes = {
    children: PropTypes.node,
};

export default AuthLayout;
