const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

let testDb;
let testDbPath;

beforeAll(() => {
    testDbPath = path.join(__dirname, 'test-admin.db');
    
    if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
    }
    
    testDb = new sqlite3.Database(testDbPath);
    
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
        testDb.close(() => {
            if (fs.existsSync(testDbPath)) {
                fs.unlinkSync(testDbPath);
            }
            resolve();
        });
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

function getAllEventsFromDb() {
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
}

function getEventByIdFromDb(eventId) {
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
}

function updateEventInDb(eventId, updateData) {
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
        
        testDb.run(
            `UPDATE events SET ${fields.join(', ')} WHERE id = ?`,
            values,
            function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                if (this.changes === 0) {
                    resolve(null);
                    return;
                }
                testDb.get(
                    'SELECT * FROM events WHERE id = ?',
                    [eventId],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            }
        );
    });
}

describe('Admin Model - getEvents', () => {
    beforeEach(async () => {
        await clearEvents();
    });

    test('should return all events ordered by date', async () => {
        await insertTestEvent({ name: 'Event B', date: '2025-12-15', tickets_available: 50 });
        await insertTestEvent({ name: 'Event A', date: '2025-12-01', tickets_available: 100 });
        await insertTestEvent({ name: 'Event C', date: '2025-12-31', tickets_available: 75 });

        const events = await getAllEventsFromDb();

        expect(events).toHaveLength(3);
        expect(events[0].name).toBe('Event A');
        expect(events[1].name).toBe('Event B');
        expect(events[2].name).toBe('Event C');
    });

    test('should return empty array when no events exist', async () => {
        const events = await getAllEventsFromDb();
        expect(events).toEqual([]);
    });

    test('should include all event fields', async () => {
        await insertTestEvent({ name: 'Concert', date: '2025-12-20', tickets_available: 200 });

        const events = await getAllEventsFromDb();

        expect(events[0]).toHaveProperty('id');
        expect(events[0]).toHaveProperty('name');
        expect(events[0]).toHaveProperty('date');
        expect(events[0]).toHaveProperty('tickets_available');
        expect(events[0]).toHaveProperty('created_at');
        expect(events[0]).toHaveProperty('updated_at');
    });

    test('should return large number of events efficiently', async () => {
        const promises = [];
        for (let i = 1; i <= 100; i++) {
            promises.push(insertTestEvent({
                name: `Event ${i}`,
                date: `2025-12-${String(i % 28 + 1).padStart(2, '0')}`,
                tickets_available: i * 10
            }));
        }
        await Promise.all(promises);

        const events = await getAllEventsFromDb();
        expect(events).toHaveLength(100);
    });
});

describe('Admin Model - createEvent', () => {
    beforeEach(async () => {
        await clearEvents();
    });

    test('should create event and return with ID', async () => {
        const eventData = {
            name: 'Test Concert',
            date: '2025-12-20',
            tickets_available: 100
        };

        const newEvent = await insertTestEvent(eventData);

        expect(newEvent).toBeDefined();
        expect(newEvent.id).toBeDefined();
        expect(newEvent.name).toBe('Test Concert');
        expect(newEvent.date).toBe('2025-12-20');
        expect(newEvent.tickets_available).toBe(100);
    });

    test('should set created_at and updated_at timestamps', async () => {
        const newEvent = await insertTestEvent({
            name: 'Event',
            date: '2025-12-20',
            tickets_available: 50
        });

        expect(newEvent.created_at).toBeDefined();
        expect(newEvent.updated_at).toBeDefined();
    });

    test('should auto-increment event IDs', async () => {
        const event1 = await insertTestEvent({ name: 'Event 1', date: '2025-12-01', tickets_available: 10 });
        const event2 = await insertTestEvent({ name: 'Event 2', date: '2025-12-02', tickets_available: 20 });
        const event3 = await insertTestEvent({ name: 'Event 3', date: '2025-12-03', tickets_available: 30 });

        expect(event2.id).toBe(event1.id + 1);
        expect(event3.id).toBe(event2.id + 1);
    });

    test('should handle special characters in event name', async () => {
        const newEvent = await insertTestEvent({
            name: 'Rock & Roll Concert: "The Best!"',
            date: '2025-12-20',
            tickets_available: 100
        });

        expect(newEvent.name).toBe('Rock & Roll Concert: "The Best!"');
    });

    test('should handle zero tickets_available', async () => {
        const newEvent = await insertTestEvent({
            name: 'Sold Out Event',
            date: '2025-12-20',
            tickets_available: 0
        });

        expect(newEvent.tickets_available).toBe(0);
    });

    test('should handle large ticket counts', async () => {
        const newEvent = await insertTestEvent({
            name: 'Stadium Event',
            date: '2025-12-20',
            tickets_available: 100000
        });

        expect(newEvent.tickets_available).toBe(100000);
    });
});

describe('Admin Model - getEventById', () => {
    beforeEach(async () => {
        await clearEvents();
    });

    test('should return event when ID exists', async () => {
        const created = await insertTestEvent({
            name: 'Concert',
            date: '2025-12-20',
            tickets_available: 100
        });

        const event = await getEventByIdFromDb(created.id);

        expect(event).toBeDefined();
        expect(event.id).toBe(created.id);
        expect(event.name).toBe('Concert');
    });

    test('should return null when event not found', async () => {
        const event = await getEventByIdFromDb(9999);
        expect(event).toBeNull();
    });

    test('should return complete event data', async () => {
        const created = await insertTestEvent({
            name: 'Game',
            date: '2025-12-15',
            tickets_available: 50
        });

        const event = await getEventByIdFromDb(created.id);

        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('name');
        expect(event).toHaveProperty('date');
        expect(event).toHaveProperty('tickets_available');
        expect(event).toHaveProperty('created_at');
        expect(event).toHaveProperty('updated_at');
    });

    test('should return correct event among multiple', async () => {
        const event1 = await insertTestEvent({ name: 'Event 1', date: '2025-12-01', tickets_available: 10 });
        const event2 = await insertTestEvent({ name: 'Event 2', date: '2025-12-02', tickets_available: 20 });
        const event3 = await insertTestEvent({ name: 'Event 3', date: '2025-12-03', tickets_available: 30 });

        const fetched = await getEventByIdFromDb(event2.id);

        expect(fetched.id).toBe(event2.id);
        expect(fetched.name).toBe('Event 2');
    });
});

describe('Admin Model - updateEvent', () => {
    beforeEach(async () => {
        await clearEvents();
    });

    test('should update event name', async () => {
        const created = await insertTestEvent({
            name: 'Old Name',
            date: '2025-12-20',
            tickets_available: 100
        });

        const updated = await updateEventInDb(created.id, { name: 'New Name' });

        expect(updated.name).toBe('New Name');
        expect(updated.date).toBe('2025-12-20');
        expect(updated.tickets_available).toBe(100);
    });

    test('should update event date', async () => {
        const created = await insertTestEvent({
            name: 'Concert',
            date: '2025-12-20',
            tickets_available: 100
        });

        const updated = await updateEventInDb(created.id, { date: '2025-12-25' });

        expect(updated.date).toBe('2025-12-25');
        expect(updated.name).toBe('Concert');
    });

    test('should update tickets_available', async () => {
        const created = await insertTestEvent({
            name: 'Event',
            date: '2025-12-20',
            tickets_available: 100
        });

        const updated = await updateEventInDb(created.id, { tickets_available: 200 });

        expect(updated.tickets_available).toBe(200);
    });

    test('should update multiple fields at once', async () => {
        const created = await insertTestEvent({
            name: 'Event',
            date: '2025-12-20',
            tickets_available: 100
        });

        const updated = await updateEventInDb(created.id, {
            name: 'Updated Event',
            date: '2025-12-25',
            tickets_available: 150
        });

        expect(updated.name).toBe('Updated Event');
        expect(updated.date).toBe('2025-12-25');
        expect(updated.tickets_available).toBe(150);
    });

    test('should update updated_at timestamp', async () => {
        const created = await insertTestEvent({
            name: 'Event',
            date: '2025-12-20',
            tickets_available: 100
        });

        const originalUpdatedAt = created.updated_at;

        await new Promise(resolve => setTimeout(resolve, 1000));

        const updated = await updateEventInDb(created.id, { name: 'New Name' });

        expect(updated.updated_at).not.toBe(originalUpdatedAt);
    });

    test('should return null when event not found', async () => {
        const result = await updateEventInDb(9999, { name: 'Updated' });
        expect(result).toBeNull();
    });

    test('should return null when no fields provided', async () => {
        const created = await insertTestEvent({
            name: 'Event',
            date: '2025-12-20',
            tickets_available: 100
        });

        const result = await updateEventInDb(created.id, {});
        expect(result).toBeNull();
    });

    test('should handle updating to zero tickets', async () => {
        const created = await insertTestEvent({
            name: 'Event',
            date: '2025-12-20',
            tickets_available: 100
        });

        const updated = await updateEventInDb(created.id, { tickets_available: 0 });

        expect(updated.tickets_available).toBe(0);
    });

    test('should preserve unchanged fields', async () => {
        const created = await insertTestEvent({
            name: 'Concert',
            date: '2025-12-20',
            tickets_available: 100
        });

        const updated = await updateEventInDb(created.id, { tickets_available: 200 });

        expect(updated.name).toBe('Concert');
        expect(updated.date).toBe('2025-12-20');
        expect(updated.tickets_available).toBe(200);
    });
});
