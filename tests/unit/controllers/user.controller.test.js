const userController = require('../../../src/controllers/user.controller');
const logger = require('../../../src/config/logger');

jest.mock('../../../src/config/logger');

describe('User Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      req.user = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'user',
        avatar: null,
        createdAt: '2023-01-01T00:00:00.000Z'
      };

      await userController.getProfile(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          role: 'user',
          avatar: null,
          createdAt: '2023-01-01T00:00:00.000Z'
        }
      });
    });

    it('should return 404 if user is not found in req', async () => {
      req.user = null;

      await userController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'User not found' });
    });

    it('should handle server errors', async () => {
      // Create a scenario that throws an error, e.g., missing res.json or similar,
      // But getProfile is quite simple. We can mock res.json to throw an error 
      // just to trigger the catch block.
      req.user = { id: 1 };
      res.json.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      await userController.getProfile(req, res);

      expect(logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Server error' });
    });
  });
});
