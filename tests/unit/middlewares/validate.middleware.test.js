const validate = require('../../../src/middlewares/validate.middleware');
const { validationResult } = require('express-validator');

jest.mock('express-validator');

describe('Validate Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should call next() if no validation errors', () => {
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });

    validate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 400 with errors if validation fails', () => {
    const errors = [{ msg: 'Invalid email' }];
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => errors
    });

    validate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      errors: errors
    });
    expect(next).not.toHaveBeenCalled();
  });
});
