/**
 * LLM Controller - Business Logic for LLM Operations
 * 
 * This module contains the business logic for handling LLM requests
 * including fetching events and processing ticket purchases.
 * It acts as an intermediary between routes and models.
 */

const llmModel = require('../models/llmModel');

/**
 * Parse user input 
 * Handles the POST /api/llm/parse endpoint
 * 
 * @param {Object} req - Express request object
 * @param {string} req.message - User input message to parse
 * @param {Object} res - Express response object
 * @returns {void} Sends JSON response with parsing result or error
 */
async function parseUserInput(req, res) {
    try {
        const message = req.body.message;
        console.log(`Received message to parse: ${message}`);

        // Call the model to parse the user input
        const parsedResult = await llmModel.parseInput(message);
        // console.log(`Parsed result: ${JSON.stringify(parsedResult)}`);
        
        // Return successful response
        res.status(200).json({
            success: true,
            data: parsedResult
        });
    } catch (error) {
        console.error('Error in parseUserInput controller:', error.message);
        // Return error response
        res.status(500).json({
            success: false,
            error: 'Failed to parse input',
            message: error.message
        });
    }
}

module.exports = {
    parseUserInput
};