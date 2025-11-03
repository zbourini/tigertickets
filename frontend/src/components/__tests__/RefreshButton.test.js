import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RefreshButton from '../RefreshButton';

describe('RefreshButton Component', () => {
    const mockOnRefresh = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders refresh button', () => {
        render(<RefreshButton onRefresh={mockOnRefresh} isLoading={false} />);
        
        const button = screen.getByRole('button', { name: /refresh/i });
        expect(button).toBeInTheDocument();
    });

    test('calls onRefresh when clicked', () => {
        render(<RefreshButton onRefresh={mockOnRefresh} isLoading={false} />);
        
        const button = screen.getByRole('button');
        fireEvent.click(button);
        
        expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    test('is disabled when loading', () => {
        render(<RefreshButton onRefresh={mockOnRefresh} isLoading={true} />);
        
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
    });

    test('is enabled when not loading', () => {
        render(<RefreshButton onRefresh={mockOnRefresh} isLoading={false} />);
        
        const button = screen.getByRole('button');
        expect(button).not.toBeDisabled();
    });

    test('shows loading state visually when loading', () => {
        render(<RefreshButton onRefresh={mockOnRefresh} isLoading={true} />);
        
        // Check for loading indicator or text
        expect(screen.getByRole('button')).toHaveTextContent(/refreshing|loading/i);
    });

    test('does not call onRefresh when disabled and clicked', () => {
        render(<RefreshButton onRefresh={mockOnRefresh} isLoading={true} />);
        
        const button = screen.getByRole('button');
        fireEvent.click(button);
        
        expect(mockOnRefresh).not.toHaveBeenCalled();
    });

    test('has appropriate accessibility label', () => {
        render(<RefreshButton onRefresh={mockOnRefresh} isLoading={false} />);
        
        const button = screen.getByRole('button');
        expect(button).toHaveAccessibleName();
    });
});
