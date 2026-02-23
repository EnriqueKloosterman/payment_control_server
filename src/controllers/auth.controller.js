const { User } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const sendEmail = require('../utils/email.service');

/**
 * Generate JWT Token
 * @param {object} payload - Data to be encoded in the token (e.g., { id, role })
 * @returns {string} - Signed JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

/**
 * Generate JWT Refresh Token
 * @param {object} payload - Data to be encoded in the token (e.g., { id })
 * @returns {string} - Signed JWT refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', errors: errors.array() });
    }

    const { firstName, lastName, email, password } = req.body;

    // 1. Check if user already exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ status: 'error', message: 'User already exists' });
    }

    // 2. Encrypt password manually (as requested)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    // 4. Send response
    if (user) {
      // Create payload for token
      const payload = {
        id: user.id,
        role: user.role,
      };

      // Generate tokens
      const accessToken = generateToken(payload);
      const refreshToken = generateRefreshToken({ id: user.id });

      // Save refresh token to DB
      user.refreshToken = refreshToken;
      await user.save();

      res.status(201).json({
        status: 'success',
        data: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          token: accessToken,
          refreshToken: refreshToken,
        },
      });
    } else {
      res.status(400).json({ status: 'error', message: 'Invalid user data' });
    }
  } catch (error) {
    logger.error('Register Error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

/**
 * @desc    Auth user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', errors: errors.array() });
    }

    const { email, password } = req.body;

    // 1. Find user by email
    const user = await User.scope('withPassword').findOne({ where: { email } });

    // 2. Check if user exists and password matches
    if (user && (await bcrypt.compare(password, user.password))) {
      // Create payload for token
      const payload = {
        id: user.id,
        role: user.role,
      };
      // Generate tokens
      const accessToken = generateToken(payload);
      const refreshToken = generateRefreshToken({ id: user.id });

      // Save refresh token to DB
      user.refreshToken = refreshToken;
      await user.save();
      
      res.json({
        status: 'success',
        data: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          token: accessToken,
          refreshToken: refreshToken,
        },
      });
    } else {
      res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    }
  } catch (error) {
    logger.error('Login Error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Public
 */
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ status: 'error', message: 'No refresh token provided' });
    }

    // Verify token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Find user with this refresh token
    const user = await User.findOne({ where: { id: decoded.id, refreshToken } });

    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Invalid refresh token' });
    }

    // Generate new tokens
    const payload = { id: user.id, role: user.role };
    const newAccessToken = generateToken(payload);
    const newRefreshToken = generateRefreshToken({ id: user.id });

    // Update refresh token in DB
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      status: 'success',
      data: {
        token: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    logger.error('Refresh Token Error: ' + error.message);
    res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token' });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
    res.json({ status: 'success', message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout Error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgotpassword
 * @access  Public
 */
const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ where: { email: req.body.email } });

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'There is no user with that email' });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validate: false });

    // Create reset url
    // In production, this should point to the frontend application URL
    const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/resetpassword/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password reset token',
        message
      });

      res.status(200).json({ status: 'success', data: 'Email sent' });
    } catch (error) {
      user.resetPasswordToken = null;
      user.resetPasswordExpire = null;

      await user.save({ validate: false });

      return res.status(500).json({ status: 'error', message: 'Email could not be sent' });
    }
  } catch (error) {
    logger.error('Forgot Password Error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

/**
 * @desc    Reset password
 * @route   PUT /api/auth/resetpassword/:token
 * @access  Public
 */
const resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const { Op } = require('sequelize');

    const user = await User.findOne({
      where: {
        resetPasswordToken,
        resetPasswordExpire: { [Op.gt]: Date.now() }
      }
    });

    if (!user) {
      return res.status(400).json({ status: 'error', message: 'Invalid token' });
    }

    // Set new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    user.refreshToken = null; // Invalidate all sessions on password reset

    await user.save();

    res.status(200).json({
      status: 'success',
      data: {
        token: generateToken({ id: user.id, role: user.role }),
        refreshToken: generateRefreshToken({ id: user.id }),
      }
    });
  } catch (error) {
    logger.error('Reset Password Error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword
};
