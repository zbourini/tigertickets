import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

global.fetch = jest.fn();

describe('App Component - Integration Tests', () => {
    beforeEach(() => {
        fetch.mockClear();
    });

    test('fetches and displays events on mount', async () => {
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
            }
        ];

        fetch.mockResolvedValueOnce({
            json: async () => ({
                success: true,
                events: mockEvents
            })
        });

        render(<App />);

        // Should show loading initially
        expect(screen.getByText(/loading/i)).toBeInTheDocument();

        // Wait for events to load
        await waitFor(() => {
            expect(screen.getByText('Basketball Game')).toBeInTheDocument();
        });

        expect(screen.getByText('Concert')).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledWith('http://localhost:6001/api/events');
    });

    test('shows error message on fetch failure', async () => {
        fetch.mockRejectedValueOnce(new Error('Network error'));

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText(/Failed to connect to the server/i)).toBeInTheDocument();
        });
    });

    test('handles successful ticket purchase', async () => {
        const mockEvents = [
            {
                id: 1,
                name: 'Concert',
                date: '2025-12-20',
                tickets_available: 100
            }
        ];

        // Mock initial fetch
        fetch.mockResolvedValueOnce({
            json: async () => ({
                success: true,
                events: mockEvents
            })
        });

        render(<App />);

        // Wait for events to load
        await waitFor(() => {
            expect(screen.getByText('Concert')).toBeInTheDocument();
        });

        // Mock purchase response
        fetch.mockResolvedValueOnce({
            json: async () => ({
                success: true,
                event: {
                    id: 1,
                    name: 'Concert',
                    tickets_available: 99
                }
            })
        });

        // Click buy button
        const buyButton = screen.getByText(/Buy Ticket/i);
        fireEvent.click(buyButton);

        // Wait for success message
        await waitFor(() => {
            expect(screen.getByText(/Successfully purchased ticket/i)).toBeInTheDocument();
        });

        // Verify tickets decremented
        expect(screen.getByText(/99 tickets available/i)).toBeInTheDocument();
    });

    test('shows error message on failed purchase', async () => {
        const mockEvents = [
            {
                id: 1,
                name: 'Concert',
                date: '2025-12-20',
                tickets_available: 100
            }
        ];

        fetch.mockResolvedValueOnce({
            json: async () => ({
                success: true,
                events: mockEvents
            })
        });

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('Concert')).toBeInTheDocument();
        });

        // Mock failed purchase
        fetch.mockResolvedValueOnce({
            json: async () => ({
                success: false,
                message: 'Not enough tickets available'
            })
        });

        const buyButton = screen.getByText(/Buy Ticket/i);
        fireEvent.click(buyButton);

        await waitFor(() => {
            expect(screen.getByText(/Not enough tickets available/i)).toBeInTheDocument();
        });
    });

    test('disables button during purchase', async () => {
        const mockEvents = [
            {
                id: 1,
                name: 'Concert',
                date: '2025-12-20',
                tickets_available: 100
            }
        ];

        fetch.mockResolvedValueOnce({
            json: async () => ({
                success: true,
                events: mockEvents
            })
        });

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('Concert')).toBeInTheDocument();
        });

        // Mock slow purchase
        fetch.mockImplementationOnce(() => new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    json: async () => ({
                        success: true,
                        event: { id: 1, tickets_available: 99 }
                    })
                });
            }, 100);
        }));

        const buyButton = screen.getByText(/Buy Ticket/i);
        fireEvent.click(buyButton);

        // Button should show processing state
        expect(screen.getByText(/Processing.../i)).toBeInTheDocument();
    });

    test('refreshes events when refresh button clicked', async () => {
        const mockEvents = [
            {
                id: 1,
                name: 'Event 1',
                date: '2025-12-15',
                tickets_available: 100
            }
        ];

        // Initial fetch
        fetch.mockResolvedValueOnce({
            json: async () => ({
                success: true,
                events: mockEvents
            })
        });

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('Event 1')).toBeInTheDocument();
        });

        // Mock refresh fetch
        const updatedEvents = [
            {
                id: 1,
                name: 'Event 1',
                date: '2025-12-15',
                tickets_available: 95
            }
        ];

        fetch.mockResolvedValueOnce({
            json: async () => ({
                success: true,
                events: updatedEvents
            })
        });

        const refreshButton = screen.getByRole('button', { name: /refresh/i });
        fireEvent.click(refreshButton);

        await waitFor(() => {
            expect(screen.getByText(/95 tickets available/i)).toBeInTheDocument();
        });
    });

    test('updates local state after purchase without full refresh', async () => {
        const mockEvents = [
            {
                id: 1,
                name: 'Concert',
                date: '2025-12-20',
                tickets_available: 100
            }
        ];

        fetch.mockResolvedValueOnce({
            json: async () => ({
                success: true,
                events: mockEvents
            })
        });

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText(/100 tickets available/i)).toBeInTheDocument();
        });

        fetch.mockResolvedValueOnce({
            json: async () => ({
                success: true,
                event: {
                    id: 1,
                    tickets_available: 99
                }
            })
        });

        const buyButton = screen.getByText(/Buy Ticket/i);
        fireEvent.click(buyButton);

        await waitFor(() => {
            expect(screen.getByText(/99 tickets available/i)).toBeInTheDocument();
        });

        // Should not have called fetch again for event list
        expect(fetch).toHaveBeenCalledTimes(2); // Initial + purchase
    });

    test('clears success message after timeout', async () => {
        jest.useFakeTimers();

        const mockEvents = [
            {
                id: 1,
                name: 'Concert',
                date: '2025-12-20',
                tickets_available: 100
            }
        ];

        fetch.mockResolvedValueOnce({
            json: async () => ({
                success: true,
                events: mockEvents
            })
        });

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('Concert')).toBeInTheDocument();
        });

        fetch.mockResolvedValueOnce({
            json: async () => ({
                success: true,
                event: { id: 1, tickets_available: 99 }
            })
        });

        const buyButton = screen.getByText(/Buy Ticket/i);
        fireEvent.click(buyButton);

        await waitFor(() => {
            expect(screen.getByText(/Successfully purchased ticket/i)).toBeInTheDocument();
        });

        // Fast-forward time
        jest.advanceTimersByTime(3000);

        await waitFor(() => {
            expect(screen.queryByText(/Successfully purchased ticket/i)).not.toBeInTheDocument();
        });

        jest.useRealTimers();
    });

    test('handles multiple rapid purchase attempts', async () => {
        const mockEvents = [
            {
                id: 1,
                name: 'Concert',
                date: '2025-12-20',
                tickets_available: 100
            }
        ];

        fetch.mockResolvedValueOnce({
            json: async () => ({
                success: true,
                events: mockEvents
            })
        });

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('Concert')).toBeInTheDocument();
        });

        // Mock first purchase
        fetch.mockResolvedValueOnce({
            json: async () => ({
                success: true,
                event: { id: 1, tickets_available: 99 }
            })
        });

        const buyButton = screen.getByText(/Buy Ticket/i);
        fireEvent.click(buyButton);
        fireEvent.click(buyButton); // Second rapid click

        // Should only process once
        await waitFor(() => {
            expect(fetch).toHaveBeenCalledTimes(2); // Initial + one purchase
        });
    });

    test('renders header and all UI components', async () => {
        fetch.mockResolvedValueOnce({
            json: async () => ({
                success: true,
                events: []
            })
        });

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText(/Clemson Campus Events/i)).toBeInTheDocument();
        });

        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
});
