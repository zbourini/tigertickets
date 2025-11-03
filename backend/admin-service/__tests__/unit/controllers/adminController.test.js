const {
    listEvents,
    addEvent,
    getEvent,
    updateEventById
} = require('../../../controllers/adminController');

jest.mock('../../../models/adminModel');
const adminModel = require('../../../models/adminModel');

describe('Admin Controller - listEvents', () => {
    let req, res;

    beforeEach(() => {
        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    test('should return all events successfully', async () => {
        const mockEvents = [
            { id: 1, name: 'Concert', date: '2025-12-01', tickets_available: 100 },
            { id: 2, name: 'Game', date: '2025-12-15', tickets_available: 50 }
        ];
        adminModel.getEvents.mockResolvedValue(mockEvents);

        await listEvents(req, res);

        expect(adminModel.getEvents).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: mockEvents,
            count: 2
        });
    });

    test('should return empty array when no events exist', async () => {
        adminModel.getEvents.mockResolvedValue([]);

        await listEvents(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: [],
            count: 0
        });
    });

    test('should handle database errors gracefully', async () => {
        adminModel.getEvents.mockRejectedValue(new Error('Database connection failed'));

        await listEvents(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Internal server error while fetching events',
            message: 'Unable to retrieve events at this time'
        });
    });
});

describe('Admin Controller - addEvent', () => {
    let req, res;

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    test('should create a valid event successfully', async () => {
        const mockEvent = {
            id: 1,
            name: 'Basketball Game',
            date: '2025-12-20',
            tickets_available: 200
        };

        req = {
            body: {
                name: 'Basketball Game',
                date: '2025-12-20',
                tickets_available: 200
            }
        };

        adminModel.createEvent.mockResolvedValue(mockEvent);

        await addEvent(req, res);

        expect(adminModel.createEvent).toHaveBeenCalledWith({
            name: 'Basketball Game',
            date: '2025-12-20',
            tickets_available: 200
        });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: mockEvent,
            message: 'Event created successfully'
        });
    });

    test('should trim whitespace from event name', async () => {
        req = {
            body: {
                name: '  Basketball Game  ',
                date: '2025-12-20',
                tickets_available: 200
            }
        };

        adminModel.createEvent.mockResolvedValue({ id: 1, name: 'Basketball Game' });

        await addEvent(req, res);

        expect(adminModel.createEvent).toHaveBeenCalledWith({
            name: 'Basketball Game',
            date: '2025-12-20',
            tickets_available: 200
        });
    });

    test('should reject event with missing name', async () => {
        req = {
            body: {
                date: '2025-12-20',
                tickets_available: 200
            }
        };

        await addEvent(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                error: 'Validation failed',
                details: expect.arrayContaining([
                    expect.stringContaining('Event name is required')
                ])
            })
        );
    });

    test('should reject event with empty name', async () => {
        req = {
            body: {
                name: '   ',
                date: '2025-12-20',
                tickets_available: 200
            }
        };

        await addEvent(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                details: expect.arrayContaining([
                    expect.stringContaining('Event name cannot be empty')
                ])
            })
        );
    });

    test('should reject event with missing date', async () => {
        req = {
            body: {
                name: 'Concert',
                tickets_available: 200
            }
        };

        await addEvent(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                details: expect.arrayContaining([
                    expect.stringContaining('Event date is required')
                ])
            })
        );
    });

    test('should reject event with past date', async () => {
        req = {
            body: {
                name: 'Concert',
                date: '2020-01-01',
                tickets_available: 200
            }
        };

        await addEvent(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                details: expect.arrayContaining([
                    expect.stringContaining('Event date cannot be in the past')
                ])
            })
        );
    });

    test('should reject event with invalid date format', async () => {
        req = {
            body: {
                name: 'Concert',
                date: '12/20/2025',
                tickets_available: 200
            }
        };

        await addEvent(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                details: expect.arrayContaining([
                    expect.stringContaining('YYYY-MM-DD format')
                ])
            })
        );
    });

    test('should reject event with negative ticket count', async () => {
        req = {
            body: {
                name: 'Concert',
                date: '2025-12-20',
                tickets_available: -10
            }
        };

        await addEvent(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                details: expect.arrayContaining([
                    expect.stringContaining('Number of tickets cannot be negative')
                ])
            })
        );
    });

    test('should reject event with missing ticket count', async () => {
        req = {
            body: {
                name: 'Concert',
                date: '2025-12-20'
            }
        };

        await addEvent(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                details: expect.arrayContaining([
                    expect.stringContaining('Number of tickets available is required')
                ])
            })
        );
    });

    test('should handle database errors during creation', async () => {
        req = {
            body: {
                name: 'Concert',
                date: '2025-12-20',
                tickets_available: 200
            }
        };

        adminModel.createEvent.mockRejectedValue(new Error('Database error'));

        await addEvent(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                error: 'Internal server error while creating event'
            })
        );
    });
});

describe('Admin Controller - getEvent', () => {
    let req, res;

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    test('should return event by valid ID', async () => {
        const mockEvent = {
            id: 1,
            name: 'Concert',
            date: '2025-12-20',
            tickets_available: 100
        };

        req = { params: { id: '1' } };
        adminModel.getEventById.mockResolvedValue(mockEvent);

        await getEvent(req, res);

        expect(adminModel.getEventById).toHaveBeenCalledWith(1);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: mockEvent
        });
    });

    test('should return 404 for non-existent event', async () => {
        req = { params: { id: '999' } };
        adminModel.getEventById.mockResolvedValue(null);

        await getEvent(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Event not found',
            message: 'No event found with ID 999'
        });
    });

    test('should reject invalid event ID (string)', async () => {
        req = { params: { id: 'abc' } };

        await getEvent(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Invalid event ID',
            message: 'Event ID must be a positive integer'
        });
    });

    test('should reject negative event ID', async () => {
        req = { params: { id: '-1' } };

        await getEvent(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Invalid event ID',
            message: 'Event ID must be a positive integer'
        });
    });

    test('should reject zero as event ID', async () => {
        req = { params: { id: '0' } };

        await getEvent(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should handle database errors', async () => {
        req = { params: { id: '1' } };
        adminModel.getEventById.mockRejectedValue(new Error('Database error'));

        await getEvent(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                error: 'Internal server error while fetching event'
            })
        );
    });
});

describe('Admin Controller - updateEventById', () => {
    let req, res;

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    test('should update event with all fields', async () => {
        const updatedEvent = {
            id: 1,
            name: 'Updated Concert',
            date: '2025-12-25',
            tickets_available: 150
        };

        req = {
            params: { id: '1' },
            body: {
                name: 'Updated Concert',
                date: '2025-12-25',
                tickets_available: 150
            }
        };

        adminModel.updateEvent.mockResolvedValue(updatedEvent);

        await updateEventById(req, res);

        expect(adminModel.updateEvent).toHaveBeenCalledWith(1, {
            name: 'Updated Concert',
            date: '2025-12-25',
            tickets_available: 150
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: updatedEvent,
            message: 'Event updated successfully'
        });
    });

    test('should update only event name', async () => {
        const updatedEvent = {
            id: 1,
            name: 'New Name',
            date: '2025-12-20',
            tickets_available: 100
        };

        req = {
            params: { id: '1' },
            body: { name: 'New Name' }
        };

        adminModel.updateEvent.mockResolvedValue(updatedEvent);

        await updateEventById(req, res);

        expect(adminModel.updateEvent).toHaveBeenCalledWith(1, {
            name: 'New Name'
        });
    });

    test('should update only ticket count', async () => {
        req = {
            params: { id: '1' },
            body: { tickets_available: 250 }
        };

        adminModel.updateEvent.mockResolvedValue({ id: 1, tickets_available: 250 });

        await updateEventById(req, res);

        expect(adminModel.updateEvent).toHaveBeenCalledWith(1, {
            tickets_available: 250
        });
    });

    test('should return 404 for non-existent event', async () => {
        req = {
            params: { id: '999' },
            body: { name: 'Updated' }
        };

        adminModel.updateEvent.mockResolvedValue(null);

        await updateEventById(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Event not found',
            message: 'No event found with ID 999'
        });
    });

    test('should reject update with no fields provided', async () => {
        req = {
            params: { id: '1' },
            body: {}
        };

        await updateEventById(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'No update data provided',
            message: 'At least one field (name, date, tickets_available) must be provided'
        });
    });

    test('should reject invalid event name in update', async () => {
        req = {
            params: { id: '1' },
            body: { name: '   ' }
        };

        await updateEventById(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Invalid event name',
            message: 'Event name must be a non-empty string'
        });
    });

    test('should reject invalid date format in update', async () => {
        req = {
            params: { id: '1' },
            body: { date: '12/20/2025' }
        };

        await updateEventById(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Invalid date format',
            message: 'Date must be in YYYY-MM-DD format'
        });
    });

    test('should reject negative ticket count in update', async () => {
        req = {
            params: { id: '1' },
            body: { tickets_available: -5 }
        };

        await updateEventById(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Invalid ticket count',
            message: 'Tickets available must be a non-negative integer'
        });
    });

    test('should handle database errors during update', async () => {
        req = {
            params: { id: '1' },
            body: { name: 'Updated' }
        };

        adminModel.updateEvent.mockRejectedValue(new Error('Database error'));

        await updateEventById(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                error: 'Internal server error while updating event'
            })
        );
    });
});
