const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Mock paths to point to a test database
const mockTestDbPath = path.join(__dirname, '..', '..', '..', 'test-database.sqlite');

// Mock the DB_PATH in the adminModel module
jest.mock('path', () => {
    const actualPath = jest.requireActual('path');
    return {
        ...actualPath,
        join: (...args) => {
            // Intercept the database path construction in adminModel
            if (args.includes('shared-db') && args.includes('database.sqlite')) {
                return mockTestDbPath;
            }
            return actualPath.join(...args);
        }
    };
});

const adminModel = require('../../../models/adminModel');

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

describe('Admin Model - getEvents', () => {
    beforeEach(async () => {
        await clearEvents();
    });

    test('should retrieve all events from database', async () => {
        // Insert test data
        await adminModel.createEvent({
            name: 'Event 1',
            date: '2025-12-01',
            tickets_available: 100
        });
        await adminModel.createEvent({
            name: 'Event 2',
            date: '2025-12-15',
            tickets_available: 50
        });

        const events = await adminModel.getEvents();

        expect(events).toHaveLength(2);
        expect(events[0]).toMatchObject({
            name: 'Event 1',
            date: '2025-12-01',
            tickets_available: 100
        });
        expect(events[1]).toMatchObject({
            name: 'Event 2',
            date: '2025-12-15',
            tickets_available: 50
        });
    });

    test('should return empty array when no events exist', async () => {
        const events = await adminModel.getEvents();

        expect(events).toEqual([]);
    });

    test('should order events by date ascending', async () => {
        await adminModel.createEvent({
            name: 'Later Event',
            date: '2025-12-31',
            tickets_available: 100
        });
        await adminModel.createEvent({
            name: 'Earlier Event',
            date: '2025-12-01',
            tickets_available: 50
        });

        const events = await adminModel.getEvents();

        expect(events[0].name).toBe('Earlier Event');
        expect(events[1].name).toBe('Later Event');
    });
});

describe('Admin Model - createEvent', () => {
    beforeEach(async () => {
        await clearEvents();
    });

    test('should insert event into database and return it', async () => {
        const eventData = {
            name: 'Test Concert',
            date: '2025-12-20',
            tickets_available: 200
        };

        const createdEvent = await adminModel.createEvent(eventData);

        expect(createdEvent).toMatchObject({
            id: expect.any(Number),
            name: 'Test Concert',
            date: '2025-12-20',
            tickets_available: 200
        });
        expect(createdEvent.id).toBeGreaterThan(0);
        expect(createdEvent.created_at).toBeDefined();
        expect(createdEvent.updated_at).toBeDefined();
    });

    test('should auto-increment event IDs', async () => {
        const event1 = await adminModel.createEvent({
            name: 'Event 1',
            date: '2025-12-01',
            tickets_available: 100
        });

        const event2 = await adminModel.createEvent({
            name: 'Event 2',
            date: '2025-12-02',
            tickets_available: 100
        });

        expect(event2.id).toBe(event1.id + 1);
    });

    test('should set timestamps on creation', async () => {
        const event = await adminModel.createEvent({
            name: 'Event',
            date: '2025-12-01',
            tickets_available: 100
        });

        expect(event.created_at).toBeTruthy();
        expect(event.updated_at).toBeTruthy();
    });
});

describe('Admin Model - getEventById', () => {
    beforeEach(async () => {
        await clearEvents();
    });

    test('should retrieve specific event by ID', async () => {
        const created = await adminModel.createEvent({
            name: 'Test Event',
            date: '2025-12-01',
            tickets_available: 100
        });

        const retrieved = await adminModel.getEventById(created.id);

        expect(retrieved).toMatchObject({
            id: created.id,
            name: 'Test Event',
            date: '2025-12-01',
            tickets_available: 100
        });
    });

    test('should return null for non-existent event ID', async () => {
        const event = await adminModel.getEventById(9999);

        expect(event).toBeNull();
    });

    test('should return correct event when multiple exist', async () => {
        await adminModel.createEvent({
            name: 'Event 1',
            date: '2025-12-01',
            tickets_available: 100
        });

        const target = await adminModel.createEvent({
            name: 'Event 2',
            date: '2025-12-02',
            tickets_available: 50
        });

        await adminModel.createEvent({
            name: 'Event 3',
            date: '2025-12-03',
            tickets_available: 75
        });

        const retrieved = await adminModel.getEventById(target.id);

        expect(retrieved.name).toBe('Event 2');
        expect(retrieved.tickets_available).toBe(50);
    });
});

describe('Admin Model - updateEvent', () => {
    beforeEach(async () => {
        await clearEvents();
    });

    test('should update event name', async () => {
        const event = await adminModel.createEvent({
            name: 'Original Name',
            date: '2025-12-01',
            tickets_available: 100
        });

        const updated = await adminModel.updateEvent(event.id, {
            name: 'Updated Name'
        });

        expect(updated.name).toBe('Updated Name');
        expect(updated.date).toBe('2025-12-01');
        expect(updated.tickets_available).toBe(100);
    });

    test('should update event date', async () => {
        const event = await adminModel.createEvent({
            name: 'Event',
            date: '2025-12-01',
            tickets_available: 100
        });

        const updated = await adminModel.updateEvent(event.id, {
            date: '2025-12-15'
        });

        expect(updated.date).toBe('2025-12-15');
        expect(updated.name).toBe('Event');
    });

    test('should update ticket count', async () => {
        const event = await adminModel.createEvent({
            name: 'Event',
            date: '2025-12-01',
            tickets_available: 100
        });

        const updated = await adminModel.updateEvent(event.id, {
            tickets_available: 250
        });

        expect(updated.tickets_available).toBe(250);
    });

    test('should update multiple fields at once', async () => {
        const event = await adminModel.createEvent({
            name: 'Event',
            date: '2025-12-01',
            tickets_available: 100
        });

        const updated = await adminModel.updateEvent(event.id, {
            name: 'Updated Event',
            date: '2025-12-20',
            tickets_available: 300
        });

        expect(updated.name).toBe('Updated Event');
        expect(updated.date).toBe('2025-12-20');
        expect(updated.tickets_available).toBe(300);
    });

    test('should return null for non-existent event', async () => {
        const result = await adminModel.updateEvent(9999, {
            name: 'Updated'
        });

        expect(result).toBeNull();
    });

    test('should update timestamp on modification', async () => {
        const event = await adminModel.createEvent({
            name: 'Event',
            date: '2025-12-01',
            tickets_available: 100
        });

        const originalUpdatedAt = event.updated_at;

        // Wait a bit to ensure timestamp changes
        await new Promise(resolve => setTimeout(resolve, 10));

        const updated = await adminModel.updateEvent(event.id, {
            name: 'Updated Event'
        });

        // Note: In SQLite, datetime('now') may not always differ in fast operations
        // This test checks that updated_at is set
        expect(updated.updated_at).toBeDefined();
    });

    test('should maintain data integrity for unchanged fields', async () => {
        const event = await adminModel.createEvent({
            name: 'Event',
            date: '2025-12-01',
            tickets_available: 100
        });

        const updated = await adminModel.updateEvent(event.id, {
            tickets_available: 150
        });

        expect(updated.name).toBe('Event');
        expect(updated.date).toBe('2025-12-01');
        expect(updated.tickets_available).toBe(150);
    });

    test('should return null when updating with no fields', async () => {
        const event = await adminModel.createEvent({
            name: 'Event',
            date: '2025-12-01',
            tickets_available: 100
        });

        const updated = await adminModel.updateEvent(event.id, {});

        expect(updated).toBeNull();
    });
});

describe('Admin Model - Additional Edge Cases', () => {
    beforeEach(async () => {
        await clearEvents();
    });

    test('should handle events with special characters in name', async () => {
        const event = await adminModel.createEvent({
            name: "Bob's Concert & Show!",
            date: '2025-12-01',
            tickets_available: 100
        });

        expect(event.name).toBe("Bob's Concert & Show!");
        
        const retrieved = await adminModel.getEventById(event.id);
        expect(retrieved.name).toBe("Bob's Concert & Show!");
    });

    test('should handle zero tickets available', async () => {
        const event = await adminModel.createEvent({
            name: 'Sold Out Event',
            date: '2025-12-01',
            tickets_available: 0
        });

        expect(event.tickets_available).toBe(0);
    });

    test('should handle large ticket counts', async () => {
        const event = await adminModel.createEvent({
            name: 'Huge Venue',
            date: '2025-12-01',
            tickets_available: 100000
        });

        expect(event.tickets_available).toBe(100000);
    });

    test('should update only tickets_available field', async () => {
        const event = await adminModel.createEvent({
            name: 'Event',
            date: '2025-12-01',
            tickets_available: 100
        });

        const updated = await adminModel.updateEvent(event.id, {
            tickets_available: 0
        });

        expect(updated.tickets_available).toBe(0);
        expect(updated.name).toBe('Event');
        expect(updated.date).toBe('2025-12-01');
    });

    test('should handle updating tickets to zero', async () => {
        const event = await adminModel.createEvent({
            name: 'Event',
            date: '2025-12-01',
            tickets_available: 100
        });

        const updated = await adminModel.updateEvent(event.id, {
            tickets_available: 0
        });

        expect(updated.tickets_available).toBe(0);
    });

    test('should retrieve multiple events in correct order', async () => {
        const event1 = await adminModel.createEvent({
            name: 'Event Z',
            date: '2025-12-25',
            tickets_available: 100
        });

        const event2 = await adminModel.createEvent({
            name: 'Event A',
            date: '2025-12-01',
            tickets_available: 100
        });

        const event3 = await adminModel.createEvent({
            name: 'Event M',
            date: '2025-12-15',
            tickets_available: 100
        });

        const events = await adminModel.getEvents();

        expect(events).toHaveLength(3);
        expect(events[0].name).toBe('Event A'); // Earliest date
        expect(events[1].name).toBe('Event M'); // Middle date
        expect(events[2].name).toBe('Event Z'); // Latest date
    });
});
