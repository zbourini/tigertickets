const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

let testDb;

beforeAll(() => {
    testDb = new sqlite3.Database(':memory:');
    
    return new Promise((resolve, reject) => {
        testDb.run(`
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
});

afterAll(() => {
    return new Promise((resolve) => {
        testDb.close(resolve);
    });
});

function clearUsers() {
    return new Promise((resolve, reject) => {
        testDb.run('DELETE FROM users', (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

const userModel = {
    createUser: (userData) => {
        return new Promise(async (resolve, reject) => {
            try {
                const { email, password } = userData;
                const passwordHash = await bcrypt.hash(password, 10);
                
                testDb.run(
                    `INSERT INTO users (email, password_hash, created_at, updated_at)
                     VALUES (?, ?, datetime('now'), datetime('now'))`,
                    [email, passwordHash],
                    function(err) {
                        if (err) {
                            if (err.message.includes('UNIQUE constraint failed')) {
                                reject(new Error('Email already exists'));
                            } else {
                                reject(err);
                            }
                            return;
                        }
                        
                        testDb.get(
                            'SELECT id, email, created_at, updated_at FROM users WHERE id = ?',
                            [this.lastID],
                            (err, row) => {
                                if (err) reject(err);
                                else resolve(row);
                            }
                        );
                    }
                );
            } catch (error) {
                reject(error);
            }
        });
    },
    
    findUserByEmail: (email) => {
        return new Promise((resolve, reject) => {
            testDb.get(
                'SELECT id, email, created_at, updated_at FROM users WHERE email = ?',
                [email],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row || null);
                }
            );
        });
    },
    
    findUserByEmailWithPassword: (email) => {
        return new Promise((resolve, reject) => {
            testDb.get(
                'SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = ?',
                [email],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row || null);
                }
            );
        });
    },
    
    findUserById: (userId) => {
        return new Promise((resolve, reject) => {
            testDb.get(
                'SELECT id, email, created_at, updated_at FROM users WHERE id = ?',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row || null);
                }
            );
        });
    },
    
    verifyPassword: async (plainPassword, hashedPassword) => {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }
};

describe('User Model - createUser', () => {
    beforeEach(async () => {
        await clearUsers();
    });

    test('should create a new user successfully', async () => {
        const userData = {
            email: 'test@example.com',
            password: 'password123'
        };

        const createdUser = await userModel.createUser(userData);

        expect(createdUser).toMatchObject({
            id: expect.any(Number),
            email: 'test@example.com'
        });
        expect(createdUser.id).toBeGreaterThan(0);
        expect(createdUser.created_at).toBeDefined();
        expect(createdUser.updated_at).toBeDefined();
        expect(createdUser.password_hash).toBeUndefined();
    });

    test('should hash password before storing', async () => {
        const userData = {
            email: 'test@example.com',
            password: 'plainpassword'
        };

        await userModel.createUser(userData);
        
        const userWithPassword = await userModel.findUserByEmailWithPassword('test@example.com');
        
        expect(userWithPassword.password_hash).toBeDefined();
        expect(userWithPassword.password_hash).not.toBe('plainpassword');
        expect(userWithPassword.password_hash.length).toBeGreaterThan(20);
    });

    test('should auto-increment user IDs', async () => {
        const user1 = await userModel.createUser({
            email: 'user1@example.com',
            password: 'password123'
        });

        const user2 = await userModel.createUser({
            email: 'user2@example.com',
            password: 'password123'
        });

        expect(user2.id).toBe(user1.id + 1);
    });

    test('should reject duplicate email addresses', async () => {
        await userModel.createUser({
            email: 'duplicate@example.com',
            password: 'password123'
        });

        await expect(
            userModel.createUser({
                email: 'duplicate@example.com',
                password: 'password456'
            })
        ).rejects.toThrow('Email already exists');
    });

    test('should set timestamps on creation', async () => {
        const user = await userModel.createUser({
            email: 'test@example.com',
            password: 'password123'
        });

        expect(user.created_at).toBeTruthy();
        expect(user.updated_at).toBeTruthy();
        expect(typeof user.created_at).toBe('string');
        expect(typeof user.updated_at).toBe('string');
    });

    test('should handle bcrypt errors gracefully', async () => {
        const originalHash = bcrypt.hash;
        bcrypt.hash = jest.fn().mockRejectedValue(new Error('Hashing failed'));

        await expect(
            userModel.createUser({
                email: 'test@example.com',
                password: 'password123'
            })
        ).rejects.toThrow();

        bcrypt.hash = originalHash;
    });

    test('should store email exactly as provided', async () => {
        const user = await userModel.createUser({
            email: 'CaseSensitive@Example.COM',
            password: 'password123'
        });

        expect(user.email).toBe('CaseSensitive@Example.COM');
    });

    test('should use bcrypt with correct salt rounds', async () => {
        const hashSpy = jest.spyOn(bcrypt, 'hash');
        
        await userModel.createUser({
            email: 'test@example.com',
            password: 'password123'
        });

        expect(hashSpy).toHaveBeenCalledWith('password123', 10);
        
        hashSpy.mockRestore();
    });
});

describe('User Model - findUserByEmail', () => {
    beforeEach(async () => {
        await clearUsers();
    });

    test('should find user by email', async () => {
        await userModel.createUser({
            email: 'find@example.com',
            password: 'password123'
        });

        const foundUser = await userModel.findUserByEmail('find@example.com');

        expect(foundUser).toMatchObject({
            email: 'find@example.com'
        });
        expect(foundUser.password_hash).toBeUndefined();
    });

    test('should return null for non-existent email', async () => {
        const user = await userModel.findUserByEmail('nonexistent@example.com');

        expect(user).toBeNull();
    });

    test('should not include password hash in result', async () => {
        await userModel.createUser({
            email: 'test@example.com',
            password: 'password123'
        });

        const user = await userModel.findUserByEmail('test@example.com');

        expect(user.password_hash).toBeUndefined();
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('created_at');
        expect(user).toHaveProperty('updated_at');
    });

    test('should be case-sensitive for email search', async () => {
        await userModel.createUser({
            email: 'test@example.com',
            password: 'password123'
        });

        const user = await userModel.findUserByEmail('TEST@EXAMPLE.COM');

        expect(user).toBeNull();
    });

    test('should find correct user when multiple exist', async () => {
        await userModel.createUser({
            email: 'user1@example.com',
            password: 'password123'
        });

        const targetUser = await userModel.createUser({
            email: 'user2@example.com',
            password: 'password123'
        });

        await userModel.createUser({
            email: 'user3@example.com',
            password: 'password123'
        });

        const foundUser = await userModel.findUserByEmail('user2@example.com');

        expect(foundUser.id).toBe(targetUser.id);
        expect(foundUser.email).toBe('user2@example.com');
    });
});

describe('User Model - findUserByEmailWithPassword', () => {
    beforeEach(async () => {
        await clearUsers();
    });

    test('should find user with password hash', async () => {
        await userModel.createUser({
            email: 'test@example.com',
            password: 'password123'
        });

        const user = await userModel.findUserByEmailWithPassword('test@example.com');

        expect(user).toMatchObject({
            email: 'test@example.com'
        });
        expect(user.password_hash).toBeDefined();
        expect(typeof user.password_hash).toBe('string');
    });

    test('should return null for non-existent email', async () => {
        const user = await userModel.findUserByEmailWithPassword('nonexistent@example.com');

        expect(user).toBeNull();
    });

    test('should include all user fields including password hash', async () => {
        await userModel.createUser({
            email: 'test@example.com',
            password: 'password123'
        });

        const user = await userModel.findUserByEmailWithPassword('test@example.com');

        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('password_hash');
        expect(user).toHaveProperty('created_at');
        expect(user).toHaveProperty('updated_at');
    });

    test('should return hashed password not plain text', async () => {
        await userModel.createUser({
            email: 'test@example.com',
            password: 'plainpassword'
        });

        const user = await userModel.findUserByEmailWithPassword('test@example.com');

        expect(user.password_hash).not.toBe('plainpassword');
        expect(user.password_hash).toContain('$2a$');
    });
});

describe('User Model - findUserById', () => {
    beforeEach(async () => {
        await clearUsers();
    });

    test('should find user by ID', async () => {
        const created = await userModel.createUser({
            email: 'test@example.com',
            password: 'password123'
        });

        const foundUser = await userModel.findUserById(created.id);

        expect(foundUser).toMatchObject({
            id: created.id,
            email: 'test@example.com'
        });
    });

    test('should return null for non-existent ID', async () => {
        const user = await userModel.findUserById(9999);

        expect(user).toBeNull();
    });

    test('should not include password hash in result', async () => {
        const created = await userModel.createUser({
            email: 'test@example.com',
            password: 'password123'
        });

        const user = await userModel.findUserById(created.id);

        expect(user.password_hash).toBeUndefined();
    });

    test('should find correct user when multiple exist', async () => {
        await userModel.createUser({
            email: 'user1@example.com',
            password: 'password123'
        });

        const targetUser = await userModel.createUser({
            email: 'user2@example.com',
            password: 'password123'
        });

        await userModel.createUser({
            email: 'user3@example.com',
            password: 'password123'
        });

        const foundUser = await userModel.findUserById(targetUser.id);

        expect(foundUser.email).toBe('user2@example.com');
    });

    test('should handle zero as invalid ID', async () => {
        const user = await userModel.findUserById(0);

        expect(user).toBeNull();
    });

    test('should handle negative ID', async () => {
        const user = await userModel.findUserById(-1);

        expect(user).toBeNull();
    });
});

describe('User Model - verifyPassword', () => {
    test('should verify correct password', async () => {
        const plainPassword = 'mypassword123';
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const isValid = await userModel.verifyPassword(plainPassword, hashedPassword);

        expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
        const plainPassword = 'correctpassword';
        const wrongPassword = 'wrongpassword';
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const isValid = await userModel.verifyPassword(wrongPassword, hashedPassword);

        expect(isValid).toBe(false);
    });

    test('should be case-sensitive', async () => {
        const plainPassword = 'Password123';
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const isValid = await userModel.verifyPassword('password123', hashedPassword);

        expect(isValid).toBe(false);
    });

    test('should reject empty password', async () => {
        const hashedPassword = await bcrypt.hash('realpassword', 10);

        const isValid = await userModel.verifyPassword('', hashedPassword);

        expect(isValid).toBe(false);
    });

    test('should handle special characters in password', async () => {
        const plainPassword = 'p@ssw0rd!#$%';
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const isValid = await userModel.verifyPassword(plainPassword, hashedPassword);

        expect(isValid).toBe(true);
    });

    test('should handle long passwords', async () => {
        const plainPassword = 'a'.repeat(100);
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const isValid = await userModel.verifyPassword(plainPassword, hashedPassword);

        expect(isValid).toBe(true);
    });

    test('should reject password with extra characters', async () => {
        const plainPassword = 'password';
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const isValid = await userModel.verifyPassword('password123', hashedPassword);

        expect(isValid).toBe(false);
    });

    test('should reject password with missing characters', async () => {
        const plainPassword = 'password123';
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const isValid = await userModel.verifyPassword('password', hashedPassword);

        expect(isValid).toBe(false);
    });

    test('should work with unicode characters', async () => {
        const plainPassword = 'пароль密码🔐';
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const isValid = await userModel.verifyPassword(plainPassword, hashedPassword);

        expect(isValid).toBe(true);
    });
});

describe('User Model - Integration Tests', () => {
    beforeEach(async () => {
        await clearUsers();
    });

    test('should create user and verify login flow', async () => {
        const userData = {
            email: 'fulltest@example.com',
            password: 'securepassword123'
        };

        const createdUser = await userModel.createUser(userData);
        expect(createdUser.email).toBe(userData.email);

        const userWithPassword = await userModel.findUserByEmailWithPassword(userData.email);
        expect(userWithPassword).toBeDefined();

        const isPasswordValid = await userModel.verifyPassword(
            userData.password,
            userWithPassword.password_hash
        );
        expect(isPasswordValid).toBe(true);

        const userById = await userModel.findUserById(createdUser.id);
        expect(userById.email).toBe(userData.email);
        expect(userById.password_hash).toBeUndefined();
    });

    test('should handle multiple users independently', async () => {
        const user1 = await userModel.createUser({
            email: 'user1@example.com',
            password: 'password1'
        });

        const user2 = await userModel.createUser({
            email: 'user2@example.com',
            password: 'password2'
        });

        const foundUser1 = await userModel.findUserByEmailWithPassword('user1@example.com');
        const foundUser2 = await userModel.findUserByEmailWithPassword('user2@example.com');

        const isUser1Valid = await userModel.verifyPassword('password1', foundUser1.password_hash);
        const isUser2Valid = await userModel.verifyPassword('password2', foundUser2.password_hash);
        const isCrossValid = await userModel.verifyPassword('password1', foundUser2.password_hash);

        expect(isUser1Valid).toBe(true);
        expect(isUser2Valid).toBe(true);
        expect(isCrossValid).toBe(false);
    });

    test('should maintain data integrity across operations', async () => {
        const user = await userModel.createUser({
            email: 'integrity@example.com',
            password: 'password123'
        });

        const byEmail = await userModel.findUserByEmail(user.email);
        const byId = await userModel.findUserById(user.id);

        expect(byEmail.id).toBe(byId.id);
        expect(byEmail.email).toBe(byId.email);
        expect(byEmail.created_at).toBe(byId.created_at);
    });
});
