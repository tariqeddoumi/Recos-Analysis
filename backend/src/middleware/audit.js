'use strict';

const db = require('../config/database');
const logger = require('../config/logger');

const MODIFYING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Middleware to automatically log all modifying API operations to audit_logs
 */
function auditMiddleware(req, res, next) {
  if (!MODIFYING_METHODS.includes(req.method)) {
    return next();
  }

  // Capture original json method to intercept response
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    // Only log if user is authenticated
    if (req.user && res.statusCode < 500) {
      const action = mapMethodToAction(req.method, req.path);
      const { entityType, entityId } = extractEntityInfo(req);

      setImmediate(() => {
        try {
          db.prepare(
            `INSERT INTO audit_logs
               (user_id, username, action, module, entity_type, entity_id,
                old_value, new_value, ip_address, user_agent, description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            req.user.id,
            req.user.username,
            action,
            extractModule(req.path),
            entityType,
            entityId,
            req.auditOldValue ? JSON.stringify(req.auditOldValue) : null,
            req.auditNewValue ? JSON.stringify(req.auditNewValue) : null,
            req.ip || req.connection?.remoteAddress,
            req.headers['user-agent'] || null,
            req.auditDescription || buildDescription(req)
          );
        } catch (err) {
          logger.error('Audit log error:', err);
        }
      });
    }

    return originalJson(body);
  };

  next();
}

function mapMethodToAction(method, path) {
  if (method === 'POST') return 'CREATE';
  if (method === 'DELETE') return 'DELETE';
  if (method === 'PUT' || method === 'PATCH') {
    if (path.includes('/status')) return 'STATUS_CHANGE';
    if (path.includes('/progress')) return 'PROGRESS_UPDATE';
    if (path.includes('/read')) return 'READ_NOTIFICATION';
    if (path.includes('/password')) return 'CHANGE_PASSWORD';
    return 'UPDATE';
  }
  return method;
}

function extractModule(path) {
  const segments = path.split('/').filter(Boolean);
  // Skip 'api' prefix if present
  const start = segments[0] === 'api' ? 1 : 0;
  return segments[start] || 'unknown';
}

function extractEntityInfo(req) {
  const segments = req.path.split('/').filter(Boolean);
  let entityType = null;
  let entityId = null;

  // Map path segments to entity types
  const entityMap = {
    'missions': 'mission',
    'recommendations': 'recommendation',
    'action-plans': 'action_plan',
    'evidences': 'evidence',
    'users': 'user',
    'entities': 'entity',
    'audit-logs': 'audit_log',
    'notifications': 'notification',
    'deadline-extensions': 'deadline_extension'
  };

  const start = segments[0] === 'api' ? 1 : 0;
  const segment = segments[start];
  if (segment && entityMap[segment]) {
    entityType = entityMap[segment];
    const idSegment = segments[start + 1];
    if (idSegment && /^\d+$/.test(idSegment)) {
      entityId = parseInt(idSegment);
    }
  }

  // Try to get from request body or response
  if (!entityId && req.params?.id) {
    entityId = parseInt(req.params.id) || null;
  }

  return { entityType, entityId };
}

function buildDescription(req) {
  const method = req.method;
  const path = req.path;
  return `${method} ${path}`;
}

/**
 * Helper to set old value for audit logging (call before update)
 */
function setAuditOldValue(req, value) {
  req.auditOldValue = value;
}

/**
 * Helper to set new value for audit logging (call after operation)
 */
function setAuditNewValue(req, value) {
  req.auditNewValue = value;
}

/**
 * Helper to set description
 */
function setAuditDescription(req, description) {
  req.auditDescription = description;
}

module.exports = {
  auditMiddleware,
  setAuditOldValue,
  setAuditNewValue,
  setAuditDescription
};
