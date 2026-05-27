const { protect } = require('../../../src/middlewares/auth.middleware');
const { User } = require('../../../src/models');
const jwt = require('jsonwebtoken');
const logger = require('../../../src/config/logger');

jest.mock('../../../src/models');
jest.mock('jsonwebtoken');
jest.mock('../../../src/config/logger');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'testsecret';
  });

  it('should call next if token is valid and user exists', async () => {
    req.headers.authorization = 'Bearer validtoken';
    jwt.verify.mockReturnValue({ id: '550e8400-e29b-41d4-a716-446655440000' });
    
    const mockUser = { id: '550e8400-e29b-41d4-a716-446655440000', email: 'test@test.com' };
    User.findByPk.mockResolvedValue(mockUser);

    await protect(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('validtoken', 'testsecret');
    expect(User.findByPk).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 if user does not exist anymore', async () => {
    req.headers.authorization = 'Bearer validtoken';
    jwt.verify.mockReturnValue({ id: '550e8400-e29b-41d4-a716-446655440000' });
    
    User.findByPk.mockResolvedValue(null);

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Not authorized, user not found' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid or expired', async () => {
    req.headers.authorization = 'Bearer invalidtoken';
    jwt.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    await protect(req, res, next);

    expect(logger.error).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Not authorized, token failed' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if no authorization header is provided', async () => {
    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Not authorized, no token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if authorization header does not start with Bearer', async () => {
    req.headers.authorization = 'Basic token';

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Not authorized, no token' });
    expect(next).not.toHaveBeenCalled();
  });
});
