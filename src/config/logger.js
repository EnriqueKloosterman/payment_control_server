const winston = require('winston');
const path = require('path');

// Logger configuration
// Logs are saved in the logs/ directory defined in the project structure.
// 'error.log' for errors, 'combined.log' for all logs.
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../logs/error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(__dirname, '../../logs/combined.log') }),
    new winston.transports.Console({ format: winston.format.simple() })
  ],
});


module.exports = logger;
