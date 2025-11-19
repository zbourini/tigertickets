const { authenticateToken, optionalAuth } = require('../../../middleware/authMiddleware');

jest.mock('jsonwebtoken');
const jwt = require('jsonwebtoken');

jest.mock('../../../controllers/authController', () => ({
    JWT_SECRET: 'test-secret-key'
}));

describe('Auth Middleware - authenticateToken', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            cookies: {},
            headers: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    test('should authenticate valid token from cookie', () => {
        const decodedToken = {
            userId: 1,
            email: 'test@example.com'
        };

        req.cookies.auth_token = 'valid-token';
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, decodedToken);
        });

        authenticateToken(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret-key', expect.any(Function));
        expect(req.user).toEqual(decodedToken);
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    test('should authenticate valid token from Authorization header', () => {
        const decodedToken = {
            userId: 1,
            email: 'test@example.com'
        };

        req.headers['authorization'] = 'Bearer valid-token';
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, decodedToken);
        });

        authenticateToken(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret-key', expect.any(Function));
        expect(req.user).toEqual(decodedToken);
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('should prefer cookie over Authorization header', () => {
        const decodedToken = {
            userId: 1,
            email: 'test@example.com'
        };

        req.cookies.auth_token = 'cookie-token';
        req.headers['authorization'] = 'Bearer header-token';
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, decodedToken);
        });

        authenticateToken(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith('cookie-token', 'test-secret-key', expect.any(Function));
    });

    test('should reject request with no token', () => {
        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Authentication required',
            message: 'No authentication token provided'
        });
        expect(next).not.toHaveBeenCalled();
    });

    test('should reject expired token', () => {
        req.cookies.auth_token = 'expired-token';
        jwt.verify.mockImplementation((token, secret, callback) => {
            const error = new Error('Token expired');
            error.name = 'TokenExpiredError';
            callback(error, null);
        });

        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Token expired',
            message: 'Your session has expired. Please login again.',
            expired: true
        });
        expect(next).not.toHaveBeenCalled();
    });

    test('should reject invalid token', () => {
        req.cookies.auth_token = 'invalid-token';
        jwt.verify.mockImplementation((token, secret, callback) => {
            const error = new Error('Invalid token');
            error.name = 'JsonWebTokenError';
            callback(error, null);
        });

        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Invalid token',
            message: 'Authentication token is invalid'
        });
        expect(next).not.toHaveBeenCalled();
    });

    test('should handle malformed Authorization header', () => {
        req.headers['authorization'] = 'InvalidFormat token';

        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Authentication required',
            message: 'No authentication token provided'
        });
    });

    test('should handle Authorization header without Bearer prefix', () => {
        req.headers['authorization'] = 'just-a-token';

        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should extract token after Bearer prefix correctly', () => {
        const decodedToken = {
            userId: 1,
            email: 'test@example.com'
        };

        req.headers['authorization'] = 'Bearer myverylongtoken123456';
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, decodedToken);
        });

        authenticateToken(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith('myverylongtoken123456', expect.any(String), expect.any(Function));
    });

    test('should handle empty cookie object', () => {
        req.cookies = null;

        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should attach complete decoded token to request', () => {
        const decodedToken = {
            userId: 1,
            email: 'test@example.com',
            role: 'user',
            iat: 1234567890,
            exp: 1234569690
        };

        req.cookies.auth_token = 'valid-token';
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, decodedToken);
        });

        authenticateToken(req, res, next);

        expect(req.user).toEqual(decodedToken);
        expect(req.user).toHaveProperty('userId');
        expect(req.user).toHaveProperty('email');
    });

    test('should handle jwt.verify throwing synchronous error', () => {
        req.cookies.auth_token = 'token';
        jwt.verify.mockImplementation(() => {
            throw new Error('Synchronous error');
        });

        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Internal server error',
            message: 'Unable to authenticate at this time'
        });
    });

    test('should handle different JWT error types', () => {
        req.cookies.auth_token = 'token';
        jwt.verify.mockImplementation((token, secret, callback) => {
            const error = new Error('Not before error');
            error.name = 'NotBeforeError';
            callback(error, null);
        });

        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('should work with multiple sequential requests', () => {
        const decodedToken1 = { userId: 1, email: 'user1@example.com' };
        const decodedToken2 = { userId: 2, email: 'user2@example.com' };

        req.cookies.auth_token = 'token1';
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, decodedToken1);
        });
        authenticateToken(req, res, next);
        expect(req.user).toEqual(decodedToken1);

        const req2 = { cookies: { auth_token: 'token2' }, headers: {} };
        const res2 = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next2 = jest.fn();
        
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, decodedToken2);
        });
        authenticateToken(req2, res2, next2);
        expect(req2.user).toEqual(decodedToken2);
    });

    test('should handle token with special characters', () => {
        const decodedToken = {
            userId: 1,
            email: 'test@example.com'
        };

        req.cookies.auth_token = 'token.with.dots-and_underscores';
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, decodedToken);
        });

        authenticateToken(req, res, next);

        expect(req.user).toEqual(decodedToken);
        expect(next).toHaveBeenCalled();
    });

    test('should not modify request if authentication fails', () => {
        req.cookies.auth_token = 'invalid';
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(new Error('Invalid'), null);
        });

        authenticateToken(req, res, next);

        expect(req.user).toBeUndefined();
    });
});

describe('Auth Middleware - optionalAuth', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            cookies: {},
            headers: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    test('should attach user data if valid token present', () => {
        const decodedToken = {
            userId: 1,
            email: 'test@example.com'
        };

        req.cookies.auth_token = 'valid-token';
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, decodedToken);
        });

        optionalAuth(req, res, next);

        expect(req.user).toEqual(decodedToken);
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    test('should continue with null user if no token', () => {
        optionalAuth(req, res, next);

        expect(req.user).toBeNull();
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    test('should continue with null user if token invalid', () => {
        req.cookies.auth_token = 'invalid-token';
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(new Error('Invalid token'), null);
        });

        optionalAuth(req, res, next);

        expect(req.user).toBeNull();
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    test('should continue with null user if token expired', () => {
        req.cookies.auth_token = 'expired-token';
        jwt.verify.mockImplementation((token, secret, callback) => {
            const error = new Error('Token expired');
            error.name = 'TokenExpiredError';
            callback(error, null);
        });

        optionalAuth(req, res, next);

        expect(req.user).toBeNull();
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('should check cookie first then Authorization header', () => {
        const decodedToken = {
            userId: 1,
            email: 'test@example.com'
        };

        req.headers['authorization'] = 'Bearer header-token';
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, decodedToken);
        });

        optionalAuth(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith('header-token', expect.any(String), expect.any(Function));
        expect(req.user).toEqual(decodedToken);
    });

    test('should prefer cookie over Authorization header', () => {
        const decodedToken = {
            userId: 1,
            email: 'test@example.com'
        };

        req.cookies.auth_token = 'cookie-token';
        req.headers['authorization'] = 'Bearer header-token';
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, decodedToken);
        });

        optionalAuth(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith('cookie-token', expect.any(String), expect.any(Function));
    });

    test('should handle jwt.verify throwing error', () => {
        req.cookies.auth_token = 'token';
        jwt.verify.mockImplementation(() => {
            throw new Error('Synchronous error');
        });

        optionalAuth(req, res, next);

        expect(req.user).toBeNull();
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('should not return error responses', () => {
        req.cookies.auth_token = 'invalid-token';
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(new Error('Invalid'), null);
        });

        optionalAuth(req, res, next);

        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });

    test('should handle malformed Authorization header gracefully', () => {
        req.headers['authorization'] = 'NotBearer token';

        optionalAuth(req, res, next);

        expect(req.user).toBeNull();
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('should extract token correctly from Bearer header', () => {
        const decodedToken = {
            userId: 1,
            email: 'test@example.com'
        };

        req.headers['authorization'] = 'Bearer abc123xyz';
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, decodedToken);
        });

        optionalAuth(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith('abc123xyz', expect.any(String), expect.any(Function));
    });

    test('should allow public access when no token provided', () => {
        optionalAuth(req, res, next);

        expect(req.user).toBeNull();
        expect(next).toHaveBeenCalled();
    });

    test('should set user to null on any verification error', () => {
        req.cookies.auth_token = 'token';
        jwt.verify.mockImplementation((token, secret, callback) => {
            const error = new Error('Any error');
            error.name = 'SomeOtherError';
            callback(error, null);
        });

        optionalAuth(req, res, next);

        expect(req.user).toBeNull();
    });

    test('should handle null cookies object', () => {
        req.cookies = null;

        optionalAuth(req, res, next);

        expect(req.user).toBeNull();
        expect(next).toHaveBeenCalled();
    });

    test('should attach complete user object when valid', () => {
        const decodedToken = {
            userId: 1,
            email: 'test@example.com',
            iat: 1234567890,
            exp: 1234569690
        };

        req.cookies.auth_token = 'valid-token';
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, decodedToken);
        });

        optionalAuth(req, res, next);

        expect(req.user).toEqual(decodedToken);
        expect(req.user).toHaveProperty('userId');
        expect(req.user).toHaveProperty('email');
        expect(req.user).toHaveProperty('iat');
        expect(req.user).toHaveProperty('exp');
    });
});

describe('Auth Middleware - Integration Scenarios', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            cookies: {},
            headers: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    test('authenticateToken should block and optionalAuth should allow same invalid token', () => {
        req.cookies.auth_token = 'invalid-token';
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(new Error('Invalid'), null);
        });

        authenticateToken(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();

        const req2 = { cookies: { auth_token: 'invalid-token' }, headers: {} };
        const res2 = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next2 = jest.fn();

        optionalAuth(req2, res2, next2);
        expect(res2.status).not.toHaveBeenCalled();
        expect(next2).toHaveBeenCalled();
        expect(req2.user).toBeNull();
    });

    test('both middlewares should handle valid token identically', () => {
        const decodedToken = {
            userId: 1,
            email: 'test@example.com'
        };

        req.cookies.auth_token = 'valid-token';
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, decodedToken);
        });

        authenticateToken(req, res, next);
        expect(req.user).toEqual(decodedToken);
        expect(next).toHaveBeenCalled();

        const req2 = { cookies: { auth_token: 'valid-token' }, headers: {} };
        const next2 = jest.fn();

        optionalAuth(req2, {}, next2);
        expect(req2.user).toEqual(decodedToken);
        expect(next2).toHaveBeenCalled();
    });

    test('should maintain consistency in token extraction logic', () => {
        const decodedToken = { userId: 1, email: 'test@example.com' };

        const testCases = [
            { cookies: { auth_token: 'cookie-token' }, headers: {} },
            { cookies: {}, headers: { authorization: 'Bearer header-token' } },
            { cookies: { auth_token: 'cookie-token' }, headers: { authorization: 'Bearer header-token' } }
        ];

        testCases.forEach((testCase, index) => {
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, decodedToken);
            });

            const req = { ...testCase };
            const next = jest.fn();
            
            authenticateToken(req, { status: jest.fn().mockReturnThis(), json: jest.fn() }, next);
            
            if (testCase.cookies.auth_token) {
                expect(jwt.verify).toHaveBeenCalledWith('cookie-token', expect.any(String), expect.any(Function));
            } else {
                expect(jwt.verify).toHaveBeenCalledWith('header-token', expect.any(String), expect.any(Function));
            }
        });
    });
});
