'use strict';

const db = require('../config/database');
const logger = require('../config/logger');

// ----------------------------------------------------------------
// GET /api/reports/templates
// ----------------------------------------------------------------
async function getReportTemplates(req, res) {
  try {
    const templates = db.prepare('SELECT * FROM report_templates WHERE is_active = 1 ORDER BY type, name').all();
    return res.json({ success: true, data: templates });
  } catch (err) {
    logger.error('getReportTemplates error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch templates.' });
  }
}

// ----------------------------------------------------------------
// GET /api/reports/export-excel
// ----------------------------------------------------------------
async function exportExcel(req, res) {
  try {
    const {
      type = 'recommendations',
      mission_id, entity_id, status, source_type_id,
      date_from, date_to, is_regulatory
    } = req.query;

    let rows = [];
    let filename = `export_${type}_${new Date().toISOString().split('T')[0]}`;

    if (type === 'recommendations') {
      const conditions = ['r.deleted_at IS NULL'];
      const params = [];
      if (mission_id) { conditions.push('r.mission_id = ?'); params.push(mission_id); }
      if (entity_id) { conditions.push('r.entity_id = ?'); params.push(entity_id); }
      if (status) { conditions.push('r.status_code = ?'); params.push(status); }
      if (source_type_id) { conditions.push('r.source_type_id = ?'); params.push(source_type_id); }
      if (date_from) { conditions.push('r.created_at >= ?'); params.push(date_from); }
      if (date_to) { conditions.push('r.created_at <= ?'); params.push(date_to); }
      if (is_regulatory !== undefined) { conditions.push('r.is_regulatory = ?'); params.push(is_regulatory === 'true' ? 1 : 0); }

      rows = db.prepare(
        `SELECT
           r.code as "Code",
           m.reference as "Mission",
           m.title as "Titre Mission",
           st.label as "Source",
           r.recommendation_text as "Recommandation",
           e.name as "Entité",
           rt.label as "Type de risque",
           sl.label as "Sévérité",
           pl.label as "Probabilité",
           r.criticality_score as "Score criticité",
           r.priority_label as "Priorité",
           owner.first_name || ' ' || owner.last_name as "Responsable",
           r.initial_deadline as "Échéance initiale",
           r.revised_deadline as "Échéance révisée",
           r.status_code as "Statut",
           r.progress_rate as "Avancement %",
           CASE WHEN r.is_regulatory THEN 'Oui' ELSE 'Non' END as "Réglementaire",
           r.created_at as "Date création"
         FROM recommendations r
         LEFT JOIN missions m ON m.id = r.mission_id
         LEFT JOIN source_types st ON st.id = r.source_type_id
         LEFT JOIN entities e ON e.id = r.entity_id
         LEFT JOIN risk_types rt ON rt.id = r.risk_type_id
         LEFT JOIN severity_levels sl ON sl.id = r.severity_level_id
         LEFT JOIN probability_levels pl ON pl.id = r.probability_level_id
         LEFT JOIN users owner ON owner.id = r.owner_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY r.criticality_score DESC NULLS LAST`
      ).all(...params);
      filename = `recommendations_${new Date().toISOString().split('T')[0]}`;

    } else if (type === 'missions') {
      rows = db.prepare(
        `SELECT
           m.reference as "Référence",
           m.code as "Code",
           m.title as "Titre",
           m.type_code as "Type",
           st.label as "Source",
           e.name as "Entité",
           m.status_code as "Statut",
           m.start_date as "Date début",
           m.end_date as "Date fin",
           supervisor.first_name || ' ' || supervisor.last_name as "Superviseur",
           m.created_at as "Date création",
           COUNT(r.id) as "Nb recommandations"
         FROM missions m
         LEFT JOIN source_types st ON st.id = m.source_type_id
         LEFT JOIN entities e ON e.id = m.entity_id
         LEFT JOIN users supervisor ON supervisor.id = m.supervisor_id
         LEFT JOIN recommendations r ON r.mission_id = m.id AND r.deleted_at IS NULL
         WHERE m.deleted_at IS NULL
         GROUP BY m.id
         ORDER BY m.created_at DESC`
      ).all();
      filename = `missions_${new Date().toISOString().split('T')[0]}`;

    } else if (type === 'action_plans') {
      rows = db.prepare(
        `SELECT
           ap.title as "Titre",
           r.code as "Code Reco",
           ap.status_code as "Statut",
           ap.priority as "Priorité",
           ap.progress_rate as "Avancement %",
           u.first_name || ' ' || u.last_name as "Opérateur",
           ap.planned_start as "Début prévu",
           ap.planned_end as "Fin prévue",
           ap.actual_end as "Fin réelle",
           ap.complexity as "Complexité",
           ap.created_at as "Date création"
         FROM action_plans ap
         LEFT JOIN recommendations r ON r.id = ap.recommendation_id
         LEFT JOIN users u ON u.id = ap.operator_id
         WHERE ap.deleted_at IS NULL
         ORDER BY ap.planned_end ASC NULLS LAST`
      ).all();
      filename = `action_plans_${new Date().toISOString().split('T')[0]}`;
    }

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No data found for export.' });
    }

    // Generate CSV
    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(';'),
      ...rows.map(row =>
        headers.map(h => {
          const val = String(row[h] ?? '').replace(/;/g, ',').replace(/\n/g, ' ').replace(/"/g, '""');
          return `"${val}"`;
        }).join(';')
      )
    ];

    const csv = csvLines.join('\n');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send('﻿' + csv);

  } catch (err) {
    logger.error('exportExcel error:', err);
    return res.status(500).json({ success: false, message: 'Export failed.' });
  }
}

// ----------------------------------------------------------------
// GET /api/reports/export-pdf
// ----------------------------------------------------------------
async function exportPdf(req, res) {
  // In production this would use puppeteer or pdfkit
  // For now, return JSON data suitable for client-side PDF generation
  try {
    const { type = 'summary', ...filters } = req.query;

    const data = {};

    if (type === 'summary' || type === 'general') {
      data.generatedAt = new Date().toISOString();
      data.generatedBy = `${req.user.first_name} ${req.user.last_name}`;

      data.recommendations = db.prepare(
        `SELECT status_code, COUNT(*) as count, ROUND(AVG(progress_rate), 1) as avg_progress
         FROM recommendations WHERE deleted_at IS NULL GROUP BY status_code`
      ).all();

      data.topCritical = db.prepare(
        `SELECT r.code, r.recommendation_text, r.priority_label, r.criticality_score,
                e.name as entity_name
         FROM recommendations r
         LEFT JOIN entities e ON e.id = r.entity_id
         WHERE r.deleted_at IS NULL AND r.status_code NOT IN ('closed', 'validated', 'abandoned')
         ORDER BY r.criticality_score DESC NULLS LAST LIMIT 10`
      ).all();
    }

    return res.json({
      success: true,
      data,
      message: 'PDF data ready. Use client-side renderer to generate PDF.'
    });
  } catch (err) {
    logger.error('exportPdf error:', err);
    return res.status(500).json({ success: false, message: 'PDF export failed.' });
  }
}

// ----------------------------------------------------------------
// POST /api/reports/generate
// ----------------------------------------------------------------
async function generateReport(req, res) {
  try {
    const { template_code, filters = {}, format = 'csv' } = req.body;

    if (!template_code) {
      return res.status(400).json({ success: false, message: 'template_code is required.' });
    }

    const template = db.prepare('SELECT * FROM report_templates WHERE code = ? AND is_active = 1').get(template_code);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found.' });
    }

    // Log report generation
    try {
      db.prepare(
        `INSERT INTO audit_logs (user_id, username, action, module, description)
         VALUES (?, ?, 'EXPORT', 'reports', ?)`
      ).run(req.user.id, req.user.username, `Generated report: ${template_code}`);
    } catch (e) { /* ignore */ }

    return res.json({
      success: true,
      data: {
        template,
        filters,
        message: 'Report generation initiated. Use export endpoints for data.'
      }
    });
  } catch (err) {
    logger.error('generateReport error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate report.' });
  }
}

module.exports = {
  getReportTemplates,
  exportExcel,
  exportPdf,
  generateReport
};
