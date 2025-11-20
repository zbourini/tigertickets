const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Mock paths to point to a test database
const mockTestDbPath = path.join(__dirname, '..', '..', '..', 'test-database.sqlite');

// Mock the DB_PATH in the clientModel module
jest.mock('path', () => {
    const actualPath = jest.requireActual('path');
    return {
        ...actualPath,
        join: (...args) => {
            // Intercept the database path construction in clientModel
            if (args.includes('shared-db') && args.includes('database.sqlite')) {
                return mockTestDbPath;
            }
            return actualPath.join(...args);
        }
    };
});

const clientModel = require('../../../models/clientModel');

let testDb;

beforeAll(() => {
    // Remove existing test database if it exists
    if (fs.existsSync(mockTestDbPath)) {
        fs.unlinkSync(mockTestDbPath);
    }
    
    testDb = new sqlite3.Database(mockTestDbPath);
    
    return new Promise((resolve, reject) => {
        testDb.run(`
            CREATE TABLE events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                date TEXT NOT NULL,
                tickets_available INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
});

afterAll(async () => {
    // Give time for any pending operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return new Promise((resolve) => {
        testDb.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            }
            // Give file system time to release the lock
            setTimeout(() => {
                try {
                    if (fs.existsSync(mockTestDbPath)) {
                        fs.unlinkSync(mockTestDbPath);
                    }
                } catch (error) {
                    console.error('Error cleaning up test database:', error);
                }
                resolve();
            }, 200);
        });
    });
}, 10000);

function clearEvents() {
    return new Promise((resolve, reject) => {
        testDb.run('DELETE FROM events', (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function insertTestEvent(eventData) {
    return new Promise((resolve, reject) => {
        const { name, date, tickets_available } = eventData;
        testDb.run(
            `INSERT INTO events (name, date, tickets_available, created_at, updated_at)
             VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
            [name, date, tickets_available],
            function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                testDb.get(
                    'SELECT * FROM events WHERE id = ?',
                    [this.lastID],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            }
        );
    });
}

describe('Client Model - getAllEvents', () => {
    beforeEach(async () => {
        await clearEvents();
    });

    test('should retrieve all events from database', async () => {
        await insertTestEvent({
            name: 'Concert',
            date: '2025-12-01',
            tickets_available: 100
        });
        await insertTestEvent({
            name: 'Game',
            date: '2025-12-15',
            tickets_available: 50
        });

        const events = await clientModel.getAllEvents();

        expect(events).toHaveLength(2);
        expect(events[0].name).toBe('Concert');
        expect(events[1].name).toBe('Game');
    });

    test('should return empty array when no events exist', async () => {
        const events = await clientModel.getAllEvents();

        expect(events).toEqual([]);
    });

    test('should include events with zero tickets', async () => {
        await insertTestEvent({
            name: 'Sold Out Event',
            date: '2025-12-01',
            tickets_available: 0
        });

        const events = await clientModel.getAllEvents();

        expect(events).toHaveLength(1);
        expect(events[0].tickets_available).toBe(0);
    });

    test('should order events by date ascending', async () => {
        await insertTestEvent({
            name: 'Later Event',
            date: '2025-12-31',
            tickets_available: 100
        });
        await insertTestEvent({
            name: 'Earlier Event',
            date: '2025-12-01',
            tickets_available: 50
        });

        const events = await clientModel.getAllEvents();

        expect(events[0].name).toBe('Earlier Event');
        expect(events[1].name).toBe('Later Event');
    });
});

describe('Client Model - getEventById', () => {
    beforeEach(async () => {
        await clearEvents();
    });

    test('should retrieve specific event by ID', async () => {
        const created = await insertTestEvent({
            name: 'Test Event',
            date: '2025-12-01',
            tickets_available: 100
        });

        const retrieved = await clientModel.getEventById(created.id);

        expect(retrieved).toMatchObject({
            id: created.id,
            name: 'Test Event',
            date: '2025-12-01',
            tickets_available: 100
        });
    });

    test('should return null for non-existent event ID', async () => {
        const event = await clientModel.getEventById(9999);

        expect(event).toBeNull();
    });
});

describe('Client Model - purchaseTickets', () => {
    beforeEach(async () => {
        await clearEvents();
    });

    test('should successfully purchase tickets and decrement count', async () => {
        const event = await insertTestEvent({
            name: 'Concert',
            date: '2025-12-01',
            tickets_available: 100
        });

        const result = await clientModel.purchaseTickets(event.id, 2);

        expect(result.success).toBe(true);
        expect(result.ticketsPurchased).toBe(2);
        expect(result.event.tickets_available).toBe(98);
        expect(result.message).toContain('Successfully purchased');
    });

    test('should default to 1 ticket when count not provided', async () => {
        const event = await insertTestEvent({
            name: 'Concert',
            date: '2025-12-01',
            tickets_available: 100
        });

        const result = await clientModel.purchaseTickets(event.id);

        expect(result.ticketsPurchased).toBe(1);
        expect(result.event.tickets_available).toBe(99);
    });

    test('should reject purchase when insufficient tickets', async () => {
        const event = await insertTestEvent({
            name: 'Concert',
            date: '2025-12-01',
            tickets_available: 2
        });

        await expect(
            clientModel.purchaseTickets(event.id, 5)
        ).rejects.toThrow('Not enough tickets available');
    });

    test('should reject purchase for non-existent event', async () => {
        await expect(
            clientModel.purchaseTickets(9999, 1)
        ).rejects.toThrow('Event not found');
    });

    test('should reject invalid event ID', async () => {
        await expect(
            clientModel.purchaseTickets(0, 1)
        ).rejects.toThrow('Invalid event ID');
    });

    test('should reject negative event ID', async () => {
        await expect(
            clientModel.purchaseTickets(-1, 1)
        ).rejects.toThrow('Invalid event ID');
    });

    test('should reject invalid ticket count', async () => {
        const event = await insertTestEvent({
            name: 'Concert',
            date: '2025-12-01',
            tickets_available: 100
        });

        await expect(
            clientModel.purchaseTickets(event.id, 0)
        ).rejects.toThrow('Invalid ticket count');
    });

    test('should reject negative ticket count', async () => {
        const event = await insertTestEvent({
            name: 'Concert',
            date: '2025-12-01',
            tickets_available: 100
        });

        await expect(
            clientModel.purchaseTickets(event.id, -1)
        ).rejects.toThrow('Invalid ticket count');
    });

    test('should handle purchasing all remaining tickets', async () => {
        const event = await insertTestEvent({
            name: 'Concert',
            date: '2025-12-01',
            tickets_available: 5
        });

        const result = await clientModel.purchaseTickets(event.id, 5);

        expect(result.event.tickets_available).toBe(0);
    });

    test('should maintain atomicity - multiple purchases', async () => {
        const event = await insertTestEvent({
            name: 'Concert',
            date: '2025-12-01',
            tickets_available: 10
        });

        // First purchase
        await clientModel.purchaseTickets(event.id, 3);
        
        // Second purchase
        const result2 = await clientModel.purchaseTickets(event.id, 4);
        
        expect(result2.event.tickets_available).toBe(3);
    });

    test('should reject second purchase if first consumes all tickets', async () => {
        const event = await insertTestEvent({
            name: 'Concert',
            date: '2025-12-01',
            tickets_available: 5
        });

        // First purchase takes all tickets
        await clientModel.purchaseTickets(event.id, 5);
        
        // Second purchase should fail
        await expect(
            clientModel.purchaseTickets(event.id, 1)
        ).rejects.toThrow('Not enough tickets available');
    });

    test('should update timestamp on purchase', async () => {
        const event = await insertTestEvent({
            name: 'Concert',
            date: '2025-12-01',
            tickets_available: 100
        });

        const result = await clientModel.purchaseTickets(event.id, 1);

        expect(result.event.updated_at).toBeDefined();
    });

    test('should handle large ticket purchases', async () => {
        const event = await insertTestEvent({
            name: 'Large Event',
            date: '2025-12-01',
            tickets_available: 1000
        });

        const result = await clientModel.purchaseTickets(event.id, 500);

        expect(result.event.tickets_available).toBe(500);
        expect(result.ticketsPurchased).toBe(500);
    });
});

describe('Client Model - Concurrency Tests', () => {
    beforeEach(async () => {
        await clearEvents();
    });

    test('should prevent overselling with sequential purchases', async () => {
        const event = await insertTestEvent({
            name: 'Concert',
            date: '2025-12-01',
            tickets_available: 10
        });

        // Sequential purchases that exceed available tickets
        await clientModel.purchaseTickets(event.id, 6);
        
        // This should fail as only 4 tickets remain
        await expect(
            clientModel.purchaseTickets(event.id, 6)
        ).rejects.toThrow('Not enough tickets available');
        
        // Verify final count is correct
        const finalEvent = await clientModel.getEventById(event.id);
        expect(finalEvent.tickets_available).toBe(4);
    });
});

describe('Client Model - Additional Edge Cases', () => {
    beforeEach(async () => {
        await clearEvents();
    });

    test('should handle null event ID in purchaseTickets', async () => {
        await expect(clientModel.purchaseTickets(null, 1)).rejects.toThrow('Invalid event ID');
    });

    test('should handle null ticket count in purchaseTickets', async () => {
        const event = await insertTestEvent({
            name: 'Concert',
            date: '2025-12-01',
            tickets_available: 100
        });

        await expect(clientModel.purchaseTickets(event.id, null)).rejects.toThrow('Invalid ticket count');
    });
});


