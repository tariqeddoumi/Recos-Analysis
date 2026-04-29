'use strict';

const db = require('../config/database');
const logger = require('../config/logger');

/**
 * Send a single notification to a user
 */
function sendNotification({
  userId,
  typeCode = 'info',
  title,
  message,
  entityType = null,
  entityId = null
}) {
  try {
    const result = db.prepare(
      `INSERT INTO notifications (user_id, type_code, title, message, entity_type, entity_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(userId, typeCode, title, message, entityType, entityId);
    return result.lastInsertRowid;
  } catch (err) {
    logger.error('Failed to send notification:', err);
    return null;
  }
}

/**
 * Send notification to multiple users
 */
function sendBulkNotifications(userIds, { typeCode, title, message, entityType, entityId }) {
  if (!userIds || userIds.length === 0) return [];

  const insert = db.prepare(
    `INSERT INTO notifications (user_id, type_code, title, message, entity_type, entity_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const insertAll = db.transaction(() => {
    const ids = [];
    for (const userId of userIds) {
      const r = insert.run(userId, typeCode, title, message, entityType, entityId);
      ids.push(r.lastInsertRowid);
    }
    return ids;
  });

  try {
    return insertAll();
  } catch (err) {
    logger.error('Failed to send bulk notifications:', err);
    return [];
  }
}

/**
 * Get notifications for a user
 */
function getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
  const offset = (page - 1) * limit;
  const whereExtra = unreadOnly ? 'AND is_read = 0' : '';

  const total = db.prepare(
    `SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? ${whereExtra}`
  ).get(userId).cnt;

  const rows = db.prepare(
    `SELECT * FROM notifications
     WHERE user_id = ? ${whereExtra}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).all(userId, limit, offset);

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/**
 * Get unread count for a user
 */
function getUnreadCount(userId) {
  const row = db.prepare(
    'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0'
  ).get(userId);
  return row ? row.cnt : 0;
}

/**
 * Mark notification as read
 */
function markAsRead(notificationId, userId) {
  const result = db.prepare(
    `UPDATE notifications SET is_read = 1, read_at = datetime('now')
     WHERE id = ? AND user_id = ?`
  ).run(notificationId, userId);
  return result.changes > 0;
}

/**
 * Mark all notifications as read for a user
 */
function markAllAsRead(userId) {
  const result = db.prepare(
    `UPDATE notifications SET is_read = 1, read_at = datetime('now')
     WHERE user_id = ? AND is_read = 0`
  ).run(userId);
  return result.changes;
}

/**
 * Send notification to all users with a given role
 */
function notifyRole(roleCode, { typeCode, title, message, entityType, entityId }) {
  const users = db.prepare(
    `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
     WHERE r.code = ? AND u.is_active = 1`
  ).all(roleCode);

  const userIds = users.map(u => u.id);
  return sendBulkNotifications(userIds, { typeCode, title, message, entityType, entityId });
}

/**
 * Send notification to users responsible for an entity
 */
function notifyEntityOwners(entityId, { typeCode, title, message, refEntityType, refEntityId }) {
  const users = db.prepare(
    `SELECT id FROM users WHERE entity_id = ? AND is_active = 1`
  ).all(entityId);

  const userIds = users.map(u => u.id);
  return sendBulkNotifications(userIds, {
    typeCode,
    title,
    message,
    entityType: refEntityType,
    entityId: refEntityId
  });
}

/**
 * Delete old read notifications (called by cron)
 */
function cleanOldNotifications(daysOld = 90) {
  const result = db.prepare(
    `DELETE FROM notifications
     WHERE is_read = 1 AND read_at < datetime('now', '-${daysOld} days')`
  ).run();
  logger.debug(`Cleaned ${result.changes} old notifications.`);
  return result.changes;
}

module.exports = {
  sendNotification,
  sendBulkNotifications,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  notifyRole,
  notifyEntityOwners,
  cleanOldNotifications
};
