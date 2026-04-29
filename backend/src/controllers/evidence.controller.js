'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const logger = require('../config/logger');
const { setAuditOldValue } = require('../middleware/audit');

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50MB

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, 'evidences');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `ev_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, uniqueName);
  }
});

const ALLOWED_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/tiff',
  'text/plain', 'text/csv',
  'application/zip', 'application/x-zip-compressed'
];

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  }
});

const uploadMiddleware = upload.single('file');

function paginate(data, total, page, limit) {
  return { success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// ----------------------------------------------------------------
// GET /api/evidences
// ----------------------------------------------------------------
async function getEvidences(req, res) {
  try {
    const {
      recommendation_id, action_plan_id, status, depositor_id,
      page = 1, limit = 20
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = ['ev.deleted_at IS NULL'];
    const params = [];

    if (recommendation_id) { conditions.push('ev.recommendation_id = ?'); params.push(recommendation_id); }
    if (action_plan_id) { conditions.push('ev.action_plan_id = ?'); params.push(action_plan_id); }
    if (status) { conditions.push('ev.status_code = ?'); params.push(status); }
    if (depositor_id) { conditions.push('ev.depositor_id = ?'); params.push(depositor_id); }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const total = db.prepare(`SELECT COUNT(*) as cnt FROM evidences ev ${where}`).get(...params).cnt;

    const evidences = db.prepare(
      `SELECT ev.*,
              u.first_name || ' ' || u.last_name as depositor_name,
              et.label as evidence_type_label,
              r.code as recommendation_code,
              val.first_name || ' ' || val.last_name as validator_name
       FROM evidences ev
       LEFT JOIN users u ON u.id = ev.depositor_id
       LEFT JOIN evidence_types et ON et.id = ev.evidence_type_id
       LEFT JOIN recommendations r ON r.id = ev.recommendation_id
       LEFT JOIN users val ON val.id = ev.validator_id
       ${where}
       ORDER BY ev.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(...params, limitNum, offset);

    return res.json(paginate(evidences, total, pageNum, limitNum));
  } catch (err) {
    logger.error('getEvidences error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch evidences.' });
  }
}

// ----------------------------------------------------------------
// GET /api/evidences/:id
// ----------------------------------------------------------------
async function getEvidenceById(req, res) {
  try {
    const { id } = req.params;
    const ev = db.prepare(
      `SELECT ev.*,
              u.first_name || ' ' || u.last_name as depositor_name,
              et.label as evidence_type_label,
              r.code as recommendation_code,
              val.first_name || ' ' || val.last_name as validator_name
       FROM evidences ev
       LEFT JOIN users u ON u.id = ev.depositor_id
       LEFT JOIN evidence_types et ON et.id = ev.evidence_type_id
       LEFT JOIN recommendations r ON r.id = ev.recommendation_id
       LEFT JOIN users val ON val.id = ev.validator_id
       WHERE ev.id = ? AND ev.deleted_at IS NULL`
    ).get(id);

    if (!ev) return res.status(404).json({ success: false, message: 'Evidence not found.' });

    return res.json({ success: true, data: ev });
  } catch (err) {
    logger.error('getEvidenceById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch evidence.' });
  }
}

// ----------------------------------------------------------------
// POST /api/evidences (with file upload)
// ----------------------------------------------------------------
async function createEvidence(req, res) {
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'File upload failed.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File is required.' });
    }

    try {
      const {
        recommendation_id, action_plan_id, evidence_type_id,
        title, description
      } = req.body;

      if (!recommendation_id) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'recommendation_id is required.' });
      }

      if (!title || !title.trim()) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'Title is required.' });
      }

      // Verify recommendation exists
      const rec = db.prepare('SELECT id FROM recommendations WHERE id = ? AND deleted_at IS NULL').get(recommendation_id);
      if (!rec) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, message: 'Recommendation not found.' });
      }

      // Compute file hash
      const fileBuffer = fs.readFileSync(req.file.path);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      const result = db.prepare(
        `INSERT INTO evidences
           (recommendation_id, action_plan_id, evidence_type_id, title, description,
            filename, original_filename, file_path, file_size, mime_type,
            file_hash, depositor_id, status_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'deposited')`
      ).run(
        recommendation_id, action_plan_id || null, evidence_type_id || null,
        title.trim(), description || null,
        req.file.filename, req.file.originalname,
        req.file.path, req.file.size, req.file.mimetype,
        fileHash, req.user.id
      );

      const evidence = db.prepare('SELECT * FROM evidences WHERE id = ?').get(result.lastInsertRowid);

      return res.status(201).json({ success: true, data: evidence, message: 'Evidence uploaded.' });
    } catch (uploadErr) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      logger.error('createEvidence error:', uploadErr);
      return res.status(500).json({ success: false, message: 'Failed to save evidence.' });
    }
  });
}

// ----------------------------------------------------------------
// PUT /api/evidences/:id/status
// ----------------------------------------------------------------
async function updateEvidenceStatus(req, res) {
  try {
    const { id } = req.params;
    const { status_code, comment } = req.body;

    const allowedStatuses = ['accepted', 'rejected', 'pending_review', 'archived'];
    if (!status_code || !allowedStatuses.includes(status_code)) {
      return res.status(400).json({
        success: false,
        message: `status_code must be one of: ${allowedStatuses.join(', ')}`
      });
    }

    const ev = db.prepare('SELECT * FROM evidences WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!ev) return res.status(404).json({ success: false, message: 'Evidence not found.' });

    setAuditOldValue(req, { status_code: ev.status_code });

    db.prepare(
      `UPDATE evidences SET
         status_code = ?,
         validator_id = ?,
         validation_date = datetime('now'),
         validator_comment = ?
       WHERE id = ?`
    ).run(status_code, req.user.id, comment || null, id);

    const updated = db.prepare('SELECT * FROM evidences WHERE id = ?').get(id);
    return res.json({ success: true, data: updated, message: 'Evidence status updated.' });
  } catch (err) {
    logger.error('updateEvidenceStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update evidence status.' });
  }
}

// ----------------------------------------------------------------
// GET /api/evidences/:id/download
// ----------------------------------------------------------------
async function downloadEvidence(req, res) {
  try {
    const { id } = req.params;
    const ev = db.prepare('SELECT * FROM evidences WHERE id = ? AND deleted_at IS NULL').get(id);

    if (!ev) return res.status(404).json({ success: false, message: 'Evidence not found.' });

    if (!fs.existsSync(ev.file_path)) {
      return res.status(404).json({ success: false, message: 'File not found on disk.' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(ev.original_filename)}"`);
    res.setHeader('Content-Type', ev.mime_type || 'application/octet-stream');
    res.setHeader('Content-Length', ev.file_size);

    return res.sendFile(path.resolve(ev.file_path));
  } catch (err) {
    logger.error('downloadEvidence error:', err);
    return res.status(500).json({ success: false, message: 'Download failed.' });
  }
}

// ----------------------------------------------------------------
// DELETE /api/evidences/:id
// ----------------------------------------------------------------
async function deleteEvidence(req, res) {
  try {
    const { id } = req.params;
    const ev = db.prepare('SELECT * FROM evidences WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!ev) return res.status(404).json({ success: false, message: 'Evidence not found.' });

    setAuditOldValue(req, ev);
    db.prepare("UPDATE evidences SET deleted_at = datetime('now') WHERE id = ?").run(id);

    return res.json({ success: true, message: 'Evidence deleted.' });
  } catch (err) {
    logger.error('deleteEvidence error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete.' });
  }
}

module.exports = {
  getEvidences,
  getEvidenceById,
  createEvidence,
  updateEvidenceStatus,
  downloadEvidence,
  deleteEvidence
};
