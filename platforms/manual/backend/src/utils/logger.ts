import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const logFormat = process.env.LOG_FORMAT || 'json';

const formats = [];

// Add timestamp
formats.push(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }));

// Add errors format
formats.push(winston.format.errors({ stack: true }));

// Add format based on configuration
if (logFormat === 'json') {
  formats.push(winston.format.json());
} else {
  formats.push(
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let msg = `${timestamp} [${level}]: ${message}`;
      if (Object.keys(meta).length > 0) {
        msg += ` ${JSON.stringify(meta)}`;
      }
      return msg;
    })
  );
}

// Add colors for development
if (process.env.MANUAL_NODE_ENV === 'development') {
  formats.unshift(winston.format.colorize());
}

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(...formats),
  defaultMeta: { service: 'manual-backend' },
  transports: [
    new winston.transports.Console(),
    // Add file transports if needed
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Create logs directory if it doesn't exist (handled by Docker volumes)
export default logger;
