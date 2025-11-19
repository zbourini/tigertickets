/**
 * Authentication Controller - Business Logic for User Authentication
 * 
 * This module contains the controller functions that handle HTTP requests
 * for user registration, login, logout, and token verification.
 * It includes input validation, JWT generation, and error handling.
 */

const jwt = require('jsonwebtoken');
const { 
    createUser, 
    findUserByEmailWithPassword, 
    findUserById,
    verifyPassword 
} = require('../models/userModel');

// JWT Secret - In production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'tiger-tickets-secret-key-change-in-production';
const JWT_EXPIRATION = '30m'; // 30 minutes

/**
 * Generate a JWT token for a user
 * 
 * @param {Object} user - User object
 * @param {number} user.id - User ID
 * @param {string} user.email - User email
 * @returns {string} JWT token
 */
function generateToken(user) {
    return jwt.sign(
        { 
            userId: user.id, 
            email: user.email 
        },
        JWT_SECRET,
        { 
            expiresIn: JWT_EXPIRATION 
        }
    );
}

/**
 * Register a new user
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing user data
 * @param {string} req.body.email - User email
 * @param {string} req.body.password - User password
 * @param {Object} res - Express response object
 * @returns {void} Sends JSON response with created user and token
 */
async function register(req, res) {
    try {
        const { email, password } = req.body;
        
        // Validate required fields
        const validationErrors = [];
        
        if (!email || !email.trim()) {
            validationErrors.push('Email is required');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            validationErrors.push('Invalid email format');
        }
        
        if (!password || !password.trim()) {
            validationErrors.push('Password is required');
        } else if (password.length < 6) {
            validationErrors.push('Password must be at least 6 characters long');
        }
        
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                message: 'Invalid input data provided',
                details: validationErrors
            });
        }
        
        // Create the user
        const newUser = await createUser({
            email: email.trim().toLowerCase(),
            password: password
        });
        
        // Generate JWT token
        const token = generateToken(newUser);
        
        // Set token in HTTP-only cookie
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 60 * 1000 // 30 minutes in milliseconds
        });
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: newUser,
            token: token // Also send in response body for in-memory storage option
        });
        
    } catch (error) {
        console.error('Error in register:', error.message);
        
        if (error.message === 'Email already exists') {
            return res.status(409).json({
                success: false,
                error: 'Conflict',
                message: 'Email already registered'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Internal server error while registering user',
            message: 'Unable to register user at this time'
        });
    }
}

/**
 * Login a user
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing login credentials
 * @param {string} req.body.email - User email
 * @param {string} req.body.password - User password
 * @param {Object} res - Express response object
 * @returns {void} Sends JSON response with user data and token
 */
async function login(req, res) {
    try {
        const { email, password } = req.body;
        
        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                message: 'Email and password are required'
            });
        }
        
        // Find user by email (with password hash)
        const user = await findUserByEmailWithPassword(email.trim().toLowerCase());
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication failed',
                message: 'Invalid email or password'
            });
        }
        
        // Verify password
        const isPasswordValid = await verifyPassword(password, user.password_hash);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Authentication failed',
                message: 'Invalid email or password'
            });
        }
        
        // Remove password hash from user object
        const { password_hash, ...userWithoutPassword } = user;
        
        // Generate JWT token
        const token = generateToken(userWithoutPassword);
        
        // Set token in HTTP-only cookie
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 60 * 1000 // 30 minutes
        });
        
        res.status(200).json({
            success: true,
            message: 'Login successful',
            user: userWithoutPassword,
            token: token // Also send in response body
        });
        
    } catch (error) {
        console.error('Error in login:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error while logging in',
            message: 'Unable to login at this time'
        });
    }
}

/**
 * Logout a user
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void} Sends JSON response confirming logout
 */
function logout(req, res) {
    try {
        // Clear the auth token cookie
        res.clearCookie('auth_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });
        
        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
        
    } catch (error) {
        console.error('Error in logout:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error while logging out',
            message: 'Unable to logout at this time'
        });
    }
}

/**
 * Verify the current user's token and return user data
 * 
 * @param {Object} req - Express request object (with user data from middleware)
 * @param {Object} res - Express response object
 * @returns {void} Sends JSON response with user data
 */
async function verifyToken(req, res) {
    try {
        // User data is attached by the auth middleware
        const userId = req.user.userId;
        
        // Fetch fresh user data from database
        const user = await findUserById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                message: 'User account no longer exists'
            });
        }
        
        res.status(200).json({
            success: true,
            user: user
        });
        
    } catch (error) {
        console.error('Error in verifyToken:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error while verifying token',
            message: 'Unable to verify token at this time'
        });
    }
}

module.exports = {
    register,
    login,
    logout,
    verifyToken,
    JWT_SECRET
};
