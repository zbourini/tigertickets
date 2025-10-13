/**
 * Admin Controller - Business Logic for Event Management
 * 
 * This module contains the controller functions that handle HTTP requests
 * for event management operations. It includes input validation, error handling,
 * and proper HTTP response formatting.
 */

const { getEvents, createEvent, getEventById, updateEvent } = require('../models/adminModel');

/**
 * List all events
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void} Sends JSON response with events list
 */
async function listEvents(req, res) {
    try {
        const events = await getEvents();
        
        res.status(200).json({
            success: true,
            data: events,
            count: events.length
        });
        
    } catch (error) {
        console.error('Error in listEvents:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error while fetching events',
            message: 'Unable to retrieve events at this time'
        });
    }
}

/**
 * Create a new event
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing event data
 * @param {string} req.body.name - Event name
 * @param {string} req.body.date - Event date (YYYY-MM-DD format)
 * @param {number} req.body.tickets_available - Number of available tickets
 * @param {Object} res - Express response object
 * @returns {void} Sends JSON response with created event
 */
async function addEvent(req, res) {
    try {
        // Validate required fields
        const { name, date, tickets_available } = req.body;
        
        const validationErrors = validateEventData({ name, date, tickets_available });
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                message: 'Invalid input data provided',
                details: validationErrors
            });
        }
        
        // Create the event
        const newEvent = await createEvent({
            name: name.trim(),
            date,
            tickets_available: parseInt(tickets_available, 10)
        });
        
        res.status(201).json({
            success: true,
            data: newEvent,
            message: 'Event created successfully'
        });
        
    } catch (error) {
        console.error('Error in addEvent:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error while creating event',
            message: 'Unable to create event at this time'
        });
    }
}

/**
 * Get a single event by ID
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.id - Event ID
 * @param {Object} res - Express response object
 * @returns {void} Sends JSON response with event data
 */
async function getEvent(req, res) {
    try {
        const eventId = parseInt(req.params.id, 10);
        
        if (isNaN(eventId) || eventId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid event ID',
                message: 'Event ID must be a positive integer'
            });
        }
        
        const event = await getEventById(eventId);
        
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found',
                message: `No event found with ID ${eventId}`
            });
        }
        
        res.status(200).json({
            success: true,
            data: event
        });
        
    } catch (error) {
        console.error('Error in getEvent:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error while fetching event',
            message: 'Unable to retrieve event at this time'
        });
    }
}

/**
 * Update an existing event
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.id - Event ID
 * @param {Object} req.body - Request body containing update data
 * @param {Object} res - Express response object
 * @returns {void} Sends JSON response with updated event
 */
async function updateEventById(req, res) {
    try {
        const eventId = parseInt(req.params.id, 10);
        
        if (isNaN(eventId) || eventId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid event ID',
                message: 'Event ID must be a positive integer'
            });
        }
        
        const { name, date, tickets_available } = req.body;
        const updateData = {};
        
        // Only include provided fields in update
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid event name',
                    message: 'Event name must be a non-empty string'
                });
            }
            updateData.name = name.trim();
        }
        
        if (date !== undefined) {
            if (!isValidDate(date)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid date format',
                    message: 'Date must be in YYYY-MM-DD format'
                });
            }
            updateData.date = date;
        }
        
        if (tickets_available !== undefined) {
            const ticketCount = parseInt(tickets_available, 10);
            if (isNaN(ticketCount) || ticketCount < 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid ticket count',
                    message: 'Tickets available must be a non-negative integer'
                });
            }
            updateData.tickets_available = ticketCount;
        }
        
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No update data provided',
                message: 'At least one field (name, date, tickets_available) must be provided'
            });
        }
        
        const updatedEvent = await updateEvent(eventId, updateData);
        
        if (!updatedEvent) {
            return res.status(404).json({
                success: false,
                error: 'Event not found',
                message: `No event found with ID ${eventId}`
            });
        }
        
        res.status(200).json({
            success: true,
            data: updatedEvent,
            message: 'Event updated successfully'
        });
        
    } catch (error) {
        console.error('Error in updateEventById:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error while updating event',
            message: 'Unable to update event at this time'
        });
    }
}

/**
 * Validate event data for creation
 * 
 * @param {Object} eventData - Event data to validate
 * @param {string} eventData.name - Event name
 * @param {string} eventData.date - Event date
 * @param {number} eventData.tickets_available - Number of tickets
 * @returns {Array<string>} Array of validation error messages
 */
function validateEventData({ name, date, tickets_available }) {
    const errors = [];
    
    // Validate name
    if (!name) {
        errors.push('Event name is required');
    } else if (typeof name !== 'string') {
        errors.push('Event name must be a string');
    } else if (name.trim().length === 0) {
        errors.push('Event name cannot be empty');
    } else if (name.length > 255) {
        errors.push('Event name cannot exceed 255 characters');
    }
    
    // Validate date
    if (!date) {
        errors.push('Event date is required');
    } else if (!isValidDate(date)) {
        errors.push('Event date must be in YYYY-MM-DD format');
    } else if (new Date(date) < new Date().setHours(0, 0, 0, 0)) {
        errors.push('Event date cannot be in the past');
    }
    
    // Validate tickets_available
    if (tickets_available === undefined || tickets_available === null) {
        errors.push('Number of tickets available is required');
    } else {
        const ticketCount = parseInt(tickets_available, 10);
        if (isNaN(ticketCount)) {
            errors.push('Number of tickets must be a valid integer');
        } else if (ticketCount < 0) {
            errors.push('Number of tickets cannot be negative');
        } else if (ticketCount > 1000000) {
            errors.push('Number of tickets cannot exceed 1,000,000');
        }
    }
    
    return errors;
}

/**
 * Check if a date string is valid and in YYYY-MM-DD format
 * 
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if date is valid, false otherwise
 */
function isValidDate(dateString) {
    if (typeof dateString !== 'string') return false;
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;
        
    return true;
}

module.exports = {
    listEvents,
    addEvent,
    getEvent,
    updateEventById
};