/**
 * Admin Model - Database Operations for Events
 * 
 * This module handles all database operations related to events management.
 * It provides functions to create, read, update, and manage event data
 * in the SQLite database.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path pointing to shared database
const DB_PATH = path.join(__dirname, '..', '..', 'backend', 'shared-db', 'database.sqlite');

/**
 * Get a database connection
 * 
 * @returns {sqlite3.Database} Database connection object
 */
function getDbConnection() {
    return new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('Error connecting to database:', err.message);
            throw err;
        }
    });
}

/**
 * Get all events from the database
 * 
 * @returns {Promise<Array>} Promise that resolves to array of events
 */
function getEvents() {
    return new Promise((resolve, reject) => {
        const db = getDbConnection();
        
        const query = `
            SELECT id, name, date, tickets_available, created_at, updated_at 
            FROM events 
            ORDER BY date ASC
        `;
        
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Error fetching events:', err.message);
                reject(err);
            } else {
                resolve(rows);
            }
            
            db.close();
        });
    });
}

/**
 * Create a new event in the database
 * 
 * @param {Object} eventData - Event data to insert
 * @param {string} eventData.name - Event name
 * @param {string} eventData.date - Event date (YYYY-MM-DD format)
 * @param {number} eventData.tickets_available - Number of available tickets
 * @returns {Promise<Object>} Promise that resolves to the created event with ID
 */
function createEvent(eventData) {
    return new Promise((resolve, reject) => {
        const db = getDbConnection();
        
        const { name, date, tickets_available } = eventData;
        
        const insertQuery = `
            INSERT INTO events (name, date, tickets_available, created_at, updated_at)
            VALUES (?, ?, ?, datetime('now'), datetime('now'))
        `;
        
        db.run(insertQuery, [name, date, tickets_available], function(err) {
            if (err) {
                console.error('Error creating event:', err.message);
                reject(err);
                return;
            }
            
            // Fetch the newly created event
            const selectQuery = `
                SELECT id, name, date, tickets_available, created_at, updated_at
                FROM events
                WHERE id = ?
            `;
            
            db.get(selectQuery, [this.lastID], (err, row) => {
                if (err) {
                    console.error('Error fetching created event:', err.message);
                    reject(err);
                } else {
                    resolve(row);
                }
                
                db.close();
            });
        });
    });
}

/**
 * Get a single event by ID
 * 
 * @param {number} eventId - The ID of the event to retrieve
 * @returns {Promise<Object|null>} Promise that resolves to event object or null if not found
 */
function getEventById(eventId) {
    return new Promise((resolve, reject) => {
        const db = getDbConnection();
        
        const query = `
            SELECT id, name, date, tickets_available, created_at, updated_at
            FROM events
            WHERE id = ?
        `;
        
        db.get(query, [eventId], (err, row) => {
            if (err) {
                console.error('Error fetching event by ID:', err.message);
                reject(err);
            } else {
                resolve(row || null);
            }
            
            db.close();
        });
    });
}

/**
 * Update an existing event
 * 
 * @param {number} eventId - ID of the event to update
 * @param {Object} updateData - Data to update
 * @param {string} [updateData.name] - New event name
 * @param {string} [updateData.date] - New event date
 * @param {number} [updateData.tickets_available] - New ticket count
 * @returns {Promise<Object|null>} Promise that resolves to updated event or null if not found
 */
function updateEvent(eventId, updateData) {
    return new Promise((resolve, reject) => {
        const db = getDbConnection();
        
        // Build dynamic update query based on provided fields
        const fields = [];
        const values = [];
        
        if (updateData.name !== undefined) {
            fields.push('name = ?');
            values.push(updateData.name);
        }
        if (updateData.date !== undefined) {
            fields.push('date = ?');
            values.push(updateData.date);
        }
        if (updateData.tickets_available !== undefined) {
            fields.push('tickets_available = ?');
            values.push(updateData.tickets_available);
        }
        
        if (fields.length === 0) {
            db.close();
            resolve(null);
            return;
        }
        
        fields.push('updated_at = datetime(\'now\')');
        values.push(eventId);
        
        const updateQuery = `
            UPDATE events 
            SET ${fields.join(', ')}
            WHERE id = ?
        `;
        
        db.run(updateQuery, values, function(err) {
            if (err) {
                console.error('Error updating event:', err.message);
                reject(err);
                return;
            }
            
            if (this.changes === 0) {
                resolve(null);
                db.close();
                return;
            }
            
            // Fetch the updated event
            const selectQuery = `
                SELECT id, name, date, tickets_available, created_at, updated_at
                FROM events
                WHERE id = ?
            `;
            
            db.get(selectQuery, [eventId], (err, row) => {
                if (err) {
                    console.error('Error fetching updated event:', err.message);
                    reject(err);
                } else {
                    resolve(row);
                }
                
                db.close();
            });
        });
    });
}

module.exports = {
    getEvents,
    createEvent,
    getEventById,
    updateEvent
};