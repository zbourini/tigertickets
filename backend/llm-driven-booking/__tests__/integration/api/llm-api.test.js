const request = require('supertest');
const express = require('express');
const llmRoutes = require('../../../routes/llmRoutes');

// Mock the controller
jest.mock('../../../controllers/llmController');
const llmController = require('../../../controllers/llmController');

describe('LLM Routes - Integration Tests', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(llmRoutes);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /parse', () => {
        test('should call parseUserInput controller', async () => {
            llmController.parseUserInput.mockImplementation((req, res) => {
                res.status(200).json({
                    success: true,
                    data: {
                        text: 'Found events',
                        foundEvents: []
                    }
                });
            });

            const response = await request(app)
                .post('/parse')
                .send({ message: 'Find basketball games' });

            expect(response.status).toBe(200);
            expect(llmController.parseUserInput).toHaveBeenCalled();
        });

        test('should accept message in request body', async () => {
            llmController.parseUserInput.mockImplementation((req, res) => {
                expect(req.body.message).toBe('Test message');
                res.status(200).json({
                    success: true,
                    data: { text: 'Response', foundEvents: [] }
                });
            });

            await request(app)
                .post('/parse')
                .send({ message: 'Test message' });

            expect(llmController.parseUserInput).toHaveBeenCalled();
        });

        test('should handle successful event search', async () => {
            const mockResponse = {
                success: true,
                data: {
                    text: 'I found a basketball game for you.',
                    foundEvents: [
                        {
                            event_id: 1,
                            name: 'Basketball Game',
                            date: '2025-12-15',
                            tickets_available: 100
                        }
                    ]
                }
            };

            llmController.parseUserInput.mockImplementation((req, res) => {
                res.status(200).json(mockResponse);
            });

            const response = await request(app)
                .post('/parse')
                .send({ message: 'Find basketball games' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockResponse);
        });

        test('should handle no events found', async () => {
            const mockResponse = {
                success: true,
                data: {
                    text: 'No events found matching your search.',
                    foundEvents: []
                }
            };

            llmController.parseUserInput.mockImplementation((req, res) => {
                res.status(200).json(mockResponse);
            });

            const response = await request(app)
                .post('/parse')
                .send({ message: 'Find opera events' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockResponse);
        });

        test('should handle controller errors', async () => {
            llmController.parseUserInput.mockImplementation((req, res) => {
                res.status(500).json({
                    success: false,
                    error: 'Failed to parse input',
                    message: 'LLM service unavailable'
                });
            });

            const response = await request(app)
                .post('/parse')
                .send({ message: 'Find events' });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                success: false,
                error: 'Failed to parse input',
                message: 'LLM service unavailable'
            });
        });

        test('should handle empty message', async () => {
            llmController.parseUserInput.mockImplementation((req, res) => {
                res.status(200).json({
                    success: true,
                    data: {
                        text: 'Please provide more information.',
                        foundEvents: []
                    }
                });
            });

            const response = await request(app)
                .post('/parse')
                .send({ message: '' });

            expect(response.status).toBe(200);
        });

        test('should handle missing message field', async () => {
            llmController.parseUserInput.mockImplementation((req, res) => {
                res.status(200).json({
                    success: true,
                    data: {
                        text: 'How can I help you?',
                        foundEvents: []
                    }
                });
            });

            const response = await request(app)
                .post('/parse')
                .send({});

            expect(response.status).toBe(200);
        });

        test('should handle messages with special characters', async () => {
            llmController.parseUserInput.mockImplementation((req, res) => {
                res.status(200).json({
                    success: true,
                    data: {
                        text: 'Searching for events...',
                        foundEvents: []
                    }
                });
            });

            const response = await request(app)
                .post('/parse')
                .send({ message: 'Find "Rock & Roll" concert!!!' });

            expect(response.status).toBe(200);
        });

        test('should return JSON content type', async () => {
            llmController.parseUserInput.mockImplementation((req, res) => {
                res.status(200).json({
                    success: true,
                    data: { text: 'Response', foundEvents: [] }
                });
            });

            const response = await request(app)
                .post('/parse')
                .send({ message: 'Test' });

            expect(response.headers['content-type']).toMatch(/json/);
        });

        test('should handle multiple events in response', async () => {
            const mockResponse = {
                success: true,
                data: {
                    text: 'Found 3 concerts for you.',
                    foundEvents: [
                        { event_id: 1, name: 'Rock Concert', date: '2025-12-01', tickets_available: 200 },
                        { event_id: 2, name: 'Jazz Concert', date: '2025-12-10', tickets_available: 150 },
                        { event_id: 3, name: 'Pop Concert', date: '2025-12-20', tickets_available: 300 }
                    ]
                }
            };

            llmController.parseUserInput.mockImplementation((req, res) => {
                res.status(200).json(mockResponse);
            });

            const response = await request(app)
                .post('/parse')
                .send({ message: 'Show me all concerts' });

            expect(response.status).toBe(200);
            expect(response.body.data.foundEvents).toHaveLength(3);
        });

        test('should handle long messages', async () => {
            const longMessage = 'I want to buy tickets '.repeat(50);
            
            llmController.parseUserInput.mockImplementation((req, res) => {
                res.status(200).json({
                    success: true,
                    data: { text: 'Response', foundEvents: [] }
                });
            });

            const response = await request(app)
                .post('/parse')
                .send({ message: longMessage });

            expect(response.status).toBe(200);
        });

        test('should handle database errors from controller', async () => {
            llmController.parseUserInput.mockImplementation((req, res) => {
                res.status(500).json({
                    success: false,
                    error: 'Failed to parse input',
                    message: 'Database connection failed'
                });
            });

            const response = await request(app)
                .post('/parse')
                .send({ message: 'Find events' });

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Database connection failed');
        });

        test('should handle network errors from controller', async () => {
            llmController.parseUserInput.mockImplementation((req, res) => {
                res.status(500).json({
                    success: false,
                    error: 'Failed to parse input',
                    message: 'Network timeout'
                });
            });

            const response = await request(app)
                .post('/parse')
                .send({ message: 'Book tickets' });

            expect(response.status).toBe(500);
        });

        test('should handle greeting messages', async () => {
            const mockResponse = {
                success: true,
                data: {
                    text: 'Hello! How can I help you with event tickets today?',
                    foundEvents: []
                }
            };

            llmController.parseUserInput.mockImplementation((req, res) => {
                res.status(200).json(mockResponse);
            });

            const response = await request(app)
                .post('/parse')
                .send({ message: 'Hello' });

            expect(response.status).toBe(200);
            expect(response.body.data.text).toContain('Hello');
        });

        test('should handle case-insensitive queries', async () => {
            llmController.parseUserInput.mockImplementation((req, res) => {
                res.status(200).json({
                    success: true,
                    data: {
                        text: 'Found events',
                        foundEvents: [
                            { event_id: 1, name: 'BASKETBALL GAME', date: '2025-12-15', tickets_available: 100 }
                        ]
                    }
                });
            });

            const response = await request(app)
                .post('/parse')
                .send({ message: 'FIND BASKETBALL GAMES' });

            expect(response.status).toBe(200);
        });

        test('should handle tool call results in response', async () => {
            const mockResponse = {
                success: true,
                data: {
                    text: 'Found events using search tool.',
                    toolCalls: [
                        {
                            toolName: 'searchEventsByName',
                            args: { searchTerm: 'basketball' }
                        }
                    ],
                    toolResults: [
                        {
                            toolName: 'searchEventsByName',
                            result: 'Found 1 event(s)'
                        }
                    ],
                    foundEvents: [
                        { event_id: 1, name: 'Basketball Game', date: '2025-12-15', tickets_available: 100 }
                    ]
                }
            };

            llmController.parseUserInput.mockImplementation((req, res) => {
                res.status(200).json(mockResponse);
            });

            const response = await request(app)
                .post('/parse')
                .send({ message: 'Find basketball' });

            expect(response.status).toBe(200);
            expect(response.body.data.toolCalls).toBeDefined();
            expect(response.body.data.toolResults).toBeDefined();
        });
    });

    describe('Route not found', () => {
        test('should return 404 for undefined routes', async () => {
            const response = await request(app)
                .get('/api/llm/undefined');

            expect(response.status).toBe(404);
        });

        test('should return 404 for wrong HTTP method', async () => {
            const response = await request(app)
                .get('/parse');

            expect(response.status).toBe(404);
        });
    });
});
