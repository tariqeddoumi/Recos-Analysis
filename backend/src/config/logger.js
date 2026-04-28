'use strict';

const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

const LOG_DIR = path.resolve('./logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const { combine, timestamp, printf, colorize, errors, json } = format;

const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  transports: [
    new transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    new transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 10,
      tailable: true
    }),
    new transports.File({
      filename: path.join(LOG_DIR, 'audit.log'),
      level: 'info',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 30,
      tailable: true
    })
  ],
  exceptionHandlers: [
    new transports.File({ filename: path.join(LOG_DIR, 'exceptions.log') })
  ],
  rejectionHandlers: [
    new transports.File({ filename: path.join(LOG_DIR, 'rejections.log') })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'HH:mm:ss' }),
      errors({ stack: true }),
      consoleFormat
    )
  }));
}

module.exports = logger;
