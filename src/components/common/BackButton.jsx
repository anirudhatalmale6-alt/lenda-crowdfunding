import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * BackButton - Navigation component for returning to previous pages
 * Addresses NAV-02: Missing "Back" buttons in detail pages
 * 
 * @param {Object} props
 * @param {string} props.to - Custom destination (default: go back in history)
 * @param {string} props.label - Custom label text
 * @param {string} props.variant - Style variant: 'default' | 'outline' | 'ghost'
 */
function BackButton({ to, label = 'Back', variant = 'default', className = '' }) {
    const navigate = useNavigate();

    const handleClick = () => {
        if (to) {
            navigate(to);
        } else {
            navigate(-1);
        }
    };

    const baseClasses = 'inline-flex items-center gap-2 font-medium transition-colors';
    
    const variantClasses = {
        default: 'px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200',
        outline: 'px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50',
        ghost: 'text-slate-600 hover:text-slate-900',
    };

    return (
        <button
            onClick={handleClick}
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        >
            <ArrowLeft className="w-4 h-4" />
            {label}
        </button>
    );
}

export default BackButton;
