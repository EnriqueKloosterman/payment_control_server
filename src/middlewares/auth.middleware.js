const jwt = require('jsonwebtoken');
const { User } = require('../models'); 
const logger = require('../config/logger');

/**
 * Middleware to protect routes that require authentication
 */
const protect = async (req, res, next) => {
  let token;

  // 1. Check if token exists in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // 2. Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Check if user still exists
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
         return res.status(401).json({ status: 'error', message: 'Not authorized, user not found' });
      }

      req.user = user;
      next();
    } catch (error) {
      logger.error('Auth Error: ' + error.message);
      return res.status(401).json({ status: 'error', message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Not authorized, no token' });
  }
};

module.exports = { protect };
