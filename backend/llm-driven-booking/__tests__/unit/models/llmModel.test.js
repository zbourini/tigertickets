const llmModel = require('../../../models/llmModel');

// Mock dependencies
jest.mock('sqlite3', () => {
    const mockDatabase = jest.fn();
    mockDatabase.prototype.all = jest.fn();
    mockDatabase.prototype.close = jest.fn();
    return {
        verbose: () => ({
            Database: mockDatabase
        })
    };
});

jest.mock('@ai-sdk/groq', () => ({
    groq: jest.fn()
}));

jest.mock('ai', () => ({
    generateText: jest.fn(),
    tool: jest.fn((config) => config),
    jsonSchema: jest.fn((schema) => schema)
}));

const sqlite3 = require('sqlite3');
const ai = require('ai');
const groq = require('@ai-sdk/groq');

describe('LLM Model - parseInput', () => {
    let mockDb;

    beforeEach(() => {
        jest.clearAllMocks();
        console.log = jest.fn();
        console.error = jest.fn();

        // Setup mock database
        mockDb = new (sqlite3.verbose().Database)();
        mockDb.all.mockImplementation((query, params, callback) => {
            callback(null, []);
        });
        mockDb.close.mockImplementation(() => {});
    });

    test('should parse simple event search query', async () => {
        const mockResult = {
            text: 'I found a basketball game for you.',
            toolCalls: [],
            toolResults: [],
            foundEvents: []
        };

        ai.generateText.mockResolvedValue(mockResult);
        groq.groq.mockReturnValue('mock-model');

        const result = await llmModel.parseInput('Find basketball games');

        expect(ai.generateText).toHaveBeenCalledWith(
            expect.objectContaining({
                model: 'mock-model',
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        role: 'system',
                        content: expect.stringContaining('TigerTickets')
                    }),
                    expect.objectContaining({
                        role: 'user',
                        content: 'Find basketball games'
                    })
                ])
            })
        );
        expect(result).toEqual(mockResult);
    });

    test('should handle tool execution for event search', async () => {
        const mockEvents = [
            {
                id: 1,
                name: 'Basketball Game',
                date: '2025-12-15',
                tickets_available: 100,
                created_at: '2025-01-01',
                updated_at: '2025-01-01'
            }
        ];

        // Mock database to return events
        mockDb.all.mockImplementation((query, params, callback) => {
            callback(null, mockEvents);
        });

        let capturedToolExecute;
        ai.tool.mockImplementation((config) => {
            capturedToolExecute = config.execute;
            return config;
        });

        const mockResult = {
            text: 'Found basketball events.',
            toolCalls: [],
            toolResults: [],
            foundEvents: []
        };

        ai.generateText.mockResolvedValue(mockResult);

        await llmModel.parseInput('Show me basketball games');

        expect(ai.tool).toHaveBeenCalledWith(
            expect.objectContaining({
                description: expect.stringContaining('Search for events'),
                inputSchema: expect.any(Object)
            })
        );
    });

    test('should handle empty search results', async () => {
        mockDb.all.mockImplementation((query, params, callback) => {
            callback(null, []);
        });

        const mockResult = {
            text: 'No events found.',
            toolCalls: [],
            toolResults: [],
            foundEvents: []
        };

        ai.generateText.mockResolvedValue(mockResult);

        const result = await llmModel.parseInput('Find opera events');

        expect(result).toEqual(mockResult);
    });

    test('should handle multiple events in search', async () => {
        const mockEvents = [
            {
                id: 1,
                name: 'Rock Concert',
                date: '2025-12-01',
                tickets_available: 200,
                created_at: '2025-01-01',
                updated_at: '2025-01-01'
            },
            {
                id: 2,
                name: 'Jazz Concert',
                date: '2025-12-10',
                tickets_available: 150,
                created_at: '2025-01-01',
                updated_at: '2025-01-01'
            }
        ];

        mockDb.all.mockImplementation((query, params, callback) => {
            callback(null, mockEvents);
        });

        const mockResult = {
            text: 'Found 2 concerts.',
            toolCalls: [],
            toolResults: [],
            foundEvents: []
        };

        ai.generateText.mockResolvedValue(mockResult);

        const result = await llmModel.parseInput('Show me concerts');

        expect(result).toEqual(mockResult);
    });

    test('should handle LLM API errors', async () => {
        ai.generateText.mockRejectedValue(new Error('LLM API error'));

        await expect(llmModel.parseInput('Find events')).rejects.toThrow('LLM API error');
    });

    test('should handle database errors during search', async () => {
        // Mock database to fail
        mockDb.all.mockImplementation((query, params, callback) => {
            callback(new Error('Database error'), null);
        });

        // Mock AI to return error result
        ai.generateText.mockResolvedValue({
            text: 'Unable to search events at this time.',
            toolCalls: [],
            toolResults: [],
            foundEvents: []
        });

        const result = await llmModel.parseInput('Find basketball');
        expect(result).toBeDefined();
        expect(result.foundEvents).toEqual([]);
    });

    test('should use correct model configuration', async () => {
        const mockModelConfig = 'mock-groq-model';
        groq.groq.mockReturnValue(mockModelConfig);

        ai.generateText.mockResolvedValue({
            text: 'Response',
            toolCalls: [],
            toolResults: [],
            foundEvents: []
        });

        await llmModel.parseInput('Test message');

        expect(groq.groq).toHaveBeenCalledWith('openai/gpt-oss-20b');
        expect(ai.generateText).toHaveBeenCalledWith(
            expect.objectContaining({
                model: mockModelConfig
            })
        );
    });

    test('should set maxSteps to 5', async () => {
        ai.generateText.mockResolvedValue({
            text: 'Response',
            toolCalls: [],
            toolResults: [],
            foundEvents: []
        });

        await llmModel.parseInput('Test');

        expect(ai.generateText).toHaveBeenCalledWith(
            expect.objectContaining({
                maxSteps: 5
            })
        );
    });

    test('should include system prompt for TigerTickets', async () => {
        ai.generateText.mockResolvedValue({
            text: 'Response',
            toolCalls: [],
            toolResults: [],
            foundEvents: []
        });

        await llmModel.parseInput('Help me');

        expect(ai.generateText).toHaveBeenCalledWith(
            expect.objectContaining({
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        role: 'system',
                        content: expect.stringContaining('TigerTickets')
                    })
                ])
            })
        );
    });

    test('should handle special characters in search terms', async () => {
        const mockResult = {
            text: 'Searching...',
            toolCalls: [],
            toolResults: [],
            foundEvents: []
        };

        ai.generateText.mockResolvedValue(mockResult);

        const result = await llmModel.parseInput('Find "Rock & Roll" concert!');

        expect(result).toEqual(mockResult);
    });

    test('should handle very long input messages', async () => {
        const longMessage = 'I want to see '.repeat(100) + 'basketball';
        
        const mockResult = {
            text: 'Response to long message',
            toolCalls: [],
            toolResults: [],
            foundEvents: []
        };

        ai.generateText.mockResolvedValue(mockResult);

        const result = await llmModel.parseInput(longMessage);

        expect(result).toEqual(mockResult);
        expect(ai.generateText).toHaveBeenCalledWith(
            expect.objectContaining({
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        role: 'user',
                        content: longMessage
                    })
                ])
            })
        );
    });

    test('should attach foundEvents to result', async () => {
        const mockResult = {
            text: 'Found events',
            toolCalls: [],
            toolResults: []
        };

        ai.generateText.mockResolvedValue(mockResult);

        const result = await llmModel.parseInput('Search events');

        expect(result).toHaveProperty('foundEvents');
        expect(Array.isArray(result.foundEvents)).toBe(true);
    });

    test('should handle greeting messages without tool calls', async () => {
        const mockResult = {
            text: 'Hello! How can I help you with tickets today?',
            toolCalls: [],
            toolResults: [],
            foundEvents: []
        };

        ai.generateText.mockResolvedValue(mockResult);

        const result = await llmModel.parseInput('Hello');

        expect(result.text).toContain('Hello');
        expect(result.foundEvents).toHaveLength(0);
    });

    test('should configure searchEventsByName tool correctly', async () => {
        ai.generateText.mockResolvedValue({
            text: 'Response',
            foundEvents: []
        });

        await llmModel.parseInput('Find events');

        expect(ai.tool).toHaveBeenCalledWith(
            expect.objectContaining({
                description: expect.stringContaining('Search for events'),
                inputSchema: expect.objectContaining({
                    type: 'object',
                    properties: expect.objectContaining({
                        searchTerm: expect.any(Object)
                    }),
                    required: ['searchTerm']
                }),
                execute: expect.any(Function)
            })
        );
    });

    test('should handle case-insensitive event searches', async () => {
        const mockResult = {
            text: 'Found basketball events',
            toolCalls: [],
            toolResults: [],
            foundEvents: []
        };

        ai.generateText.mockResolvedValue(mockResult);

        const result = await llmModel.parseInput('FIND BASKETBALL GAMES');

        expect(result).toEqual(mockResult);
    });

    test('should handle ticket quantity in messages', async () => {
        const mockResult = {
            text: 'I can help you purchase 5 tickets.',
            toolCalls: [],
            toolResults: [],
            foundEvents: []
        };

        ai.generateText.mockResolvedValue(mockResult);

        const result = await llmModel.parseInput('I need 5 tickets for basketball');

        expect(result).toEqual(mockResult);
    });

    test('should handle date-specific queries', async () => {
        const mockResult = {
            text: 'Looking for events on that date.',
            toolCalls: [],
            toolResults: [],
            foundEvents: []
        };

        ai.generateText.mockResolvedValue(mockResult);

        const result = await llmModel.parseInput('What events are on December 15?');

        expect(result).toEqual(mockResult);
    });
});
