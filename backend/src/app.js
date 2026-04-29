'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const cron = require('node-cron');

const logger = require('./config/logger');
const { apiLimiter } = require('./middleware/rateLimiter');
const routes = require('./routes/index');
const reminderService = require('./services/reminder.service');
const authService = require('./services/authService');
const notificationService = require('./services/notification.service');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      scriptSrc:  ["'self'"],
      imgSrc:     ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", FRONTEND_URL]
    }
  }
}));

// ============================================================
// CORS
// ============================================================
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000'
    ];
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed.`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24h preflight cache
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight

// ============================================================
// BODY PARSING & COMPRESSION
// ============================================================
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// REQUEST LOGGING
// ============================================================
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/api/health') {
      logger.info({
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.headers['user-agent']?.slice(0, 80)
      });
    }
  });
  next();
});

// ============================================================
// RATE LIMITING
// ============================================================
app.use('/api/', apiLimiter);

// ============================================================
// STATIC FILES (uploads)
// ============================================================
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
app.use('/uploads', express.static(uploadDir, {
  setHeaders: (res) => {
    res.set('X-Content-Type-Options', 'nosniff');
  }
}));

// ============================================================
// API ROUTES
// ============================================================
app.use('/api', routes);

// ============================================================
// 404 HANDLER
// ============================================================
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`
  });
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // CORS error
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File too large.' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ success: false, message: 'Unexpected file field.' });
  }

  // JWT errors
  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }

  // SQLite constraint errors
  if (err.message && err.message.includes('UNIQUE constraint failed')) {
    return res.status(409).json({ success: false, message: 'Duplicate entry.' });
  }
  if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
    return res.status(400).json({ success: false, message: 'Referenced record does not exist.' });
  }

  const status = err.statusCode || err.status || 500;
  return res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred.'
      : err.message || 'Internal server error.'
  });
});

// ============================================================
// CRON JOBS
// ============================================================
function initCronJobs() {
  // Daily reminder check at 08:00
  cron.schedule('0 8 * * *', async () => {
    logger.info('[cron] Running daily reminder check...');
    try {
      reminderService.checkAndSendReminders();
    } catch (err) {
      logger.error('[cron] Reminder check failed:', err);
    }
  });

  // Daily escalation check at 09:00
  cron.schedule('0 9 * * *', async () => {
    logger.info('[cron] Running daily escalation check...');
    try {
      reminderService.processEscalations();
    } catch (err) {
      logger.error('[cron] Escalation check failed:', err);
    }
  });

  // Session cleanup: every 6 hours
  cron.schedule('0 */6 * * *', () => {
    logger.info('[cron] Cleaning expired sessions...');
    try {
      authService.cleanExpiredSessions();
    } catch (err) {
      logger.error('[cron] Session cleanup failed:', err);
    }
  });

  // Notification cleanup: weekly on Sunday at 02:00
  cron.schedule('0 2 * * 0', () => {
    logger.info('[cron] Cleaning old notifications...');
    try {
      notificationService.cleanOldNotifications(90);
    } catch (err) {
      logger.error('[cron] Notification cleanup failed:', err);
    }
  });

  logger.info('[cron] All cron jobs initialized.');
}

// ============================================================
// START SERVER
// ============================================================
let server;

async function startServer() {
  try {
    // Initialize database (imported for side effects)
    require('./config/database');
    logger.info('Database initialized.');

    server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });

    // Initialize cron jobs
    if (process.env.NODE_ENV !== 'test') {
      initCronJobs();
    }

    return server;
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================
function gracefulShutdown(signal) {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed.');
      try {
        const { closeDb } = require('./config/database');
        closeDb();
        logger.info('Database connection closed.');
      } catch (e) {
        logger.warn('Error closing database:', e.message);
      }
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
startServer();

module.exports = app;
