const { check } = require('express-validator');
const validate = require('./validate.middleware');

const passwordValidation = check('password', 'Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one symbol')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/);

const validateRegister = [
  check('firstName', 'First name is required').not().isEmpty(),
  check('lastName', 'Last name is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  passwordValidation,
  validate
];

const validateLogin = [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists(),
  validate
];

const validateResetPassword = [
  passwordValidation,
  validate
];

module.exports = {
  validateRegister,
  validateLogin,
  validateResetPassword
};
