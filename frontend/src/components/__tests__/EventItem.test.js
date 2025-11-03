import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EventItem from '../EventItem';

describe('EventItem Component', () => {
    const mockEvent = {
        id: 1,
        name: 'Basketball Game',
        date: '2025-12-15',
        tickets_available: 100
    };

    const mockOnPurchase = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders event name', () => {
        render(<EventItem event={mockEvent} onPurchase={mockOnPurchase} />);
        
        expect(screen.getByText('Basketball Game')).toBeInTheDocument();
    });

    test('renders event date', () => {
        render(<EventItem event={mockEvent} onPurchase={mockOnPurchase} />);
        
        const dateElement = screen.getByText(/Date:/i).closest('p');
        expect(dateElement).toBeInTheDocument();
        const timeElement = dateElement.querySelector('time');
        expect(timeElement).toHaveAttribute('datetime', '2025-12-15');
    });

    test('renders tickets available count', () => {
        render(<EventItem event={mockEvent} onPurchase={mockOnPurchase} />);
        
        expect(screen.getByText(/100 tickets available/i)).toBeInTheDocument();
    });

    test('renders "Buy Ticket" button when tickets available', () => {
        render(<EventItem event={mockEvent} onPurchase={mockOnPurchase} />);
        
        const button = screen.getByText(/Buy Ticket/i);
        expect(button).toBeInTheDocument();
        expect(button).not.toBeDisabled();
    });

    test('disables button when no tickets available', () => {
        const soldOutEvent = { ...mockEvent, tickets_available: 0 };
        render(<EventItem event={soldOutEvent} onPurchase={mockOnPurchase} />);
        
        const button = screen.getByRole('button', { name: /Buy ticket/i });
        expect(button).toBeDisabled();
        expect(button).toHaveTextContent(/Sold Out/i);
    });

    test('calls onPurchase with correct event ID when button clicked', () => {
        render(<EventItem event={mockEvent} onPurchase={mockOnPurchase} />);
        
        const button = screen.getByText(/Buy Ticket/i);
        fireEvent.click(button);
        
        expect(mockOnPurchase).toHaveBeenCalledTimes(1);
        expect(mockOnPurchase).toHaveBeenCalledWith(1, 'Basketball Game');
    });

    test('shows "Processing..." state when purchasing', () => {
        render(
            <EventItem 
                event={mockEvent} 
                onPurchase={mockOnPurchase}
                isPurchasing={true}
            />
        );
        
        expect(screen.getByText(/Processing.../i)).toBeInTheDocument();
    });

    test('disables button when purchasing', () => {
        render(
            <EventItem 
                event={mockEvent} 
                onPurchase={mockOnPurchase}
                isPurchasing={true}
            />
        );
        
        const button = screen.getByRole('button', { name: /Buy ticket/i });
        expect(button).toBeDisabled();
        expect(button).toHaveTextContent(/Processing.../i);
    });

    test('formats date correctly', () => {
        const event = { ...mockEvent, date: '2025-01-01' };
        render(<EventItem event={event} onPurchase={mockOnPurchase} />);
        
        // Date should be in the datetime attribute
        const timeElement = screen.getByText(/12\/31\/2024/i);
        expect(timeElement).toBeInTheDocument();
        expect(timeElement).toHaveAttribute('datetime', '2025-01-01');
    });

    test('handles very long event names', () => {
        const longNameEvent = {
            ...mockEvent,
            name: 'The Annual International Basketball Championship Tournament Finals'
        };
        render(<EventItem event={longNameEvent} onPurchase={mockOnPurchase} />);
        
        expect(screen.getByRole('heading', { name: /The Annual International Basketball Championship Tournament Finals/i }))
            .toBeInTheDocument();
    });

    test('displays singular "ticket" when only 1 available', () => {
        const oneTicketEvent = { ...mockEvent, tickets_available: 1 };
        render(<EventItem event={oneTicketEvent} onPurchase={mockOnPurchase} />);
        
        // Check the aria-label or sr-only text for singular ticket
        expect(screen.getByLabelText(/1 ticket remaining/i)).toBeInTheDocument();
    });

    test('has correct accessibility attributes', () => {
        render(<EventItem event={mockEvent} onPurchase={mockOnPurchase} />);
        
        const button = screen.getByRole('button', { name: /Buy Ticket/i });
        expect(button).toBeInTheDocument();
    });
});
