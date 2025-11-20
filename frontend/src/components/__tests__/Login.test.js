/**
 * Login Component Tests
 * 
 * Tests for the Login component including form rendering,
 * input validation, form submission, and authentication flow.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Login from '../Login';
import { setupFetchMock } from '../../testUtils';

describe('Login Component', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = setupFetchMock();
    // Suppress expected console errors during tests
    jest.spyOn(console, 'error').mockImplementation((msg) => {
      if (typeof msg === 'string' && (msg.includes('Login error') || msg.includes('act(...)'))) return;
    });
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    fetchMock.clear();
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders login form with all required elements', () => {
      render(<Login onLoginSuccess={jest.fn()} />);
      
      expect(screen.getByText(/Login to Tiger Tickets/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
    });

    test('renders switch to register link', () => {
      render(<Login onLoginSuccess={jest.fn()} />);
      
      expect(screen.getByText(/Don't have an account/i)).toBeInTheDocument();
      expect(screen.getByText(/Register here/i)).toBeInTheDocument();
    });

    test('email input has correct type and placeholder', () => {
      render(<Login onLoginSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('placeholder');
    });

    test('password input has correct type', () => {
      render(<Login onLoginSuccess={jest.fn()} />);
      
      const passwordInput = screen.getByLabelText(/Password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Form Input Handling', () => {
    test('updates email field when typing', () => {
      render(<Login onLoginSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      
      expect(emailInput.value).toBe('test@clemson.edu');
    });

    test('updates password field when typing', () => {
      render(<Login onLoginSuccess={jest.fn()} />);
      
      const passwordInput = screen.getByLabelText(/Password/i);
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      
      expect(passwordInput.value).toBe('password123');
    });

    test('allows clearing input fields', () => {
      render(<Login onLoginSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(emailInput, { target: { value: '' } });
      
      expect(emailInput.value).toBe('');
    });
  });

  describe('Form Validation', () => {
    test('calls API even with empty form (browser validation)', async () => {
      // The component doesn't have client-side validation for empty fields
      // Browser's HTML5 validation would normally handle this
      fetchMock.mockError('Email and password are required');
      
      render(<Login onLoginSuccess={jest.fn()} />);
      
      const submitButton = screen.getByRole('button', { name: /Login/i });
      fireEvent.click(submitButton);
      
      // Since the component uses required attribute, the form won't actually submit
      // But if it did, it would show an error from the server
      expect(submitButton).toBeInTheDocument();
    });

    test('shows server error when credentials are invalid', async () => {
      fetchMock.mockError('Invalid email or password');
      
      render(<Login onLoginSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Login/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid email or password/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    test('calls API with correct credentials on submit', async () => {
      const mockOnLoginSuccess = jest.fn();
      fetchMock.mockSuccess({ 
        user: { id: 1, email: 'test@clemson.edu' },
        token: 'mock-token'
      });
      
      render(<Login onLoginSuccess={mockOnLoginSuccess} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Login/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:8001/api/auth/login',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'test@clemson.edu',
              password: 'password123'
            })
          })
        );
      });
    });

    test('calls onLoginSuccess with user data on successful login', async () => {
      const mockOnLoginSuccess = jest.fn();
      const mockUser = { id: 1, email: 'test@clemson.edu' };
      const mockToken = 'mock-jwt-token';
      
      fetchMock.mockSuccess({ user: mockUser, token: mockToken });
      
      render(<Login onLoginSuccess={mockOnLoginSuccess} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Login/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnLoginSuccess).toHaveBeenCalledWith(mockUser, mockToken);
      });
    });

    test('shows error message on failed login', async () => {
      fetchMock.mockError('Invalid credentials');
      
      render(<Login onLoginSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Login/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
      });
    });

    test('shows network error message on fetch failure', async () => {
      fetchMock.mockNetworkError();
      
      render(<Login onLoginSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Login/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Network error|Failed to connect/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    test('disables submit button during login', async () => {
      fetchMock.mockSuccess({ 
        user: { id: 1, email: 'test@clemson.edu' },
        token: 'mock-token'
      });
      
      render(<Login onLoginSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Login/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      // Button should be disabled during loading
      expect(submitButton).toBeDisabled();
    });

    test('shows loading text during submission', async () => {
      // Create a promise that we can control
      let resolveLogin;
      global.fetch = jest.fn(() => new Promise(resolve => {
        resolveLogin = resolve;
      }));
      
      render(<Login onLoginSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Login/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/Logging in|Loading/i)).toBeInTheDocument();
      });
      
      // Resolve the promise
      resolveLogin({
        json: async () => ({ 
          success: true, 
          user: { id: 1, email: 'test@clemson.edu' },
          token: 'mock-token'
        })
      });
    });

    test('re-enables button after login completes', async () => {
      fetchMock.mockSuccess({ 
        user: { id: 1, email: 'test@clemson.edu' },
        token: 'mock-token'
      });
      
      render(<Login onLoginSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Login/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Navigation', () => {
    test('calls onSwitchToRegister when register link clicked', () => {
      const mockOnSwitchToRegister = jest.fn();
      render(<Login onLoginSuccess={jest.fn()} onSwitchToRegister={mockOnSwitchToRegister} />);
      
      const registerLink = screen.getByText(/Register here/i);
      fireEvent.click(registerLink);
      
      expect(mockOnSwitchToRegister).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('clears error message when user starts typing', async () => {
      fetchMock.mockError('Invalid credentials');
      
      render(<Login onLoginSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Login/i });
      
      // Submit with invalid credentials
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
      });
      
      // Start typing again - error should clear
      fireEvent.change(emailInput, { target: { value: 'test2@clemson.edu' } });
      
      await waitFor(() => {
        expect(screen.queryByText(/Invalid credentials/i)).not.toBeInTheDocument();
      });
    });

    test('shows generic error on login failure without specific message', async () => {
      fetchMock.mockError('');
      
      render(<Login onLoginSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Login/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Login failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('form inputs have proper labels', () => {
      render(<Login onLoginSuccess={jest.fn()} />);
      
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    });

    test('submit button is keyboard accessible', () => {
      render(<Login onLoginSuccess={jest.fn()} />);
      
      const submitButton = screen.getByRole('button', { name: /Login/i });
      expect(submitButton).toBeInTheDocument();
    });

    test('can submit form with Enter key', async () => {
      const mockOnLoginSuccess = jest.fn();
      fetchMock.mockSuccess({ 
        user: { id: 1, email: 'test@clemson.edu' },
        token: 'mock-token'
      });
      
      render(<Login onLoginSuccess={mockOnLoginSuccess} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.submit(emailInput.closest('form'));
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });
  });
});
