import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Header from '../Header';
import { renderWithAuth, createMockAuthContext } from '../../testUtils';
import AuthContext from '../../context/AuthContext';

describe('Header Component', () => {
    describe('Authenticated User', () => {
        test('renders application title', () => {
            const mockAuthContext = createMockAuthContext({ isAuthenticated: true });
            
            render(
                <AuthContext.Provider value={mockAuthContext}>
                    <Header />
                </AuthContext.Provider>
            );
            
            expect(screen.getByText(/Clemson Campus Events/i)).toBeInTheDocument();
        });

        test('renders description text', () => {
            const mockAuthContext = createMockAuthContext({ isAuthenticated: true });
            
            render(
                <AuthContext.Provider value={mockAuthContext}>
                    <Header />
                </AuthContext.Provider>
            );
            
            expect(screen.getByText(/Browse and purchase tickets/i)).toBeInTheDocument();
        });

        test('displays user email when authenticated', () => {
            const mockAuthContext = createMockAuthContext({ 
                isAuthenticated: true,
                user: { email: 'test@clemson.edu' }
            });
            
            render(
                <AuthContext.Provider value={mockAuthContext}>
                    <Header />
                </AuthContext.Provider>
            );
            
            expect(screen.getByText('test@clemson.edu')).toBeInTheDocument();
            expect(screen.getByText(/Logged in as:/i)).toBeInTheDocument();
        });

        test('displays logout button when authenticated', () => {
            const mockAuthContext = createMockAuthContext({ isAuthenticated: true });
            
            render(
                <AuthContext.Provider value={mockAuthContext}>
                    <Header />
                </AuthContext.Provider>
            );
            
            expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
        });

        test('calls logout when logout button clicked and confirmed', async () => {
            const mockLogout = jest.fn();
            const mockAuthContext = createMockAuthContext({ 
                isAuthenticated: true,
                logout: mockLogout
            });
            
            // Mock window.confirm to return true
            global.confirm = jest.fn(() => true);
            
            render(
                <AuthContext.Provider value={mockAuthContext}>
                    <Header />
                </AuthContext.Provider>
            );
            
            const logoutButton = screen.getByRole('button', { name: /Logout/i });
            fireEvent.click(logoutButton);
            
            await waitFor(() => {
                expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to logout?');
                expect(mockLogout).toHaveBeenCalled();
            });
        });

        test('does not call logout when logout is cancelled', async () => {
            const mockLogout = jest.fn();
            const mockAuthContext = createMockAuthContext({ 
                isAuthenticated: true,
                logout: mockLogout
            });
            
            // Mock window.confirm to return false
            global.confirm = jest.fn(() => false);
            
            render(
                <AuthContext.Provider value={mockAuthContext}>
                    <Header />
                </AuthContext.Provider>
            );
            
            const logoutButton = screen.getByRole('button', { name: /Logout/i });
            fireEvent.click(logoutButton);
            
            await waitFor(() => {
                expect(global.confirm).toHaveBeenCalled();
                expect(mockLogout).not.toHaveBeenCalled();
            });
        });
    });

    describe('Unauthenticated User', () => {
        test('renders application title when not authenticated', () => {
            const mockAuthContext = createMockAuthContext({ 
                isAuthenticated: false,
                user: null
            });
            
            render(
                <AuthContext.Provider value={mockAuthContext}>
                    <Header />
                </AuthContext.Provider>
            );
            
            expect(screen.getByText(/Clemson Campus Events/i)).toBeInTheDocument();
        });

        test('does not display user info when not authenticated', () => {
            const mockAuthContext = createMockAuthContext({ 
                isAuthenticated: false,
                user: null
            });
            
            render(
                <AuthContext.Provider value={mockAuthContext}>
                    <Header />
                </AuthContext.Provider>
            );
            
            expect(screen.queryByText(/Logged in as:/i)).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /Logout/i })).not.toBeInTheDocument();
        });

        test('does not display logout button when not authenticated', () => {
            const mockAuthContext = createMockAuthContext({ 
                isAuthenticated: false,
                user: null
            });
            
            render(
                <AuthContext.Provider value={mockAuthContext}>
                    <Header />
                </AuthContext.Provider>
            );
            
            expect(screen.queryByRole('button', { name: /Logout/i })).not.toBeInTheDocument();
        });
    });

    describe('Accessibility and Structure', () => {
        test('has semantic header element', () => {
            const mockAuthContext = createMockAuthContext({ isAuthenticated: true });
            
            const { container } = render(
                <AuthContext.Provider value={mockAuthContext}>
                    <Header />
                </AuthContext.Provider>
            );
            
            const header = container.querySelector('header');
            expect(header).toBeInTheDocument();
        });

        test('heading is visible on the page', () => {
            const mockAuthContext = createMockAuthContext({ isAuthenticated: true });
            
            render(
                <AuthContext.Provider value={mockAuthContext}>
                    <Header />
                </AuthContext.Provider>
            );
            
            const heading = screen.getByRole('heading', { level: 1 });
            expect(heading).toBeVisible();
        });

        test('applies correct CSS classes', () => {
            const mockAuthContext = createMockAuthContext({ isAuthenticated: true });
            
            const { container } = render(
                <AuthContext.Provider value={mockAuthContext}>
                    <Header />
                </AuthContext.Provider>
            );
            
            const header = container.querySelector('header');
            expect(header).toHaveClass('app-header');
        });

        test('logout button has proper accessibility attributes', () => {
            const mockAuthContext = createMockAuthContext({ isAuthenticated: true });
            
            render(
                <AuthContext.Provider value={mockAuthContext}>
                    <Header />
                </AuthContext.Provider>
            );
            
            const logoutButton = screen.getByRole('button', { name: /Logout/i });
            expect(logoutButton).toHaveAttribute('title', 'Logout');
        });
    });
});
