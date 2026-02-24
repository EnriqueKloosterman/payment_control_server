const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Unique identifier for the user (UUID)'
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'First name cannot be empty' },
        len: { args: [2, 50], msg: 'First name must be between 2 and 50 characters' }
      },
      comment: 'User first name'
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Last name cannot be empty' },
        len: { args: [2, 50], msg: 'Last name must be between 2 and 50 characters' }
      },
      comment: 'User last name'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: { msg: 'Email is already in use' },
      validate: {
        isEmail: { msg: 'Must be a valid email address' }
      },
      comment: 'User email address (unique)'
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: { args: [8, 100], msg: 'Password must be at least 8 characters long' }
      },
      comment: 'Encrypted password'
    },
    refreshToken: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'JWT Refresh Token for session management'
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Hashed token to reset user password'
    },
    resetPasswordExpire: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Expiration date of the reset password token'
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user',
      allowNull: false,
      comment: 'User role for authorization'
    }
  }, {

    defaultScope: {
      // Don't return password by default
      attributes: { exclude: ['password'] }
    },
    scopes: {
      // Scope to verify password (include password)
      withPassword: {
        attributes: {}
      }
    },
    timestamps: true, // Adds createdAt and updatedAt
    tableName: 'users' // Fija el nombre en minúsculas en MySQL de Linux
  });

  User.associate = (models) => {
    User.hasMany(models.Factura, {
      foreignKey: 'userId',
      as: 'facturas',
      onDelete: 'CASCADE'
    });
  };

  const crypto = require('crypto');

  // Generate and hash password token
  User.prototype.getResetPasswordToken = function() {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    return resetToken;
  };

  return User;
};
