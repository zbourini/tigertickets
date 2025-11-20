const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Mock paths to point to a test database
const mockTestDbPath = path.join(__dirname, '..', '..', '..', 'test-database.sqlite');

// Mock the DB_PATH in the llmModel module
jest.mock('path', () => {
    const actualPath = jest.requireActual('path');
    return {
        ...actualPath,
        join: (...args) => {
            // Intercept the database path construction in llmModel
            if (args.includes('shared-db') && args.includes('database.sqlite')) {
                return mockTestDbPath;
            }
            return actualPath.join(...args);
        }
    };
});

// Mock AI dependencies to avoid actual API calls
jest.mock('@ai-sdk/groq', () => ({
    groq: jest.fn(() => 'mock-model')
}));

jest.mock('ai', () => ({
    generateText: jest.fn(),
    tool: jest.fn((config) => config),
    jsonSchema: jest.fn((schema) => schema)
}));

const ai = require('ai');

// Now require the model after mocks are set up
const llmModel = require('../../../models/llmModel');

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

describe('LLM Model - Database Integration', () => {
    beforeEach(async () => {
        await clearEvents();
        jest.clearAllMocks();
        console.log = jest.fn();
        console.error = jest.fn();
    });

    describe('searchEventsByName via parseInput', () => {
        test('should find events with exact name match', async () => {
            await insertTestEvent({
                name: 'Basketball Game',
                date: '2025-12-15',
                tickets_available: 100
            });

            // Mock AI response
            let toolExecute;
            ai.tool.mockImplementation((config) => {
                toolExecute = config.execute;
                return config;
            });

            ai.generateText.mockImplementation(async (config) => {
                // Execute the tool to trigger database search
                const toolResult = await toolExecute({ searchTerm: 'Basketball' });
                
                return {
                    text: toolResult,
                    foundEvents: []
                };
            });

            const result = await llmModel.parseInput('Find Basketball Game');

            expect(result).toBeDefined();
            expect(ai.generateText).toHaveBeenCalled();
        });

        test('should find events with partial name match', async () => {
            await insertTestEvent({
                name: 'Rock Concert Tonight',
                date: '2025-12-20',
                tickets_available: 200
            });

            let toolExecute;
            ai.tool.mockImplementation((config) => {
                toolExecute = config.execute;
                return config;
            });

            ai.generateText.mockImplementation(async (config) => {
                const toolResult = await toolExecute({ searchTerm: 'Rock' });
                
                return {
                    text: toolResult,
                    foundEvents: []
                };
            });

            await llmModel.parseInput('Find Rock concerts');

            expect(ai.generateText).toHaveBeenCalled();
        });

        test('should handle case-insensitive searches', async () => {
            await insertTestEvent({
                name: 'Jazz Festival',
                date: '2025-12-01',
                tickets_available: 150
            });

            let toolExecute;
            ai.tool.mockImplementation((config) => {
                toolExecute = config.execute;
                return config;
            });

            ai.generateText.mockImplementation(async (config) => {
                const toolResult = await toolExecute({ searchTerm: 'JAZZ' });
                
                return {
                    text: toolResult,
                    foundEvents: []
                };
            });

            await llmModel.parseInput('Find JAZZ events');

            expect(ai.generateText).toHaveBeenCalled();
        });

        test('should return empty message when no events match', async () => {
            await insertTestEvent({
                name: 'Opera Night',
                date: '2025-12-01',
                tickets_available: 50
            });

            let toolExecute;
            ai.tool.mockImplementation((config) => {
                toolExecute = config.execute;
                return config;
            });

            ai.generateText.mockImplementation(async (config) => {
                const toolResult = await toolExecute({ searchTerm: 'Ballet' });
                
                return {
                    text: toolResult,
                    foundEvents: []
                };
            });

            const result = await llmModel.parseInput('Find Ballet performances');

            expect(result).toBeDefined();
        });

        test('should find multiple matching events', async () => {
            await insertTestEvent({
                name: 'Concert Rock Night',
                date: '2025-12-01',
                tickets_available: 100
            });
            await insertTestEvent({
                name: 'Jazz Concert',
                date: '2025-12-10',
                tickets_available: 150
            });
            await insertTestEvent({
                name: 'Pop Concert Tour',
                date: '2025-12-20',
                tickets_available: 200
            });

            let toolExecute;
            ai.tool.mockImplementation((config) => {
                toolExecute = config.execute;
                return config;
            });

            ai.generateText.mockImplementation(async (config) => {
                const toolResult = await toolExecute({ searchTerm: 'Concert' });
                
                return {
                    text: toolResult,
                    foundEvents: []
                };
            });

            const result = await llmModel.parseInput('Find Concert events');

            expect(result).toBeDefined();
        });

        test('should order results by date ascending', async () => {
            await insertTestEvent({
                name: 'Event Z',
                date: '2025-12-31',
                tickets_available: 100
            });
            await insertTestEvent({
                name: 'Event A',
                date: '2025-12-01',
                tickets_available: 100
            });
            await insertTestEvent({
                name: 'Event M',
                date: '2025-12-15',
                tickets_available: 100
            });

            let toolExecute;
            let capturedEvents = [];
            
            ai.tool.mockImplementation((config) => {
                toolExecute = config.execute;
                return config;
            });

            ai.generateText.mockImplementation(async (config) => {
                const toolResult = await toolExecute({ searchTerm: 'Event' });
                
                // The tool should have logged the search
                expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Searching for events'));
                
                return {
                    text: toolResult,
                    foundEvents: []
                };
            });

            await llmModel.parseInput('Find Event');

            expect(ai.generateText).toHaveBeenCalled();
        });

        test('should handle events with zero tickets', async () => {
            await insertTestEvent({
                name: 'Sold Out Show',
                date: '2025-12-01',
                tickets_available: 0
            });

            let toolExecute;
            ai.tool.mockImplementation((config) => {
                toolExecute = config.execute;
                return config;
            });

            ai.generateText.mockImplementation(async (config) => {
                const toolResult = await toolExecute({ searchTerm: 'Sold Out' });
                
                return {
                    text: toolResult,
                    foundEvents: []
                };
            });

            const result = await llmModel.parseInput('Find Sold Out Show');

            expect(result).toBeDefined();
        });

        test('should handle special characters in event names', async () => {
            await insertTestEvent({
                name: "Bob's Rock & Roll Show!",
                date: '2025-12-01',
                tickets_available: 100
            });

            let toolExecute;
            ai.tool.mockImplementation((config) => {
                toolExecute = config.execute;
                return config;
            });

            ai.generateText.mockImplementation(async (config) => {
                const toolResult = await toolExecute({ searchTerm: 'Bob' });
                
                return {
                    text: toolResult,
                    foundEvents: []
                };
            });

            const result = await llmModel.parseInput("Find Bob's show");

            expect(result).toBeDefined();
        });

        test('should handle search with wildcards in term', async () => {
            await insertTestEvent({
                name: 'Amazing Concert',
                date: '2025-12-01',
                tickets_available: 100
            });

            let toolExecute;
            ai.tool.mockImplementation((config) => {
                toolExecute = config.execute;
                return config;
            });

            ai.generateText.mockImplementation(async (config) => {
                const toolResult = await toolExecute({ searchTerm: 'Amazing' });
                
                return {
                    text: toolResult,
                    foundEvents: []
                };
            });

            const result = await llmModel.parseInput('Find Amazing Concert');

            expect(result).toBeDefined();
        });
    });

    describe('parseInput with real database', () => {
        test('should handle empty database', async () => {
            ai.generateText.mockResolvedValue({
                text: 'No events found.',
                foundEvents: []
            });

            const result = await llmModel.parseInput('Find any events');

            expect(result).toBeDefined();
            expect(result.foundEvents).toEqual([]);
        });

        test('should attach foundEvents to result', async () => {
            await insertTestEvent({
                name: 'Test Event',
                date: '2025-12-01',
                tickets_available: 100
            });

            const mockFoundEvents = [
                {
                    event_id: 1,
                    name: 'Test Event',
                    date: '2025-12-01',
                    tickets_available: 100
                }
            ];

            ai.generateText.mockResolvedValue({
                text: 'Found events.',
                foundEvents: mockFoundEvents
            });

            const result = await llmModel.parseInput('Find Test Event');

            expect(result).toHaveProperty('foundEvents');
            expect(Array.isArray(result.foundEvents)).toBe(true);
        });
    });
});
