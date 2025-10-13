/**
 * Client Service Server
 * 
 * This is the main server file for the Tiger Tickets client service.
 * It handles client-facing operations including fetching event listings
 * and processing ticket purchases from the shared SQLite database.
 * 
 * The server runs on port 6001 and provides APIs for:
 * - GET /api/events: Retrieve all available events
 * - POST /api/events/:id/purchase: Purchase tickets for an event
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 6001;

// Import routes
const clientRoutes = require('./routes/clientRoutes');

// Middleware configuration
app.use(cors({
    origin: "http://localhost:5001", // Allow frontend connections
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', clientRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Not found',
        message: `Route ${req.originalUrl} not found` 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Client service running on port ${PORT}`);
    console.log(`Events API: http://localhost:${PORT}/api/events`);
});

module.exports = app;