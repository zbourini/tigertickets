const request = require('supertest');
const express = require('express');
const adminRoutes = require('../../../routes/adminRoutes');

jest.mock('../../../controllers/adminController');
const adminController = require('../../../controllers/adminController');

describe('Admin Routes', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use('/api/admin', adminRoutes);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/admin/events', () => {
        test('should route to listEvents controller', async () => {
            adminController.listEvents.mockImplementation((req, res) => {
                res.status(200).json({ success: true, data: [], count: 0 });
            });

            const response = await request(app)
                .get('/api/admin/events')
                .expect(200);

            expect(adminController.listEvents).toHaveBeenCalledTimes(1);
            expect(response.body.success).toBe(true);
        });

        test('should accept GET requests', async () => {
            adminController.listEvents.mockImplementation((req, res) => {
                res.status(200).json({ success: true, data: [] });
            });

            await request(app)
                .get('/api/admin/events')
                .expect(200);
        });

        test('should reject POST requests to list endpoint', async () => {
            await request(app)
                .post('/api/admin/events/list')
                .expect(404);
        });
    });

    describe('POST /api/admin/events', () => {
        test('should route to addEvent controller', async () => {
            adminController.addEvent.mockImplementation((req, res) => {
                res.status(201).json({
                    success: true,
                    data: { id: 1, name: 'Test Event' }
                });
            });

            const response = await request(app)
                .post('/api/admin/events')
                .send({ name: 'Test Event', date: '2025-12-20', tickets_available: 100 })
                .expect(201);

            expect(adminController.addEvent).toHaveBeenCalledTimes(1);
            expect(response.body.success).toBe(true);
        });

        test('should pass request body to controller', async () => {
            let capturedReq;
            adminController.addEvent.mockImplementation((req, res) => {
                capturedReq = req;
                res.status(201).json({ success: true });
            });

            await request(app)
                .post('/api/admin/events')
                .send({ name: 'Concert', date: '2025-12-20', tickets_available: 100 });

            expect(capturedReq.body.name).toBe('Concert');
            expect(capturedReq.body.date).toBe('2025-12-20');
            expect(capturedReq.body.tickets_available).toBe(100);
        });

        test('should handle JSON content type', async () => {
            adminController.addEvent.mockImplementation((req, res) => {
                res.status(201).json({ success: true });
            });

            await request(app)
                .post('/api/admin/events')
                .set('Content-Type', 'application/json')
                .send(JSON.stringify({ name: 'Event', date: '2025-12-20', tickets_available: 50 }))
                .expect(201);
        });
    });

    describe('GET /api/admin/events/:id', () => {
        test('should route to getEvent controller', async () => {
            adminController.getEvent.mockImplementation((req, res) => {
                res.status(200).json({
                    success: true,
                    data: { id: 1, name: 'Test Event' }
                });
            });

            const response = await request(app)
                .get('/api/admin/events/1')
                .expect(200);

            expect(adminController.getEvent).toHaveBeenCalledTimes(1);
            expect(response.body.success).toBe(true);
        });

        test('should pass event ID as parameter', async () => {
            let capturedReq;
            adminController.getEvent.mockImplementation((req, res) => {
                capturedReq = req;
                res.status(200).json({ success: true });
            });

            await request(app)
                .get('/api/admin/events/42');

            expect(capturedReq.params.id).toBe('42');
        });

        test('should handle numeric IDs', async () => {
            adminController.getEvent.mockImplementation((req, res) => {
                res.status(200).json({ success: true });
            });

            await request(app)
                .get('/api/admin/events/123')
                .expect(200);
        });

        test('should handle string IDs in URL', async () => {
            let capturedReq;
            adminController.getEvent.mockImplementation((req, res) => {
                capturedReq = req;
                res.status(200).json({ success: true });
            });

            await request(app)
                .get('/api/admin/events/abc');

            expect(capturedReq.params.id).toBe('abc');
        });
    });

    describe('PUT /api/admin/events/:id', () => {
        test('should route to updateEventById controller', async () => {
            adminController.updateEventById.mockImplementation((req, res) => {
                res.status(200).json({
                    success: true,
                    data: { id: 1, name: 'Updated Event' }
                });
            });

            const response = await request(app)
                .put('/api/admin/events/1')
                .send({ name: 'Updated Event' })
                .expect(200);

            expect(adminController.updateEventById).toHaveBeenCalledTimes(1);
            expect(response.body.success).toBe(true);
        });

        test('should pass both ID and body to controller', async () => {
            let capturedReq;
            adminController.updateEventById.mockImplementation((req, res) => {
                capturedReq = req;
                res.status(200).json({ success: true });
            });

            await request(app)
                .put('/api/admin/events/5')
                .send({ name: 'New Name', tickets_available: 200 });

            expect(capturedReq.params.id).toBe('5');
            expect(capturedReq.body.name).toBe('New Name');
            expect(capturedReq.body.tickets_available).toBe(200);
        });

        test('should accept partial updates', async () => {
            adminController.updateEventById.mockImplementation((req, res) => {
                res.status(200).json({ success: true });
            });

            await request(app)
                .put('/api/admin/events/1')
                .send({ tickets_available: 150 })
                .expect(200);
        });

        test('should reject PATCH requests', async () => {
            await request(app)
                .patch('/api/admin/events/1')
                .send({ name: 'Updated' })
                .expect(404);
        });
    });

    describe('Route not found', () => {
        test('should return 404 for undefined routes', async () => {
            await request(app)
                .get('/api/admin/undefined')
                .expect(404);
        });

        test('should return 404 for DELETE requests', async () => {
            await request(app)
                .delete('/api/admin/events/1')
                .expect(404);
        });

        test('should return 404 for nested routes', async () => {
            await request(app)
                .get('/api/admin/events/1/tickets')
                .expect(404);
        });
    });

    describe('HTTP Methods', () => {
        test('GET /api/admin/events should not accept POST', async () => {
            await request(app)
                .post('/api/admin/events/all')
                .expect(404);
        });

        test('POST /api/admin/events should work correctly', async () => {
            adminController.addEvent.mockImplementation((req, res) => {
                res.status(201).json({ success: true });
            });

            await request(app)
                .post('/api/admin/events')
                .send({ name: 'Event', date: '2025-12-20', tickets_available: 100 })
                .expect(201);

            expect(adminController.addEvent).toHaveBeenCalled();
        });
    });

    describe('Request parsing', () => {
        test('should parse JSON body correctly', async () => {
            let capturedBody;
            adminController.addEvent.mockImplementation((req, res) => {
                capturedBody = req.body;
                res.status(201).json({ success: true });
            });

            const eventData = {
                name: 'Test Concert',
                date: '2025-12-20',
                tickets_available: 100
            };

            await request(app)
                .post('/api/admin/events')
                .send(eventData);

            expect(capturedBody).toEqual(eventData);
        });

        test('should handle empty body', async () => {
            let capturedBody;
            adminController.addEvent.mockImplementation((req, res) => {
                capturedBody = req.body;
                res.status(400).json({ success: false });
            });

            await request(app)
                .post('/api/admin/events')
                .send({});

            expect(capturedBody).toEqual({});
        });
    });

    describe('Response format', () => {
        test('should return JSON content type', async () => {
            adminController.listEvents.mockImplementation((req, res) => {
                res.status(200).json({ success: true });
            });

            const response = await request(app)
                .get('/api/admin/events');

            expect(response.headers['content-type']).toMatch(/json/);
        });

        test('should maintain response structure from controller', async () => {
            const mockResponse = {
                success: true,
                data: [{ id: 1, name: 'Event' }],
                count: 1
            };

            adminController.listEvents.mockImplementation((req, res) => {
                res.status(200).json(mockResponse);
            });

            const response = await request(app)
                .get('/api/admin/events');

            expect(response.body).toEqual(mockResponse);
        });
    });
});
