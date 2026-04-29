'use strict';

const { body, query, param, validationResult } = require('express-validator');
const db = require('../config/database');
const logger = require('../config/logger');
const auditService = require('../services/audit.service');
const { setAuditOldValue } = require('../middleware/audit');

// ----------------------------------------------------------------
// Helper: build paginated response
// ----------------------------------------------------------------
function paginate(data, total, page, limit) {
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

// ----------------------------------------------------------------
// GET /api/missions
// ----------------------------------------------------------------
async function getMissions(req, res) {
  try {
    const {
      status, entity_id, source_type_id, type_code,
      date_from, date_to, search,
      page = 1, limit = 20, sort = 'created_at', order = 'DESC'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = ['m.deleted_at IS NULL'];
    const params = [];

    if (status) { conditions.push('m.status_code = ?'); params.push(status); }
    if (entity_id) { conditions.push('m.entity_id = ?'); params.push(entity_id); }
    if (source_type_id) { conditions.push('m.source_type_id = ?'); params.push(source_type_id); }
    if (type_code) { conditions.push('m.type_code = ?'); params.push(type_code); }
    if (date_from) { conditions.push('m.created_at >= ?'); params.push(date_from); }
    if (date_to) { conditions.push('m.created_at <= ?'); params.push(date_to + ' 23:59:59'); }
    if (search) {
      conditions.push('(m.title LIKE ? OR m.reference LIKE ? OR m.code LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Entity-based filtering for non-admin roles
    const restrictedRoles = ['responsable_entite', 'responsable_action'];
    if (restrictedRoles.includes(req.user.role_code) && req.user.entity_id) {
      conditions.push('m.entity_id = ?');
      params.push(req.user.entity_id);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const allowedSorts = ['created_at', 'title', 'status_code', 'start_date', 'end_date', 'reference'];
    const sortCol = allowedSorts.includes(sort) ? `m.${sort}` : 'm.created_at';
    const orderDir = order === 'ASC' ? 'ASC' : 'DESC';

    const total = db.prepare(`SELECT COUNT(*) as cnt FROM missions m ${where}`).get(...params).cnt;

    const missions = db.prepare(
      `SELECT m.*,
              e.name as entity_name,
              st.label as source_label,
              u.first_name || ' ' || u.last_name as supervisor_name,
              cl.label as confidentiality_label,
              creator.first_name || ' ' || creator.last_name as created_by_name,
              (SELECT COUNT(*) FROM recommendations r WHERE r.mission_id = m.id AND r.deleted_at IS NULL) as recommendation_count
       FROM missions m
       LEFT JOIN entities e ON e.id = m.entity_id
       LEFT JOIN source_types st ON st.id = m.source_type_id
       LEFT JOIN users u ON u.id = m.supervisor_id
       LEFT JOIN confidentiality_levels cl ON cl.id = m.confidentiality_level_id
       LEFT JOIN users creator ON creator.id = m.created_by
       ${where}
       ORDER BY ${sortCol} ${orderDir}
       LIMIT ? OFFSET ?`
    ).all(...params, limitNum, offset);

    return res.json(paginate(missions, total, pageNum, limitNum));
  } catch (err) {
    logger.error('getMissions error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch missions.' });
  }
}

// ----------------------------------------------------------------
// GET /api/missions/:id
// ----------------------------------------------------------------
async function getMissionById(req, res) {
  try {
    const { id } = req.params;
    const mission = db.prepare(
      `SELECT m.*,
              e.name as entity_name,
              st.label as source_label, st.code as source_code,
              u.first_name || ' ' || u.last_name as supervisor_name,
              cl.label as confidentiality_label,
              creator.first_name || ' ' || creator.last_name as created_by_name
       FROM missions m
       LEFT JOIN entities e ON e.id = m.entity_id
       LEFT JOIN source_types st ON st.id = m.source_type_id
       LEFT JOIN users u ON u.id = m.supervisor_id
       LEFT JOIN confidentiality_levels cl ON cl.id = m.confidentiality_level_id
       LEFT JOIN users creator ON creator.id = m.created_by
       WHERE m.id = ? AND m.deleted_at IS NULL`
    ).get(id);

    if (!mission) {
      return res.status(404).json({ success: false, message: 'Mission not found.' });
    }

    return res.json({ success: true, data: mission });
  } catch (err) {
    logger.error('getMissionById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch mission.' });
  }
}

// ----------------------------------------------------------------
// POST /api/missions
// ----------------------------------------------------------------
const createMissionValidation = [
  body('title').notEmpty().trim().isLength({ max: 500 }).withMessage('Title required (max 500 chars).'),
  body('type_code').notEmpty().withMessage('Mission type required.'),
  body('entity_id').optional().isInt().withMessage('entity_id must be integer.'),
  body('source_type_id').optional().isInt(),
  body('supervisor_id').optional().isInt(),
  body('confidentiality_level_id').optional().isInt(),
  body('period_start').optional().isISO8601().withMessage('period_start must be a date.'),
  body('period_end').optional().isISO8601().withMessage('period_end must be a date.'),
  body('start_date').optional().isISO8601(),
  body('end_date').optional().isISO8601()
];

async function createMission(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation error.', errors: errors.array() });
  }

  try {
    const {
      title, type_code, source_type_id, issuing_authority,
      entity_id, scope, period_start, period_end,
      start_date, end_date, report_received_date, report_validated_date,
      supervisor_id, confidentiality_level_id,
      description, observations
    } = req.body;

    // Generate reference and code
    const year = new Date().getFullYear();
    const count = db.prepare("SELECT COUNT(*) as cnt FROM missions WHERE created_at >= date('now', 'start of year')").get().cnt;
    const seq = String(count + 1).padStart(4, '0');
    const reference = `MISS-${year}-${seq}`;
    const code = `M${year}${seq}`;

    const result = db.prepare(
      `INSERT INTO missions
         (reference, code, title, type_code, source_type_id, issuing_authority,
          entity_id, scope, period_start, period_end, start_date, end_date,
          report_received_date, report_validated_date, supervisor_id,
          confidentiality_level_id, status_code, description, observations, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`
    ).run(
      reference, code, title, type_code, source_type_id || null, issuing_authority || null,
      entity_id || null, scope || null, period_start || null, period_end || null,
      start_date || null, end_date || null, report_received_date || null,
      report_validated_date || null, supervisor_id || null,
      confidentiality_level_id || null, description || null,
      observations || null, req.user.id
    );

    const mission = db.prepare('SELECT * FROM missions WHERE id = ?').get(result.lastInsertRowid);

    // Status history
    db.prepare(
      `INSERT INTO status_history (entity_type, entity_id, from_status, to_status, changed_by, comment)
       VALUES ('mission', ?, NULL, 'draft', ?, 'Mission created')`
    ).run(mission.id, req.user.id);

    return res.status(201).json({ success: true, data: mission, message: 'Mission created successfully.' });
  } catch (err) {
    logger.error('createMission error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create mission.' });
  }
}

// ----------------------------------------------------------------
// PUT /api/missions/:id
// ----------------------------------------------------------------
async function updateMission(req, res) {
  try {
    const { id } = req.params;
    const mission = db.prepare('SELECT * FROM missions WHERE id = ? AND deleted_at IS NULL').get(id);

    if (!mission) {
      return res.status(404).json({ success: false, message: 'Mission not found.' });
    }

    setAuditOldValue(req, mission);

    const {
      title, type_code, source_type_id, issuing_authority,
      entity_id, scope, period_start, period_end,
      start_date, end_date, report_received_date, report_validated_date,
      supervisor_id, confidentiality_level_id, description, observations
    } = req.body;

    db.prepare(
      `UPDATE missions SET
         title = COALESCE(?, title),
         type_code = COALESCE(?, type_code),
         source_type_id = ?,
         issuing_authority = ?,
         entity_id = ?,
         scope = ?,
         period_start = ?,
         period_end = ?,
         start_date = ?,
         end_date = ?,
         report_received_date = ?,
         report_validated_date = ?,
         supervisor_id = ?,
         confidentiality_level_id = ?,
         description = ?,
         observations = ?
       WHERE id = ?`
    ).run(
      title || null, type_code || null,
      source_type_id !== undefined ? source_type_id : mission.source_type_id,
      issuing_authority !== undefined ? issuing_authority : mission.issuing_authority,
      entity_id !== undefined ? entity_id : mission.entity_id,
      scope !== undefined ? scope : mission.scope,
      period_start !== undefined ? period_start : mission.period_start,
      period_end !== undefined ? period_end : mission.period_end,
      start_date !== undefined ? start_date : mission.start_date,
      end_date !== undefined ? end_date : mission.end_date,
      report_received_date !== undefined ? report_received_date : mission.report_received_date,
      report_validated_date !== undefined ? report_validated_date : mission.report_validated_date,
      supervisor_id !== undefined ? supervisor_id : mission.supervisor_id,
      confidentiality_level_id !== undefined ? confidentiality_level_id : mission.confidentiality_level_id,
      description !== undefined ? description : mission.description,
      observations !== undefined ? observations : mission.observations,
      id
    );

    const updated = db.prepare('SELECT * FROM missions WHERE id = ?').get(id);
    return res.json({ success: true, data: updated, message: 'Mission updated successfully.' });
  } catch (err) {
    logger.error('updateMission error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update mission.' });
  }
}

// ----------------------------------------------------------------
// DELETE /api/missions/:id (logical delete)
// ----------------------------------------------------------------
async function deleteMission(req, res) {
  try {
    const { id } = req.params;
    const mission = db.prepare('SELECT * FROM missions WHERE id = ? AND deleted_at IS NULL').get(id);

    if (!mission) {
      return res.status(404).json({ success: false, message: 'Mission not found.' });
    }

    setAuditOldValue(req, mission);

    db.prepare(
      "UPDATE missions SET deleted_at = datetime('now'), deleted_by = ? WHERE id = ?"
    ).run(req.user.id, id);

    return res.json({ success: true, message: 'Mission deleted successfully.' });
  } catch (err) {
    logger.error('deleteMission error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete mission.' });
  }
}

// ----------------------------------------------------------------
// PUT /api/missions/:id/status
// ----------------------------------------------------------------
async function updateMissionStatus(req, res) {
  try {
    const { id } = req.params;
    const { status_code, comment } = req.body;

    if (!status_code) {
      return res.status(400).json({ success: false, message: 'status_code is required.' });
    }

    const mission = db.prepare('SELECT * FROM missions WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!mission) {
      return res.status(404).json({ success: false, message: 'Mission not found.' });
    }

    // Check if status is valid
    const statusType = db.prepare('SELECT * FROM mission_status_types WHERE code = ?').get(status_code);
    if (!statusType) {
      return res.status(400).json({ success: false, message: 'Invalid status code.' });
    }

    if (statusType.is_terminal && mission.status_code === status_code) {
      return res.status(400).json({ success: false, message: 'Mission is already in a terminal status.' });
    }

    setAuditOldValue(req, { status_code: mission.status_code });

    db.prepare('UPDATE missions SET status_code = ? WHERE id = ?').run(status_code, id);

    db.prepare(
      `INSERT INTO status_history (entity_type, entity_id, from_status, to_status, changed_by, comment)
       VALUES ('mission', ?, ?, ?, ?, ?)`
    ).run(id, mission.status_code, status_code, req.user.id, comment || null);

    const updated = db.prepare('SELECT * FROM missions WHERE id = ?').get(id);
    return res.json({ success: true, data: updated, message: 'Status updated.' });
  } catch (err) {
    logger.error('updateMissionStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update status.' });
  }
}

// ----------------------------------------------------------------
// GET /api/missions/:id/recommendations
// ----------------------------------------------------------------
async function getMissionRecommendations(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const mission = db.prepare('SELECT id FROM missions WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!mission) {
      return res.status(404).json({ success: false, message: 'Mission not found.' });
    }

    const total = db.prepare(
      'SELECT COUNT(*) as cnt FROM recommendations WHERE mission_id = ? AND deleted_at IS NULL'
    ).get(id).cnt;

    const recs = db.prepare(
      `SELECT r.*,
              sl.label as severity_label, sl.color as severity_color,
              pl.label as probability_label,
              e.name as entity_name,
              owner.first_name || ' ' || owner.last_name as owner_name,
              operator.first_name || ' ' || operator.last_name as operator_name
       FROM recommendations r
       LEFT JOIN severity_levels sl ON sl.id = r.severity_level_id
       LEFT JOIN probability_levels pl ON pl.id = r.probability_level_id
       LEFT JOIN entities e ON e.id = r.entity_id
       LEFT JOIN users owner ON owner.id = r.owner_id
       LEFT JOIN users operator ON operator.id = r.operator_id
       WHERE r.mission_id = ? AND r.deleted_at IS NULL
       ORDER BY r.criticality_score DESC, r.created_at ASC
       LIMIT ? OFFSET ?`
    ).all(id, limitNum, offset);

    return res.json(paginate(recs, total, pageNum, limitNum));
  } catch (err) {
    logger.error('getMissionRecommendations error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch recommendations.' });
  }
}

// ----------------------------------------------------------------
// GET /api/missions/:id/history
// ----------------------------------------------------------------
async function getMissionHistory(req, res) {
  try {
    const { id } = req.params;
    const history = db.prepare(
      `SELECT sh.*, u.first_name || ' ' || u.last_name as changed_by_name
       FROM status_history sh
       LEFT JOIN users u ON u.id = sh.changed_by
       WHERE sh.entity_type = 'mission' AND sh.entity_id = ?
       ORDER BY sh.created_at DESC`
    ).all(id);

    return res.json({ success: true, data: history });
  } catch (err) {
    logger.error('getMissionHistory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch history.' });
  }
}

module.exports = {
  getMissions,
  getMissionById,
  createMission,
  updateMission,
  deleteMission,
  updateMissionStatus,
  getMissionRecommendations,
  getMissionHistory,
  createMissionValidation
};
