'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;
const BCRYPT_ROUNDS = 12;

/**
 * Hash a password with bcrypt
 */
async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against hash
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Verify a JWT token
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Login - verify credentials, handle lockout, return JWT
 */
async function login(username, password, ipAddress, userAgent) {
  // Find user
  const user = db.prepare(
    `SELECT u.*, r.code as role_code, r.name as role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE (u.username = ? OR u.email = ?) AND u.is_active = 1`
  ).get(username, username);

  if (!user) {
    throw Object.assign(new Error('Invalid credentials.'), { statusCode: 401 });
  }

  // Check lockout
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    throw Object.assign(
      new Error(`Account locked. Try again in ${minutesLeft} minute(s).`),
      { statusCode: 423 }
    );
  }

  // Verify password
  const passwordValid = await verifyPassword(password, user.password_hash);

  if (!passwordValid) {
    await incrementFailedAttempts(user.id);
    const updated = db.prepare('SELECT failed_attempts, locked_until FROM users WHERE id = ?').get(user.id);
    if (updated.locked_until) {
      throw Object.assign(
        new Error(`Invalid credentials. Account locked for ${LOCK_DURATION_MINUTES} minutes due to too many failed attempts.`),
        { statusCode: 423 }
      );
    }
    const remaining = MAX_FAILED_ATTEMPTS - updated.failed_attempts;
    throw Object.assign(
      new Error(`Invalid credentials. ${remaining} attempt(s) remaining before lockout.`),
      { statusCode: 401 }
    );
  }

  // Reset failed attempts on success
  await resetFailedAttempts(user.id);

  // Update last login
  db.prepare('UPDATE users SET last_login = datetime(\'now\') WHERE id = ?').run(user.id);

  // Generate token
  const payload = {
    userId: user.id,
    username: user.username,
    roleCode: user.role_code,
    entityId: user.entity_id
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  // Store session
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const sessionId = uuidv4();

  // Calculate expiry
  const expiresAt = new Date();
  const hours = parseInt(JWT_EXPIRES_IN) || 8;
  expiresAt.setHours(expiresAt.getHours() + hours);

  db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(sessionId, user.id, tokenHash, ipAddress, userAgent, expiresAt.toISOString());

  // Audit log
  try {
    db.prepare(
      `INSERT INTO audit_logs (user_id, username, action, module, ip_address, user_agent, description)
       VALUES (?, ?, 'LOGIN', 'auth', ?, ?, 'User login')`
    ).run(user.id, user.username, ipAddress, userAgent);
  } catch (e) {
    logger.warn('Failed to write login audit log:', e.message);
  }

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roleCode: user.role_code,
      roleName: user.role_name,
      entityId: user.entity_id,
      mustChangePassword: Boolean(user.must_change_password)
    }
  };
}

/**
 * Logout - revoke session
 */
function logout(token, userId, ipAddress, userAgent) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  db.prepare(
    `UPDATE sessions SET is_revoked = 1 WHERE token_hash = ? AND user_id = ?`
  ).run(tokenHash, userId);

  // Audit
  try {
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
    db.prepare(
      `INSERT INTO audit_logs (user_id, username, action, module, ip_address, user_agent, description)
       VALUES (?, ?, 'LOGOUT', 'auth', ?, ?, 'User logout')`
    ).run(userId, user?.username, ipAddress, userAgent);
  } catch (e) {
    logger.warn('Failed to write logout audit log:', e.message);
  }
}

/**
 * Refresh token - extend session
 */
async function refreshToken(token, ipAddress, userAgent) {
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
  } catch (err) {
    throw Object.assign(new Error('Invalid token.'), { statusCode: 401 });
  }

  // Check if not expired by more than 1 day
  const exp = decoded.exp * 1000;
  if (Date.now() - exp > 24 * 60 * 60 * 1000) {
    throw Object.assign(new Error('Token too old to refresh. Please login again.'), { statusCode: 401 });
  }

  // Revoke old token
  const oldHash = crypto.createHash('sha256').update(token).digest('hex');
  db.prepare('UPDATE sessions SET is_revoked = 1 WHERE token_hash = ?').run(oldHash);

  // Issue new token
  const user = db.prepare(
    `SELECT u.*, r.code as role_code FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.id = ? AND u.is_active = 1`
  ).get(decoded.userId);

  if (!user) {
    throw Object.assign(new Error('User not found.'), { statusCode: 401 });
  }

  const payload = {
    userId: user.id,
    username: user.username,
    roleCode: user.role_code,
    entityId: user.entity_id
  };

  const newToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const tokenHash = crypto.createHash('sha256').update(newToken).digest('hex');
  const sessionId = uuidv4();

  const expiresAt = new Date();
  const hours = parseInt(JWT_EXPIRES_IN) || 8;
  expiresAt.setHours(expiresAt.getHours() + hours);

  db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(sessionId, user.id, tokenHash, ipAddress, userAgent, expiresAt.toISOString());

  return { token: newToken };
}

/**
 * Change password
 */
async function changePassword(userId, currentPassword, newPassword) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  }

  const valid = await verifyPassword(currentPassword, user.password_hash);
  if (!valid) {
    throw Object.assign(new Error('Current password is incorrect.'), { statusCode: 400 });
  }

  if (newPassword.length < 8) {
    throw Object.assign(new Error('Password must be at least 8 characters.'), { statusCode: 400 });
  }

  const newHash = await hashPassword(newPassword);
  db.prepare(
    `UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?`
  ).run(newHash, userId);

  // Revoke all sessions to force re-login
  db.prepare('UPDATE sessions SET is_revoked = 1 WHERE user_id = ?').run(userId);
}

/**
 * Increment failed login attempts, lock if exceeded
 */
async function incrementFailedAttempts(userId) {
  const user = db.prepare('SELECT failed_attempts FROM users WHERE id = ?').get(userId);
  const newCount = (user?.failed_attempts || 0) + 1;

  if (newCount >= MAX_FAILED_ATTEMPTS) {
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + LOCK_DURATION_MINUTES);
    db.prepare(
      'UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?'
    ).run(newCount, lockUntil.toISOString(), userId);
  } else {
    db.prepare(
      'UPDATE users SET failed_attempts = ?, locked_until = NULL WHERE id = ?'
    ).run(newCount, userId);
  }
}

/**
 * Reset failed attempts and unlock
 */
async function resetFailedAttempts(userId) {
  db.prepare(
    'UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?'
  ).run(userId);
}

/**
 * Clean expired sessions (called by cron)
 */
function cleanExpiredSessions() {
  const result = db.prepare(
    "DELETE FROM sessions WHERE expires_at < datetime('now') OR is_revoked = 1"
  ).run();
  logger.debug(`Cleaned ${result.changes} expired sessions.`);
  return result.changes;
}

module.exports = {
  login,
  logout,
  refreshToken,
  hashPassword,
  verifyPassword,
  verifyToken,
  changePassword,
  incrementFailedAttempts,
  resetFailedAttempts,
  cleanExpiredSessions
};
