/**
 * Admin Routes - REST API Endpoints for Event Management
 * 
 * This module defines the REST API routes for the admin service.
 * It provides endpoints for creating, reading, and updating events
 * following RESTful design principles.
 */

const express = require('express');
const router = express.Router();
const { 
    listEvents, 
    addEvent, 
    getEvent, 
    updateEventById 
} = require('../controllers/adminController');

// GET /api/admin/events - Get all events
router.get('/events', listEvents);

// POST /api/admin/events - Create a new event
router.post('/events', addEvent);

// GET /api/admin/events/:id - Get a specific event by ID
router.get('/events/:id', getEvent);

// PUT /api/admin/events/:id - Update a specific event
router.put('/events/:id', updateEventById);

module.exports = router;