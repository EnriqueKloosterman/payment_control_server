const logger = require('../config/logger');

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getProfile = async (req, res) => {
  try {
    // req.user is set by auth middleware
    const user = req.user; 
    
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    res.json({
      status: 'success',
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt
      },
    });
  } catch (error) {
    logger.error('Get Profile Error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

module.exports = {
  getProfile,
};
