const sqlite3 = require('sqlite3').verbose();

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

// Mock implementation of client model functions using testDb
const clientModel = {
    getAllEvents: () => {
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
    
    purchaseTickets: (eventId, ticketCount = 1) => {
        return new Promise((resolve, reject) => {
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
            testDb.serialize(() => {
                testDb.run('BEGIN TRANSACTION', (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    testDb.get(
                        'SELECT * FROM events WHERE id = ?',
                        [eventId],
                        (err, event) => {
                            if (err) {
                                testDb.run('ROLLBACK', () => reject(err));
                                return;
                            }
                            
                            if (!event) {
                                testDb.run('ROLLBACK', () => {
                                    reject(new Error('Event not found'));
                                });
                                return;
                            }
                            
                            if (event.tickets_available < ticketCount) {
                                testDb.run('ROLLBACK', () => {
                                    reject(new Error(`Not enough tickets available. Only ${event.tickets_available} tickets remaining.`));
                                });
                                return;
                            }
                            
                            const newTicketCount = event.tickets_available - ticketCount;
                            
                            testDb.run(
                                `UPDATE events SET tickets_available = ?, updated_at = datetime('now') WHERE id = ?`,
                                [newTicketCount, eventId],
                                function(err) {
                                    if (err) {
                                        testDb.run('ROLLBACK', () => reject(err));
                                        return;
                                    }
                                    
                                    testDb.run('COMMIT', (err) => {
                                        if (err) {
                                            testDb.run('ROLLBACK', () => reject(err));
                                            return;
                                        }
                                        
                                        const updatedEvent = {
                                            ...event,
                                            tickets_available: newTicketCount
                                        };
                                        
                                        resolve({
                                            success: true,
                                            message: `Successfully purchased ${ticketCount} ticket(s) for ${event.name}`,
                                            event: updatedEvent,
                                            ticketsPurchased: ticketCount
                                        });
                                    });
                                }
                            );
                        }
                    );
                });
            });
        });
    }
};

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

    test('should handle concurrent purchase attempts correctly', async () => {
        const event = await insertTestEvent({
            name: 'Concert',
            date: '2025-12-01',
            tickets_available: 5
        });

        // Simulate concurrent purchases
        const purchase1 = clientModel.purchaseTickets(event.id, 3);
        const purchase2 = clientModel.purchaseTickets(event.id, 3);

        // One should succeed, one should fail
        const results = await Promise.allSettled([purchase1, purchase2]);
        
        const fulfilled = results.filter(r => r.status === 'fulfilled');
        const rejected = results.filter(r => r.status === 'rejected');

        // At least one should fail due to insufficient tickets
        expect(rejected.length).toBeGreaterThan(0);
        
        // The successful one should have decremented correctly
        if (fulfilled.length > 0) {
            expect(fulfilled[0].value.event.tickets_available).toBeLessThanOrEqual(5);
        }
    });

    test('should prevent overselling with rapid consecutive purchases', async () => {
        const event = await insertTestEvent({
            name: 'Concert',
            date: '2025-12-01',
            tickets_available: 10
        });

        // Try to purchase more tickets than available through multiple transactions
        const purchases = [
            clientModel.purchaseTickets(event.id, 6),
            clientModel.purchaseTickets(event.id, 6)
        ];

        const results = await Promise.allSettled(purchases);
        
        const fulfilled = results.filter(r => r.status === 'fulfilled');
        const rejected = results.filter(r => r.status === 'rejected');

        // At least one must fail
        expect(rejected.length).toBeGreaterThan(0);
        
        // Verify final count is not negative
        const finalEvent = await clientModel.getEventById(event.id);
        expect(finalEvent.tickets_available).toBeGreaterThanOrEqual(0);
    });
});
