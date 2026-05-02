import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuthLayout from './AuthLayout';

const renderWithRouter = (ui) => {
    return render(ui, { wrapper: BrowserRouter });
};

describe('AuthLayout', () => {
    it('renders the layout structure correctly', () => {
        renderWithRouter(<AuthLayout />);

        // Check that the main layout elements exist
        expect(document.querySelector('.min-h-screen')).toBeInTheDocument();
        expect(document.querySelector('.bg-slate-50')).toBeInTheDocument();
    });

    it('renders the decorative side with branding', () => {
        renderWithRouter(<AuthLayout />);

        // Check for LENDA branding text in decorative side
        expect(screen.getByText('Welcome to LENDA')).toBeInTheDocument();
        expect(screen.getByText(/peer-to-peer lending platform/i)).toBeInTheDocument();
    });

    it('has proper CSS classes for responsive design', () => {
        renderWithRouter(<AuthLayout />);

        // Check for responsive classes
        const decorativeSide = document.querySelector('.hidden.lg\\:flex');
        expect(decorativeSide).toBeInTheDocument();
    });

    it('renders Outlet component', () => {
        renderWithRouter(<AuthLayout />);

        // Check that Outlet is rendered (should have a container for it)
        const outletContainer = document.querySelector('.flex-1');
        expect(outletContainer).toBeInTheDocument();
    });

    it('renders without crashing', () => {
        const { container } = renderWithRouter(<AuthLayout />);
        expect(container).toBeInTheDocument();
    });

    it('has correct propTypes', () => {
        expect(AuthLayout.propTypes).toBeDefined();
    });
});
