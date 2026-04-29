'use strict';

const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');
const db = require('../config/database');
const logger = require('../config/logger');

/**
 * POST /api/auth/login
 */
const loginValidation = [
  body('username').notEmpty().trim().withMessage('Username is required.'),
  body('password').notEmpty().withMessage('Password is required.')
];

async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation error.', errors: errors.array() });
  }

  try {
    const { username, password } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.login(username, password, ipAddress, userAgent);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Login successful.'
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/auth/logout
 */
async function logout(req, res) {
  try {
    authService.logout(
      req.token,
      req.user.id,
      req.ip,
      req.headers['user-agent']
    );
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    logger.error('Logout error:', err);
    return res.status(500).json({ success: false, message: 'Logout failed.' });
  }
}

/**
 * GET /api/auth/me
 */
async function getMe(req, res) {
  try {
    const user = db.prepare(
      `SELECT u.id, u.username, u.email, u.first_name, u.last_name,
              u.role_id, u.entity_id, u.is_active, u.must_change_password, u.last_login,
              r.code as role_code, r.name as role_name,
              e.name as entity_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN entities e ON e.id = u.entity_id
       WHERE u.id = ?`
    ).get(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Get permissions for role
    const permissions = db.prepare(
      `SELECT module, action, is_allowed FROM permissions WHERE role_id = ?`
    ).all(user.role_id);

    const permMap = {};
    for (const p of permissions) {
      if (!permMap[p.module]) permMap[p.module] = {};
      permMap[p.module][p.action] = Boolean(p.is_allowed);
    }

    return res.status(200).json({
      success: true,
      data: {
        ...user,
        permissions: permMap
      }
    });
  } catch (err) {
    logger.error('GetMe error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch user data.' });
  }
}

/**
 * PUT /api/auth/change-password
 */
const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase and number.')
];

async function changePassword(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation error.', errors: errors.array() });
  }

  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, currentPassword, newPassword);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please login again.'
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/auth/refresh
 */
async function refreshToken(req, res) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required.' });
    }

    const result = await authService.refreshToken(token, req.ip, req.headers['user-agent']);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

module.exports = {
  login,
  logout,
  getMe,
  changePassword,
  refreshToken,
  loginValidation,
  changePasswordValidation
};
