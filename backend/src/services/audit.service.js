'use strict';

const db = require('../config/database');
const logger = require('../config/logger');

/**
 * Log an audit event
 */
function log({
  userId = null,
  username = null,
  action,
  module,
  entityType = null,
  entityId = null,
  oldValue = null,
  newValue = null,
  ipAddress = null,
  userAgent = null,
  description = null
}) {
  try {
    // Resolve username if not provided
    if (!username && userId) {
      const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
      username = user?.username || null;
    }

    db.prepare(
      `INSERT INTO audit_logs
         (user_id, username, action, module, entity_type, entity_id,
          old_value, new_value, ip_address, user_agent, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userId,
      username,
      action,
      module,
      entityType,
      entityId,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      ipAddress,
      userAgent,
      description
    );
  } catch (err) {
    logger.error('Failed to write audit log:', err);
  }
}

/**
 * Get audit logs with filtering and pagination
 */
function getLogs({
  userId = null,
  username = null,
  action = null,
  module = null,
  entityType = null,
  entityId = null,
  dateFrom = null,
  dateTo = null,
  search = null,
  page = 1,
  limit = 50
}) {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (userId) {
    conditions.push('al.user_id = ?');
    params.push(userId);
  }
  if (username) {
    conditions.push('al.username LIKE ?');
    params.push(`%${username}%`);
  }
  if (action) {
    conditions.push('al.action = ?');
    params.push(action);
  }
  if (module) {
    conditions.push('al.module = ?');
    params.push(module);
  }
  if (entityType) {
    conditions.push('al.entity_type = ?');
    params.push(entityType);
  }
  if (entityId) {
    conditions.push('al.entity_id = ?');
    params.push(entityId);
  }
  if (dateFrom) {
    conditions.push('al.created_at >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push('al.created_at <= ?');
    params.push(dateTo + ' 23:59:59');
  }
  if (search) {
    conditions.push('(al.description LIKE ? OR al.username LIKE ? OR al.action LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = db.prepare(
    `SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`
  ).get(...params);

  const rows = db.prepare(
    `SELECT al.*, u.first_name || ' ' || u.last_name as user_full_name
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ${whereClause}
     ORDER BY al.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total: countRow.total,
      totalPages: Math.ceil(countRow.total / limit)
    }
  };
}

/**
 * Get logs for a specific entity
 */
function getEntityLogs(entityType, entityId) {
  return db.prepare(
    `SELECT al.*, u.first_name || ' ' || u.last_name as user_full_name
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE al.entity_type = ? AND al.entity_id = ?
     ORDER BY al.created_at DESC`
  ).all(entityType, entityId);
}

/**
 * Export logs as CSV-ready array
 */
function exportLogs(filters = {}) {
  const { data } = getLogs({ ...filters, limit: 10000 });
  return data.map(row => ({
    Date: row.created_at,
    Utilisateur: row.username || '',
    'Nom complet': row.user_full_name || '',
    Action: row.action,
    Module: row.module,
    'Type entité': row.entity_type || '',
    'ID entité': row.entity_id || '',
    Description: row.description || '',
    'Adresse IP': row.ip_address || ''
  }));
}

module.exports = { log, getLogs, getEntityLogs, exportLogs };
