'use strict';

const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const logger = require('../config/logger');
const criticalityService = require('../services/criticality.service');
const { setAuditOldValue } = require('../middleware/audit');

function paginate(data, total, page, limit) {
  return { success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// ----------------------------------------------------------------
// GET /api/recommendations
// ----------------------------------------------------------------
async function getRecommendations(req, res) {
  try {
    const {
      mission_id, status, entity_id, owner_id, operator_id,
      source_type_id, risk_type_id, is_regulatory,
      priority_label, date_from, date_to, search,
      overdue_only, page = 1, limit = 20, sort = 'criticality_score', order = 'DESC'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = ['r.deleted_at IS NULL'];
    const params = [];

    if (mission_id) { conditions.push('r.mission_id = ?'); params.push(mission_id); }
    if (status) {
      const statuses = status.split(',').filter(Boolean);
      conditions.push(`r.status_code IN (${statuses.map(() => '?').join(',')})`);
      params.push(...statuses);
    }
    if (entity_id) { conditions.push('r.entity_id = ?'); params.push(entity_id); }
    if (owner_id) { conditions.push('r.owner_id = ?'); params.push(owner_id); }
    if (operator_id) { conditions.push('r.operator_id = ?'); params.push(operator_id); }
    if (source_type_id) { conditions.push('r.source_type_id = ?'); params.push(source_type_id); }
    if (risk_type_id) { conditions.push('r.risk_type_id = ?'); params.push(risk_type_id); }
    if (is_regulatory !== undefined) { conditions.push('r.is_regulatory = ?'); params.push(is_regulatory === 'true' ? 1 : 0); }
    if (priority_label) { conditions.push('r.priority_label = ?'); params.push(priority_label); }
    if (date_from) { conditions.push('r.created_at >= ?'); params.push(date_from); }
    if (date_to) { conditions.push('r.created_at <= ?'); params.push(date_to + ' 23:59:59'); }
    if (search) {
      conditions.push('(r.code LIKE ? OR r.recommendation_text LIKE ? OR r.constat LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (overdue_only === 'true') {
      conditions.push("date(COALESCE(r.revised_deadline, r.initial_deadline)) < date('now')");
      conditions.push("r.status_code NOT IN ('closed', 'validated', 'abandoned')");
    }

    // Role-based filtering
    if (req.user.role_code === 'responsable_entite' && req.user.entity_id) {
      conditions.push('r.entity_id = ?'); params.push(req.user.entity_id);
    } else if (req.user.role_code === 'responsable_action') {
      conditions.push('(r.owner_id = ? OR r.operator_id = ?)');
      params.push(req.user.id, req.user.id);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const allowedSorts = ['criticality_score', 'created_at', 'initial_deadline', 'status_code', 'code', 'progress_rate'];
    const sortCol = allowedSorts.includes(sort) ? `r.${sort}` : 'r.criticality_score';
    const orderDir = order === 'ASC' ? 'ASC' : 'DESC';

    const total = db.prepare(`SELECT COUNT(*) as cnt FROM recommendations r ${where}`).get(...params).cnt;

    const recs = db.prepare(
      `SELECT r.*,
              m.title as mission_title, m.reference as mission_reference,
              sl.label as severity_label, sl.score as severity_score, sl.color as severity_color,
              pl.label as probability_label, pl.score as probability_score,
              e.name as entity_name,
              rt.label as risk_type_label,
              st.label as source_label,
              owner.first_name || ' ' || owner.last_name as owner_name,
              operator.first_name || ' ' || operator.last_name as operator_name,
              cl.label as confidentiality_label
       FROM recommendations r
       LEFT JOIN missions m ON m.id = r.mission_id
       LEFT JOIN severity_levels sl ON sl.id = r.severity_level_id
       LEFT JOIN probability_levels pl ON pl.id = r.probability_level_id
       LEFT JOIN entities e ON e.id = r.entity_id
       LEFT JOIN risk_types rt ON rt.id = r.risk_type_id
       LEFT JOIN source_types st ON st.id = r.source_type_id
       LEFT JOIN users owner ON owner.id = r.owner_id
       LEFT JOIN users operator ON operator.id = r.operator_id
       LEFT JOIN confidentiality_levels cl ON cl.id = r.confidentiality_level_id
       ${where}
       ORDER BY ${sortCol} ${orderDir} NULLS LAST
       LIMIT ? OFFSET ?`
    ).all(...params, limitNum, offset);

    return res.json(paginate(recs, total, pageNum, limitNum));
  } catch (err) {
    logger.error('getRecommendations error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch recommendations.' });
  }
}

// ----------------------------------------------------------------
// GET /api/recommendations/:id
// ----------------------------------------------------------------
async function getRecommendationById(req, res) {
  try {
    const { id } = req.params;
    const rec = db.prepare(
      `SELECT r.*,
              m.title as mission_title, m.reference as mission_reference,
              sl.label as severity_label, sl.score as severity_score, sl.color as severity_color,
              pl.label as probability_label, pl.score as probability_score,
              e.name as entity_name,
              d.name as direction_name,
              p.name as process_name,
              rt.label as risk_type_label,
              st.label as source_label, st.coefficient as source_coefficient,
              owner.first_name || ' ' || owner.last_name as owner_name,
              owner.email as owner_email,
              operator.first_name || ' ' || operator.last_name as operator_name,
              cl.label as confidentiality_label,
              creator.first_name || ' ' || creator.last_name as created_by_name
       FROM recommendations r
       LEFT JOIN missions m ON m.id = r.mission_id
       LEFT JOIN severity_levels sl ON sl.id = r.severity_level_id
       LEFT JOIN probability_levels pl ON pl.id = r.probability_level_id
       LEFT JOIN entities e ON e.id = r.entity_id
       LEFT JOIN directions d ON d.id = r.direction_id
       LEFT JOIN processes p ON p.id = r.process_id
       LEFT JOIN risk_types rt ON rt.id = r.risk_type_id
       LEFT JOIN source_types st ON st.id = r.source_type_id
       LEFT JOIN users owner ON owner.id = r.owner_id
       LEFT JOIN users operator ON operator.id = r.operator_id
       LEFT JOIN confidentiality_levels cl ON cl.id = r.confidentiality_level_id
       LEFT JOIN users creator ON creator.id = r.created_by
       WHERE r.id = ? AND r.deleted_at IS NULL`
    ).get(id);

    if (!rec) {
      return res.status(404).json({ success: false, message: 'Recommendation not found.' });
    }

    return res.json({ success: true, data: rec });
  } catch (err) {
    logger.error('getRecommendationById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch recommendation.' });
  }
}

// ----------------------------------------------------------------
// POST /api/recommendations
// ----------------------------------------------------------------
const createRecommendationValidation = [
  body('mission_id').isInt().withMessage('mission_id required.'),
  body('recommendation_text').notEmpty().withMessage('Recommendation text required.'),
  body('entity_id').optional().isInt(),
  body('severity_level_id').optional().isInt(),
  body('probability_level_id').optional().isInt(),
  body('initial_deadline').optional().isISO8601(),
  body('is_regulatory').optional().isBoolean()
];

async function createRecommendation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation error.', errors: errors.array() });
  }

  try {
    const {
      mission_id, source_type_id, report_reference, page_reference, emission_date,
      entity_id, direction_id, process_id, risk_type_id,
      constat, root_cause, potential_consequence, recommendation_text,
      severity_level_id, probability_level_id,
      owner_id, operator_id, initial_deadline,
      entity_comment, controller_comment, confidentiality_level_id,
      is_regulatory = false, type_code = 'recommendation', recurrence_count = 0
    } = req.body;

    // Verify mission exists
    const mission = db.prepare('SELECT * FROM missions WHERE id = ? AND deleted_at IS NULL').get(mission_id);
    if (!mission) {
      return res.status(404).json({ success: false, message: 'Mission not found.' });
    }

    // Generate code
    const year = new Date().getFullYear();
    const count = db.prepare(
      "SELECT COUNT(*) as cnt FROM recommendations WHERE created_at >= date('now', 'start of year')"
    ).get().cnt;
    const seq = String(count + 1).padStart(4, '0');
    const code = `RECO-${year}-${seq}`;

    // Insert
    const result = db.prepare(
      `INSERT INTO recommendations
         (code, mission_id, source_type_id, report_reference, page_reference, emission_date,
          entity_id, direction_id, process_id, risk_type_id,
          constat, root_cause, potential_consequence, recommendation_text,
          severity_level_id, probability_level_id,
          owner_id, operator_id, initial_deadline,
          status_code, progress_rate,
          entity_comment, controller_comment, confidentiality_level_id,
          is_regulatory, type_code, recurrence_count, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0,
               ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      code, mission_id, source_type_id || null, report_reference || null, page_reference || null,
      emission_date || null, entity_id || null, direction_id || null, process_id || null,
      risk_type_id || null, constat || null, root_cause || null, potential_consequence || null,
      recommendation_text, severity_level_id || null, probability_level_id || null,
      owner_id || null, operator_id || null, initial_deadline || null,
      entity_comment || null, controller_comment || null, confidentiality_level_id || null,
      is_regulatory ? 1 : 0, type_code, recurrence_count, req.user.id
    );

    const recId = result.lastInsertRowid;

    // Calculate criticality
    const recData = db.prepare('SELECT * FROM recommendations WHERE id = ?').get(recId);
    const { score, label } = criticalityService.calculateForRecommendation(recData);
    if (score !== null) {
      db.prepare(
        'UPDATE recommendations SET criticality_score = ?, criticality_adjusted = ?, priority_label = ? WHERE id = ?'
      ).run(score, score, label, recId);
    }

    // Status history
    db.prepare(
      `INSERT INTO status_history (entity_type, entity_id, from_status, to_status, changed_by)
       VALUES ('recommendation', ?, NULL, 'draft', ?)`
    ).run(recId, req.user.id);

    const rec = db.prepare('SELECT * FROM recommendations WHERE id = ?').get(recId);
    return res.status(201).json({ success: true, data: rec, message: 'Recommendation created.' });
  } catch (err) {
    logger.error('createRecommendation error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create recommendation.' });
  }
}

// ----------------------------------------------------------------
// PUT /api/recommendations/:id
// ----------------------------------------------------------------
async function updateRecommendation(req, res) {
  try {
    const { id } = req.params;
    const rec = db.prepare('SELECT * FROM recommendations WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!rec) return res.status(404).json({ success: false, message: 'Recommendation not found.' });

    setAuditOldValue(req, rec);

    const fields = [
      'source_type_id', 'report_reference', 'page_reference', 'emission_date',
      'entity_id', 'direction_id', 'process_id', 'risk_type_id',
      'constat', 'root_cause', 'potential_consequence', 'recommendation_text',
      'severity_level_id', 'probability_level_id',
      'owner_id', 'operator_id', 'initial_deadline', 'revised_deadline',
      'entity_comment', 'controller_comment', 'confidentiality_level_id',
      'is_regulatory', 'type_code', 'recurrence_count'
    ];

    const setClauses = [];
    const params = [];
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update.' });
    }

    params.push(id);
    db.prepare(`UPDATE recommendations SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);

    // Recalculate criticality
    const updated = db.prepare('SELECT * FROM recommendations WHERE id = ?').get(id);
    const { score, label } = criticalityService.calculateForRecommendation(updated);
    if (score !== null) {
      db.prepare(
        'UPDATE recommendations SET criticality_score = ?, criticality_adjusted = ?, priority_label = ? WHERE id = ?'
      ).run(score, score, label, id);
    }

    const final = db.prepare('SELECT * FROM recommendations WHERE id = ?').get(id);
    return res.json({ success: true, data: final, message: 'Recommendation updated.' });
  } catch (err) {
    logger.error('updateRecommendation error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update recommendation.' });
  }
}

// ----------------------------------------------------------------
// DELETE /api/recommendations/:id
// ----------------------------------------------------------------
async function deleteRecommendation(req, res) {
  try {
    const { id } = req.params;
    const rec = db.prepare('SELECT * FROM recommendations WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!rec) return res.status(404).json({ success: false, message: 'Recommendation not found.' });

    setAuditOldValue(req, rec);
    db.prepare("UPDATE recommendations SET deleted_at = datetime('now'), deleted_by = ? WHERE id = ?").run(req.user.id, id);

    return res.json({ success: true, message: 'Recommendation deleted.' });
  } catch (err) {
    logger.error('deleteRecommendation error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete.' });
  }
}

// ----------------------------------------------------------------
// PUT /api/recommendations/:id/status
// ----------------------------------------------------------------
async function updateRecommendationStatus(req, res) {
  try {
    const { id } = req.params;
    const { status_code, comment } = req.body;

    if (!status_code) return res.status(400).json({ success: false, message: 'status_code required.' });

    const rec = db.prepare('SELECT * FROM recommendations WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!rec) return res.status(404).json({ success: false, message: 'Recommendation not found.' });

    const statusType = db.prepare('SELECT * FROM recommendation_status_types WHERE code = ?').get(status_code);
    if (!statusType) return res.status(400).json({ success: false, message: 'Invalid status code.' });

    setAuditOldValue(req, { status_code: rec.status_code });

    const now = new Date().toISOString().split('T')[0];
    const closeDate = statusType.is_terminal ? now : null;

    db.prepare(
      `UPDATE recommendations SET status_code = ?, actual_close_date = COALESCE(?, actual_close_date) WHERE id = ?`
    ).run(status_code, closeDate, id);

    db.prepare(
      `INSERT INTO status_history (entity_type, entity_id, from_status, to_status, changed_by, comment)
       VALUES ('recommendation', ?, ?, ?, ?, ?)`
    ).run(id, rec.status_code, status_code, req.user.id, comment || null);

    const updated = db.prepare('SELECT * FROM recommendations WHERE id = ?').get(id);
    return res.json({ success: true, data: updated, message: 'Status updated.' });
  } catch (err) {
    logger.error('updateRecommendationStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update status.' });
  }
}

// ----------------------------------------------------------------
// GET /api/recommendations/:id/actions
// ----------------------------------------------------------------
async function getRecommendationActions(req, res) {
  try {
    const { id } = req.params;
    const actions = db.prepare(
      `SELECT ap.*,
              u.first_name || ' ' || u.last_name as operator_name,
              e.name as entity_name
       FROM action_plans ap
       LEFT JOIN users u ON u.id = ap.operator_id
       LEFT JOIN entities e ON e.id = ap.entity_id
       WHERE ap.recommendation_id = ? AND ap.deleted_at IS NULL
       ORDER BY ap.priority DESC, ap.planned_end ASC`
    ).all(id);

    return res.json({ success: true, data: actions });
  } catch (err) {
    logger.error('getRecommendationActions error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch actions.' });
  }
}

// ----------------------------------------------------------------
// GET /api/recommendations/:id/evidences
// ----------------------------------------------------------------
async function getRecommendationEvidences(req, res) {
  try {
    const { id } = req.params;
    const evidences = db.prepare(
      `SELECT ev.*,
              u.first_name || ' ' || u.last_name as depositor_name,
              et.label as evidence_type_label
       FROM evidences ev
       LEFT JOIN users u ON u.id = ev.depositor_id
       LEFT JOIN evidence_types et ON et.id = ev.evidence_type_id
       WHERE ev.recommendation_id = ? AND ev.deleted_at IS NULL
       ORDER BY ev.created_at DESC`
    ).all(id);

    return res.json({ success: true, data: evidences });
  } catch (err) {
    logger.error('getRecommendationEvidences error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch evidences.' });
  }
}

// ----------------------------------------------------------------
// GET /api/recommendations/:id/history
// ----------------------------------------------------------------
async function getRecommendationHistory(req, res) {
  try {
    const { id } = req.params;
    const history = db.prepare(
      `SELECT sh.*, u.first_name || ' ' || u.last_name as changed_by_name
       FROM status_history sh
       LEFT JOIN users u ON u.id = sh.changed_by
       WHERE sh.entity_type = 'recommendation' AND sh.entity_id = ?
       ORDER BY sh.created_at DESC`
    ).all(id);

    return res.json({ success: true, data: history });
  } catch (err) {
    logger.error('getRecommendationHistory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch history.' });
  }
}

// ----------------------------------------------------------------
// GET /api/recommendations/:id/comments
// ----------------------------------------------------------------
async function getRecommendationComments(req, res) {
  try {
    const { id } = req.params;
    const isInternal = req.user.role_code === 'admin_system' || req.user.role_code === 'admin_metier';

    const comments = db.prepare(
      `SELECT c.*, u.first_name || ' ' || u.last_name as author_name
       FROM comments c
       LEFT JOIN users u ON u.id = c.author_id
       WHERE c.entity_type = 'recommendation' AND c.entity_id = ? AND c.deleted_at IS NULL
         ${isInternal ? '' : 'AND c.is_internal = 0'}
       ORDER BY c.created_at ASC`
    ).all(id);

    return res.json({ success: true, data: comments });
  } catch (err) {
    logger.error('getRecommendationComments error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch comments.' });
  }
}

// ----------------------------------------------------------------
// POST /api/recommendations/:id/comments
// ----------------------------------------------------------------
async function addRecommendationComment(req, res) {
  try {
    const { id } = req.params;
    const { content, is_internal = false } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content required.' });
    }

    const rec = db.prepare('SELECT id FROM recommendations WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!rec) return res.status(404).json({ success: false, message: 'Recommendation not found.' });

    const result = db.prepare(
      `INSERT INTO comments (entity_type, entity_id, content, author_id, is_internal)
       VALUES ('recommendation', ?, ?, ?, ?)`
    ).run(id, content.trim(), req.user.id, is_internal ? 1 : 0);

    const comment = db.prepare(
      `SELECT c.*, u.first_name || ' ' || u.last_name as author_name
       FROM comments c LEFT JOIN users u ON u.id = c.author_id
       WHERE c.id = ?`
    ).get(result.lastInsertRowid);

    return res.status(201).json({ success: true, data: comment, message: 'Comment added.' });
  } catch (err) {
    logger.error('addRecommendationComment error:', err);
    return res.status(500).json({ success: false, message: 'Failed to add comment.' });
  }
}

// ----------------------------------------------------------------
// PUT /api/recommendations/:id/progress
// ----------------------------------------------------------------
async function updateRecommendationProgress(req, res) {
  try {
    const { id } = req.params;
    const rec = db.prepare('SELECT id FROM recommendations WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!rec) return res.status(404).json({ success: false, message: 'Recommendation not found.' });

    // Calculate from action plans
    const actions = db.prepare(
      `SELECT progress_rate, weight FROM action_plans
       WHERE recommendation_id = ? AND deleted_at IS NULL
         AND status_code != 'cancelled'`
    ).all(id);

    let progress = 0;
    if (actions.length > 0) {
      const totalWeight = actions.reduce((s, a) => s + (a.weight || 1), 0);
      if (totalWeight > 0) {
        progress = actions.reduce((s, a) => s + (a.progress_rate * (a.weight || 1)), 0) / totalWeight;
        progress = Math.round(progress);
      }
    }

    db.prepare('UPDATE recommendations SET progress_rate = ? WHERE id = ?').run(progress, id);

    return res.json({ success: true, data: { progress_rate: progress }, message: 'Progress updated.' });
  } catch (err) {
    logger.error('updateRecommendationProgress error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update progress.' });
  }
}

module.exports = {
  getRecommendations,
  getRecommendationById,
  createRecommendation,
  updateRecommendation,
  deleteRecommendation,
  updateRecommendationStatus,
  getRecommendationActions,
  getRecommendationEvidences,
  getRecommendationHistory,
  getRecommendationComments,
  addRecommendationComment,
  updateRecommendationProgress,
  createRecommendationValidation
};
