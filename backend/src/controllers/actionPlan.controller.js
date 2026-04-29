'use strict';

const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const logger = require('../config/logger');
const { setAuditOldValue } = require('../middleware/audit');

function paginate(data, total, page, limit) {
  return { success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// ----------------------------------------------------------------
// GET /api/action-plans
// ----------------------------------------------------------------
async function getActionPlans(req, res) {
  try {
    const {
      recommendation_id, status, operator_id, entity_id,
      overdue_only, date_from, date_to, search,
      page = 1, limit = 20, sort = 'planned_end', order = 'ASC'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = ['ap.deleted_at IS NULL'];
    const params = [];

    if (recommendation_id) { conditions.push('ap.recommendation_id = ?'); params.push(recommendation_id); }
    if (status) {
      const statuses = status.split(',').filter(Boolean);
      conditions.push(`ap.status_code IN (${statuses.map(() => '?').join(',')})`);
      params.push(...statuses);
    }
    if (operator_id) { conditions.push('ap.operator_id = ?'); params.push(operator_id); }
    if (entity_id) { conditions.push('ap.entity_id = ?'); params.push(entity_id); }
    if (overdue_only === 'true') {
      conditions.push("date(ap.planned_end) < date('now')");
      conditions.push("ap.status_code NOT IN ('completed', 'cancelled')");
    }
    if (date_from) { conditions.push('ap.planned_end >= ?'); params.push(date_from); }
    if (date_to) { conditions.push('ap.planned_end <= ?'); params.push(date_to); }
    if (search) {
      conditions.push('(ap.title LIKE ? OR ap.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    // Role-based filtering
    if (req.user.role_code === 'responsable_action') {
      conditions.push('ap.operator_id = ?');
      params.push(req.user.id);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const allowedSorts = ['planned_end', 'priority', 'status_code', 'progress_rate', 'created_at'];
    const sortCol = allowedSorts.includes(sort) ? `ap.${sort}` : 'ap.planned_end';
    const orderDir = order === 'ASC' ? 'ASC' : 'DESC';

    const total = db.prepare(`SELECT COUNT(*) as cnt FROM action_plans ap ${where}`).get(...params).cnt;

    const plans = db.prepare(
      `SELECT ap.*,
              r.code as recommendation_code, r.recommendation_text,
              u.first_name || ' ' || u.last_name as operator_name,
              e.name as entity_name,
              m.title as mission_title
       FROM action_plans ap
       LEFT JOIN recommendations r ON r.id = ap.recommendation_id
       LEFT JOIN missions m ON m.id = r.mission_id
       LEFT JOIN users u ON u.id = ap.operator_id
       LEFT JOIN entities e ON e.id = ap.entity_id
       ${where}
       ORDER BY ${sortCol} ${orderDir} NULLS LAST
       LIMIT ? OFFSET ?`
    ).all(...params, limitNum, offset);

    return res.json(paginate(plans, total, pageNum, limitNum));
  } catch (err) {
    logger.error('getActionPlans error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch action plans.' });
  }
}

// ----------------------------------------------------------------
// GET /api/action-plans/:id
// ----------------------------------------------------------------
async function getActionPlanById(req, res) {
  try {
    const { id } = req.params;
    const plan = db.prepare(
      `SELECT ap.*,
              r.code as recommendation_code, r.recommendation_text, r.mission_id,
              m.title as mission_title,
              u.first_name || ' ' || u.last_name as operator_name,
              u.email as operator_email,
              e.name as entity_name,
              creator.first_name || ' ' || creator.last_name as created_by_name
       FROM action_plans ap
       LEFT JOIN recommendations r ON r.id = ap.recommendation_id
       LEFT JOIN missions m ON m.id = r.mission_id
       LEFT JOIN users u ON u.id = ap.operator_id
       LEFT JOIN entities e ON e.id = ap.entity_id
       LEFT JOIN users creator ON creator.id = ap.created_by
       WHERE ap.id = ? AND ap.deleted_at IS NULL`
    ).get(id);

    if (!plan) return res.status(404).json({ success: false, message: 'Action plan not found.' });

    return res.json({ success: true, data: plan });
  } catch (err) {
    logger.error('getActionPlanById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch action plan.' });
  }
}

// ----------------------------------------------------------------
// POST /api/action-plans
// ----------------------------------------------------------------
const createActionPlanValidation = [
  body('recommendation_id').isInt().withMessage('recommendation_id required.'),
  body('title').notEmpty().trim().withMessage('Title required.'),
  body('planned_end').optional().isISO8601(),
  body('priority').optional().isInt({ min: 1, max: 4 }),
  body('weight').optional().isFloat({ min: 0.1, max: 10 })
];

async function createActionPlan(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation error.', errors: errors.array() });
  }

  try {
    const {
      recommendation_id, title, description, operator_id, contributors = [],
      entity_id, planned_start, planned_end, priority = 2,
      weight = 1, complexity = 'medium', dependencies = [],
      expected_deliverable, expected_evidence, comment
    } = req.body;

    const rec = db.prepare('SELECT id FROM recommendations WHERE id = ? AND deleted_at IS NULL').get(recommendation_id);
    if (!rec) return res.status(404).json({ success: false, message: 'Recommendation not found.' });

    const result = db.prepare(
      `INSERT INTO action_plans
         (recommendation_id, title, description, operator_id, contributors,
          entity_id, planned_start, planned_end, priority, status_code,
          progress_rate, weight, complexity, dependencies,
          expected_deliverable, expected_evidence, comment, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      recommendation_id, title.trim(), description || null, operator_id || null,
      JSON.stringify(contributors), entity_id || null, planned_start || null,
      planned_end || null, priority, weight, complexity,
      JSON.stringify(dependencies), expected_deliverable || null,
      expected_evidence || null, comment || null, req.user.id
    );

    db.prepare(
      `INSERT INTO status_history (entity_type, entity_id, from_status, to_status, changed_by)
       VALUES ('action_plan', ?, NULL, 'draft', ?)`
    ).run(result.lastInsertRowid, req.user.id);

    const plan = db.prepare('SELECT * FROM action_plans WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, data: plan, message: 'Action plan created.' });
  } catch (err) {
    logger.error('createActionPlan error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create action plan.' });
  }
}

// ----------------------------------------------------------------
// PUT /api/action-plans/:id
// ----------------------------------------------------------------
async function updateActionPlan(req, res) {
  try {
    const { id } = req.params;
    const plan = db.prepare('SELECT * FROM action_plans WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!plan) return res.status(404).json({ success: false, message: 'Action plan not found.' });

    setAuditOldValue(req, plan);

    const fields = [
      'title', 'description', 'operator_id', 'entity_id',
      'planned_start', 'planned_end', 'actual_end', 'priority',
      'weight', 'complexity', 'expected_deliverable', 'expected_evidence',
      'comment', 'is_blocked', 'block_reason'
    ];

    const setClauses = [];
    const params = [];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }

    // JSON fields
    if (req.body.contributors !== undefined) {
      setClauses.push('contributors = ?');
      params.push(JSON.stringify(req.body.contributors));
    }
    if (req.body.dependencies !== undefined) {
      setClauses.push('dependencies = ?');
      params.push(JSON.stringify(req.body.dependencies));
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update.' });
    }

    params.push(id);
    db.prepare(`UPDATE action_plans SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM action_plans WHERE id = ?').get(id);
    return res.json({ success: true, data: updated, message: 'Action plan updated.' });
  } catch (err) {
    logger.error('updateActionPlan error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update.' });
  }
}

// ----------------------------------------------------------------
// DELETE /api/action-plans/:id
// ----------------------------------------------------------------
async function deleteActionPlan(req, res) {
  try {
    const { id } = req.params;
    const plan = db.prepare('SELECT * FROM action_plans WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!plan) return res.status(404).json({ success: false, message: 'Action plan not found.' });

    setAuditOldValue(req, plan);
    db.prepare("UPDATE action_plans SET deleted_at = datetime('now'), deleted_by = ? WHERE id = ?").run(req.user.id, id);

    return res.json({ success: true, message: 'Action plan deleted.' });
  } catch (err) {
    logger.error('deleteActionPlan error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete.' });
  }
}

// ----------------------------------------------------------------
// PUT /api/action-plans/:id/status
// ----------------------------------------------------------------
async function updateActionPlanStatus(req, res) {
  try {
    const { id } = req.params;
    const { status_code, comment } = req.body;
    if (!status_code) return res.status(400).json({ success: false, message: 'status_code required.' });

    const plan = db.prepare('SELECT * FROM action_plans WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!plan) return res.status(404).json({ success: false, message: 'Action plan not found.' });

    const statusType = db.prepare('SELECT * FROM action_status_types WHERE code = ?').get(status_code);
    if (!statusType) return res.status(400).json({ success: false, message: 'Invalid status.' });

    setAuditOldValue(req, { status_code: plan.status_code });

    const actualEnd = statusType.is_terminal ? new Date().toISOString().split('T')[0] : null;
    db.prepare(
      `UPDATE action_plans SET status_code = ?, actual_end = COALESCE(?, actual_end)
       WHERE id = ?`
    ).run(status_code, actualEnd, id);

    db.prepare(
      `INSERT INTO status_history (entity_type, entity_id, from_status, to_status, changed_by, comment)
       VALUES ('action_plan', ?, ?, ?, ?, ?)`
    ).run(id, plan.status_code, status_code, req.user.id, comment || null);

    const updated = db.prepare('SELECT * FROM action_plans WHERE id = ?').get(id);
    return res.json({ success: true, data: updated, message: 'Status updated.' });
  } catch (err) {
    logger.error('updateActionPlanStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update status.' });
  }
}

// ----------------------------------------------------------------
// PUT /api/action-plans/:id/progress
// ----------------------------------------------------------------
async function updateActionPlanProgress(req, res) {
  try {
    const { id } = req.params;
    const { progress_rate } = req.body;

    if (progress_rate === undefined || progress_rate < 0 || progress_rate > 100) {
      return res.status(400).json({ success: false, message: 'progress_rate must be 0-100.' });
    }

    const plan = db.prepare('SELECT * FROM action_plans WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!plan) return res.status(404).json({ success: false, message: 'Action plan not found.' });

    db.prepare('UPDATE action_plans SET progress_rate = ? WHERE id = ?').run(progress_rate, id);

    // Propagate to recommendation
    const actions = db.prepare(
      `SELECT progress_rate, weight FROM action_plans
       WHERE recommendation_id = ? AND deleted_at IS NULL AND status_code != 'cancelled'`
    ).all(plan.recommendation_id);

    if (actions.length > 0) {
      const totalWeight = actions.reduce((s, a) => s + (a.weight || 1), 0);
      const recProgress = totalWeight > 0
        ? Math.round(actions.reduce((s, a) => s + (a.progress_rate * (a.weight || 1)), 0) / totalWeight)
        : 0;
      db.prepare('UPDATE recommendations SET progress_rate = ? WHERE id = ?')
        .run(recProgress, plan.recommendation_id);
    }

    return res.json({ success: true, data: { progress_rate }, message: 'Progress updated.' });
  } catch (err) {
    logger.error('updateActionPlanProgress error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update progress.' });
  }
}

// ----------------------------------------------------------------
// GET /api/action-plans/:id/evidences
// ----------------------------------------------------------------
async function getActionPlanEvidences(req, res) {
  try {
    const { id } = req.params;
    const evidences = db.prepare(
      `SELECT ev.*,
              u.first_name || ' ' || u.last_name as depositor_name,
              et.label as evidence_type_label
       FROM evidences ev
       LEFT JOIN users u ON u.id = ev.depositor_id
       LEFT JOIN evidence_types et ON et.id = ev.evidence_type_id
       WHERE ev.action_plan_id = ? AND ev.deleted_at IS NULL
       ORDER BY ev.created_at DESC`
    ).all(id);

    return res.json({ success: true, data: evidences });
  } catch (err) {
    logger.error('getActionPlanEvidences error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch evidences.' });
  }
}

// ----------------------------------------------------------------
// GET /api/action-plans/:id/history
// ----------------------------------------------------------------
async function getActionPlanHistory(req, res) {
  try {
    const { id } = req.params;
    const history = db.prepare(
      `SELECT sh.*, u.first_name || ' ' || u.last_name as changed_by_name
       FROM status_history sh
       LEFT JOIN users u ON u.id = sh.changed_by
       WHERE sh.entity_type = 'action_plan' AND sh.entity_id = ?
       ORDER BY sh.created_at DESC`
    ).all(id);

    return res.json({ success: true, data: history });
  } catch (err) {
    logger.error('getActionPlanHistory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch history.' });
  }
}

module.exports = {
  getActionPlans,
  getActionPlanById,
  createActionPlan,
  updateActionPlan,
  deleteActionPlan,
  updateActionPlanStatus,
  updateActionPlanProgress,
  getActionPlanEvidences,
  getActionPlanHistory,
  createActionPlanValidation
};
