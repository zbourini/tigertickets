import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner Component', () => {
    test('renders loading spinner', () => {
        render(<LoadingSpinner />);
        
        const spinner = screen.getByTestId('loading-spinner');
        expect(spinner).toBeInTheDocument();
    });

    test('has appropriate aria-label for accessibility', () => {
        render(<LoadingSpinner />);
        
        const spinner = screen.getByLabelText(/loading/i);
        expect(spinner).toBeInTheDocument();
    });

    test('displays loading text', () => {
        render(<LoadingSpinner />);
        
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test('has role="status" for screen readers', () => {
        render(<LoadingSpinner />);
        
        const spinner = screen.getByRole('status');
        expect(spinner).toBeInTheDocument();
    });

    test('applies correct CSS classes for animation', () => {
        const { container } = render(<LoadingSpinner />);
        
        const spinner = container.querySelector('.spinner, .loading-spinner, [class*="spin"]');
        expect(spinner).toBeTruthy();
    });
});
