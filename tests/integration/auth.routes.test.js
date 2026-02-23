const request = require('supertest');
const app = require('../../src/app');
const { User } = require('../../src/models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock external dependencies
jest.mock('../../src/models');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../src/config/logger'); // silence logging

describe('Auth Routes (Integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'secret';
    process.env.JWT_EXPIRES_IN = '1h';
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and return a token', async () => {
      // Mock db finding no existing user
      User.findOne.mockResolvedValue(null);
      // Mock hashing
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashedPassword');
      // Mock user creation
      User.create.mockResolvedValue({
        id: 1,
        firstName: 'Integration',
        lastName: 'Test',
        email: 'int@test.com',
        role: 'user',
        save: jest.fn().mockResolvedValue(true)
      });
      // Mock token generation
      jwt.sign.mockReturnValue('fake-jwt-token');

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Integration',
          lastName: 'Test',
          email: 'int@test.com',
          password: 'Password123!'
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.token).toBe('fake-jwt-token');
      expect(response.body.data.refreshToken).toBe('fake-jwt-token');
      expect(User.create).toHaveBeenCalled();
    });

    it('should return 400 if validation fails', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          // Missing required fields
          email: 'not-an-email'
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login an existing user', async () => {
      // Mock user finding
      const mockUser = {
        id: 1,
        email: 'int@test.com',
        password: 'hashedPassword',
        role: 'user',
        save: jest.fn().mockResolvedValue(true)
      };
      
      const mockFindOne = jest.fn().mockResolvedValue(mockUser);
      User.scope = jest.fn().mockReturnValue({ findOne: mockFindOne });
      
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('fake-jwt-token');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'int@test.com',
          password: 'Password123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.token).toBe('fake-jwt-token');
      expect(response.body.data.refreshToken).toBe('fake-jwt-token');
    });

    it('should return 400 when missing email or password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'valid@test.com'
          // no password
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });
});
