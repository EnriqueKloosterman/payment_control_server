const authController = require('../../../src/controllers/auth.controller');
const { User } = require('../../../src/models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../../../src/config/logger');

// Mock dependencies
jest.mock('../../../src/models');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../../src/config/logger');

describe('Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      User.findOne.mockResolvedValue(null);
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashedPassword');
      User.create.mockResolvedValue({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'user',
        save: jest.fn().mockResolvedValue(true)
      });
      jwt.sign.mockReturnValue('token');

      await authController.register(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'john@example.com' } });
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 'salt');
      expect(User.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({ 
          token: 'token',
          refreshToken: 'token'
        })
      }));
    });

    it('should return 400 if user already exists', async () => {
      User.findOne.mockResolvedValue({ email: 'john@example.com' });

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'User already exists' });
    });

    it('should handle server errors', async () => {
      User.findOne.mockRejectedValue(new Error('Database error'));

      await authController.register(req, res);

      expect(logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Server error' });
    });
  });

  describe('login', () => {
    beforeEach(() => {
      req.body = {
        email: 'john@example.com',
        password: 'Password123!'
      };
    });

    it('should login successfully with correct credentials', async () => {
      const mockUser = {
        id: 1,
        email: 'john@example.com',
        password: 'hashedPassword',
        role: 'user',
        save: jest.fn().mockResolvedValue(true)
      };
      
      // Mock User.scope().findOne() chain
      const mockFindOne = jest.fn().mockResolvedValue(mockUser);
      User.scope = jest.fn().mockReturnValue({ findOne: mockFindOne });
      
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('token');

      await authController.login(req, res);

      expect(User.scope).toHaveBeenCalledWith('withPassword');
      expect(bcrypt.compare).toHaveBeenCalledWith('Password123!', 'hashedPassword');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({ 
          token: 'token',
          refreshToken: 'token'
        })
      }));
    });

    it('should return 401 with invalid credentials', async () => {
        // Mock User.scope().findOne() chain
        const mockFindOne = jest.fn().mockResolvedValue(null);
        User.scope = jest.fn().mockReturnValue({ findOne: mockFindOne });

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Invalid email or password' });
    });
  });
});
