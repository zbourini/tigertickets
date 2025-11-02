/**
 * LLM Service Server
 *
 * This is the main server file for the Tiger Tickets LLM service.
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 7001;

// Import routes
const llmRoutes = require('./routes/llmRoutes');

// Middleware configuration
app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:5001"], // Allow frontend and admin service connections
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', llmRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not found',
        message: `Route ${req.originalUrl} not found` 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`LLM service running on port ${PORT}`);
    console.log(`LLM API: http://localhost:${PORT}/api/llm/parse`);
});

module.exports = app;