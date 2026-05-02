import PropTypes from 'prop-types';
import { Outlet } from 'react-router-dom';
import Header from '../common/Header';
import Footer from '../common/Footer';
import Breadcrumb from '../common/Breadcrumb';

function MainLayout() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
                {/* Breadcrumb navigation - NAV-01 */}
                <div className="container mx-auto px-4 pt-4">
                    <Breadcrumb />
                </div>
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}

MainLayout.propTypes = {
    children: PropTypes.node,
};

export default MainLayout;
