/**
 * Client Routes - API Routes for Client Service
 * 
 * This module defines all the API routes for the client service.
 * It handles routing for event viewing and ticket purchasing operations.
 * 
 * Routes:
 * - GET /events: Get all events
 * - GET /events/:id: Get specific event by ID
 * - POST /events/:id/purchase: Purchase tickets for an event
 */

const express = require('express');
const router = express.Router();

// Import controllers
const clientController = require('../controllers/clientController');

/**
 * @route   GET /api/events
 * @desc    Get all events for client display
 * @access  Public
 */
router.get('/events', clientController.getAllEvents);

/**
 * @route   GET /api/events/:id
 * @desc    Get specific event by ID
 * @access  Public
 * @param   {string} id - Event ID
 */
router.get('/events/:id', clientController.getEventById);

/**
 * @route   POST /api/events/:id/purchase
 * @desc    Purchase tickets for a specific event
 * @access  Public
 * @param   {string} id - Event ID
 * @body    {number} [ticketCount] - Number of tickets to purchase (optional, defaults to 1)
 */
router.post('/events/:id/purchase', clientController.purchaseTickets);

module.exports = router;