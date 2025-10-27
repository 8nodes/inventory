const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: 'logs/analytics-service-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/analytics-service.log' }),
  ],
});

module.exports = logger;
