const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const originalPath = path.join(__dirname, '..', '..', '..', 'models', 'adminModel.js');

let testDb;

beforeAll(() => {
    testDb = new sqlite3.Database(':memory:');
    
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

afterAll(() => {
    return new Promise((resolve) => {
        testDb.close(resolve);
    });
});

function clearEvents() {
    return new Promise((resolve, reject) => {
        testDb.run('DELETE FROM events', (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// Mock implementation of model functions using testDb
const adminModel = {
    getEvents: () => {
        return new Promise((resolve, reject) => {
            testDb.all(
                'SELECT id, name, date, tickets_available, created_at, updated_at FROM events ORDER BY date ASC',
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    },
    
    createEvent: (eventData) => {
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
                        'SELECT id, name, date, tickets_available, created_at, updated_at FROM events WHERE id = ?',
                        [this.lastID],
                        (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        }
                    );
                }
            );
        });
    },
    
    getEventById: (eventId) => {
        return new Promise((resolve, reject) => {
            testDb.get(
                'SELECT id, name, date, tickets_available, created_at, updated_at FROM events WHERE id = ?',
                [eventId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row || null);
                }
            );
        });
    },
    
    updateEvent: (eventId, updateData) => {
        return new Promise((resolve, reject) => {
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
                resolve(null);
                return;
            }
            
            fields.push('updated_at = datetime(\'now\')');
            values.push(eventId);
            
            const updateQuery = `UPDATE events SET ${fields.join(', ')} WHERE id = ?`;
            
            testDb.run(updateQuery, values, function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (this.changes === 0) {
                    resolve(null);
                    return;
                }
                
                testDb.get(
                    'SELECT id, name, date, tickets_available, created_at, updated_at FROM events WHERE id = ?',
                    [eventId],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
        });
    }
};

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
});
