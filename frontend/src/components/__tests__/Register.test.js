/**
 * Register Component Tests
 * 
 * Tests for the Register component including form rendering,
 * input validation, password matching, and registration flow.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Register from '../Register';
import { setupFetchMock } from '../../testUtils';

describe('Register Component', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = setupFetchMock();
    // Suppress expected console errors during tests
    jest.spyOn(console, 'error').mockImplementation((msg) => {
      if (typeof msg === 'string' && (msg.includes('Registration error') || msg.includes('act(...)'))) return;
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
    test('renders registration form with all required elements', () => {
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      expect(screen.getByText(/Register for Tiger Tickets/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument();
    });

    test('renders switch to login link', () => {
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      expect(screen.getByText(/Already have an account/i)).toBeInTheDocument();
      expect(screen.getByText(/Login here/i)).toBeInTheDocument();
    });

    test('email input has correct type', () => {
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    test('password inputs have correct type', () => {
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      const passwordInput = screen.getByLabelText(/^Password$/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Form Input Handling', () => {
    test('updates email field when typing', () => {
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      fireEvent.change(emailInput, { target: { value: 'newuser@clemson.edu' } });
      
      expect(emailInput.value).toBe('newuser@clemson.edu');
    });

    test('updates password field when typing', () => {
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      const passwordInput = screen.getByLabelText(/^Password$/i);
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      
      expect(passwordInput.value).toBe('password123');
    });

    test('updates confirm password field when typing', () => {
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      
      expect(confirmPasswordInput.value).toBe('password123');
    });
  });

  describe('Email Validation', () => {
    test('shows error for invalid email format', async () => {
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/^Password$/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      const submitButton = screen.getByRole('button', { name: /Register/i });
      
      fireEvent.change(emailInput, { target: { value: 'invalidemail' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid email/i)).toBeInTheDocument();
      });
    });

    test('accepts valid email format', async () => {
      fetchMock.mockSuccess({ 
        user: { id: 1, email: 'test@clemson.edu' },
        token: 'mock-token'
      });
      
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/^Password$/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      const submitButton = screen.getByRole('button', { name: /Register/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    test('shows error for missing email', async () => {
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      const passwordInput = screen.getByLabelText(/^Password$/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      const submitButton = screen.getByRole('button', { name: /Register/i });
      
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid email|All fields are required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Password Validation', () => {
    test('shows error when password is too short', async () => {
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/^Password$/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      const submitButton = screen.getByRole('button', { name: /Register/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'short' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'short' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Password must be at least/i)).toBeInTheDocument();
      });
    });

    test('shows error when passwords do not match', async () => {
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/^Password$/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      const submitButton = screen.getByRole('button', { name: /Register/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password456' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
      });
    });

    test('accepts matching passwords with minimum length', async () => {
      fetchMock.mockSuccess({ 
        user: { id: 1, email: 'test@clemson.edu' },
        token: 'mock-token'
      });
      
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/^Password$/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      const submitButton = screen.getByRole('button', { name: /Register/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    test('shows error when password is missing', async () => {
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      const submitButton = screen.getByRole('button', { name: /Register/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/All fields are required|Password must be/i)).toBeInTheDocument();
      });
    });

    test('shows error when confirm password is missing', async () => {
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/^Password$/i);
      const submitButton = screen.getByRole('button', { name: /Register/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Passwords do not match|All fields are required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    test('calls API with correct data on submit', async () => {
      const mockOnRegisterSuccess = jest.fn();
      fetchMock.mockSuccess({ 
        user: { id: 1, email: 'newuser@clemson.edu' },
        token: 'mock-token'
      });
      
      render(<Register onRegisterSuccess={mockOnRegisterSuccess} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/^Password$/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      const submitButton = screen.getByRole('button', { name: /Register/i });
      
      fireEvent.change(emailInput, { target: { value: 'newuser@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:8001/api/auth/register',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'newuser@clemson.edu',
              password: 'password123'
            })
          })
        );
      });
    });

    test('calls onRegisterSuccess with user data on successful registration', async () => {
      const mockOnRegisterSuccess = jest.fn();
      const mockUser = { id: 1, email: 'newuser@clemson.edu' };
      const mockToken = 'mock-jwt-token';
      
      fetchMock.mockSuccess({ user: mockUser, token: mockToken });
      
      render(<Register onRegisterSuccess={mockOnRegisterSuccess} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/^Password$/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      const submitButton = screen.getByRole('button', { name: /Register/i });
      
      fireEvent.change(emailInput, { target: { value: 'newuser@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnRegisterSuccess).toHaveBeenCalledWith(mockUser, mockToken);
      });
    });

    test('shows error message when email already exists', async () => {
      fetchMock.mockError('Email already exists');
      
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/^Password$/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      const submitButton = screen.getByRole('button', { name: /Register/i });
      
      fireEvent.change(emailInput, { target: { value: 'existing@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Email already exists/i)).toBeInTheDocument();
      });
    });

    test('shows network error message on fetch failure', async () => {
      fetchMock.mockNetworkError();
      
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/^Password$/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      const submitButton = screen.getByRole('button', { name: /Register/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Network error|Failed to connect/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    test('disables submit button during registration', async () => {
      fetchMock.mockSuccess({ 
        user: { id: 1, email: 'test@clemson.edu' },
        token: 'mock-token'
      });
      
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/^Password$/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      const submitButton = screen.getByRole('button', { name: /Register/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      expect(submitButton).toBeDisabled();
    });

    test('shows loading text during submission', async () => {
      let resolveRegister;
      global.fetch = jest.fn(() => new Promise(resolve => {
        resolveRegister = resolve;
      }));
      
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/^Password$/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      const submitButton = screen.getByRole('button', { name: /Register/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Registering|Creating account/i)).toBeInTheDocument();
      });
      
      resolveRegister({
        json: async () => ({ 
          success: true, 
          user: { id: 1, email: 'test@clemson.edu' },
          token: 'mock-token'
        })
      });
    });

    test('re-enables button after registration completes', async () => {
      fetchMock.mockSuccess({ 
        user: { id: 1, email: 'test@clemson.edu' },
        token: 'mock-token'
      });
      
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/^Password$/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      const submitButton = screen.getByRole('button', { name: /Register/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Navigation', () => {
    test('calls onSwitchToLogin when login link clicked', () => {
      const mockOnSwitchToLogin = jest.fn();
      render(<Register onRegisterSuccess={jest.fn()} onSwitchToLogin={mockOnSwitchToLogin} />);
      
      const loginLink = screen.getByText(/Login here/i);
      fireEvent.click(loginLink);
      
      expect(mockOnSwitchToLogin).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('clears error message when user starts typing', async () => {
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/^Password$/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      const submitButton = screen.getByRole('button', { name: /Register/i });
      
      // Submit with mismatched passwords
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password456' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
      });
      
      // Start typing again
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      
      await waitFor(() => {
        expect(screen.queryByText(/Passwords do not match/i)).not.toBeInTheDocument();
      });
    });

    test('shows generic error on registration failure without specific message', async () => {
      fetchMock.mockError('');
      
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/^Password$/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      const submitButton = screen.getByRole('button', { name: /Register/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Registration failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('form inputs have proper labels', () => {
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    });

    test('submit button is keyboard accessible', () => {
      render(<Register onRegisterSuccess={jest.fn()} />);
      
      const submitButton = screen.getByRole('button', { name: /Register/i });
      expect(submitButton).toBeInTheDocument();
    });

    test('can submit form with Enter key', async () => {
      const mockOnRegisterSuccess = jest.fn();
      fetchMock.mockSuccess({ 
        user: { id: 1, email: 'test@clemson.edu' },
        token: 'mock-token'
      });
      
      render(<Register onRegisterSuccess={mockOnRegisterSuccess} />);
      
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/^Password$/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      
      fireEvent.change(emailInput, { target: { value: 'test@clemson.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.submit(emailInput.closest('form'));
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });
  });
});
