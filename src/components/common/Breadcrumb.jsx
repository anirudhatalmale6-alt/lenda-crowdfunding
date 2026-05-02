import { Link } from 'react-router-dom';

/**
 * Breadcrumb - UX-005: Breadcrumb navigation component for admin panels
 * Provides hierarchical navigation with customizable paths
 */
function Breadcrumb({ paths = [], className = '' }) {
    if (!paths || paths.length === 0) return null;

    return (
        <nav className={`flex items-center text-sm ${className}`} aria-label="Breadcrumb">
            <ol className="flex items-center flex-wrap gap-1">
                {/* Home Link */}
                <li className="flex items-center">
                    <Link 
                        to="/admin" 
                        className="text-gray-500 hover:text-gray-700 transition-colors flex items-center"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    </Link>
                </li>

                {paths.map((path, index) => {
                    const isLast = index === paths.length - 1;
                    const isActive = path.active || isLast;

                    return (
                        <li key={index} className="flex items-center">
                            {/* Separator */}
                            <svg 
                                className="w-4 h-4 text-gray-400 mx-1" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>

                            {/* Breadcrumb Item */}
                            {isActive ? (
                                <span className="text-gray-900 font-medium truncate max-w-[200px]" title={path.label}>
                                    {path.icon && (
                                        <span className="inline-flex items-center mr-1">
                                            {path.icon}
                                        </span>
                                    )}
                                    {path.label}
                                </span>
                            ) : (
                                <Link 
                                    to={path.href} 
                                    className="text-gray-500 hover:text-gray-700 transition-colors truncate max-w-[200px]"
                                    title={path.label}
                                >
                                    {path.icon && (
                                        <span className="inline-flex items-center mr-1">
                                            {path.icon}
                                        </span>
                                    )}
                                    {path.label}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

/**
 * AdminBreadcrumb - Specialized breadcrumb for admin pages
 * Pre-configured with common admin paths
 */
function AdminBreadcrumb({ currentPage, parentPage, grandparentPage, className = '' }) {
    const paths = [];

    if (grandparentPage) {
        paths.push({
            label: grandparentPage,
            href: `/admin/${grandparentPage.toLowerCase().replace(/\s+/g, '-')}`
        });
    }

    if (parentPage) {
        paths.push({
            label: parentPage,
            href: `/admin/${parentPage.toLowerCase().replace(/\s+/g, '-')}`
        });
    }

    if (currentPage) {
        paths.push({
            label: currentPage,
            active: true
        });
    }

    return <Breadcrumb paths={paths} className={className} />;
}

export { Breadcrumb, AdminBreadcrumb };
export default Breadcrumb;
