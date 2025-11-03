const {
    getAllEvents,
    purchaseTickets,
    getEventById
} = require('../../../controllers/clientController');

jest.mock('../../../models/clientModel');
const clientModel = require('../../../models/clientModel');

describe('Client Controller - getAllEvents', () => {
    let req, res;

    beforeEach(() => {
        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
        console.log = jest.fn();
    });

    test('should return all events successfully', async () => {
        const mockEvents = [
            { id: 1, name: 'Concert', date: '2025-12-01', tickets_available: 100 },
            { id: 2, name: 'Game', date: '2025-12-15', tickets_available: 50 }
        ];
        clientModel.getAllEvents.mockResolvedValue(mockEvents);

        await getAllEvents(req, res);

        expect(clientModel.getAllEvents).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Events retrieved successfully',
            count: 2,
            events: mockEvents
        });
    });

    test('should handle empty event list', async () => {
        clientModel.getAllEvents.mockResolvedValue([]);

        await getAllEvents(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Events retrieved successfully',
            count: 0,
            events: []
        });
    });

    test('should handle database errors gracefully', async () => {
        clientModel.getAllEvents.mockRejectedValue(new Error('Database connection failed'));

        await getAllEvents(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Failed to retrieve events',
            message: 'Database connection failed'
        });
    });
});

describe('Client Controller - getEventById', () => {
    let req, res;

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
        console.log = jest.fn();
    });

    test('should return event for valid ID', async () => {
        const mockEvent = {
            id: 1,
            name: 'Concert',
            date: '2025-12-20',
            tickets_available: 100
        };

        req = { params: { id: '1' } };
        clientModel.getEventById.mockResolvedValue(mockEvent);

        await getEventById(req, res);

        expect(clientModel.getEventById).toHaveBeenCalledWith(1);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Event retrieved successfully',
            event: mockEvent
        });
    });

    test('should return 404 for non-existent event', async () => {
        req = { params: { id: '999' } };
        clientModel.getEventById.mockResolvedValue(null);

        await getEventById(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Event not found',
            message: 'Event with ID 999 does not exist'
        });
    });

    test('should reject invalid event ID (string)', async () => {
        req = { params: { id: 'abc' } };

        await getEventById(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Invalid event ID',
            message: 'Event ID must be a positive integer'
        });
    });

    test('should reject negative event ID', async () => {
        req = { params: { id: '-1' } };

        await getEventById(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Invalid event ID',
            message: 'Event ID must be a positive integer'
        });
    });

    test('should reject zero as event ID', async () => {
        req = { params: { id: '0' } };

        await getEventById(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should handle database errors', async () => {
        req = { params: { id: '1' } };
        clientModel.getEventById.mockRejectedValue(new Error('Database error'));

        await getEventById(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Failed to retrieve event',
            message: 'Database error'
        });
    });
});

describe('Client Controller - purchaseTickets', () => {
    let req, res;

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
        console.log = jest.fn();
    });

    test('should process valid ticket purchase', async () => {
        const mockResult = {
            message: 'Tickets purchased successfully',
            event: {
                id: 1,
                name: 'Concert',
                tickets_available: 98
            },
            ticketsPurchased: 2
        };

        req = {
            params: { id: '1' },
            body: { ticketCount: 2 }
        };

        clientModel.purchaseTickets.mockResolvedValue(mockResult);

        await purchaseTickets(req, res);

        expect(clientModel.purchaseTickets).toHaveBeenCalledWith(1, 2);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Tickets purchased successfully',
            event: mockResult.event,
            ticketsPurchased: 2
        });
    });

    test('should default to 1 ticket when count not provided', async () => {
        const mockResult = {
            message: 'Ticket purchased successfully',
            event: { id: 1, tickets_available: 99 },
            ticketsPurchased: 1
        };

        req = {
            params: { id: '1' },
            body: {}
        };

        clientModel.purchaseTickets.mockResolvedValue(mockResult);

        await purchaseTickets(req, res);

        expect(clientModel.purchaseTickets).toHaveBeenCalledWith(1, 1);
    });

    test('should reject invalid event ID', async () => {
        req = {
            params: { id: 'abc' },
            body: { ticketCount: 1 }
        };

        await purchaseTickets(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Invalid event ID',
            message: 'Event ID must be a positive integer'
        });
    });

    test('should reject negative event ID', async () => {
        req = {
            params: { id: '-5' },
            body: { ticketCount: 1 }
        };

        await purchaseTickets(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Invalid event ID',
            message: 'Event ID must be a positive integer'
        });
    });

    test('should reject zero ticket count', async () => {
        req = {
            params: { id: '1' },
            body: { ticketCount: 0 }
        };

        await purchaseTickets(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Invalid ticket count',
            message: 'Ticket count must be a positive integer'
        });
    });

    test('should reject negative ticket count', async () => {
        req = {
            params: { id: '1' },
            body: { ticketCount: -2 }
        };

        await purchaseTickets(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Invalid ticket count',
            message: 'Ticket count must be a positive integer'
        });
    });

    test('should return 404 when event not found', async () => {
        req = {
            params: { id: '999' },
            body: { ticketCount: 1 }
        };

        clientModel.purchaseTickets.mockRejectedValue(
            new Error('Event not found')
        );

        await purchaseTickets(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Purchase failed',
            message: 'Event not found'
        });
    });

    test('should return 400 when insufficient tickets', async () => {
        req = {
            params: { id: '1' },
            body: { ticketCount: 10 }
        };

        clientModel.purchaseTickets.mockRejectedValue(
            new Error('Not enough tickets available')
        );

        await purchaseTickets(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Purchase failed',
            message: 'Not enough tickets available'
        });
    });

    test('should handle database errors during purchase', async () => {
        req = {
            params: { id: '1' },
            body: { ticketCount: 2 }
        };

        clientModel.purchaseTickets.mockRejectedValue(
            new Error('Database error')
        );

        await purchaseTickets(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Purchase failed',
            message: 'Database error'
        });
    });

    test('should handle large ticket purchases', async () => {
        const mockResult = {
            message: 'Tickets purchased successfully',
            event: {
                id: 1,
                name: 'Large Event',
                tickets_available: 0
            },
            ticketsPurchased: 100
        };

        req = {
            params: { id: '1' },
            body: { ticketCount: 100 }
        };

        clientModel.purchaseTickets.mockResolvedValue(mockResult);

        await purchaseTickets(req, res);

        expect(clientModel.purchaseTickets).toHaveBeenCalledWith(1, 100);
        expect(res.status).toHaveBeenCalledWith(200);
    });
});
