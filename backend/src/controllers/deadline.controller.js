'use strict';

const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const logger = require('../config/logger');
const notificationService = require('../services/notification.service');

function paginate(data, total, page, limit) {
  return { success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// ----------------------------------------------------------------
// GET /api/deadline-extensions
// ----------------------------------------------------------------
async function getDeadlineExtensions(req, res) {
  try {
    const {
      entity_type, entity_id, status, requester_id,
      page = 1, limit = 20
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    if (entity_type) { conditions.push('de.entity_type = ?'); params.push(entity_type); }
    if (entity_id) { conditions.push('de.entity_id = ?'); params.push(entity_id); }
    if (status) { conditions.push('de.status_code = ?'); params.push(status); }
    if (requester_id) { conditions.push('de.requester_id = ?'); params.push(requester_id); }

    // Non-admin users only see their own requests
    const adminRoles = ['admin_system', 'admin_metier', 'validateur', 'management'];
    if (!adminRoles.includes(req.user.role_code)) {
      conditions.push('de.requester_id = ?');
      params.push(req.user.id);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) as cnt FROM deadline_extensions de ${where}`).get(...params).cnt;

    const extensions = db.prepare(
      `SELECT de.*,
              req.first_name || ' ' || req.last_name as requester_name,
              val.first_name || ' ' || val.last_name as validator_name
       FROM deadline_extensions de
       LEFT JOIN users req ON req.id = de.requester_id
       LEFT JOIN users val ON val.id = de.validator_id
       ${where}
       ORDER BY de.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(...params, limitNum, offset);

    return res.json(paginate(extensions, total, pageNum, limitNum));
  } catch (err) {
    logger.error('getDeadlineExtensions error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch extensions.' });
  }
}

// ----------------------------------------------------------------
// GET /api/deadline-extensions/:id
// ----------------------------------------------------------------
async function getDeadlineExtensionById(req, res) {
  try {
    const { id } = req.params;
    const ext = db.prepare(
      `SELECT de.*,
              req.first_name || ' ' || req.last_name as requester_name,
              val.first_name || ' ' || val.last_name as validator_name
       FROM deadline_extensions de
       LEFT JOIN users req ON req.id = de.requester_id
       LEFT JOIN users val ON val.id = de.validator_id
       WHERE de.id = ?`
    ).get(id);

    if (!ext) return res.status(404).json({ success: false, message: 'Extension request not found.' });

    return res.json({ success: true, data: ext });
  } catch (err) {
    logger.error('getDeadlineExtensionById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch extension.' });
  }
}

// ----------------------------------------------------------------
// POST /api/deadline-extensions
// ----------------------------------------------------------------
const createExtensionValidation = [
  body('entity_type').isIn(['recommendation', 'action_plan']).withMessage('entity_type must be recommendation or action_plan.'),
  body('entity_id').isInt().withMessage('entity_id required.'),
  body('requested_deadline').isISO8601().withMessage('requested_deadline must be a valid date.'),
  body('reason').notEmpty().withMessage('Reason required.')
];

async function createDeadlineExtension(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation error.', errors: errors.array() });
  }

  try {
    const {
      entity_type, entity_id, requested_deadline,
      reason, justification, impact
    } = req.body;

    // Get current deadline
    let current_deadline = null;
    if (entity_type === 'recommendation') {
      const rec = db.prepare('SELECT initial_deadline, revised_deadline FROM recommendations WHERE id = ? AND deleted_at IS NULL').get(entity_id);
      if (!rec) return res.status(404).json({ success: false, message: 'Recommendation not found.' });
      current_deadline = rec.revised_deadline || rec.initial_deadline;
    } else {
      const ap = db.prepare('SELECT planned_end FROM action_plans WHERE id = ? AND deleted_at IS NULL').get(entity_id);
      if (!ap) return res.status(404).json({ success: false, message: 'Action plan not found.' });
      current_deadline = ap.planned_end;
    }

    if (!current_deadline) {
      return res.status(400).json({ success: false, message: 'No existing deadline to extend.' });
    }

    if (new Date(requested_deadline) <= new Date(current_deadline)) {
      return res.status(400).json({ success: false, message: 'Requested deadline must be after current deadline.' });
    }

    const result = db.prepare(
      `INSERT INTO deadline_extensions
         (entity_type, entity_id, current_deadline, requested_deadline,
          reason, justification, impact, requester_id, status_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).run(entity_type, entity_id, current_deadline, requested_deadline,
      reason, justification || null, impact || null, req.user.id);

    // Notify validators
    const validators = db.prepare(
      `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
       WHERE r.code IN ('admin_metier', 'validateur') AND u.is_active = 1`
    ).all();

    const valIds = validators.map(v => v.id);
    notificationService.sendBulkNotifications(valIds, {
      typeCode: 'deadline',
      title: 'Demande de prorogation de délai',
      message: `Une demande de prorogation de délai a été soumise pour ${entity_type} #${entity_id}. Nouvelle date demandée: ${requested_deadline}`,
      entityType: 'deadline_extension',
      entityId: result.lastInsertRowid
    });

    const ext = db.prepare('SELECT * FROM deadline_extensions WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, data: ext, message: 'Extension request submitted.' });
  } catch (err) {
    logger.error('createDeadlineExtension error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create extension request.' });
  }
}

// ----------------------------------------------------------------
// PUT /api/deadline-extensions/:id/status
// ----------------------------------------------------------------
async function updateExtensionStatus(req, res) {
  try {
    const { id } = req.params;
    const { status_code, comment } = req.body;

    const allowedStatuses = ['approved', 'rejected'];
    if (!status_code || !allowedStatuses.includes(status_code)) {
      return res.status(400).json({ success: false, message: "status_code must be 'approved' or 'rejected'." });
    }

    const ext = db.prepare('SELECT * FROM deadline_extensions WHERE id = ?').get(id);
    if (!ext) return res.status(404).json({ success: false, message: 'Extension request not found.' });

    if (ext.status_code !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending requests can be processed.' });
    }

    db.prepare(
      `UPDATE deadline_extensions SET
         status_code = ?,
         validator_id = ?,
         validation_date = datetime('now'),
         validator_comment = ?
       WHERE id = ?`
    ).run(status_code, req.user.id, comment || null, id);

    // If approved, update the actual entity deadline
    if (status_code === 'approved') {
      if (ext.entity_type === 'recommendation') {
        db.prepare('UPDATE recommendations SET revised_deadline = ? WHERE id = ?')
          .run(ext.requested_deadline, ext.entity_id);
      } else if (ext.entity_type === 'action_plan') {
        db.prepare('UPDATE action_plans SET planned_end = ? WHERE id = ?')
          .run(ext.requested_deadline, ext.entity_id);
      }
    }

    // Notify requester
    const statusMsg = status_code === 'approved' ? 'approuvée' : 'rejetée';
    notificationService.sendNotification({
      userId: ext.requester_id,
      typeCode: 'deadline',
      title: `Demande de prorogation ${statusMsg}`,
      message: `Votre demande de prorogation pour ${ext.entity_type} #${ext.entity_id} a été ${statusMsg}.${comment ? ' Commentaire: ' + comment : ''}`,
      entityType: 'deadline_extension',
      entityId: ext.id
    });

    const updated = db.prepare('SELECT * FROM deadline_extensions WHERE id = ?').get(id);
    return res.json({ success: true, data: updated, message: `Extension request ${statusMsg}.` });
  } catch (err) {
    logger.error('updateExtensionStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update extension status.' });
  }
}

module.exports = {
  getDeadlineExtensions,
  getDeadlineExtensionById,
  createDeadlineExtension,
  updateExtensionStatus,
  createExtensionValidation
};
