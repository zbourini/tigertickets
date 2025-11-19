/**
 * User Model - Database Operations for User Authentication
 * 
 * This module handles all database operations related to user management.
 * It provides functions to create, read, and authenticate users
 * in the SQLite database.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Database path pointing to shared database
const DB_PATH = path.join(__dirname, '..', '..', 'shared-db', 'database.sqlite');

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
 * Create a new user in the database
 * 
 * @param {Object} userData - User data to insert
 * @param {string} userData.email - User email (unique identifier)
 * @param {string} userData.password - Plain text password (will be hashed)
 * @returns {Promise<Object>} Promise that resolves to the created user (without password)
 */
function createUser(userData) {
    return new Promise(async (resolve, reject) => {
        const db = getDbConnection();
        
        try {
            const { email, password } = userData;
            
            // Hash the password with bcrypt (salt rounds: 10)
            const passwordHash = await bcrypt.hash(password, 10);
            
            const insertQuery = `
                INSERT INTO users (email, password_hash, created_at, updated_at)
                VALUES (?, ?, datetime('now'), datetime('now'))
            `;
            
            db.run(insertQuery, [email, passwordHash], function(err) {
                if (err) {
                    console.error('Error creating user:', err.message);
                    
                    // Check for unique constraint violation
                    if (err.message.includes('UNIQUE constraint failed')) {
                        reject(new Error('Email already exists'));
                    } else {
                        reject(err);
                    }
                    return;
                }
                
                // Fetch the newly created user (without password hash)
                const selectQuery = `
                    SELECT id, email, created_at, updated_at
                    FROM users
                    WHERE id = ?
                `;
                
                db.get(selectQuery, [this.lastID], (err, row) => {
                    if (err) {
                        console.error('Error fetching created user:', err.message);
                        reject(err);
                    } else {
                        resolve(row);
                    }
                    
                    db.close();
                });
            });
        } catch (error) {
            console.error('Error in createUser:', error.message);
            reject(error);
            db.close();
        }
    });
}

/**
 * Find a user by email
 * 
 * @param {string} email - User email to search for
 * @returns {Promise<Object|null>} Promise that resolves to user object (without password) or null
 */
function findUserByEmail(email) {
    return new Promise((resolve, reject) => {
        const db = getDbConnection();
        
        const query = `
            SELECT id, email, created_at, updated_at
            FROM users
            WHERE email = ?
        `;
        
        db.get(query, [email], (err, row) => {
            if (err) {
                console.error('Error finding user by email:', err.message);
                reject(err);
            } else {
                resolve(row || null);
            }
            
            db.close();
        });
    });
}

/**
 * Find a user by email (including password hash for authentication)
 * 
 * @param {string} email - User email to search for
 * @returns {Promise<Object|null>} Promise that resolves to user object with password_hash or null
 */
function findUserByEmailWithPassword(email) {
    return new Promise((resolve, reject) => {
        const db = getDbConnection();
        
        const query = `
            SELECT id, email, password_hash, created_at, updated_at
            FROM users
            WHERE email = ?
        `;
        
        db.get(query, [email], (err, row) => {
            if (err) {
                console.error('Error finding user by email:', err.message);
                reject(err);
            } else {
                resolve(row || null);
            }
            
            db.close();
        });
    });
}

/**
 * Find a user by ID
 * 
 * @param {number} userId - User ID to search for
 * @returns {Promise<Object|null>} Promise that resolves to user object (without password) or null
 */
function findUserById(userId) {
    return new Promise((resolve, reject) => {
        const db = getDbConnection();
        
        const query = `
            SELECT id, email, created_at, updated_at
            FROM users
            WHERE id = ?
        `;
        
        db.get(query, [userId], (err, row) => {
            if (err) {
                console.error('Error finding user by ID:', err.message);
                reject(err);
            } else {
                resolve(row || null);
            }
            
            db.close();
        });
    });
}

/**
 * Verify a user's password
 * 
 * @param {string} plainPassword - Plain text password to verify
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} Promise that resolves to true if password matches
 */
async function verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = {
    createUser,
    findUserByEmail,
    findUserByEmailWithPassword,
    findUserById,
    verifyPassword
};
