/**
 * Admin Service Server
 * 
 * This is the main server file for the Tiger Tickets admin service.
 * It handles event management operations including creating new events
 * and updating event information in the shared SQLite database.
 * 
 */

const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./setup');

const app = express();

// Import routes
const adminRoutes = require('./routes/adminRoutes');

// Middleware configuration
app.use(cors({
    origin: "http://localhost:6001", // Allow frontend and other services
    credentials: true
}));

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (simple)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// API routes
endpoints = [
    'GET /',
    'GET /api/admin/events',
    'GET /api/admin/events/:id',
    'POST /api/admin/events',
    'PUT /api/admin/events/:id'
]

app.use(adminRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Tiger Tickets Admin Service',
        endpoints: endpoints
    });
});

// 404 handler for undefined routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Route ${req.method} ${req.url} not found`,
        availableEndpoints: endpoints
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    
    res.status(err.status || 500).json({
        success: false,
        error: 'Internal Server Error',
        message: err.message || 'An unexpected error occurred'
    });
});

// Server configuration
const PORT = 5001;

/**
 * Initialize database and start server
 */
async function startServer() {
    try {
        console.log('Initializing database...');
        await initializeDatabase();
        console.log('Database initialization completed successfully!');
        
        // Start the server
        app.listen(PORT, () => {
            console.log('\nTiger Tickets Admin Service Started Successfully!');
            console.log(`Server running at: http://localhost:${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
            console.log(`API endpoints: http://localhost:${PORT}/api/admin/events`);
            console.log(`Started at: ${new Date().toISOString()}\n`);
        });
        
    } catch (error) {
        console.error('Failed to start server:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM. Shutting down gracefully...');
    process.exit(0);
});

// Start the server
if (require.main === module) {
    startServer();
}

module.exports = app;