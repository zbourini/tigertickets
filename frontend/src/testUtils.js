/**
 * Test Utilities
 * 
 * Helper functions and mock providers for testing components
 * that depend on authentication context.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AuthProvider } from './context/AuthContext';

/**
 * Mock AuthContext value for testing
 * Provides a default authenticated state
 */
export const mockAuthContextValue = {
  user: { id: 1, email: 'test@clemson.edu' },
  token: 'mock-jwt-token',
  isAuthenticated: true,
  loading: false,
  login: jest.fn(),
  logout: jest.fn(),
  verifyToken: jest.fn(),
  getAuthHeader: jest.fn(() => ({ 'Authorization': 'Bearer mock-jwt-token' }))
};

/**
 * Mock AuthContext value for unauthenticated state
 */
export const mockUnauthenticatedContextValue = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  login: jest.fn(),
  logout: jest.fn(),
  verifyToken: jest.fn(),
  getAuthHeader: jest.fn(() => ({}))
};

/**
 * Mock AuthContext value for loading state
 */
export const mockLoadingContextValue = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  login: jest.fn(),
  logout: jest.fn(),
  verifyToken: jest.fn(),
  getAuthHeader: jest.fn(() => ({}))
};

/**
 * Custom render function that wraps components with AuthProvider
 * 
 * @param {JSX.Element} ui - Component to render
 * @param {Object} options - Additional render options
 * @returns {Object} Render result
 */
export const renderWithAuth = (ui, options = {}) => {
  return render(
    <AuthProvider>
      {ui}
    </AuthProvider>,
    options
  );
};

/**
 * Mock useAuth hook with custom values
 * 
 * @param {Object} overrides - Custom values to override defaults
 * @returns {Object} Mock auth context value
 */
export const createMockAuthContext = (overrides = {}) => {
  return {
    ...mockAuthContextValue,
    ...overrides
  };
};

/**
 * Setup mock for fetch API
 * Returns helper functions to mock different responses
 */
export const setupFetchMock = () => {
  global.fetch = jest.fn();
  
  return {
    mockSuccess: (data) => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true, ...data })
      });
    },
    
    mockError: (message = 'Error') => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({ success: false, message })
      });
    },
    
    mockNetworkError: () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
    },
    
    clear: () => {
      global.fetch.mockClear();
    }
  };
};

/**
 * Mock localStorage for testing
 */
export const mockLocalStorage = () => {
  const storage = {};
  
  return {
    getItem: jest.fn((key) => storage[key] || null),
    setItem: jest.fn((key, value) => {
      storage[key] = value;
    }),
    removeItem: jest.fn((key) => {
      delete storage[key];
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
    }),
    get data() {
      return { ...storage };
    }
  };
};

/**
 * Wait for async effects to complete
 */
export const waitForEffects = () => new Promise(resolve => setTimeout(resolve, 0));
