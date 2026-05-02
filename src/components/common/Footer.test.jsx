import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Footer from './Footer';

const renderWithRouter = (ui) => {
    return render(ui, { wrapper: BrowserRouter });
};

describe('Footer', () => {
    it('renders the LENDA logo', () => {
        renderWithRouter(<Footer />);
        expect(screen.getByText('LENDA')).toBeInTheDocument();
    });

    it('renders company description', () => {
        renderWithRouter(<Footer />);
        expect(screen.getByText(/peer-to-peer lending platform/i)).toBeInTheDocument();
    });

    it('renders social media links', () => {
        renderWithRouter(<Footer />);

        // Check for social media icons (Facebook, Twitter, Instagram, Linkedin)
        const facebookLink = document.querySelector('a[href="https://facebook.com"]');
        const twitterLink = document.querySelector('a[href="https://twitter.com"]');
        const instagramLink = document.querySelector('a[href="https://instagram.com"]');
        const linkedinLink = document.querySelector('a[href="https://linkedin.com"]');

        expect(facebookLink).toBeInTheDocument();
        expect(twitterLink).toBeInTheDocument();
        expect(instagramLink).toBeInTheDocument();
        expect(linkedinLink).toBeInTheDocument();
    });

    it('renders quick links section', () => {
        renderWithRouter(<Footer />);

        expect(screen.getByText('Quick Links')).toBeInTheDocument();
        expect(screen.getByText('Browse Loans')).toBeInTheDocument();
        expect(screen.getByText('Recovery Marketplace')).toBeInTheDocument();
        expect(screen.getByText('Escrow Service')).toBeInTheDocument();
        expect(screen.getByText('Create Account')).toBeInTheDocument();
    });

    it('renders contact section', () => {
        renderWithRouter(<Footer />);

        expect(screen.getByText('Contact Us')).toBeInTheDocument();
        expect(screen.getByText('support@lenda.com')).toBeInTheDocument();
        expect(screen.getByText('+1 (555) 123-4567')).toBeInTheDocument();
        expect(screen.getByText('New York, NY 10001')).toBeInTheDocument();
    });

    it('renders copyright notice with current year', () => {
        renderWithRouter(<Footer />);

        const currentYear = new Date().getFullYear();
        expect(screen.getByText(new RegExp(`© ${currentYear} LENDA`))).toBeInTheDocument();
    });

    it('renders footer links (Privacy, Terms, Cookies)', () => {
        renderWithRouter(<Footer />);

        expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
        expect(screen.getByText('Terms of Service')).toBeInTheDocument();
        expect(screen.getByText('Cookie Policy')).toBeInTheDocument();
    });

    it('has proper footer element', () => {
        renderWithRouter(<Footer />);

        const footer = document.querySelector('footer.bg-slate-900');
        expect(footer).toBeInTheDocument();
    });

    it('renders footer with correct layout classes', () => {
        renderWithRouter(<Footer />);

        // Check for grid layout
        const gridContainer = document.querySelector('.grid.grid-cols-1');
        expect(gridContainer).toBeInTheDocument();
    });

    it('quick links have correct paths', () => {
        renderWithRouter(<Footer />);

        const loansLink = screen.getByText('Browse Loans').closest('a');
        expect(loansLink).toHaveAttribute('href', '/loans');

        const marketplaceLink = screen.getByText('Recovery Marketplace').closest('a');
        expect(marketplaceLink).toHaveAttribute('href', '/marketplace');

        const escrowLink = screen.getByText('Escrow Service').closest('a');
        expect(escrowLink).toHaveAttribute('href', '/escrow');

        const registerLink = screen.getByText('Create Account').closest('a');
        expect(registerLink).toHaveAttribute('href', '/register');
    });

    it('social links have correct target and rel attributes', () => {
        renderWithRouter(<Footer />);

        const facebookLink = document.querySelector('a[href="https://facebook.com"]');
        expect(facebookLink).toHaveAttribute('target', '_blank');
        expect(facebookLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
});
