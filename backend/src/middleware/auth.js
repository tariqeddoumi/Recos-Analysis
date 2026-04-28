'use strict';

const jwt = require('jsonwebtoken');
const db = require('../config/database');
const logger = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-prod';

/**
 * Verify JWT and attach user to req.user
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required.'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
      }
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }

    // Check session is not revoked
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = db.prepare(
      `SELECT s.id, s.is_revoked, s.expires_at
       FROM sessions s
       WHERE s.token_hash = ? AND s.user_id = ?`
    ).get(tokenHash, decoded.userId);

    if (!session || session.is_revoked) {
      return res.status(401).json({ success: false, message: 'Session revoked or not found.' });
    }

    if (new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ success: false, message: 'Session expired.' });
    }

    // Fetch fresh user data
    const user = db.prepare(
      `SELECT u.id, u.username, u.email, u.first_name, u.last_name,
              u.role_id, u.entity_id, u.is_active, u.must_change_password,
              r.code as role_code, r.name as role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = ? AND u.is_active = 1`
    ).get(decoded.userId);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found or inactive.' });
    }

    req.user = user;
    req.token = token;
    req.sessionId = session.id;
    next();
  } catch (err) {
    logger.error('Auth middleware error:', err);
    return res.status(500).json({ success: false, message: 'Authentication error.' });
  }
}

/**
 * Require specific role(s)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    if (!roles.includes(req.user.role_code)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}.`
      });
    }
    next();
  };
}

/**
 * Check module permission
 */
function requirePermission(module, action) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    // Admin system has all permissions
    if (req.user.role_code === 'admin_system') {
      return next();
    }

    const perm = db.prepare(
      `SELECT is_allowed FROM permissions
       WHERE role_id = ? AND module = ? AND action = ?`
    ).get(req.user.role_id, module, action);

    if (!perm || !perm.is_allowed) {
      return res.status(403).json({
        success: false,
        message: `Permission denied: ${module}:${action}.`
      });
    }

    next();
  };
}

/**
 * Check if user can access entity data (own entity or admin)
 */
function requireEntityAccess(entityIdParam = 'entity_id') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    const adminRoles = ['admin_system', 'admin_metier', 'management', 'regulateur', 'emetteur', 'validateur'];
    if (adminRoles.includes(req.user.role_code)) {
      return next();
    }

    const entityId = req.params[entityIdParam] || req.body[entityIdParam] || req.query[entityIdParam];
    if (entityId && req.user.entity_id && parseInt(entityId) !== req.user.entity_id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to data from this entity.'
      });
    }

    next();
  };
}

/**
 * Optional auth - attach user if token present but don't fail
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return next();

  authenticate(req, res, (err) => {
    if (err) return next();
    next();
  });
}

module.exports = {
  authenticate,
  requireRole,
  requirePermission,
  requireEntityAccess,
  optionalAuth
};
