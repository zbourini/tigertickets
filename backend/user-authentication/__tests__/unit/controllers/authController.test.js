const {
    register,
    login,
    logout,
    verifyToken
} = require('../../../controllers/authController');

jest.mock('../../../models/userModel');
const userModel = require('../../../models/userModel');

jest.mock('jsonwebtoken');
const jwt = require('jsonwebtoken');

describe('Auth Controller - register', () => {
    let req, res;

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            cookie: jest.fn()
        };
        jest.clearAllMocks();
        process.env.NODE_ENV = 'test';
    });

    test('should register a new user successfully', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        req = {
            body: {
                email: 'test@example.com',
                password: 'password123'
            }
        };

        userModel.createUser.mockResolvedValue(mockUser);
        jwt.sign.mockReturnValue('mock-token');

        await register(req, res);

        expect(userModel.createUser).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123'
        });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'User registered successfully',
            user: mockUser,
            token: 'mock-token'
        });
        expect(res.cookie).toHaveBeenCalledWith('auth_token', 'mock-token', expect.any(Object));
    });

    test('should trim and lowercase email', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        req = {
            body: {
                email: 'TEST@EXAMPLE.COM',
                password: 'password123'
            }
        };

        userModel.createUser.mockResolvedValue(mockUser);
        jwt.sign.mockReturnValue('mock-token');

        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(userModel.createUser).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'test@example.com',
                password: 'password123'
            })
        );
    });

    test('should reject registration with missing email', async () => {
        req = {
            body: {
                password: 'password123'
            }
        };

        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                error: 'Validation failed',
                details: expect.arrayContaining([
                    'Email is required'
                ])
            })
        );
    });

    test('should reject registration with empty email', async () => {
        req = {
            body: {
                email: '   ',
                password: 'password123'
            }
        };

        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                details: expect.arrayContaining([
                    'Email is required'
                ])
            })
        );
    });

    test('should reject registration with invalid email format', async () => {
        req = {
            body: {
                email: 'invalid-email',
                password: 'password123'
            }
        };

        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                details: expect.arrayContaining([
                    'Invalid email format'
                ])
            })
        );
    });

    test('should reject registration with missing password', async () => {
        req = {
            body: {
                email: 'test@example.com'
            }
        };

        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                details: expect.arrayContaining([
                    'Password is required'
                ])
            })
        );
    });

    test('should reject registration with empty password', async () => {
        req = {
            body: {
                email: 'test@example.com',
                password: '   '
            }
        };

        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                details: expect.arrayContaining([
                    'Password is required'
                ])
            })
        );
    });

    test('should reject registration with short password', async () => {
        req = {
            body: {
                email: 'test@example.com',
                password: '12345'
            }
        };

        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                details: expect.arrayContaining([
                    'Password must be at least 6 characters long'
                ])
            })
        );
    });

    test('should reject registration with duplicate email', async () => {
        req = {
            body: {
                email: 'existing@example.com',
                password: 'password123'
            }
        };

        userModel.createUser.mockRejectedValue(new Error('Email already exists'));

        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Conflict',
            message: 'Email already registered'
        });
    });

    test('should handle database errors during registration', async () => {
        req = {
            body: {
                email: 'test@example.com',
                password: 'password123'
            }
        };

        userModel.createUser.mockRejectedValue(new Error('Database error'));

        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                error: 'Internal server error while registering user'
            })
        );
    });

    test('should validate multiple fields simultaneously', async () => {
        req = {
            body: {
                email: 'invalid',
                password: '123'
            }
        };

        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                details: expect.arrayContaining([
                    'Invalid email format',
                    'Password must be at least 6 characters long'
                ])
            })
        );
    });

    test('should set cookie with correct options', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        req = {
            body: {
                email: 'test@example.com',
                password: 'password123'
            }
        };

        userModel.createUser.mockResolvedValue(mockUser);
        jwt.sign.mockReturnValue('mock-token');

        await register(req, res);

        expect(res.cookie).toHaveBeenCalledWith('auth_token', 'mock-token', {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 1800000
        });
    });

    test('should generate JWT with correct payload', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        req = {
            body: {
                email: 'test@example.com',
                password: 'password123'
            }
        };

        userModel.createUser.mockResolvedValue(mockUser);
        jwt.sign.mockReturnValue('mock-token');

        await register(req, res);

        expect(jwt.sign).toHaveBeenCalledWith(
            {
                userId: 1,
                email: 'test@example.com'
            },
            expect.any(String),
            { expiresIn: '30m' }
        );
    });
});

describe('Auth Controller - login', () => {
    let req, res;

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            cookie: jest.fn()
        };
        jest.clearAllMocks();
        process.env.NODE_ENV = 'test';
    });

    test('should login user successfully with valid credentials', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            password_hash: 'hashed_password',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        req = {
            body: {
                email: 'test@example.com',
                password: 'password123'
            }
        };

        userModel.findUserByEmailWithPassword.mockResolvedValue(mockUser);
        userModel.verifyPassword.mockResolvedValue(true);
        jwt.sign.mockReturnValue('mock-token');

        await login(req, res);

        expect(userModel.findUserByEmailWithPassword).toHaveBeenCalledWith('test@example.com');
        expect(userModel.verifyPassword).toHaveBeenCalledWith('password123', 'hashed_password');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Login successful',
            user: {
                id: 1,
                email: 'test@example.com',
                created_at: '2025-01-01',
                updated_at: '2025-01-01'
            },
            token: 'mock-token'
        });
    });

    test('should reject login with missing email', async () => {
        req = {
            body: {
                password: 'password123'
            }
        };

        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Validation failed',
            message: 'Email and password are required'
        });
    });

    test('should reject login with missing password', async () => {
        req = {
            body: {
                email: 'test@example.com'
            }
        };

        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Validation failed',
            message: 'Email and password are required'
        });
    });

    test('should reject login with non-existent email', async () => {
        req = {
            body: {
                email: 'nonexistent@example.com',
                password: 'password123'
            }
        };

        userModel.findUserByEmailWithPassword.mockResolvedValue(null);

        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Authentication failed',
            message: 'Invalid email or password'
        });
    });

    test('should reject login with incorrect password', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            password_hash: 'hashed_password',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        req = {
            body: {
                email: 'test@example.com',
                password: 'wrongpassword'
            }
        };

        userModel.findUserByEmailWithPassword.mockResolvedValue(mockUser);
        userModel.verifyPassword.mockResolvedValue(false);

        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Authentication failed',
            message: 'Invalid email or password'
        });
    });

    test('should not return password hash in response', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            password_hash: 'hashed_password',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        req = {
            body: {
                email: 'test@example.com',
                password: 'password123'
            }
        };

        userModel.findUserByEmailWithPassword.mockResolvedValue(mockUser);
        userModel.verifyPassword.mockResolvedValue(true);
        jwt.sign.mockReturnValue('mock-token');

        await login(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                user: expect.not.objectContaining({
                    password_hash: expect.anything()
                })
            })
        );
    });

    test('should set cookie on successful login', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            password_hash: 'hashed_password',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        req = {
            body: {
                email: 'test@example.com',
                password: 'password123'
            }
        };

        userModel.findUserByEmailWithPassword.mockResolvedValue(mockUser);
        userModel.verifyPassword.mockResolvedValue(true);
        jwt.sign.mockReturnValue('mock-token');

        await login(req, res);

        expect(res.cookie).toHaveBeenCalledWith('auth_token', 'mock-token', expect.any(Object));
    });

    test('should handle database errors during login', async () => {
        req = {
            body: {
                email: 'test@example.com',
                password: 'password123'
            }
        };

        userModel.findUserByEmailWithPassword.mockRejectedValue(new Error('Database error'));

        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                error: 'Internal server error while logging in'
            })
        );
    });

    test('should trim and lowercase email during login', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            password_hash: 'hashed_password',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        req = {
            body: {
                email: '  TEST@EXAMPLE.COM  ',
                password: 'password123'
            }
        };

        userModel.findUserByEmailWithPassword.mockResolvedValue(mockUser);
        userModel.verifyPassword.mockResolvedValue(true);
        jwt.sign.mockReturnValue('mock-token');

        await login(req, res);

        expect(userModel.findUserByEmailWithPassword).toHaveBeenCalledWith('test@example.com');
    });

    test('should handle password verification errors', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            password_hash: 'hashed_password',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        req = {
            body: {
                email: 'test@example.com',
                password: 'password123'
            }
        };

        userModel.findUserByEmailWithPassword.mockResolvedValue(mockUser);
        userModel.verifyPassword.mockRejectedValue(new Error('Verification error'));

        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe('Auth Controller - logout', () => {
    let req, res;

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            clearCookie: jest.fn()
        };
        req = {};
        jest.clearAllMocks();
        process.env.NODE_ENV = 'test';
    });

    test('should logout successfully', async () => {
        logout(req, res);

        expect(res.clearCookie).toHaveBeenCalledWith('auth_token', {
            httpOnly: true,
            secure: false,
            sameSite: 'lax'
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Logout successful'
        });
    });

    test('should clear cookie with correct options', async () => {
        logout(req, res);

        expect(res.clearCookie).toHaveBeenCalledWith('auth_token', expect.objectContaining({
            httpOnly: true,
            sameSite: 'lax'
        }));
    });

    test('should handle errors during logout', async () => {
        res.clearCookie.mockImplementation(() => {
            throw new Error('Cookie error');
        });

        logout(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                error: 'Internal server error while logging out'
            })
        );
    });
});

describe('Auth Controller - verifyToken', () => {
    let req, res;

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    test('should verify token and return user data', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
        };

        req = {
            user: {
                userId: 1,
                email: 'test@example.com'
            }
        };

        userModel.findUserById.mockResolvedValue(mockUser);

        await verifyToken(req, res);

        expect(userModel.findUserById).toHaveBeenCalledWith(1);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            user: mockUser
        });
    });

    test('should return 404 if user no longer exists', async () => {
        req = {
            user: {
                userId: 999,
                email: 'deleted@example.com'
            }
        };

        userModel.findUserById.mockResolvedValue(null);

        await verifyToken(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'User not found',
            message: 'User account no longer exists'
        });
    });

    test('should handle database errors during verification', async () => {
        req = {
            user: {
                userId: 1,
                email: 'test@example.com'
            }
        };

        userModel.findUserById.mockRejectedValue(new Error('Database error'));

        await verifyToken(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                error: 'Internal server error while verifying token'
            })
        );
    });

    test('should fetch fresh user data from database', async () => {
        const mockUser = {
            id: 1,
            email: 'updated@example.com',
            created_at: '2025-01-01',
            updated_at: '2025-01-02'
        };

        req = {
            user: {
                userId: 1,
                email: 'old@example.com'
            }
        };

        userModel.findUserById.mockResolvedValue(mockUser);

        await verifyToken(req, res);

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            user: mockUser
        });
    });
});
