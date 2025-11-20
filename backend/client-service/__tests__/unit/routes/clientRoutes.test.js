const request = require('supertest');
const express = require('express');
const clientRoutes = require('../../../routes/clientRoutes');
const clientController = require('../../../controllers/clientController');

// Mock the controller
jest.mock('../../../controllers/clientController');

describe('Client Routes', () => {
    let app;

    beforeEach(() => {
        // Create a fresh Express app for each test
        app = express();
        app.use(express.json());
        app.use('/api', clientRoutes);
        
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    describe('GET /api/events', () => {
        test('should call getAllEvents controller', async () => {
            clientController.getAllEvents.mockImplementation((req, res) => {
                res.status(200).json({ success: true, events: [] });
            });

            const response = await request(app).get('/api/events');

            expect(clientController.getAllEvents).toHaveBeenCalledTimes(1);
            expect(response.status).toBe(200);
        });
    });

    describe('GET /api/events/:id', () => {
        test('should call getEventById controller with correct ID', async () => {
            clientController.getEventById.mockImplementation((req, res) => {
                res.status(200).json({ 
                    success: true, 
                    event: { id: 1, name: 'Test Event' } 
                });
            });

            const response = await request(app).get('/api/events/1');

            expect(clientController.getEventById).toHaveBeenCalledTimes(1);
            expect(response.status).toBe(200);
        });

        test('should handle string IDs', async () => {
            clientController.getEventById.mockImplementation((req, res) => {
                res.status(200).json({ success: true });
            });

            const response = await request(app).get('/api/events/abc');

            expect(clientController.getEventById).toHaveBeenCalledTimes(1);
        });
    });

    describe('POST /api/events/:id/purchase', () => {
        test('should call purchaseTickets controller', async () => {
            clientController.purchaseTickets.mockImplementation((req, res) => {
                res.status(200).json({ 
                    success: true, 
                    message: 'Purchase successful' 
                });
            });

            const response = await request(app)
                .post('/api/events/1/purchase')
                .send({ ticketCount: 2 });

            expect(clientController.purchaseTickets).toHaveBeenCalledTimes(1);
            expect(response.status).toBe(200);
        });

        test('should handle purchase without body', async () => {
            clientController.purchaseTickets.mockImplementation((req, res) => {
                res.status(200).json({ success: true });
            });

            const response = await request(app)
                .post('/api/events/1/purchase');

            expect(clientController.purchaseTickets).toHaveBeenCalledTimes(1);
        });

        test('should pass request body to controller', async () => {
            clientController.purchaseTickets.mockImplementation((req, res) => {
                res.status(200).json({ 
                    success: true,
                    ticketCount: req.body.ticketCount 
                });
            });

            const response = await request(app)
                .post('/api/events/5/purchase')
                .send({ ticketCount: 10 });

            expect(clientController.purchaseTickets).toHaveBeenCalledTimes(1);
            expect(response.body.ticketCount).toBe(10);
        });
    });

    describe('Invalid routes', () => {
        test('should return 404 for non-existent routes', async () => {
            const response = await request(app).get('/api/invalid');
            expect(response.status).toBe(404);
        });

        test('should return 404 for wrong HTTP method', async () => {
            const response = await request(app).delete('/api/events/1');
            expect(response.status).toBe(404);
        });
    });
});
