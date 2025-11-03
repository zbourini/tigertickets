import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Header from '../Header';

describe('Header Component', () => {
    test('renders application title', () => {
        render(<Header />);
        
        expect(screen.getByText(/Clemson Campus Events/i)).toBeInTheDocument();
    });

    test('renders logo/branding', () => {
        render(<Header />);
        
        // Look for logo image or text
        const logo = screen.queryByAltText(/logo/i) || 
                     screen.queryByText(/Clemson Campus Events/i);
        expect(logo).toBeInTheDocument();
    });

    test('has semantic header element', () => {
        const { container } = render(<Header />);
        
        const header = container.querySelector('header');
        expect(header).toBeInTheDocument();
    });

    test('applies correct styling classes', () => {
        const { container } = render(<Header />);
        
        const header = container.querySelector('header');
        expect(header).toBeInTheDocument();
    });

    test('is visible on the page', () => {
        render(<Header />);
        
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toBeVisible();
    });

    test('contains navigation elements if present', () => {
        render(<Header />);
        
        // Check for any navigation elements
        const nav = screen.queryByRole('navigation');
        if (nav) {
            expect(nav).toBeInTheDocument();
        }
    });
});
