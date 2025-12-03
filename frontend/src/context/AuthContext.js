/**
 * Authentication Context
 * 
 * This context provides authentication state and functions throughout the app.
 * It manages user login, logout, token storage, and token expiration handling.
 */

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import dotenv from 'dotenv';

// Init environment variables
dotenv.config();

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    /**
     * Load user from localStorage on mount
     */
    useEffect(() => {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setToken(storedToken);
                setUser(parsedUser);
                setIsAuthenticated(true);
                
                // Verify token is still valid
                verifyToken(storedToken);
            } catch (error) {
                console.error('Error parsing stored user:', error);
                logout();
            }
        }
        
        setLoading(false);
    }, []);

    /**
     * Verify token with backend
     */
    const verifyToken = useCallback(async (tokenToVerify) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_BASE_URL}/api/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${tokenToVerify || token}`
                },
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                setUser(data.user);
                setIsAuthenticated(true);
                localStorage.setItem('user', JSON.stringify(data.user));
            } else {
                // Token is invalid or expired
                if (data.expired) {
                    console.log('Token expired, logging out');
                }
                logout();
            }
        } catch (error) {
            console.error('Error verifying token:', error);
            // Don't logout on network errors, keep local state
        }
    }, [token]);

    /**
     * Login function
     */
    const login = useCallback((userData, authToken) => {
        setUser(userData);
        setToken(authToken);
        setIsAuthenticated(true);
        localStorage.setItem('auth_token', authToken);
        localStorage.setItem('user', JSON.stringify(userData));
    }, []);

    /**
     * Logout function
     */
    const logout = useCallback(async () => {
        try {
            // Call logout endpoint to clear HTTP-only cookie
            await fetch(`${process.env.REACT_APP_BASE_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Error calling logout endpoint:', error);
        }

        // Clear local state and storage
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
    }, []);

    /**
     * Get authorization header for API calls
     */
    const getAuthHeader = useCallback(() => {
        if (token) {
            return { 'Authorization': `Bearer ${token}` };
        }
        return {};
    }, [token]);

    /**
     * Check if token is expired (client-side check)
     * Note: This is a basic check. The real expiration is enforced by the backend.
     */
    const checkTokenExpiration = useCallback(() => {
        if (!token) return;

        try {
            // Decode JWT (basic decode without verification)
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.warn('Invalid token format');
                return;
            }
            const base64Url = parts[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(window.atob(base64));
            
            const expirationTime = payload.exp * 1000; // Convert to milliseconds
            const currentTime = Date.now();
            
            if (currentTime >= expirationTime) {
                console.log('Token has expired');
                logout();
            }
        } catch (error) {
            console.error('Error checking token expiration:', error);
        }
    }, [token, logout]);

    /**
     * Set up token expiration checker
     */
    useEffect(() => {
        if (!token || !isAuthenticated) return;

        // Check token expiration every minute
        const intervalId = setInterval(() => {
            checkTokenExpiration();
        }, 60000); // 60 seconds

        // Check immediately
        checkTokenExpiration();

        return () => clearInterval(intervalId);
    }, [token, isAuthenticated, checkTokenExpiration]);

    const value = {
        user,
        token,
        isAuthenticated,
        loading,
        login,
        logout,
        verifyToken,
        getAuthHeader
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Custom hook to use auth context
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
