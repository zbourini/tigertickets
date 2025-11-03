const request = require('supertest');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Mock admin routes using test database
const mockAdminController = {
    listEvents: async (req, res) => {
        try {
            testDb.all('SELECT * FROM events ORDER BY date ASC', [], (err, rows) => {
                if (err) {
                    return res.status(500).json({ success: false, error: 'Internal server error' });
                }
                res.status(200).json({ success: true, data: rows, count: rows.length });
            });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    },
    
    addEvent: async (req, res) => {
        try {
            const { name, date, tickets_available } = req.body;
            
            // Validation
            const errors = [];
            if (!name || name.trim().length === 0) {
                errors.push('Event name is required');
            }
            if (!date) {
                errors.push('Event date is required');
            } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                errors.push('Event date must be in YYYY-MM-DD format');
            } else if (new Date(date) < new Date().setHours(0, 0, 0, 0)) {
                errors.push('Event date cannot be in the past');
            }
            if (tickets_available === undefined || tickets_available === null) {
                errors.push('Number of tickets available is required');
            } else if (parseInt(tickets_available) < 0) {
                errors.push('Number of tickets cannot be negative');
            }
            
            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors
                });
            }
            
            testDb.run(
                `INSERT INTO events (name, date, tickets_available, created_at, updated_at)
                 VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
                [name.trim(), date, parseInt(tickets_available)],
                function(err) {
                    if (err) {
                        return res.status(500).json({ success: false, error: 'Internal server error' });
                    }
                    testDb.get('SELECT * FROM events WHERE id = ?', [this.lastID], (err, row) => {
                        if (err) {
                            return res.status(500).json({ success: false, error: 'Internal server error' });
                        }
                        res.status(201).json({
                            success: true,
                            data: row,
                            message: 'Event created successfully'
                        });
                    });
                }
            );
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    },
    
    getEvent: async (req, res) => {
        try {
            const eventId = parseInt(req.params.id);
            
            if (isNaN(eventId) || eventId <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid event ID',
                    message: 'Event ID must be a positive integer'
                });
            }
            
            testDb.get('SELECT * FROM events WHERE id = ?', [eventId], (err, row) => {
                if (err) {
                    return res.status(500).json({ success: false, error: 'Internal server error' });
                }
                if (!row) {
                    return res.status(404).json({
                        success: false,
                        error: 'Event not found',
                        message: `No event found with ID ${eventId}`
                    });
                }
                res.status(200).json({ success: true, data: row });
            });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    },
    
    updateEventById: async (req, res) => {
        try {
            const eventId = parseInt(req.params.id);
            
            if (isNaN(eventId) || eventId <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid event ID',
                    message: 'Event ID must be a positive integer'
                });
            }
            
            const { name, date, tickets_available } = req.body;
            const fields = [];
            const values = [];
            
            if (name !== undefined) {
                if (typeof name !== 'string' || name.trim().length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid event name'
                    });
                }
                fields.push('name = ?');
                values.push(name.trim());
            }
            
            if (date !== undefined) {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid date format'
                    });
                }
                fields.push('date = ?');
                values.push(date);
            }
            
            if (tickets_available !== undefined) {
                const count = parseInt(tickets_available);
                if (isNaN(count) || count < 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid ticket count'
                    });
                }
                fields.push('tickets_available = ?');
                values.push(count);
            }
            
            if (fields.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No update data provided'
                });
            }
            
            fields.push('updated_at = datetime(\'now\')');
            values.push(eventId);
            
            testDb.run(
                `UPDATE events SET ${fields.join(', ')} WHERE id = ?`,
                values,
                function(err) {
                    if (err) {
                        return res.status(500).json({ success: false, error: 'Internal server error' });
                    }
                    if (this.changes === 0) {
                        return res.status(404).json({
                            success: false,
                            error: 'Event not found',
                            message: `No event found with ID ${eventId}`
                        });
                    }
                    testDb.get('SELECT * FROM events WHERE id = ?', [eventId], (err, row) => {
                        if (err) {
                            return res.status(500).json({ success: false, error: 'Internal server error' });
                        }
                        res.status(200).json({
                            success: true,
                            data: row,
                            message: 'Event updated successfully'
                        });
                    });
                }
            );
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
};

// Setup routes
app.get('/api/admin/events', mockAdminController.listEvents);
app.post('/api/admin/events', mockAdminController.addEvent);
app.get('/api/admin/events/:id', mockAdminController.getEvent);
app.put('/api/admin/events/:id', mockAdminController.updateEventById);

describe('Admin Service API - GET /api/admin/events', () => {
    beforeEach(async () => {
        await clearEvents();
    });

    test('should return all events', async () => {
        // Insert test data
        await new Promise((resolve) => {
            testDb.run(
                `INSERT INTO events (name, date, tickets_available) VALUES (?, ?, ?)`,
                ['Concert', '2025-12-01', 100],
                resolve
            );
        });
        await new Promise((resolve) => {
            testDb.run(
                `INSERT INTO events (name, date, tickets_available) VALUES (?, ?, ?)`,
                ['Game', '2025-12-15', 50],
                resolve
            );
        });

        const response = await request(app)
            .get('/api/admin/events')
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.count).toBe(2);
        expect(response.body.data).toHaveLength(2);
    });

    test('should return empty array when no events', async () => {
        const response = await request(app)
            .get('/api/admin/events')
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual([]);
        expect(response.body.count).toBe(0);
    });
});

describe('Admin Service API - POST /api/admin/events', () => {
    beforeEach(async () => {
        await clearEvents();
    });

    test('should create a new event', async () => {
        const newEvent = {
            name: 'Test Concert',
            date: '2025-12-20',
            tickets_available: 200
        };

        const response = await request(app)
            .post('/api/admin/events')
            .send(newEvent)
            .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
            name: 'Test Concert',
            date: '2025-12-20',
            tickets_available: 200
        });
        expect(response.body.data.id).toBeDefined();
    });

    test('should reject event with missing name', async () => {
        const response = await request(app)
            .post('/api/admin/events')
            .send({
                date: '2025-12-20',
                tickets_available: 200
            })
            .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.details).toContain('Event name is required');
    });

    test('should reject event with missing date', async () => {
        const response = await request(app)
            .post('/api/admin/events')
            .send({
                name: 'Concert',
                tickets_available: 200
            })
            .expect(400);

        expect(response.body.details).toContain('Event date is required');
    });

    test('should reject event with past date', async () => {
        const response = await request(app)
            .post('/api/admin/events')
            .send({
                name: 'Concert',
                date: '2020-01-01',
                tickets_available: 200
            })
            .expect(400);

        expect(response.body.details).toContain('Event date cannot be in the past');
    });

    test('should reject event with invalid date format', async () => {
        const response = await request(app)
            .post('/api/admin/events')
            .send({
                name: 'Concert',
                date: '12/20/2025',
                tickets_available: 200
            })
            .expect(400);

        expect(response.body.details[0]).toContain('YYYY-MM-DD format');
    });

    test('should reject event with negative tickets', async () => {
        const response = await request(app)
            .post('/api/admin/events')
            .send({
                name: 'Concert',
                date: '2025-12-20',
                tickets_available: -10
            })
            .expect(400);

        expect(response.body.details[0]).toContain('cannot be negative');
    });

    test('should trim whitespace from event name', async () => {
        const response = await request(app)
            .post('/api/admin/events')
            .send({
                name: '  Concert  ',
                date: '2025-12-20',
                tickets_available: 200
            })
            .expect(201);

        expect(response.body.data.name).toBe('Concert');
    });
});

describe('Admin Service API - GET /api/admin/events/:id', () => {
    beforeEach(async () => {
        await clearEvents();
    });

    test('should return specific event by ID', async () => {
        const eventId = await new Promise((resolve) => {
            testDb.run(
                `INSERT INTO events (name, date, tickets_available) VALUES (?, ?, ?)`,
                ['Concert', '2025-12-01', 100],
                function() {
                    resolve(this.lastID);
                }
            );
        });

        const response = await request(app)
            .get(`/api/admin/events/${eventId}`)
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Concert');
    });

    test('should return 404 for non-existent event', async () => {
        const response = await request(app)
            .get('/api/admin/events/9999')
            .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Event not found');
    });

    test('should return 400 for invalid event ID', async () => {
        const response = await request(app)
            .get('/api/admin/events/abc')
            .expect(400);

        expect(response.body.error).toBe('Invalid event ID');
    });
});

describe('Admin Service API - PUT /api/admin/events/:id', () => {
    beforeEach(async () => {
        await clearEvents();
    });

    test('should update event name', async () => {
        const eventId = await new Promise((resolve) => {
            testDb.run(
                `INSERT INTO events (name, date, tickets_available) VALUES (?, ?, ?)`,
                ['Old Name', '2025-12-01', 100],
                function() {
                    resolve(this.lastID);
                }
            );
        });

        const response = await request(app)
            .put(`/api/admin/events/${eventId}`)
            .send({ name: 'New Name' })
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('New Name');
    });

    test('should update multiple fields', async () => {
        const eventId = await new Promise((resolve) => {
            testDb.run(
                `INSERT INTO events (name, date, tickets_available) VALUES (?, ?, ?)`,
                ['Event', '2025-12-01', 100],
                function() {
                    resolve(this.lastID);
                }
            );
        });

        const response = await request(app)
            .put(`/api/admin/events/${eventId}`)
            .send({
                name: 'Updated Event',
                date: '2025-12-25',
                tickets_available: 250
            })
            .expect(200);

        expect(response.body.data.name).toBe('Updated Event');
        expect(response.body.data.date).toBe('2025-12-25');
        expect(response.body.data.tickets_available).toBe(250);
    });

    test('should return 404 for non-existent event', async () => {
        const response = await request(app)
            .put('/api/admin/events/9999')
            .send({ name: 'Updated' })
            .expect(404);

        expect(response.body.error).toBe('Event not found');
    });

    test('should return 400 when no fields provided', async () => {
        const eventId = await new Promise((resolve) => {
            testDb.run(
                `INSERT INTO events (name, date, tickets_available) VALUES (?, ?, ?)`,
                ['Event', '2025-12-01', 100],
                function() {
                    resolve(this.lastID);
                }
            );
        });

        const response = await request(app)
            .put(`/api/admin/events/${eventId}`)
            .send({})
            .expect(400);

        expect(response.body.error).toBe('No update data provided');
    });
});

describe('Admin Service API - Response Format Consistency', () => {
    beforeEach(async () => {
        await clearEvents();
    });

    test('all success responses should have success: true', async () => {
        const createResponse = await request(app)
            .post('/api/admin/events')
            .send({
                name: 'Event',
                date: '2025-12-01',
                tickets_available: 100
            });

        expect(createResponse.body.success).toBe(true);

        const listResponse = await request(app).get('/api/admin/events');
        expect(listResponse.body.success).toBe(true);
    });

    test('all error responses should have success: false', async () => {
        const response = await request(app)
            .get('/api/admin/events/abc');

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
    });
});
