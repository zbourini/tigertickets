const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// Import Microservices
const adminService = require('./admin-service/server');
const clientService = require('./client-service/server');
const llmDrivenBookingService = require('./llm-driven-booking/server');
const userAuthService = require('./user-authentication/server');

// Middleware configuration
app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:6001", "http://localhost:5001"], 
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON request bodies
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// API routes
app.use('/api/admin', adminService);
app.use('/api/client', clientService);
app.use('/api/llm', llmDrivenBookingService);
app.use('/api/auth', userAuthService);

// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        service: 'Tiger Tickets - Backend Service',
        status: 'running',
        version: '1.0.0',
        timestamp: new Date().toISOString()
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

// Start the server
app.listen(PORT, () => {
    console.log(`\nBackend Service running on port ${PORT}`);
});

module.exports = app;
