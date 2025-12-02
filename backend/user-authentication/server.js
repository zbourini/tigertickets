/**
 * User Authentication Service Server
 * 
 * This is the main server file for the Tiger Tickets authentication service.
 * It handles user registration, login, logout, and JWT token management
 * using the shared SQLite database.
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { initializeDatabase } = require('./setup');

const app = express();
const PORT = process.env.PORT || 8001;

// Import routes
const authRoutes = require('./routes/authRoutes');

// Middleware configuration
app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:6001", "http://localhost:5001"], 
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse cookies
app.use(cookieParser());

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// API routes
app.use(authRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        service: 'Tiger Tickets - User Authentication Service',
        status: 'running',
        version: '1.0.0',
        endpoints: [
            'POST /api/auth/register - Register a new user',
            'POST /api/auth/login - Login a user',
            'POST /api/auth/logout - Logout a user',
            'GET /api/auth/verify - Verify token and get current user',
            'GET /api/auth/me - Get current user data'
        ]
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Not found',
        message: `Route ${req.originalUrl} not found` 
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        success: false,
        error: 'Internal server error',
        message: err.message 
    });
});

// Initialize database and start server
async function startServer() {
    try {
        console.log('Initializing database...');
        await initializeDatabase();
        console.log('Database initialized successfully!');
        
        app.listen(PORT, () => {
            console.log(`\nUser Authentication Service running on port ${PORT}`);
            console.log(`Service URL: http://localhost:${PORT}`);
            console.log(`API Base: http://localhost:${PORT}/api/auth`);
            console.log('\nAvailable endpoints:');
            console.log('  POST   /api/auth/register');
            console.log('  POST   /api/auth/login');
            console.log('  POST   /api/auth/logout');
            console.log('  GET    /api/auth/verify');
            console.log('  GET    /api/auth/me');
            console.log('\n');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    // Start the server
    startServer();
}
module.exports = app;