/**
 * Skeleton - Reusable skeleton loading components
 * Addresses NAV-03: No loading states for some async operations
 */

/**
 * Text skeleton - for loading text content
 */
export function SkeletonText({ lines = 1, className = '' }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <div 
                    key={i} 
                    className="h-4 bg-slate-200 rounded animate-pulse"
                    style={{ width: i === lines - 1 && lines > 1 ? '75%' : '100%' }}
                />
            ))}
        </div>
    );
}

/**
 * Card skeleton - for loading card content
 */
export function SkeletonCard({ className = '' }) {
    return (
        <div className={`bg-white rounded-xl border border-slate-200 p-6 ${className}`}>
            <div className="animate-pulse space-y-4">
                <div className="h-6 bg-slate-200 rounded w-1/3"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="h-20 bg-slate-100 rounded"></div>
            </div>
        </div>
    );
}

/**
 * Table row skeleton - for loading table rows
 */
export function SkeletonTableRow({ columns = 4, className = '' }) {
    return (
        <tr className={className}>
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="py-4 px-4">
                    <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
                </td>
            ))}
        </tr>
    );
}

/**
 * Table skeleton - for loading entire tables
 */
export function SkeletonTable({ rows = 5, columns = 4, className = '' }) {
    return (
        <div className={`overflow-hidden rounded-lg border border-slate-200 ${className}`}>
            <table className="w-full">
                <thead className="bg-slate-50">
                    <tr>
                        {Array.from({ length: columns }).map((_, i) => (
                            <th key={i} className="py-3 px-4 text-left">
                                <div className="h-4 bg-slate-200 rounded w-20 animate-pulse"></div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, i) => (
                        <SkeletonTableRow key={i} columns={columns} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/**
 * Stats card skeleton - for loading statistics cards
 */
export function SkeletonStatsCard({ className = '' }) {
    return (
        <div className={`bg-white rounded-xl border border-slate-200 p-6 ${className}`}>
            <div className="animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-slate-200 rounded w-32"></div>
            </div>
        </div>
    );
}

/**
 * Chart skeleton - for loading chart areas
 */
export function SkeletonChart({ className = '' }) {
    return (
        <div className={`bg-white rounded-xl border border-slate-200 p-6 ${className}`}>
            <div className="animate-pulse mb-6">
                <div className="h-6 bg-slate-200 rounded w-40"></div>
            </div>
            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <div className="w-10 h-4 bg-slate-200 rounded animate-pulse"></div>
                        <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-200 rounded-full" style={{ width: `${60 + Math.random() * 40}%` }}></div>
                        </div>
                        <div className="w-16 h-4 bg-slate-200 rounded animate-pulse"></div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Avatar skeleton - for loading user avatars
 */
export function SkeletonAvatar({ size = 'md', className = '' }) {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
        xl: 'w-24 h-24',
    };
    
    return (
        <div className={`${sizeClasses[size]} rounded-full bg-slate-200 animate-pulse ${className}`} />
    );
}

/**
 * Button skeleton - for loading buttons
 */
export function SkeletonButton({ className = '' }) {
    return (
        <div className={`h-10 bg-slate-200 rounded-lg animate-pulse ${className}`} />
    );
}

/**
 * Input skeleton - for loading form inputs
 */
export function SkeletonInput({ className = '' }) {
    return (
        <div className={`h-10 bg-slate-200 rounded-lg animate-pulse ${className}`} />
    );
}

/**
 * Generic skeleton wrapper
 */
export function Skeleton({ className = '' }) {
    return (
        <div className={`bg-slate-200 animate-pulse rounded ${className}`} />
    );
}

export default {
    SkeletonText,
    SkeletonCard,
    SkeletonTableRow,
    SkeletonTable,
    SkeletonStatsCard,
    SkeletonChart,
    SkeletonAvatar,
    SkeletonButton,
    SkeletonInput,
    Skeleton,
};
