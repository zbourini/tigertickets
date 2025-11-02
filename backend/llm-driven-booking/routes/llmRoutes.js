/**
 * LLM Routes - API Routes for LLM Service
 * 
 * This module defines all the API routes for the LLM service.
 * It handles routing for parsing user input using LLM.
 * 
 * Routes:
 * - POST /api/llm/parse: Parse user input using LLM
 */

const express = require('express');
const router = express.Router();

// Import controllers
const llmController = require('../controllers/llmController');

/**
 * @route   POST /api/llm/parse
 * @desc    Parse user input using LLM
 * @access  Public
 * @param   {string} message - User input message to parse
 */
router.post('/llm/parse', llmController.parseUserInput);

module.exports = router;