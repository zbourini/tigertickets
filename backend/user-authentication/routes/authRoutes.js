/**
 * Authentication Routes - REST API Endpoints for User Authentication
 * 
 * This module defines the REST API routes for the authentication service.
 * It provides endpoints for registration, login, logout, and token verification.
 */

const express = require('express');
const router = express.Router();
const { 
    register, 
    login, 
    logout, 
    verifyToken 
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// POST /api/auth/register - Register a new user
router.post('/register', register);

// POST /api/auth/login - Login a user
router.post('/login', login);

// POST /api/auth/logout - Logout a user
router.post('/logout', logout);

// GET /api/auth/verify - Verify token and get current user
router.get('/verify', authenticateToken, verifyToken);

// GET /api/auth/me - Get current user (alias for verify)
router.get('/me', authenticateToken, verifyToken);

module.exports = router;
