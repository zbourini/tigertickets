/**
 * JWT Authentication Middleware
 * 
 * This middleware verifies JWT tokens from either cookies or Authorization header
 * and attaches the decoded user data to the request object.
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../controllers/authController');

/**
 * Middleware to authenticate JWT tokens
 * 
 * Checks for token in:
 * 1. HTTP-only cookie (auth_token)
 * 2. Authorization header (Bearer token)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function authenticateToken(req, res, next) {
    try {
        let token = null;
        
        // Check for token in cookie
        if (req.cookies && req.cookies.auth_token) {
            token = req.cookies.auth_token;
        }
        
        // Check for token in Authorization header (Bearer token)
        const authHeader = req.headers['authorization'];
        if (!token && authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // Remove 'Bearer ' prefix
        }
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'No authentication token provided'
            });
        }
        
        // Verify the token
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                // Check if token is expired
                if (err.name === 'TokenExpiredError') {
                    return res.status(401).json({
                        success: false,
                        error: 'Token expired',
                        message: 'Your session has expired. Please login again.',
                        expired: true
                    });
                }
                
                // Invalid token
                return res.status(403).json({
                    success: false,
                    error: 'Invalid token',
                    message: 'Authentication token is invalid'
                });
            }
            
            // Attach user data to request
            req.user = decoded;
            next();
        });
        
    } catch (error) {
        console.error('Error in authenticateToken middleware:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Unable to authenticate at this time'
        });
    }
}

/**
 * Optional authentication middleware
 * Similar to authenticateToken but doesn't return error if no token
 * Useful for routes that work with or without authentication
 */
function optionalAuth(req, res, next) {
    try {
        let token = null;
        
        if (req.cookies && req.cookies.auth_token) {
            token = req.cookies.auth_token;
        }
        
        const authHeader = req.headers['authorization'];
        if (!token && authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
        
        if (!token) {
            req.user = null;
            return next();
        }
        
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                req.user = null;
            } else {
                req.user = decoded;
            }
            next();
        });
        
    } catch (error) {
        console.error('Error in optionalAuth middleware:', error.message);
        req.user = null;
        next();
    }
}

module.exports = {
    authenticateToken,
    optionalAuth
};
