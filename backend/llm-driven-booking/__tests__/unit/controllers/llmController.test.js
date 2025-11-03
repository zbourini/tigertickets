const { parseUserInput } = require('../../../controllers/llmController');

jest.mock('../../../models/llmModel');
const llmModel = require('../../../models/llmModel');

describe('LLM Controller - parseUserInput', () => {
    let req, res;

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
        console.log = jest.fn();
        console.error = jest.fn();
    });

    test('should successfully parse user input with event search', async () => {
        const mockParsedResult = {
            text: 'I found a basketball game for you.',
            toolCalls: [],
            toolResults: [],
            foundEvents: [
                {
                    event_id: 1,
                    name: 'Basketball Game',
                    date: '2025-12-15',
                    tickets_available: 100
                }
            ]
        };

        req = {
            body: {
                message: 'I want to buy tickets for a basketball game'
            }
        };

        llmModel.parseInput.mockResolvedValue(mockParsedResult);

        await parseUserInput(req, res);

        expect(llmModel.parseInput).toHaveBeenCalledWith('I want to buy tickets for a basketball game');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: mockParsedResult
        });
    });

    test('should handle simple greeting messages', async () => {
        const mockParsedResult = {
            text: 'Hello! How can I help you with event tickets today?',
            toolCalls: [],
            toolResults: [],
            foundEvents: []
        };

        req = {
            body: {
                message: 'Hello'
            }
        };

        llmModel.parseInput.mockResolvedValue(mockParsedResult);

        await parseUserInput(req, res);

        expect(llmModel.parseInput).toHaveBeenCalledWith('Hello');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: mockParsedResult
        });
    });

    test('should handle multiple events found', async () => {
        const mockParsedResult = {
            text: 'I found 3 concert events for you.',
            toolCalls: [],
            toolResults: [],
            foundEvents: [
                {
                    event_id: 1,
                    name: 'Rock Concert',
                    date: '2025-12-01',
                    tickets_available: 200
                },
                {
                    event_id: 2,
                    name: 'Jazz Concert',
                    date: '2025-12-10',
                    tickets_available: 150
                },
                {
                    event_id: 3,
                    name: 'Pop Concert',
                    date: '2025-12-20',
                    tickets_available: 300
                }
            ]
        };

        req = {
            body: {
                message: 'Show me all concerts'
            }
        };

        llmModel.parseInput.mockResolvedValue(mockParsedResult);

        await parseUserInput(req, res);

        expect(llmModel.parseInput).toHaveBeenCalledWith('Show me all concerts');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: mockParsedResult
        });
        expect(mockParsedResult.foundEvents).toHaveLength(3);
    });

    test('should handle no events found scenario', async () => {
        const mockParsedResult = {
            text: 'Sorry, I could not find any events matching "opera".',
            toolCalls: [],
            toolResults: [],
            foundEvents: []
        };

        req = {
            body: {
                message: 'I want to see an opera'
            }
        };

        llmModel.parseInput.mockResolvedValue(mockParsedResult);

        await parseUserInput(req, res);

        expect(llmModel.parseInput).toHaveBeenCalledWith('I want to see an opera');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: mockParsedResult
        });
        expect(mockParsedResult.foundEvents).toHaveLength(0);
    });

    test('should handle empty message', async () => {
        const mockParsedResult = {
            text: 'Please provide more information about what event you are looking for.',
            toolCalls: [],
            toolResults: [],
            foundEvents: []
        };

        req = {
            body: {
                message: ''
            }
        };

        llmModel.parseInput.mockResolvedValue(mockParsedResult);

        await parseUserInput(req, res);

        expect(llmModel.parseInput).toHaveBeenCalledWith('');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: mockParsedResult
        });
    });

    test('should handle complex ticket purchase queries', async () => {
        const mockParsedResult = {
            text: 'I found a basketball game on December 15. How many tickets would you like?',
            toolCalls: [
                {
                    toolName: 'searchEventsByName',
                    args: { searchTerm: 'basketball' }
                }
            ],
            toolResults: [
                {
                    toolName: 'searchEventsByName',
                    result: 'Found 1 event(s):\n- Event ID: 1\n  Name: Basketball Game\n  Date: 2025-12-15\n  Available Tickets: 100'
                }
            ],
            foundEvents: [
                {
                    event_id: 1,
                    name: 'Basketball Game',
                    date: '2025-12-15',
                    tickets_available: 100
                }
            ]
        };

        req = {
            body: {
                message: 'I need 5 tickets for the basketball game'
            }
        };

        llmModel.parseInput.mockResolvedValue(mockParsedResult);

        await parseUserInput(req, res);

        expect(llmModel.parseInput).toHaveBeenCalledWith('I need 5 tickets for the basketball game');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: mockParsedResult
        });
    });

    test('should handle LLM parsing errors gracefully', async () => {
        req = {
            body: {
                message: 'Find me a concert'
            }
        };

        llmModel.parseInput.mockRejectedValue(new Error('LLM service unavailable'));

        await parseUserInput(req, res);

        expect(console.error).toHaveBeenCalledWith('Error in parseUserInput controller:', 'LLM service unavailable');
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Failed to parse input',
            message: 'LLM service unavailable'
        });
    });

    test('should handle network errors', async () => {
        req = {
            body: {
                message: 'Book me tickets'
            }
        };

        llmModel.parseInput.mockRejectedValue(new Error('Network timeout'));

        await parseUserInput(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Failed to parse input',
            message: 'Network timeout'
        });
    });

    test('should handle database connection errors', async () => {
        req = {
            body: {
                message: 'Show available events'
            }
        };

        llmModel.parseInput.mockRejectedValue(new Error('Database connection failed'));

        await parseUserInput(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Failed to parse input',
            message: 'Database connection failed'
        });
    });

    test('should handle API key errors', async () => {
        req = {
            body: {
                message: 'Find tickets'
            }
        };

        llmModel.parseInput.mockRejectedValue(new Error('Invalid API key'));

        await parseUserInput(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Failed to parse input',
            message: 'Invalid API key'
        });
    });

    test('should log received messages', async () => {
        const mockParsedResult = {
            text: 'Response',
            toolCalls: [],
            toolResults: [],
            foundEvents: []
        };

        req = {
            body: {
                message: 'Test message'
            }
        };

        llmModel.parseInput.mockResolvedValue(mockParsedResult);

        await parseUserInput(req, res);

        expect(console.log).toHaveBeenCalledWith('Received message to parse: Test message');
    });

    test('should handle messages with special characters', async () => {
        const mockParsedResult = {
            text: 'I understand you are looking for events.',
            toolCalls: [],
            toolResults: [],
            foundEvents: []
        };

        req = {
            body: {
                message: 'Find me tickets for "Rock & Roll" concert!!!'
            }
        };

        llmModel.parseInput.mockResolvedValue(mockParsedResult);

        await parseUserInput(req, res);

        expect(llmModel.parseInput).toHaveBeenCalledWith('Find me tickets for "Rock & Roll" concert!!!');
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should handle very long messages', async () => {
        const longMessage = 'I want to buy tickets '.repeat(50);
        const mockParsedResult = {
            text: 'Could you please clarify what event you are interested in?',
            toolCalls: [],
            toolResults: [],
            foundEvents: []
        };

        req = {
            body: {
                message: longMessage
            }
        };

        llmModel.parseInput.mockResolvedValue(mockParsedResult);

        await parseUserInput(req, res);

        expect(llmModel.parseInput).toHaveBeenCalledWith(longMessage);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should handle messages with numbers', async () => {
        const mockParsedResult = {
            text: 'Looking for events with those details.',
            toolCalls: [],
            toolResults: [],
            foundEvents: []
        };

        req = {
            body: {
                message: 'I need 10 tickets for event on 2025-12-25'
            }
        };

        llmModel.parseInput.mockResolvedValue(mockParsedResult);

        await parseUserInput(req, res);

        expect(llmModel.parseInput).toHaveBeenCalledWith('I need 10 tickets for event on 2025-12-25');
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should handle case-insensitive event searches', async () => {
        const mockParsedResult = {
            text: 'Found basketball events.',
            toolCalls: [],
            toolResults: [],
            foundEvents: [
                {
                    event_id: 1,
                    name: 'BASKETBALL GAME',
                    date: '2025-12-15',
                    tickets_available: 100
                }
            ]
        };

        req = {
            body: {
                message: 'FIND ME BASKETBALL EVENTS'
            }
        };

        llmModel.parseInput.mockResolvedValue(mockParsedResult);

        await parseUserInput(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: mockParsedResult
        });
    });
});
