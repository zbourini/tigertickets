/**
 * Client Controller - Business Logic for Client Operations
 * 
 * This module contains the business logic for handling client requests
 * including fetching events and processing ticket purchases.
 * It acts as an intermediary between routes and models.
 */

const clientModel = require('../models/clientModel');

/**
 * Get all events for client display
 * Handles the GET /api/events endpoint
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void} Sends JSON response with events or error
 */
async function getAllEvents(req, res) {
    try {
        console.log('Fetching all events for client display...');
        
        const events = await clientModel.getAllEvents();
        
        // Log the number of events found
        console.log(`Found ${events.length} events`);
        
        // Return successful response
        res.status(200).json({
            success: true,
            message: 'Events retrieved successfully',
            count: events.length,
            events: events
        });
        
    } catch (error) {
        console.error('Error in getAllEvents controller:', error.message);
        
        // Return error response
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve events',
            message: error.message
        });
    }
}

/**
 * Purchase tickets for a specific event
 * Handles the POST /api/events/:id/purchase endpoint
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Event ID from URL parameter
 * @param {number} [req.body.ticketCount] - Number of tickets to purchase (optional, defaults to 1)
 * @param {Object} res - Express response object
 * @returns {void} Sends JSON response with purchase result or error
 */
async function purchaseTickets(req, res) {
    try {
        const eventId = parseInt(req.params.id);
        const ticketCount = parseInt(req.body.ticketCount) || 1;
        
        // Input validation
        if (isNaN(eventId) || eventId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid event ID',
                message: 'Event ID must be a positive integer'
            });
        }
        
        if (isNaN(ticketCount) || ticketCount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid ticket count',
                message: 'Ticket count must be a positive integer'
            });
        }
        
        console.log(`Processing purchase for event ${eventId}, ${ticketCount} ticket(s)...`);
        
        // Process the purchase
        const result = await clientModel.purchaseTickets(eventId, ticketCount);
        
        console.log(`Purchase successful: ${result.message}`);
        
        // Return successful purchase response
        res.status(200).json({
            success: true,
            message: result.message,
            event: result.event,
            ticketsPurchased: result.ticketsPurchased
        });
        
    } catch (error) {
        console.error('Error in purchaseTickets controller:', error.message);
        
        // Determine appropriate status code based on error type
        let statusCode = 500;
        if (error.message.includes('not found')) {
            statusCode = 404;
        } else if (error.message.includes('Not enough tickets') || 
                   error.message.includes('Invalid')) {
            statusCode = 400;
        }
        
        res.status(statusCode).json({
            success: false,
            error: 'Purchase failed',
            message: error.message
        });
    }
}

/**
 * Get details for a specific event by ID
 * Handles the GET /api/events/:id endpoint
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Event ID from URL parameter
 * @param {Object} res - Express response object
 * @returns {void} Sends JSON response with event details or error
 */
async function getEventById(req, res) {
    try {
        const eventId = parseInt(req.params.id);
        
        // Input validation
        if (isNaN(eventId) || eventId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid event ID',
                message: 'Event ID must be a positive integer'
            });
        }
        
        console.log(`Fetching event details for ID: ${eventId}`);
        
        const event = await clientModel.getEventById(eventId);
        
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found',
                message: `Event with ID ${eventId} does not exist`
            });
        }
        
        console.log(`Found event: ${event.name}`);
        
        res.status(200).json({
            success: true,
            message: 'Event retrieved successfully',
            event: event
        });
        
    } catch (error) {
        console.error('Error in getEventById controller:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve event',
            message: error.message
        });
    }
}

module.exports = {
    getAllEvents,
    purchaseTickets,
    getEventById
};