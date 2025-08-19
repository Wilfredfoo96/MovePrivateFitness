const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.dirname(process.env.LOG_FILE_PATH || './logs/worker.log');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'aoikumo-worker' },
    transports: [
        // Console transport
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        // File transport
        new winston.transports.File({
            filename: process.env.LOG_FILE_PATH || './logs/worker.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true
        }),
        // Error file transport
        new winston.transports.File({
            filename: process.env.LOG_FILE_PATH ? 
                process.env.LOG_FILE_PATH.replace('.log', '.error.log') : 
                './logs/worker.error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true
        })
    ]
});

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
    new winston.transports.File({
        filename: process.env.LOG_FILE_PATH ? 
            process.env.LOG_FILE_PATH.replace('.log', '.exceptions.log') : 
            './logs/worker.exceptions.log'
    })
);

logger.rejections.handle(
    new winston.transports.File({
        filename: process.env.LOG_FILE_PATH ? 
            process.env.LOG_FILE_PATH.replace('.log', '.rejections.log') : 
            './logs/worker.rejections.log'
    })
);

module.exports = { logger };

