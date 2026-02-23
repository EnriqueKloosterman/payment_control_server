const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const swaggerUi = require('swagger-ui-express');
const path = require('path');
const swaggerSpecs = require('./config/swagger');
const logger = require('./config/logger');
require('dotenv').config();

const app = express();

/**
 * Security Middleware
 * helmet: Secure HTTP headers
 * cors: Enable Cross-Origin Resource Sharing
 */
app.use(helmet());
app.use(cors());

/**
 * Body Parsing Middleware
 * Parse JSON and URL-encoded data
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Rate Limiting
 * Global rate limiter to prevent DDoS attacks
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});
app.use('/api', limiter);

/**
 * Logging Middleware
 */
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logInfo = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent') || '',
      ip: req.ip || ''
    };
    
    // Log levels based on status
    if (res.statusCode >= 500) {
      logger.error('Server Error', logInfo);
    } else if (res.statusCode >= 400) {
      logger.warn('Client Error', logInfo);
    } else {
      logger.info('HTTP Request', logInfo);
    }
  });
  next();
});

/**
 * Swagger Documentation
 * Serve API docs at /api-docs
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const facturasRoutes = require('./routes/facturas.routes');
const cronService = require('./services/cron.service');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/facturas', facturasRoutes);

/**
 * Static Files (e.g., uploads)
 * Ensure 'uploads' directory exists in root
 */
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


/**
 * Connectivity Test Route
 */
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Payment Control API' });
});

/**
 * Error Handling Middleware
 * Catch-all for errors and formatting
 */
const ErrorResponse = require('./utils/errorResponse');

app.use((err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  logger.error(err.stack);

  // Sequelize bad objectid / cast error
  if (err.name === 'SequelizeDatabaseError') {
    const message = 'Server Database Error';
    error = new ErrorResponse(message, 500);
  }

  // Sequelize validation error (e.g. notEmpty)
  if (err.name === 'SequelizeValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new ErrorResponse(message, 400);
  }

  // Sequelize duplicate value
  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = 'Duplicate field value entered';
    error = new ErrorResponse(message, 400);
  }

  // JWT Token Invalid
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token, please log in again';
    error = new ErrorResponse(message, 401);
  }

  // JWT Token Expired
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired, please log in again';
    error = new ErrorResponse(message, 401);
  }

  res.status(error.statusCode || 500).json({
    status: 'error',
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

/**
 * Server Start
 */
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    logger.info(`Documentation available at http://localhost:${PORT}/api-docs`);
    
    // Starting background tasks
    cronService.start();
  });
}

module.exports = app;
