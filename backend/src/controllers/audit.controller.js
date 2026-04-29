'use strict';

const auditService = require('../services/audit.service');
const logger = require('../config/logger');

// ----------------------------------------------------------------
// GET /api/audit-logs
// ----------------------------------------------------------------
async function getAuditLogs(req, res) {
  try {
    const {
      user_id, username, action, module, entity_type,
      date_from, date_to, search,
      page = 1, limit = 50
    } = req.query;

    const result = auditService.getLogs({
      userId: user_id ? parseInt(user_id) : null,
      username,
      action,
      module,
      entityType: entity_type,
      dateFrom: date_from,
      dateTo: date_to,
      search,
      page: Math.max(1, parseInt(page)),
      limit: Math.min(200, Math.max(1, parseInt(limit)))
    });

    return res.json(result);
  } catch (err) {
    logger.error('getAuditLogs error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
  }
}

// ----------------------------------------------------------------
// GET /api/audit-logs/export
// ----------------------------------------------------------------
async function exportAuditLogs(req, res) {
  try {
    const {
      user_id, username, action, module, entity_type,
      date_from, date_to, search
    } = req.query;

    const rows = auditService.exportLogs({
      userId: user_id ? parseInt(user_id) : null,
      username,
      action,
      module,
      entityType: entity_type,
      dateFrom: date_from,
      dateTo: date_to,
      search
    });

    // Build CSV
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No logs found for export.' });
    }

    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(';'),
      ...rows.map(row =>
        headers.map(h => {
          const val = String(row[h] ?? '').replace(/;/g, ',').replace(/\n/g, ' ');
          return `"${val}"`;
        }).join(';')
      )
    ];

    const csv = csvLines.join('\n');
    const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send('﻿' + csv); // BOM for Excel compatibility
  } catch (err) {
    logger.error('exportAuditLogs error:', err);
    return res.status(500).json({ success: false, message: 'Export failed.' });
  }
}

module.exports = { getAuditLogs, exportAuditLogs };
