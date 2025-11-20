import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

global.fetch = jest.fn();

describe('App Component - Integration Tests', () => {
    beforeEach(() => {
        fetch.mockClear();
        localStorage.clear();
        jest.clearAllMocks();
        
        // Suppress expected console warnings/errors during tests
        const originalWarn = console.warn;
        const originalError = console.error;
        
        jest.spyOn(console, 'warn').mockImplementation((msg, ...args) => {
            if (typeof msg === 'string' && (msg.includes('Speech recognition') || msg.includes('Invalid token'))) return;
            originalWarn(msg, ...args);
        });
        jest.spyOn(console, 'error').mockImplementation((msg, ...args) => {
            if (typeof msg === 'string' && (msg.includes('token expiration') || msg.includes('fetching events'))) return;
            originalError(msg, ...args);
        });
        
        // Mock localStorage for auth
        Storage.prototype.getItem = jest.fn((key) => {
            if (key === 'auth_token') return null;
            if (key === 'user') return null;
            return null;
        });
        Storage.prototype.setItem = jest.fn();
    });
    
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Authentication Flow', () => {
        test('shows login form when not authenticated', async () => {
            render(<App />);
            
            await waitFor(() => {
                expect(screen.getByText(/Login to Tiger Tickets/i)).toBeInTheDocument();
            });
            expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
        });

        test('can switch from login to register', async () => {
            render(<App />);
            
            await waitFor(() => {
                expect(screen.getByText(/Login to Tiger Tickets/i)).toBeInTheDocument();
            });
            
            const registerLink = screen.getByText(/Register here/i);
            fireEvent.click(registerLink);
            
            await waitFor(() => {
                expect(screen.getByText(/Register for Tiger Tickets/i)).toBeInTheDocument();
            });
        });

        test('can switch from register to login', async () => {
            render(<App />);
            
            await waitFor(() => {
                const registerLink = screen.getByText(/Register here/i);
                fireEvent.click(registerLink);
            });
            
            await waitFor(() => {
                expect(screen.getByText(/Register for Tiger Tickets/i)).toBeInTheDocument();
            });
            
            const loginLink = screen.getByText(/Login here/i);
            fireEvent.click(loginLink);
            
            await waitFor(() => {
                expect(screen.getByText(/Login to Tiger Tickets/i)).toBeInTheDocument();
            });
        });
    });

    describe('Authenticated Event Display', () => {
        test('fetches and displays events on mount when authenticated', async () => {
            // Mock authenticated state
            Storage.prototype.getItem = jest.fn((key) => {
                if (key === 'auth_token') return 'mock-token';
                if (key === 'user') return JSON.stringify({ id: 1, email: 'test@clemson.edu' });
                return null;
            });

            // Mock auth verification
            fetch.mockResolvedValueOnce({
                json: jest.fn().mockResolvedValue({
                    success: true,
                    user: { id: 1, email: 'test@clemson.edu' }
                })
            });

            // Mock events fetch
            fetch.mockResolvedValueOnce({
                json: jest.fn().mockResolvedValue({
                    success: true,
                    events: [
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
                    ]
                })
            });

            render(<App />);

            await waitFor(() => {
                expect(screen.getByText('Basketball Game')).toBeInTheDocument();
            }, { timeout: 3000 });

            expect(screen.getByText('Concert')).toBeInTheDocument();
        });

        test('shows error message on fetch failure when authenticated', async () => {
            // Mock authenticated state
            Storage.prototype.getItem = jest.fn((key) => {
                if (key === 'auth_token') return 'mock-token';
                if (key === 'user') return JSON.stringify({ id: 1, email: 'test@clemson.edu' });
                return null;
            });

            // Mock auth verification
            fetch.mockResolvedValueOnce({
                json: jest.fn().mockResolvedValue({
                    success: true,
                    user: { id: 1, email: 'test@clemson.edu' }
                })
            });

            // Mock events fetch failure
            fetch.mockRejectedValueOnce(new Error('Network error'));

            render(<App />);

            await waitFor(() => {
                expect(screen.getByText(/Failed to connect to the server/i)).toBeInTheDocument();
            }, { timeout: 3000 });
        });

        test('displays header with user info when authenticated', async () => {
            // Mock authenticated state
            Storage.prototype.getItem = jest.fn((key) => {
                if (key === 'auth_token') return 'mock-token';
                if (key === 'user') return JSON.stringify({ id: 1, email: 'test@clemson.edu' });
                return null;
            });

            // Mock auth verification
            fetch.mockResolvedValueOnce({
                json: jest.fn().mockResolvedValue({
                    success: true,
                    user: { id: 1, email: 'test@clemson.edu' }
                })
            });

            // Mock events fetch
            fetch.mockResolvedValueOnce({
                json: jest.fn().mockResolvedValue({
                    success: true,
                    events: []
                })
            });

            render(<App />);

            await waitFor(() => {
                expect(screen.getByText(/Clemson Campus Events/i)).toBeInTheDocument();
                expect(screen.getByText('test@clemson.edu')).toBeInTheDocument();
            }, { timeout: 3000 });
        });
    });

    describe('Ticket Purchase Flow (when authenticated)', () => {
        test('shows error message on failed purchase', async () => {
            // Mock authenticated state
            Storage.prototype.getItem = jest.fn((key) => {
                if (key === 'auth_token') return 'mock-token';
                if (key === 'user') return JSON.stringify({ id: 1, email: 'test@clemson.edu' });
                return null;
            });

            // Mock auth verification
            fetch.mockResolvedValueOnce({
                json: jest.fn().mockResolvedValue({
                    success: true,
                    user: { id: 1, email: 'test@clemson.edu' }
                })
            });

            // Mock events fetch
            fetch.mockResolvedValueOnce({
                json: jest.fn().mockResolvedValue({
                    success: true,
                    events: [
                        {
                            id: 1,
                            name: 'Concert',
                            date: '2025-12-20',
                            tickets_available: 100
                        }
                    ]
                })
            });

            render(<App />);

            await waitFor(() => {
                expect(screen.getByText('Concert')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Mock failed purchase
            fetch.mockResolvedValueOnce({
                json: jest.fn().mockResolvedValue({
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
    });
});


