import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

const renderWithRouter = (ui, { route = '/' } = {}) => {
    window.history.pushState({}, 'Test', route);
    return render(ui, { wrapper: BrowserRouter });
};

describe('ProtectedRoute', () => {
    const mockChildren = <div data-testid="protected-content">Protected Content</div>;

    it('renders children when authenticated', () => {
        renderWithRouter(
            <ProtectedRoute isAuthenticated={true}>
                {mockChildren}
            </ProtectedRoute>
        );

        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('redirects to login when not authenticated', () => {
        renderWithRouter(
            <ProtectedRoute isAuthenticated={false}>
                {mockChildren}
            </ProtectedRoute>,
            { route: '/protected' }
        );

        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('has correct propTypes', () => {
        expect(ProtectedRoute.propTypes).toBeDefined();
    });
});
