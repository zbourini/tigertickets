/**
 * Database Setup and Initialization Script
 * 
 * This script initializes the SQLite database by:
 * - Creating the database file if it doesn't exist
 * - Running the schema initialization from init.sql
 * - Setting up proper database connections
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database file path in the shared directory
const DB_PATH = path.join(__dirname, '..', 'shared-db', 'database.sqlite');
const INIT_SQL_PATH = path.join(__dirname, '..', 'shared-db', 'init.sql');

/**
 * Initialize the SQLite database
 * 
 * @returns {Promise<void>} Promise that resolves when database is initialized
 */
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        // Create the database connection
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error creating database:', err.message);
                reject(err);
                return;
            }
            console.log('Connected to SQLite database at:', DB_PATH);
        });

        // Read and execute the initialization SQL
        try {
            const initSQL = fs.readFileSync(INIT_SQL_PATH, 'utf8');
            
            // Execute the SQL statements
            db.exec(initSQL, (err) => {
                if (err) {
                    console.error('Error executing initialization SQL:', err.message);
                    reject(err);
                    return;
                }
                
                console.log('Database initialized successfully!');
                
                // Close the database connection
                db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                        reject(err);
                        return;
                    }
                    console.log('Database connection closed.');
                    resolve();
                });
            });
            
        } catch (error) {
            console.error('Error reading initialization SQL file:', error.message);
            reject(error);
        }
    });
}

// Run initialization if this file is executed directly
if (require.main === module) {
    initializeDatabase()
        .then(() => {
            console.log('Database setup completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Database setup failed:', error);
            process.exit(1);
        });
}

module.exports = { initializeDatabase, DB_PATH };
