/**
 * LLM Model - Database Operations for LLM Service
 * 
 * This module handles all database operations for the LLM service.
 * It provides functions to fetch events and process ticket purchases
 * with proper transaction handling and concurrency control.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const groq = require('@ai-sdk/groq');
const ai = require('ai');
const dotenv = require('dotenv');

// Init environment variables
dotenv.config();

// Database path pointing to shared database
const DB_PATH = path.join(__dirname, '..', '..', 'shared-db', 'database.sqlite');

/**
 * Parse user input using LLM to extract event and ticket information
 * 
 * @param {string} message - User input message to parse
 * @returns {Promise<Object>} Promise that resolves to parsed event and ticket information
 */
async function parseInput(message) {
    // Store events found during tool execution
    let foundEvents = [];
    
    const result = await ai.generateText({
        model: groq.groq('openai/gpt-oss-20b'),
        messages: [
            {
                role: 'system',
                content: `You are TigerTickets, an AI assistant for booking event tickets.
                You help users find events and purchase tickets. 
                When a user mentions an event name or keyword, use the searchEventsByName tool to find matching events.`
                // Always return structured json with event ID and ticket counts.`
            },
            {
                role: 'user',
                content: message
            }
        ],
        tools: {
            searchEventsByName: ai.tool({
                description: 'Search for events by name or keyword. Returns matching events.',
                inputSchema: ai.jsonSchema({
                    type: 'object',
                    properties: {
                        searchTerm: { 
                            type: 'string', 
                            description: 'The event name or keyword to search for' 
                        }
                    },
                    required: ['searchTerm']
                }),
                execute: async ({ searchTerm }) => {
                    console.log(`Searching for events with term: ${searchTerm}`);
                    const events = await searchEventsByName(searchTerm);
                    
                    // Store the found events in the outer scope
                    foundEvents = events.map(event => ({
                        event_id: event.id,
                        name: event.name,
                        date: event.date,
                        tickets_available: event.tickets_available
                    }));
                    
                    // Return a formatted string with event details for the LLM
                    if (events.length === 0) {
                        return 'No events found matching that search term.';
                    }
                    return `Found ${events.length} event(s):\n` + events.map(event => 
                        `- Event ID: ${event.id}\n  Name: ${event.name}\n  Date: ${event.date}\n  Available Tickets: ${event.tickets_available}`
                    ).join('\n\n');
                }
            })
        },
        maxSteps: 5
    });

    // Attach the found events to the result
    result.foundEvents = foundEvents;

    return result;
}

/**
 * Get a database connection with transaction support
 * 
 * @returns {sqlite3.Database} Database connection object
 */
function getDbConnection() {
    return new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error('Error connecting to database:', err.message);
            throw err;
        }
    });
}

/**
 * Search for events by name (case-insensitive partial match)
 * 
 * @param {string} searchTerm - The search term to match against event names
 * @returns {Promise<Array>} Promise that resolves to array of matching events
 */
function searchEventsByName(searchTerm) {
    return new Promise((resolve, reject) => {
        const db = getDbConnection();
        
        const query = `
            SELECT id, name, date, tickets_available, created_at, updated_at 
            FROM events 
            WHERE name LIKE ?
            ORDER BY date ASC
        `;
        
        // Add wildcards for partial matching
        const searchPattern = `%${searchTerm}%`;
        
        db.all(query, [searchPattern], (err, rows) => {
            if (err) {
                console.error('Error searching events by name:', err.message);
                reject(err);
            } else {
                resolve(rows);
            }
            
            db.close();
        });
    });
}

module.exports = {
    parseInput
};