const winston = require('winston');
const path = require('path');

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
});

const transports = [
    // Console — always available (works on Vercel + local)
    new winston.transports.Console({
        format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
        silent: process.env.NODE_ENV === 'test',
    }),
];

// File transports — only in local/non-serverless environments
// Vercel has a READ-ONLY file system, so writing log files will crash the function
if (!process.env.VERCEL) {
    transports.push(
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/error.log'),
            level: 'error',
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 3,
        }),
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/combined.log'),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 5,
        })
    );
}

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
    ),
    transports,
});

module.exports = logger;
