import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminRoute from './AdminRoute';

const renderWithRouter = (ui) => {
    return render(ui, { wrapper: BrowserRouter });
};

describe('AdminRoute', () => {
    const mockChildren = <div data-testid="admin-content">Admin Content</div>;

    it('renders children when user is admin', () => {
        renderWithRouter(
            <AdminRoute isAuthenticated={true} user={{ role: 'admin' }}>
                {mockChildren}
            </AdminRoute>
        );

        expect(screen.getByTestId('admin-content')).toBeInTheDocument();
    });

    it('redirects to login when not authenticated', () => {
        renderWithRouter(
            <AdminRoute isAuthenticated={false} user={{ role: 'admin' }}>
                {mockChildren}
            </AdminRoute>
        );

        expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    });

    it('redirects to dashboard when user is not admin', () => {
        renderWithRouter(
            <AdminRoute isAuthenticated={true} user={{ role: 'borrower' }}>
                {mockChildren}
            </AdminRoute>
        );

        expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    });

    it('redirects to dashboard when user role is undefined', () => {
        renderWithRouter(
            <AdminRoute isAuthenticated={true} user={{}}>
                {mockChildren}
            </AdminRoute>
        );

        expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    });

    it('has correct propTypes', () => {
        expect(AdminRoute.propTypes).toBeDefined();
    });
});
