const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('../../../routes/authRoutes');

jest.mock('../../../models/userModel');
const userModel = require('../../../models/userModel');

jest.mock('jsonwebtoken');
const jwt = require('jsonwebtoken');

let app;

beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/auth', authRoutes);
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('POST /api/auth/register', () => {
    test('should register new user and return token', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        userModel.createUser.mockResolvedValue(mockUser);
        jwt.sign.mockReturnValue('mock-token-123');

        const response = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        expect(response.status).toBe(201);
        expect(response.body).toEqual({
            success: true,
            message: 'User registered successfully',
            user: mockUser,
            token: 'mock-token-123'
        });
        expect(response.headers['set-cookie']).toBeDefined();
    });

    test('should return 400 for missing email', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                password: 'password123'
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Validation failed');
    });

    test('should return 400 for invalid email format', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'invalid-email',
                password: 'password123'
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });

    test('should return 400 for short password', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'test@example.com',
                password: '123'
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });

    test('should return 409 for duplicate email', async () => {
        userModel.createUser.mockRejectedValue(new Error('Email already exists'));

        const response = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'existing@example.com',
                password: 'password123'
            });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Conflict');
    });

    test('should set httpOnly cookie on successful registration', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        userModel.createUser.mockResolvedValue(mockUser);
        jwt.sign.mockReturnValue('mock-token-123');

        const response = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        const cookies = response.headers['set-cookie'];
        expect(cookies).toBeDefined();
        expect(cookies[0]).toContain('auth_token=mock-token-123');
        expect(cookies[0]).toContain('HttpOnly');
    });
});

describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            password_hash: 'hashed_password',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        userModel.findUserByEmailWithPassword.mockResolvedValue(mockUser);
        userModel.verifyPassword.mockResolvedValue(true);
        jwt.sign.mockReturnValue('mock-token-456');

        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Login successful');
        expect(response.body.token).toBe('mock-token-456');
        expect(response.body.user.password_hash).toBeUndefined();
    });

    test('should return 400 for missing credentials', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com'
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });

    test('should return 401 for non-existent email', async () => {
        userModel.findUserByEmailWithPassword.mockResolvedValue(null);

        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'nonexistent@example.com',
                password: 'password123'
            });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Authentication failed');
    });

    test('should return 401 for incorrect password', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            password_hash: 'hashed_password',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        userModel.findUserByEmailWithPassword.mockResolvedValue(mockUser);
        userModel.verifyPassword.mockResolvedValue(false);

        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'wrongpassword'
            });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    test('should set cookie on successful login', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            password_hash: 'hashed_password',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        userModel.findUserByEmailWithPassword.mockResolvedValue(mockUser);
        userModel.verifyPassword.mockResolvedValue(true);
        jwt.sign.mockReturnValue('login-token');

        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        const cookies = response.headers['set-cookie'];
        expect(cookies).toBeDefined();
        expect(cookies[0]).toContain('auth_token=login-token');
    });

    test('should not expose password hash in response', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            password_hash: 'hashed_password',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        userModel.findUserByEmailWithPassword.mockResolvedValue(mockUser);
        userModel.verifyPassword.mockResolvedValue(true);
        jwt.sign.mockReturnValue('token');

        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        expect(response.body.user).toBeDefined();
        expect(response.body.user.password_hash).toBeUndefined();
    });
});

describe('POST /api/auth/logout', () => {
    test('should logout successfully', async () => {
        const response = await request(app)
            .post('/api/auth/logout');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Logout successful');
    });

    test('should clear auth cookie', async () => {
        const response = await request(app)
            .post('/api/auth/logout');

        const cookies = response.headers['set-cookie'];
        expect(cookies).toBeDefined();
        expect(cookies[0]).toContain('auth_token=');
    });

    test('should logout even without existing session', async () => {
        const response = await request(app)
            .post('/api/auth/logout');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });
});

describe('GET /api/auth/verify', () => {
    test('should verify valid token from cookie', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, { userId: 1, email: 'test@example.com' });
        });
        userModel.findUserById.mockResolvedValue(mockUser);

        const response = await request(app)
            .get('/api/auth/verify')
            .set('Cookie', ['auth_token=valid-token']);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.user).toEqual(mockUser);
    });

    test('should verify valid token from Authorization header', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, { userId: 1, email: 'test@example.com' });
        });
        userModel.findUserById.mockResolvedValue(mockUser);

        const response = await request(app)
            .get('/api/auth/verify')
            .set('Authorization', 'Bearer valid-token');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

    test('should return 401 for missing token', async () => {
        const response = await request(app)
            .get('/api/auth/verify');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Authentication required');
    });

    test('should return 401 for expired token', async () => {
        jwt.verify.mockImplementation((token, secret, callback) => {
            const error = new Error('Token expired');
            error.name = 'TokenExpiredError';
            callback(error, null);
        });

        const response = await request(app)
            .get('/api/auth/verify')
            .set('Cookie', ['auth_token=expired-token']);

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Token expired');
        expect(response.body.expired).toBe(true);
    });

    test('should return 403 for invalid token', async () => {
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(new Error('Invalid token'), null);
        });

        const response = await request(app)
            .get('/api/auth/verify')
            .set('Cookie', ['auth_token=invalid-token']);

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Invalid token');
    });

    test('should return 404 if user no longer exists', async () => {
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, { userId: 999, email: 'deleted@example.com' });
        });
        userModel.findUserById.mockResolvedValue(null);

        const response = await request(app)
            .get('/api/auth/verify')
            .set('Cookie', ['auth_token=valid-token']);

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('User not found');
    });
});

describe('GET /api/auth/me', () => {
    test('should return current user data', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, { userId: 1, email: 'test@example.com' });
        });
        userModel.findUserById.mockResolvedValue(mockUser);

        const response = await request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer valid-token');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.user).toEqual(mockUser);
    });

    test('should require authentication', async () => {
        const response = await request(app)
            .get('/api/auth/me');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    test('should work with cookie authentication', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, { userId: 1, email: 'test@example.com' });
        });
        userModel.findUserById.mockResolvedValue(mockUser);

        const response = await request(app)
            .get('/api/auth/me')
            .set('Cookie', ['auth_token=valid-token']);

        expect(response.status).toBe(200);
        expect(response.body.user).toEqual(mockUser);
    });
});

describe('Integration - Complete Auth Flow', () => {
    test('should complete registration, login, verify, and logout flow', async () => {
        const mockUser = {
            id: 1,
            email: 'flow@example.com',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        userModel.createUser.mockResolvedValue(mockUser);
        jwt.sign.mockReturnValue('register-token');

        const registerResponse = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'flow@example.com',
                password: 'password123'
            });

        expect(registerResponse.status).toBe(201);
        expect(registerResponse.body.success).toBe(true);

        const mockUserWithPassword = {
            ...mockUser,
            password_hash: 'hashed_password'
        };

        userModel.findUserByEmailWithPassword.mockResolvedValue(mockUserWithPassword);
        userModel.verifyPassword.mockResolvedValue(true);
        jwt.sign.mockReturnValue('login-token');

        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'flow@example.com',
                password: 'password123'
            });

        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body.success).toBe(true);

        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, { userId: 1, email: 'flow@example.com' });
        });
        userModel.findUserById.mockResolvedValue(mockUser);

        const verifyResponse = await request(app)
            .get('/api/auth/verify')
            .set('Authorization', 'Bearer login-token');

        expect(verifyResponse.status).toBe(200);
        expect(verifyResponse.body.user.email).toBe('flow@example.com');

        const logoutResponse = await request(app)
            .post('/api/auth/logout');

        expect(logoutResponse.status).toBe(200);
        expect(logoutResponse.body.message).toBe('Logout successful');
    });

    test('should handle failed login after successful registration', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        userModel.createUser.mockResolvedValue(mockUser);
        jwt.sign.mockReturnValue('token');

        const registerResponse = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        expect(registerResponse.status).toBe(201);

        const mockUserWithPassword = {
            ...mockUser,
            password_hash: 'hashed_password'
        };

        userModel.findUserByEmailWithPassword.mockResolvedValue(mockUserWithPassword);
        userModel.verifyPassword.mockResolvedValue(false);

        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'wrongpassword'
            });

        expect(loginResponse.status).toBe(401);
    });

    test('should maintain separate sessions for different users', async () => {
        const user1 = {
            id: 1,
            email: 'user1@example.com',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        const user2 = {
            id: 2,
            email: 'user2@example.com',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        userModel.findUserByEmailWithPassword.mockImplementation((email) => {
            if (email === 'user1@example.com') {
                return Promise.resolve({ ...user1, password_hash: 'hash1' });
            } else {
                return Promise.resolve({ ...user2, password_hash: 'hash2' });
            }
        });

        userModel.verifyPassword.mockResolvedValue(true);
        
        jwt.sign.mockImplementation((payload) => {
            return `token-${payload.userId}`;
        });

        const login1 = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'user1@example.com',
                password: 'password123'
            });

        const login2 = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'user2@example.com',
                password: 'password123'
            });

        expect(login1.body.token).toBe('token-1');
        expect(login2.body.token).toBe('token-2');
    });
});

describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
        userModel.createUser.mockRejectedValue(new Error('Database connection failed'));

        const response = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
    });

    test('should handle malformed JSON', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .set('Content-Type', 'application/json')
            .send('invalid json{');

        expect(response.status).toBe(400);
    });

    test('should handle missing Content-Type header', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send('email=test@example.com&password=password123');

        expect(response.status).toBe(500);
    });
});
