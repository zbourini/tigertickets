/**
 * Client Model - Database Operations for Client Service
 * 
 * This module handles all database operations for the client service.
 * It provides functions to fetch events and process ticket purchases
 * with proper transaction handling and concurrency control.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path pointing to shared database
const DB_PATH = path.join(__dirname, '..', '..', 'shared-db', 'database.sqlite');

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
 * Get all events regardless of availability for client display
 * 
 * @returns {Promise<Array>} Promise that resolves to array of all events
 */
function getAllEvents() {
    return new Promise((resolve, reject) => {
        const db = getDbConnection();
        
        const query = `
            SELECT id, name, date, tickets_available, created_at, updated_at 
            FROM events 
            ORDER BY date ASC
        `;
        
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Error fetching all events:', err.message);
                reject(err);
            } else {
                resolve(rows);
            }
            
            db.close();
        });
    });
}

/**
 * Get a single event by ID for purchase validation
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
 * Purchase tickets for an event with atomic transaction handling
 * Prevents overselling by using database transactions and row locking
 * 
 * @param {number} eventId - ID of the event to purchase tickets for
 * @param {number} [ticketCount=1] - Number of tickets to purchase (default: 1)
 * @returns {Promise<Object>} Promise that resolves to updated event data or rejects with error
 */
function purchaseTickets(eventId, ticketCount = 1) {
    return new Promise((resolve, reject) => {
        const db = getDbConnection();
        
        // Input validation
        if (!eventId || eventId <= 0) {
            reject(new Error('Invalid event ID provided'));
            return;
        }
        
        if (!ticketCount || ticketCount <= 0) {
            reject(new Error('Invalid ticket count provided'));
            return;
        }
        
        // Begin transaction for atomic operation
        db.serialize(() => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) {
                    console.error('Error starting transaction:', err.message);
                    reject(err);
                    db.close();
                    return;
                }
                
                // Lock the row and get current ticket count
                const selectQuery = `
                    SELECT id, name, date, tickets_available, created_at, updated_at
                    FROM events
                    WHERE id = ?
                `;
                
                db.get(selectQuery, [eventId], (err, event) => {
                    if (err) {
                        console.error('Error fetching event for purchase:', err.message);
                        db.run('ROLLBACK', () => {
                            reject(err);
                            db.close();
                        });
                        return;
                    }
                    
                    if (!event) {
                        db.run('ROLLBACK', () => {
                            reject(new Error('Event not found'));
                            db.close();
                        });
                        return;
                    }
                    
                    // Check if enough tickets are available
                    if (event.tickets_available < ticketCount) {
                        db.run('ROLLBACK', () => {
                            reject(new Error(`Not enough tickets available. Only ${event.tickets_available} tickets remaining.`));
                            db.close();
                        });
                        return;
                    }
                    
                    // Update ticket count
                    const newTicketCount = event.tickets_available - ticketCount;
                    const updateQuery = `
                        UPDATE events 
                        SET tickets_available = ?, updated_at = datetime('now')
                        WHERE id = ?
                    `;
                    
                    db.run(updateQuery, [newTicketCount, eventId], function(err) {
                        if (err) {
                            console.error('Error updating ticket count:', err.message);
                            db.run('ROLLBACK', () => {
                                reject(err);
                                db.close();
                            });
                            return;
                        }
                        
                        // Commit transaction
                        db.run('COMMIT', (err) => {
                            if (err) {
                                console.error('Error committing transaction:', err.message);
                                db.run('ROLLBACK', () => {
                                    reject(err);
                                    db.close();
                                });
                                return;
                            }
                            
                            // Return updated event data
                            const updatedEvent = {
                                ...event,
                                tickets_available: newTicketCount,
                                updated_at: new Date().toISOString()
                            };
                            
                            resolve({
                                success: true,
                                message: `Successfully purchased ${ticketCount} ticket(s) for ${event.name}`,
                                event: updatedEvent,
                                ticketsPurchased: ticketCount
                            });
                            
                            db.close();
                        });
                    });
                });
            });
        });
    });
}

module.exports = {
    getAllEvents,
    getEventById,
    purchaseTickets
};