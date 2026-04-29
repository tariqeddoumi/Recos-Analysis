'use strict';

const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const logger = require('../config/logger');
const authService = require('../services/authService');

function ok(res, data, message = 'Success.', status = 200) {
  return res.status(status).json({ success: true, data, message });
}
function notFound(res, msg = 'Not found.') {
  return res.status(404).json({ success: false, message: msg });
}
function badReq(res, msg) {
  return res.status(400).json({ success: false, message: msg });
}
function serverErr(res, err, msg = 'Internal server error.') {
  logger.error(msg, err);
  return res.status(500).json({ success: false, message: msg });
}

// ============================================================
// SOURCE TYPES
// ============================================================
const getSources = (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM source_types ORDER BY sort_order, label').all();
    return ok(res, rows);
  } catch (e) { return serverErr(res, e, 'Failed to fetch sources.'); }
};

const createSource = (req, res) => {
  try {
    const { code, label, coefficient = 1.0, description, sort_order = 0 } = req.body;
    if (!code || !label) return badReq(res, 'code and label required.');
    const r = db.prepare(
      'INSERT INTO source_types (code, label, coefficient, description, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).run(code, label, coefficient, description || null, sort_order);
    return ok(res, db.prepare('SELECT * FROM source_types WHERE id = ?').get(r.lastInsertRowid), 'Source created.', 201);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return badReq(res, 'Code already exists.');
    return serverErr(res, e, 'Failed to create source.');
  }
};

const updateSource = (req, res) => {
  try {
    const { id } = req.params;
    const row = db.prepare('SELECT * FROM source_types WHERE id = ?').get(id);
    if (!row) return notFound(res, 'Source not found.');
    const { label, coefficient, description, sort_order, is_active } = req.body;
    db.prepare(
      `UPDATE source_types SET
         label = COALESCE(?, label), coefficient = COALESCE(?, coefficient),
         description = COALESCE(?, description), sort_order = COALESCE(?, sort_order),
         is_active = COALESCE(?, is_active) WHERE id = ?`
    ).run(label || null, coefficient ?? null, description ?? null, sort_order ?? null, is_active ?? null, id);
    return ok(res, db.prepare('SELECT * FROM source_types WHERE id = ?').get(id), 'Source updated.');
  } catch (e) { return serverErr(res, e, 'Failed to update source.'); }
};

const deleteSource = (req, res) => {
  try {
    const { id } = req.params;
    const row = db.prepare('SELECT * FROM source_types WHERE id = ?').get(id);
    if (!row) return notFound(res, 'Source not found.');
    db.prepare('UPDATE source_types SET is_active = 0 WHERE id = ?').run(id);
    return ok(res, null, 'Source deactivated.');
  } catch (e) { return serverErr(res, e, 'Failed to delete source.'); }
};

// ============================================================
// RISK TYPES
// ============================================================
const getRiskTypes = (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM risk_types ORDER BY sort_order, label').all();
    return ok(res, rows);
  } catch (e) { return serverErr(res, e); }
};

const createRiskType = (req, res) => {
  try {
    const { code, label, category, description, sort_order = 0 } = req.body;
    if (!code || !label) return badReq(res, 'code and label required.');
    const r = db.prepare(
      'INSERT INTO risk_types (code, label, category, description, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).run(code, label, category || null, description || null, sort_order);
    return ok(res, db.prepare('SELECT * FROM risk_types WHERE id = ?').get(r.lastInsertRowid), 'Risk type created.', 201);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return badReq(res, 'Code already exists.');
    return serverErr(res, e);
  }
};

const updateRiskType = (req, res) => {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM risk_types WHERE id = ?').get(id)) return notFound(res);
    const { label, category, description, sort_order, is_active } = req.body;
    db.prepare(
      `UPDATE risk_types SET label = COALESCE(?, label), category = COALESCE(?, category),
         description = COALESCE(?, description), sort_order = COALESCE(?, sort_order),
         is_active = COALESCE(?, is_active) WHERE id = ?`
    ).run(label || null, category || null, description || null, sort_order ?? null, is_active ?? null, id);
    return ok(res, db.prepare('SELECT * FROM risk_types WHERE id = ?').get(id), 'Updated.');
  } catch (e) { return serverErr(res, e); }
};

const deleteRiskType = (req, res) => {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM risk_types WHERE id = ?').get(id)) return notFound(res);
    db.prepare('UPDATE risk_types SET is_active = 0 WHERE id = ?').run(id);
    return ok(res, null, 'Deactivated.');
  } catch (e) { return serverErr(res, e); }
};

// ============================================================
// SEVERITY LEVELS
// ============================================================
const getSeverityLevels = (req, res) => {
  try {
    return ok(res, db.prepare('SELECT * FROM severity_levels ORDER BY score').all());
  } catch (e) { return serverErr(res, e); }
};

const createSeverityLevel = (req, res) => {
  try {
    const { code, label, score, color = '#6B7280', description } = req.body;
    if (!code || !label || score === undefined) return badReq(res, 'code, label, score required.');
    const r = db.prepare(
      'INSERT INTO severity_levels (code, label, score, color, description) VALUES (?, ?, ?, ?, ?)'
    ).run(code, label, score, color, description || null);
    return ok(res, db.prepare('SELECT * FROM severity_levels WHERE id = ?').get(r.lastInsertRowid), 'Created.', 201);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return badReq(res, 'Code already exists.');
    return serverErr(res, e);
  }
};

const updateSeverityLevel = (req, res) => {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM severity_levels WHERE id = ?').get(id)) return notFound(res);
    const { label, score, color, description, is_active } = req.body;
    db.prepare(
      `UPDATE severity_levels SET label = COALESCE(?, label), score = COALESCE(?, score),
         color = COALESCE(?, color), description = COALESCE(?, description),
         is_active = COALESCE(?, is_active) WHERE id = ?`
    ).run(label || null, score ?? null, color || null, description || null, is_active ?? null, id);
    return ok(res, db.prepare('SELECT * FROM severity_levels WHERE id = ?').get(id), 'Updated.');
  } catch (e) { return serverErr(res, e); }
};

// ============================================================
// PROBABILITY LEVELS
// ============================================================
const getProbabilityLevels = (req, res) => {
  try {
    return ok(res, db.prepare('SELECT * FROM probability_levels ORDER BY score').all());
  } catch (e) { return serverErr(res, e); }
};

const createProbabilityLevel = (req, res) => {
  try {
    const { code, label, score, color = '#6B7280', description } = req.body;
    if (!code || !label || score === undefined) return badReq(res, 'code, label, score required.');
    const r = db.prepare(
      'INSERT INTO probability_levels (code, label, score, color, description) VALUES (?, ?, ?, ?, ?)'
    ).run(code, label, score, color, description || null);
    return ok(res, db.prepare('SELECT * FROM probability_levels WHERE id = ?').get(r.lastInsertRowid), 'Created.', 201);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return badReq(res, 'Code already exists.');
    return serverErr(res, e);
  }
};

const updateProbabilityLevel = (req, res) => {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM probability_levels WHERE id = ?').get(id)) return notFound(res);
    const { label, score, color, description, is_active } = req.body;
    db.prepare(
      `UPDATE probability_levels SET label = COALESCE(?, label), score = COALESCE(?, score),
         color = COALESCE(?, color), description = COALESCE(?, description),
         is_active = COALESCE(?, is_active) WHERE id = ?`
    ).run(label || null, score ?? null, color || null, description || null, is_active ?? null, id);
    return ok(res, db.prepare('SELECT * FROM probability_levels WHERE id = ?').get(id), 'Updated.');
  } catch (e) { return serverErr(res, e); }
};

// ============================================================
// MISSION STATUSES
// ============================================================
const getMissionStatuses = (req, res) => {
  try {
    return ok(res, db.prepare('SELECT * FROM mission_status_types ORDER BY sort_order').all());
  } catch (e) { return serverErr(res, e); }
};

const createMissionStatus = (req, res) => {
  try {
    const { code, label, color = '#6B7280', is_terminal = 0, sort_order = 0, description } = req.body;
    if (!code || !label) return badReq(res, 'code and label required.');
    const r = db.prepare(
      'INSERT INTO mission_status_types (code, label, color, is_terminal, sort_order, description) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(code, label, color, is_terminal ? 1 : 0, sort_order, description || null);
    return ok(res, db.prepare('SELECT * FROM mission_status_types WHERE id = ?').get(r.lastInsertRowid), 'Created.', 201);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return badReq(res, 'Code exists.');
    return serverErr(res, e);
  }
};

const updateMissionStatus = (req, res) => {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM mission_status_types WHERE id = ?').get(id)) return notFound(res);
    const { label, color, is_terminal, sort_order, description } = req.body;
    db.prepare(
      `UPDATE mission_status_types SET label = COALESCE(?, label), color = COALESCE(?, color),
         is_terminal = COALESCE(?, is_terminal), sort_order = COALESCE(?, sort_order),
         description = COALESCE(?, description) WHERE id = ?`
    ).run(label || null, color || null, is_terminal ?? null, sort_order ?? null, description || null, id);
    return ok(res, db.prepare('SELECT * FROM mission_status_types WHERE id = ?').get(id), 'Updated.');
  } catch (e) { return serverErr(res, e); }
};

// ============================================================
// RECOMMENDATION STATUSES
// ============================================================
const getRecommendationStatuses = (req, res) => {
  try {
    return ok(res, db.prepare('SELECT * FROM recommendation_status_types ORDER BY sort_order').all());
  } catch (e) { return serverErr(res, e); }
};

const createRecommendationStatus = (req, res) => {
  try {
    const { code, label, color = '#6B7280', is_terminal = 0, allows_modification = 1, sort_order = 0, description } = req.body;
    if (!code || !label) return badReq(res, 'code and label required.');
    const r = db.prepare(
      `INSERT INTO recommendation_status_types
         (code, label, color, is_terminal, allows_modification, sort_order, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(code, label, color, is_terminal ? 1 : 0, allows_modification ? 1 : 0, sort_order, description || null);
    return ok(res, db.prepare('SELECT * FROM recommendation_status_types WHERE id = ?').get(r.lastInsertRowid), 'Created.', 201);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return badReq(res, 'Code exists.');
    return serverErr(res, e);
  }
};

const updateRecommendationStatus = (req, res) => {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM recommendation_status_types WHERE id = ?').get(id)) return notFound(res);
    const { label, color, is_terminal, allows_modification, sort_order, description } = req.body;
    db.prepare(
      `UPDATE recommendation_status_types SET
         label = COALESCE(?, label), color = COALESCE(?, color),
         is_terminal = COALESCE(?, is_terminal), allows_modification = COALESCE(?, allows_modification),
         sort_order = COALESCE(?, sort_order), description = COALESCE(?, description) WHERE id = ?`
    ).run(label || null, color || null, is_terminal ?? null, allows_modification ?? null,
      sort_order ?? null, description || null, id);
    return ok(res, db.prepare('SELECT * FROM recommendation_status_types WHERE id = ?').get(id), 'Updated.');
  } catch (e) { return serverErr(res, e); }
};

// ============================================================
// ACTION STATUSES
// ============================================================
const getActionStatuses = (req, res) => {
  try {
    return ok(res, db.prepare('SELECT * FROM action_status_types ORDER BY sort_order').all());
  } catch (e) { return serverErr(res, e); }
};

const createActionStatus = (req, res) => {
  try {
    const { code, label, color = '#6B7280', is_terminal = 0, sort_order = 0, description } = req.body;
    if (!code || !label) return badReq(res, 'code and label required.');
    const r = db.prepare(
      'INSERT INTO action_status_types (code, label, color, is_terminal, sort_order, description) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(code, label, color, is_terminal ? 1 : 0, sort_order, description || null);
    return ok(res, db.prepare('SELECT * FROM action_status_types WHERE id = ?').get(r.lastInsertRowid), 'Created.', 201);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return badReq(res, 'Code exists.');
    return serverErr(res, e);
  }
};

const updateActionStatus = (req, res) => {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM action_status_types WHERE id = ?').get(id)) return notFound(res);
    const { label, color, is_terminal, sort_order, description } = req.body;
    db.prepare(
      `UPDATE action_status_types SET label = COALESCE(?, label), color = COALESCE(?, color),
         is_terminal = COALESCE(?, is_terminal), sort_order = COALESCE(?, sort_order),
         description = COALESCE(?, description) WHERE id = ?`
    ).run(label || null, color || null, is_terminal ?? null, sort_order ?? null, description || null, id);
    return ok(res, db.prepare('SELECT * FROM action_status_types WHERE id = ?').get(id), 'Updated.');
  } catch (e) { return serverErr(res, e); }
};

// ============================================================
// ENTITIES
// ============================================================
const getEntities = (req, res) => {
  try {
    const rows = db.prepare(
      `SELECT e.*, parent.name as parent_name FROM entities e
       LEFT JOIN entities parent ON parent.id = e.parent_id
       WHERE e.is_active = 1 ORDER BY e.name`
    ).all();
    return ok(res, rows);
  } catch (e) { return serverErr(res, e); }
};

const createEntity = (req, res) => {
  try {
    const { code, name, parent_id, direction, description } = req.body;
    if (!code || !name) return badReq(res, 'code and name required.');
    const r = db.prepare(
      'INSERT INTO entities (code, name, parent_id, direction, description) VALUES (?, ?, ?, ?, ?)'
    ).run(code, name, parent_id || null, direction || null, description || null);
    return ok(res, db.prepare('SELECT * FROM entities WHERE id = ?').get(r.lastInsertRowid), 'Entity created.', 201);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return badReq(res, 'Code already exists.');
    return serverErr(res, e);
  }
};

const updateEntity = (req, res) => {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM entities WHERE id = ?').get(id)) return notFound(res);
    const { name, parent_id, direction, description, is_active } = req.body;
    db.prepare(
      `UPDATE entities SET name = COALESCE(?, name), parent_id = COALESCE(?, parent_id),
         direction = COALESCE(?, direction), description = COALESCE(?, description),
         is_active = COALESCE(?, is_active) WHERE id = ?`
    ).run(name || null, parent_id ?? null, direction || null, description || null, is_active ?? null, id);
    return ok(res, db.prepare('SELECT * FROM entities WHERE id = ?').get(id), 'Updated.');
  } catch (e) { return serverErr(res, e); }
};

const deleteEntity = (req, res) => {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM entities WHERE id = ?').get(id)) return notFound(res);
    db.prepare('UPDATE entities SET is_active = 0 WHERE id = ?').run(id);
    return ok(res, null, 'Entity deactivated.');
  } catch (e) { return serverErr(res, e); }
};

// ============================================================
// USERS
// ============================================================
const getUsers = (req, res) => {
  try {
    const { role_code, entity_id, is_active = '1' } = req.query;
    const conditions = [];
    const params = [];
    if (role_code) { conditions.push('r.code = ?'); params.push(role_code); }
    if (entity_id) { conditions.push('u.entity_id = ?'); params.push(entity_id); }
    if (is_active !== 'all') { conditions.push('u.is_active = ?'); params.push(is_active === '0' ? 0 : 1); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const users = db.prepare(
      `SELECT u.id, u.username, u.email, u.first_name, u.last_name,
              u.role_id, u.entity_id, u.is_active, u.must_change_password,
              u.failed_attempts, u.locked_until, u.last_login, u.created_at,
              r.code as role_code, r.name as role_name,
              e.name as entity_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN entities e ON e.id = u.entity_id
       ${where}
       ORDER BY u.first_name, u.last_name`
    ).all(...params);
    return ok(res, users);
  } catch (e) { return serverErr(res, e); }
};

const getUserById = (req, res) => {
  try {
    const user = db.prepare(
      `SELECT u.id, u.username, u.email, u.first_name, u.last_name,
              u.role_id, u.entity_id, u.is_active, u.must_change_password, u.created_at,
              r.code as role_code, r.name as role_name,
              e.name as entity_name
       FROM users u JOIN roles r ON r.id = u.role_id
       LEFT JOIN entities e ON e.id = u.entity_id
       WHERE u.id = ?`
    ).get(req.params.id);
    if (!user) return notFound(res, 'User not found.');
    return ok(res, user);
  } catch (e) { return serverErr(res, e); }
};

const createUser = async (req, res) => {
  try {
    const { username, email, password, first_name, last_name, role_id, entity_id, must_change_password = true } = req.body;
    if (!username || !email || !password || !first_name || !last_name || !role_id) {
      return badReq(res, 'username, email, password, first_name, last_name, role_id required.');
    }

    const role = db.prepare('SELECT id FROM roles WHERE id = ?').get(role_id);
    if (!role) return badReq(res, 'Invalid role_id.');

    const passwordHash = await authService.hashPassword(password);

    const r = db.prepare(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, role_id, entity_id, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(username, email, passwordHash, first_name, last_name, role_id, entity_id || null, must_change_password ? 1 : 0);

    const user = db.prepare(
      `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.role_id, u.entity_id, u.is_active,
              r.code as role_code, r.name as role_name
       FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`
    ).get(r.lastInsertRowid);

    return ok(res, user, 'User created.', 201);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return badReq(res, 'Username or email already exists.');
    return serverErr(res, e);
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) return notFound(res, 'User not found.');

    const { email, first_name, last_name, role_id, entity_id, is_active, must_change_password, new_password } = req.body;

    let passwordHash = user.password_hash;
    if (new_password) {
      if (new_password.length < 8) return badReq(res, 'Password min 8 characters.');
      passwordHash = await authService.hashPassword(new_password);
    }

    db.prepare(
      `UPDATE users SET
         email = COALESCE(?, email),
         first_name = COALESCE(?, first_name),
         last_name = COALESCE(?, last_name),
         role_id = COALESCE(?, role_id),
         entity_id = COALESCE(?, entity_id),
         is_active = COALESCE(?, is_active),
         must_change_password = COALESCE(?, must_change_password),
         password_hash = ?
       WHERE id = ?`
    ).run(
      email || null, first_name || null, last_name || null,
      role_id || null, entity_id !== undefined ? entity_id : null,
      is_active ?? null, must_change_password ?? null,
      passwordHash, id
    );

    return ok(res, db.prepare(
      `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.role_id, u.entity_id, u.is_active,
              r.code as role_code FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`
    ).get(id), 'User updated.');
  } catch (e) { return serverErr(res, e); }
};

const deleteUser = (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) return badReq(res, 'Cannot deactivate your own account.');
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) return notFound(res, 'User not found.');
    db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(id);
    db.prepare('UPDATE sessions SET is_revoked = 1 WHERE user_id = ?').run(id);
    return ok(res, null, 'User deactivated.');
  } catch (e) { return serverErr(res, e); }
};

// ============================================================
// ROLES
// ============================================================
const getRoles = (req, res) => {
  try {
    return ok(res, db.prepare('SELECT * FROM roles WHERE is_active = 1 ORDER BY name').all());
  } catch (e) { return serverErr(res, e); }
};

const createRole = (req, res) => {
  try {
    const { code, name, description } = req.body;
    if (!code || !name) return badReq(res, 'code and name required.');
    const r = db.prepare('INSERT INTO roles (code, name, description) VALUES (?, ?, ?)').run(code, name, description || null);
    return ok(res, db.prepare('SELECT * FROM roles WHERE id = ?').get(r.lastInsertRowid), 'Role created.', 201);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return badReq(res, 'Code exists.');
    return serverErr(res, e);
  }
};

const updateRole = (req, res) => {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM roles WHERE id = ?').get(id)) return notFound(res);
    const { name, description, is_active } = req.body;
    db.prepare(
      `UPDATE roles SET name = COALESCE(?, name), description = COALESCE(?, description),
         is_active = COALESCE(?, is_active) WHERE id = ?`
    ).run(name || null, description || null, is_active ?? null, id);
    return ok(res, db.prepare('SELECT * FROM roles WHERE id = ?').get(id), 'Updated.');
  } catch (e) { return serverErr(res, e); }
};

// ============================================================
// PERMISSIONS
// ============================================================
const getPermissions = (req, res) => {
  try {
    const { roleId } = req.params;
    const perms = db.prepare('SELECT * FROM permissions WHERE role_id = ? ORDER BY module, action').all(roleId);
    return ok(res, perms);
  } catch (e) { return serverErr(res, e); }
};

const updatePermissions = (req, res) => {
  try {
    const { roleId } = req.params;
    const { permissions } = req.body; // array of { module, action, is_allowed }
    if (!Array.isArray(permissions)) return badReq(res, 'permissions must be an array.');

    const upsert = db.prepare(
      `INSERT INTO permissions (role_id, module, action, is_allowed) VALUES (?, ?, ?, ?)
       ON CONFLICT(role_id, module, action) DO UPDATE SET is_allowed = excluded.is_allowed`
    );

    const updateAll = db.transaction(() => {
      for (const p of permissions) {
        upsert.run(roleId, p.module, p.action, p.is_allowed ? 1 : 0);
      }
    });
    updateAll();

    return ok(res, db.prepare('SELECT * FROM permissions WHERE role_id = ?').all(roleId), 'Permissions updated.');
  } catch (e) { return serverErr(res, e); }
};

// ============================================================
// PARAMETERS
// ============================================================
const getParameters = (req, res) => {
  try {
    const { module } = req.query;
    const rows = module
      ? db.prepare('SELECT * FROM parameter_settings WHERE module = ? ORDER BY key').all(module)
      : db.prepare('SELECT * FROM parameter_settings ORDER BY module, key').all();
    return ok(res, rows);
  } catch (e) { return serverErr(res, e); }
};

const updateParameter = (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    if (value === undefined) return badReq(res, 'value required.');
    db.prepare(
      `INSERT INTO parameter_settings (key, value, label, type, module)
       VALUES (?, ?, ?, 'string', 'general')
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).run(key, String(value), key);
    return ok(res, db.prepare('SELECT * FROM parameter_settings WHERE key = ?').get(key), 'Updated.');
  } catch (e) { return serverErr(res, e); }
};

// Bulk update parameters
const updateParameters = (req, res) => {
  try {
    const params = req.body; // { key: value, ... }
    if (typeof params !== 'object') return badReq(res, 'Body must be an object.');
    const upsert = db.prepare(
      `INSERT INTO parameter_settings (key, value, label, type, module)
       VALUES (?, ?, ?, 'string', 'general')
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    );
    const tx = db.transaction(() => {
      for (const [key, value] of Object.entries(params)) {
        upsert.run(key, String(value), key);
      }
    });
    tx();
    return ok(res, null, 'Parameters updated.');
  } catch (e) { return serverErr(res, e); }
};

// ============================================================
// REMINDER RULES
// ============================================================
const getReminderRules = (req, res) => {
  try {
    return ok(res, db.prepare('SELECT * FROM reminder_rules ORDER BY days_before_due, days_after_due').all());
  } catch (e) { return serverErr(res, e); }
};

const createReminderRule = (req, res) => {
  try {
    const { days_before_due, days_after_due, target_role, notification_type = 'reminder', message_template } = req.body;
    if (!target_role || !message_template) return badReq(res, 'target_role and message_template required.');
    const r = db.prepare(
      'INSERT INTO reminder_rules (days_before_due, days_after_due, target_role, notification_type, message_template) VALUES (?, ?, ?, ?, ?)'
    ).run(days_before_due ?? null, days_after_due ?? null, target_role, notification_type, message_template);
    return ok(res, db.prepare('SELECT * FROM reminder_rules WHERE id = ?').get(r.lastInsertRowid), 'Created.', 201);
  } catch (e) { return serverErr(res, e); }
};

const updateReminderRule = (req, res) => {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM reminder_rules WHERE id = ?').get(id)) return notFound(res);
    const { days_before_due, days_after_due, target_role, notification_type, message_template, is_active } = req.body;
    db.prepare(
      `UPDATE reminder_rules SET
         days_before_due = COALESCE(?, days_before_due), days_after_due = COALESCE(?, days_after_due),
         target_role = COALESCE(?, target_role), notification_type = COALESCE(?, notification_type),
         message_template = COALESCE(?, message_template), is_active = COALESCE(?, is_active)
       WHERE id = ?`
    ).run(days_before_due ?? null, days_after_due ?? null, target_role || null, notification_type || null,
      message_template || null, is_active ?? null, id);
    return ok(res, db.prepare('SELECT * FROM reminder_rules WHERE id = ?').get(id), 'Updated.');
  } catch (e) { return serverErr(res, e); }
};

const deleteReminderRule = (req, res) => {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM reminder_rules WHERE id = ?').get(id)) return notFound(res);
    db.prepare('UPDATE reminder_rules SET is_active = 0 WHERE id = ?').run(id);
    return ok(res, null, 'Deactivated.');
  } catch (e) { return serverErr(res, e); }
};

// ============================================================
// ESCALATION RULES
// ============================================================
const getEscalationRules = (req, res) => {
  try {
    return ok(res, db.prepare('SELECT * FROM escalation_rules ORDER BY entity_type, delay_days').all());
  } catch (e) { return serverErr(res, e); }
};

const createEscalationRule = (req, res) => {
  try {
    const { entity_type, trigger_condition, delay_days = 0, notification_level = 'warning', target_role, description } = req.body;
    if (!entity_type || !trigger_condition || !target_role) return badReq(res, 'entity_type, trigger_condition, target_role required.');
    const r = db.prepare(
      'INSERT INTO escalation_rules (entity_type, trigger_condition, delay_days, notification_level, target_role, description) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(entity_type, trigger_condition, delay_days, notification_level, target_role, description || null);
    return ok(res, db.prepare('SELECT * FROM escalation_rules WHERE id = ?').get(r.lastInsertRowid), 'Created.', 201);
  } catch (e) { return serverErr(res, e); }
};

const updateEscalationRule = (req, res) => {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM escalation_rules WHERE id = ?').get(id)) return notFound(res);
    const { entity_type, trigger_condition, delay_days, notification_level, target_role, description, is_active } = req.body;
    db.prepare(
      `UPDATE escalation_rules SET
         entity_type = COALESCE(?, entity_type), trigger_condition = COALESCE(?, trigger_condition),
         delay_days = COALESCE(?, delay_days), notification_level = COALESCE(?, notification_level),
         target_role = COALESCE(?, target_role), description = COALESCE(?, description),
         is_active = COALESCE(?, is_active) WHERE id = ?`
    ).run(entity_type || null, trigger_condition || null, delay_days ?? null, notification_level || null,
      target_role || null, description || null, is_active ?? null, id);
    return ok(res, db.prepare('SELECT * FROM escalation_rules WHERE id = ?').get(id), 'Updated.');
  } catch (e) { return serverErr(res, e); }
};

const deleteEscalationRule = (req, res) => {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM escalation_rules WHERE id = ?').get(id)) return notFound(res);
    db.prepare('UPDATE escalation_rules SET is_active = 0 WHERE id = ?').run(id);
    return ok(res, null, 'Deactivated.');
  } catch (e) { return serverErr(res, e); }
};

// ============================================================
// WORKFLOW STEPS
// ============================================================
const getWorkflowSteps = (req, res) => {
  try {
    const { entity_type } = req.query;
    const rows = entity_type
      ? db.prepare('SELECT * FROM workflow_steps WHERE entity_type = ? ORDER BY sort_order').all(entity_type)
      : db.prepare('SELECT * FROM workflow_steps ORDER BY entity_type, sort_order').all();
    return ok(res, rows);
  } catch (e) { return serverErr(res, e); }
};

const createWorkflowStep = (req, res) => {
  try {
    const { name, entity_type, from_status, to_status, required_role, requires_proof = 0, requires_comment = 0, sort_order = 0 } = req.body;
    if (!name || !entity_type || !from_status || !to_status || !required_role) {
      return badReq(res, 'name, entity_type, from_status, to_status, required_role required.');
    }
    const r = db.prepare(
      'INSERT INTO workflow_steps (name, entity_type, from_status, to_status, required_role, requires_proof, requires_comment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(name, entity_type, from_status, to_status, required_role, requires_proof ? 1 : 0, requires_comment ? 1 : 0, sort_order);
    return ok(res, db.prepare('SELECT * FROM workflow_steps WHERE id = ?').get(r.lastInsertRowid), 'Created.', 201);
  } catch (e) { return serverErr(res, e); }
};

const updateWorkflowStep = (req, res) => {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM workflow_steps WHERE id = ?').get(id)) return notFound(res);
    const { name, required_role, requires_proof, requires_comment, sort_order, is_active } = req.body;
    db.prepare(
      `UPDATE workflow_steps SET
         name = COALESCE(?, name), required_role = COALESCE(?, required_role),
         requires_proof = COALESCE(?, requires_proof), requires_comment = COALESCE(?, requires_comment),
         sort_order = COALESCE(?, sort_order), is_active = COALESCE(?, is_active) WHERE id = ?`
    ).run(name || null, required_role || null, requires_proof ?? null, requires_comment ?? null,
      sort_order ?? null, is_active ?? null, id);
    return ok(res, db.prepare('SELECT * FROM workflow_steps WHERE id = ?').get(id), 'Updated.');
  } catch (e) { return serverErr(res, e); }
};

const deleteWorkflowStep = (req, res) => {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM workflow_steps WHERE id = ?').get(id)) return notFound(res);
    db.prepare('UPDATE workflow_steps SET is_active = 0 WHERE id = ?').run(id);
    return ok(res, null, 'Deactivated.');
  } catch (e) { return serverErr(res, e); }
};

// ============================================================
// CONFIDENTIALITY LEVELS
// ============================================================
const getConfidentialityLevels = (req, res) => {
  try {
    return ok(res, db.prepare('SELECT * FROM confidentiality_levels ORDER BY rank').all());
  } catch (e) { return serverErr(res, e); }
};

const createConfidentialityLevel = (req, res) => {
  try {
    const { code, label, rank = 0, color = '#6B7280', description } = req.body;
    if (!code || !label) return badReq(res, 'code and label required.');
    const r = db.prepare(
      'INSERT INTO confidentiality_levels (code, label, rank, color, description) VALUES (?, ?, ?, ?, ?)'
    ).run(code, label, rank, color, description || null);
    return ok(res, db.prepare('SELECT * FROM confidentiality_levels WHERE id = ?').get(r.lastInsertRowid), 'Created.', 201);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return badReq(res, 'Code exists.');
    return serverErr(res, e);
  }
};

const updateConfidentialityLevel = (req, res) => {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM confidentiality_levels WHERE id = ?').get(id)) return notFound(res);
    const { label, rank, color, description, is_active } = req.body;
    db.prepare(
      `UPDATE confidentiality_levels SET label = COALESCE(?, label), rank = COALESCE(?, rank),
         color = COALESCE(?, color), description = COALESCE(?, description),
         is_active = COALESCE(?, is_active) WHERE id = ?`
    ).run(label || null, rank ?? null, color || null, description || null, is_active ?? null, id);
    return ok(res, db.prepare('SELECT * FROM confidentiality_levels WHERE id = ?').get(id), 'Updated.');
  } catch (e) { return serverErr(res, e); }
};

// ============================================================
// EVIDENCE TYPES
// ============================================================
const getEvidenceTypes = (req, res) => {
  try {
    return ok(res, db.prepare('SELECT * FROM evidence_types WHERE is_active = 1 ORDER BY label').all());
  } catch (e) { return serverErr(res, e); }
};

const createEvidenceType = (req, res) => {
  try {
    const { code, label, allowed_extensions = [], description } = req.body;
    if (!code || !label) return badReq(res, 'code and label required.');
    const r = db.prepare(
      'INSERT INTO evidence_types (code, label, allowed_extensions, description) VALUES (?, ?, ?, ?)'
    ).run(code, label, JSON.stringify(allowed_extensions), description || null);
    return ok(res, db.prepare('SELECT * FROM evidence_types WHERE id = ?').get(r.lastInsertRowid), 'Created.', 201);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return badReq(res, 'Code exists.');
    return serverErr(res, e);
  }
};

const updateEvidenceType = (req, res) => {
  try {
    const { id } = req.params;
    if (!db.prepare('SELECT id FROM evidence_types WHERE id = ?').get(id)) return notFound(res);
    const { label, allowed_extensions, description, is_active } = req.body;
    db.prepare(
      `UPDATE evidence_types SET label = COALESCE(?, label),
         allowed_extensions = COALESCE(?, allowed_extensions),
         description = COALESCE(?, description), is_active = COALESCE(?, is_active) WHERE id = ?`
    ).run(label || null, allowed_extensions ? JSON.stringify(allowed_extensions) : null,
      description || null, is_active ?? null, id);
    return ok(res, db.prepare('SELECT * FROM evidence_types WHERE id = ?').get(id), 'Updated.');
  } catch (e) { return serverErr(res, e); }
};

module.exports = {
  // Sources
  getSources, createSource, updateSource, deleteSource,
  // Risk types
  getRiskTypes, createRiskType, updateRiskType, deleteRiskType,
  // Severity
  getSeverityLevels, createSeverityLevel, updateSeverityLevel,
  // Probability
  getProbabilityLevels, createProbabilityLevel, updateProbabilityLevel,
  // Mission statuses
  getMissionStatuses, createMissionStatus, updateMissionStatus,
  // Reco statuses
  getRecommendationStatuses, createRecommendationStatus, updateRecommendationStatus,
  // Action statuses
  getActionStatuses, createActionStatus, updateActionStatus,
  // Entities
  getEntities, createEntity, updateEntity, deleteEntity,
  // Users
  getUsers, getUserById, createUser, updateUser, deleteUser,
  // Roles
  getRoles, createRole, updateRole,
  // Permissions
  getPermissions, updatePermissions,
  // Parameters
  getParameters, updateParameter, updateParameters,
  // Reminder rules
  getReminderRules, createReminderRule, updateReminderRule, deleteReminderRule,
  // Escalation rules
  getEscalationRules, createEscalationRule, updateEscalationRule, deleteEscalationRule,
  // Workflow steps
  getWorkflowSteps, createWorkflowStep, updateWorkflowStep, deleteWorkflowStep,
  // Confidentiality levels
  getConfidentialityLevels, createConfidentialityLevel, updateConfidentialityLevel,
  // Evidence types
  getEvidenceTypes, createEvidenceType, updateEvidenceType
};
