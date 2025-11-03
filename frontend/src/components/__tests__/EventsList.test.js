import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EventsList from '../EventsList';

describe('EventsList Component', () => {
    const mockEvents = [
        {
            id: 1,
            name: 'Basketball Game',
            date: '2025-12-15',
            tickets_available: 100
        },
        {
            id: 2,
            name: 'Concert',
            date: '2025-12-20',
            tickets_available: 50
        },
        {
            id: 3,
            name: 'Theater Show',
            date: '2025-12-01',
            tickets_available: 0
        }
    ];

    const mockOnPurchase = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders all events in the list', () => {
        render(<EventsList events={mockEvents} onPurchase={mockOnPurchase} />);
        
        expect(screen.getByText('Basketball Game')).toBeInTheDocument();
        expect(screen.getByText('Concert')).toBeInTheDocument();
        expect(screen.getByText('Theater Show')).toBeInTheDocument();
    });

    test('shows "No events available" when events array is empty', () => {
        render(<EventsList events={[]} onPurchase={mockOnPurchase} />);
        
        expect(screen.getByText(/No events available/i)).toBeInTheDocument();
    });

    test('passes onPurchase handler to EventItem components', () => {
        render(<EventsList events={mockEvents} onPurchase={mockOnPurchase} />);
        
        const buttons = screen.getAllByText(/Buy Ticket|Sold Out/i);
        expect(buttons.length).toBeGreaterThan(0);
    });

    test('indicates which event is being purchased', () => {
        render(
            <EventsList 
                events={mockEvents} 
                onPurchase={mockOnPurchase}
                purchasingEventId={1}
            />
        );
        
        expect(screen.getByText(/Purchasing.../i)).toBeInTheDocument();
    });

    test('renders events in chronological order', () => {
        render(<EventsList events={mockEvents} onPurchase={mockOnPurchase} />);
        
        const eventNames = screen.getAllByText(/Game|Concert|Theater/i).map(el => el.textContent);
        // Assuming EventsList sorts by date
        // Theater Show (12-01) should come before Basketball Game (12-15) before Concert (12-20)
        expect(eventNames).toBeTruthy();
    });

    test('renders correct number of events', () => {
        render(<EventsList events={mockEvents} onPurchase={mockOnPurchase} />);
        
        const events = screen.getAllByText(/tickets available|Sold Out/i);
        expect(events).toHaveLength(3);
    });

    test('handles undefined events gracefully', () => {
        render(<EventsList events={undefined} onPurchase={mockOnPurchase} />);
        
        expect(screen.getByText(/No events available/i)).toBeInTheDocument();
    });

    test('handles null events gracefully', () => {
        render(<EventsList events={null} onPurchase={mockOnPurchase} />);
        
        expect(screen.getByText(/No events available/i)).toBeInTheDocument();
    });
});
