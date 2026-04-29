'use strict';

const db = require('../config/database');
const logger = require('../config/logger');

// ----------------------------------------------------------------
// GET /api/dashboard/general
// ----------------------------------------------------------------
async function getDashboardGeneral(req, res) {
  try {
    // Total missions
    const totalMissions = db.prepare("SELECT COUNT(*) as cnt FROM missions WHERE deleted_at IS NULL").get().cnt;

    // Total recommendations
    const totalRecos = db.prepare("SELECT COUNT(*) as cnt FROM recommendations WHERE deleted_at IS NULL").get().cnt;

    // Recommendations by status
    const recosByStatus = db.prepare(
      `SELECT status_code, COUNT(*) as count
       FROM recommendations
       WHERE deleted_at IS NULL
       GROUP BY status_code`
    ).all();

    // Overdue recommendations
    const overdueRecos = db.prepare(
      `SELECT COUNT(*) as cnt FROM recommendations
       WHERE deleted_at IS NULL
         AND status_code NOT IN ('closed', 'validated', 'abandoned', 'rejected')
         AND date(COALESCE(revised_deadline, initial_deadline)) < date('now')
         AND initial_deadline IS NOT NULL`
    ).get().cnt;

    // Recommendations by priority
    const recosByPriority = db.prepare(
      `SELECT priority_label, COUNT(*) as count
       FROM recommendations
       WHERE deleted_at IS NULL AND priority_label IS NOT NULL
       GROUP BY priority_label`
    ).all();

    // Average progress rate
    const avgProgress = db.prepare(
      `SELECT ROUND(AVG(progress_rate), 1) as avg_progress
       FROM recommendations
       WHERE deleted_at IS NULL
         AND status_code NOT IN ('draft', 'abandoned', 'rejected')`
    ).get().avg_progress;

    // Action plans stats
    const totalActions = db.prepare("SELECT COUNT(*) as cnt FROM action_plans WHERE deleted_at IS NULL").get().cnt;
    const overdueActions = db.prepare(
      `SELECT COUNT(*) as cnt FROM action_plans
       WHERE deleted_at IS NULL
         AND status_code NOT IN ('completed', 'cancelled')
         AND date(planned_end) < date('now')
         AND planned_end IS NOT NULL`
    ).get().cnt;

    // Evidences stats
    const pendingEvidences = db.prepare(
      "SELECT COUNT(*) as cnt FROM evidences WHERE deleted_at IS NULL AND status_code = 'deposited'"
    ).get().cnt;

    // Missions by status
    const missionsByStatus = db.prepare(
      `SELECT status_code, COUNT(*) as count FROM missions WHERE deleted_at IS NULL GROUP BY status_code`
    ).all();

    // Recommendations closing in 30 days
    const closingIn30 = db.prepare(
      `SELECT COUNT(*) as cnt FROM recommendations
       WHERE deleted_at IS NULL
         AND status_code NOT IN ('closed', 'validated', 'abandoned', 'rejected')
         AND date(COALESCE(revised_deadline, initial_deadline)) BETWEEN date('now') AND date('now', '+30 days')
         AND initial_deadline IS NOT NULL`
    ).get().cnt;

    return res.json({
      success: true,
      data: {
        missions: {
          total: totalMissions,
          byStatus: missionsByStatus
        },
        recommendations: {
          total: totalRecos,
          byStatus: recosByStatus,
          byPriority: recosByPriority,
          overdue: overdueRecos,
          closingIn30Days: closingIn30,
          avgProgress: avgProgress || 0
        },
        actionPlans: {
          total: totalActions,
          overdue: overdueActions
        },
        evidences: {
          pendingReview: pendingEvidences
        }
      }
    });
  } catch (err) {
    logger.error('getDashboardGeneral error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard data.' });
  }
}

// ----------------------------------------------------------------
// GET /api/dashboard/by-source
// ----------------------------------------------------------------
async function getDashboardBySource(req, res) {
  try {
    const bySource = db.prepare(
      `SELECT
         st.code, st.label, st.coefficient,
         COUNT(r.id) as total,
         SUM(CASE WHEN r.status_code IN ('closed', 'validated') THEN 1 ELSE 0 END) as closed,
         SUM(CASE WHEN r.status_code NOT IN ('closed', 'validated', 'abandoned')
                   AND date(COALESCE(r.revised_deadline, r.initial_deadline)) < date('now')
                   AND r.initial_deadline IS NOT NULL THEN 1 ELSE 0 END) as overdue,
         ROUND(AVG(r.progress_rate), 1) as avg_progress,
         ROUND(AVG(r.criticality_score), 2) as avg_criticality
       FROM source_types st
       LEFT JOIN recommendations r ON r.source_type_id = st.id AND r.deleted_at IS NULL
       GROUP BY st.id, st.code, st.label, st.coefficient
       ORDER BY total DESC`
    ).all();

    return res.json({ success: true, data: bySource });
  } catch (err) {
    logger.error('getDashboardBySource error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch source KPIs.' });
  }
}

// ----------------------------------------------------------------
// GET /api/dashboard/regulatory
// ----------------------------------------------------------------
async function getDashboardRegulatory(req, res) {
  try {
    const regulatory = db.prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status_code IN ('closed', 'validated') THEN 1 ELSE 0 END) as closed,
         SUM(CASE WHEN status_code NOT IN ('closed', 'validated', 'abandoned')
                   AND date(COALESCE(revised_deadline, initial_deadline)) < date('now')
                   AND initial_deadline IS NOT NULL THEN 1 ELSE 0 END) as overdue,
         ROUND(AVG(progress_rate), 1) as avg_progress,
         SUM(CASE WHEN priority_label = 'Critique' THEN 1 ELSE 0 END) as critical_count
       FROM recommendations
       WHERE deleted_at IS NULL AND is_regulatory = 1`
    ).get();

    const byStatus = db.prepare(
      `SELECT status_code, COUNT(*) as count
       FROM recommendations
       WHERE deleted_at IS NULL AND is_regulatory = 1
       GROUP BY status_code`
    ).all();

    const overdueList = db.prepare(
      `SELECT r.id, r.code, r.recommendation_text, r.priority_label,
              COALESCE(r.revised_deadline, r.initial_deadline) as active_deadline,
              e.name as entity_name,
              u.first_name || ' ' || u.last_name as owner_name
       FROM recommendations r
       LEFT JOIN entities e ON e.id = r.entity_id
       LEFT JOIN users u ON u.id = r.owner_id
       WHERE r.deleted_at IS NULL AND r.is_regulatory = 1
         AND r.status_code NOT IN ('closed', 'validated', 'abandoned')
         AND date(COALESCE(r.revised_deadline, r.initial_deadline)) < date('now')
         AND r.initial_deadline IS NOT NULL
       ORDER BY active_deadline ASC
       LIMIT 20`
    ).all();

    return res.json({
      success: true,
      data: { summary: regulatory, byStatus, overdueList }
    });
  } catch (err) {
    logger.error('getDashboardRegulatory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch regulatory dashboard.' });
  }
}

// ----------------------------------------------------------------
// GET /api/dashboard/by-entity
// ----------------------------------------------------------------
async function getDashboardByEntity(req, res) {
  try {
    const byEntity = db.prepare(
      `SELECT
         e.id, e.code, e.name,
         COUNT(r.id) as total_recos,
         SUM(CASE WHEN r.status_code IN ('closed', 'validated') THEN 1 ELSE 0 END) as closed_recos,
         SUM(CASE WHEN r.status_code NOT IN ('closed', 'validated', 'abandoned')
                   AND date(COALESCE(r.revised_deadline, r.initial_deadline)) < date('now')
                   AND r.initial_deadline IS NOT NULL THEN 1 ELSE 0 END) as overdue_recos,
         ROUND(AVG(r.progress_rate), 1) as avg_progress,
         SUM(CASE WHEN r.priority_label = 'Critique' THEN 1 ELSE 0 END) as critical_count
       FROM entities e
       LEFT JOIN recommendations r ON r.entity_id = e.id AND r.deleted_at IS NULL
       WHERE e.is_active = 1
       GROUP BY e.id, e.code, e.name
       HAVING total_recos > 0
       ORDER BY overdue_recos DESC, total_recos DESC`
    ).all();

    return res.json({ success: true, data: byEntity });
  } catch (err) {
    logger.error('getDashboardByEntity error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch entity KPIs.' });
  }
}

// ----------------------------------------------------------------
// GET /api/dashboard/management
// ----------------------------------------------------------------
async function getDashboardManagement(req, res) {
  try {
    // Overall compliance rate
    const compliance = db.prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status_code IN ('closed', 'validated') THEN 1 ELSE 0 END) as completed,
         ROUND(100.0 * SUM(CASE WHEN status_code IN ('closed', 'validated') THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) as compliance_rate
       FROM recommendations WHERE deleted_at IS NULL`
    ).get();

    // Trend: recos created per month (last 12 months)
    const monthlyTrend = db.prepare(
      `SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
       FROM recommendations
       WHERE deleted_at IS NULL AND created_at >= date('now', '-12 months')
       GROUP BY month ORDER BY month`
    ).all();

    // Top 5 entities by overdue
    const topOverdueEntities = db.prepare(
      `SELECT e.name,
              SUM(CASE WHEN r.status_code NOT IN ('closed', 'validated', 'abandoned')
                        AND date(COALESCE(r.revised_deadline, r.initial_deadline)) < date('now')
                        AND r.initial_deadline IS NOT NULL THEN 1 ELSE 0 END) as overdue_count
       FROM entities e
       LEFT JOIN recommendations r ON r.entity_id = e.id AND r.deleted_at IS NULL
       WHERE e.is_active = 1
       GROUP BY e.id, e.name
       ORDER BY overdue_count DESC LIMIT 5`
    ).all();

    // Top 5 critical recommendations
    const criticalRecos = db.prepare(
      `SELECT r.id, r.code, r.recommendation_text, r.priority_label, r.criticality_score,
              COALESCE(r.revised_deadline, r.initial_deadline) as active_deadline,
              e.name as entity_name
       FROM recommendations r
       LEFT JOIN entities e ON e.id = r.entity_id
       WHERE r.deleted_at IS NULL
         AND r.status_code NOT IN ('closed', 'validated', 'abandoned')
         AND r.priority_label = 'Critique'
       ORDER BY r.criticality_score DESC LIMIT 10`
    ).all();

    // Pending deadline extensions
    const pendingExtensions = db.prepare(
      "SELECT COUNT(*) as cnt FROM deadline_extensions WHERE status_code = 'pending'"
    ).get().cnt;

    return res.json({
      success: true,
      data: {
        compliance,
        monthlyTrend,
        topOverdueEntities,
        criticalRecos,
        pendingExtensions
      }
    });
  } catch (err) {
    logger.error('getDashboardManagement error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch management dashboard.' });
  }
}

// ----------------------------------------------------------------
// GET /api/dashboard/my-tasks
// ----------------------------------------------------------------
async function getMyTasks(req, res) {
  try {
    const userId = req.user.id;

    // My overdue recommendations (as owner)
    const overdueRecos = db.prepare(
      `SELECT r.id, r.code, r.recommendation_text, r.status_code,
              r.priority_label, COALESCE(r.revised_deadline, r.initial_deadline) as active_deadline,
              m.title as mission_title
       FROM recommendations r
       LEFT JOIN missions m ON m.id = r.mission_id
       WHERE r.deleted_at IS NULL
         AND (r.owner_id = ? OR r.operator_id = ?)
         AND r.status_code NOT IN ('closed', 'validated', 'abandoned')
         AND date(COALESCE(r.revised_deadline, r.initial_deadline)) < date('now')
         AND r.initial_deadline IS NOT NULL
       ORDER BY active_deadline ASC LIMIT 10`
    ).all(userId, userId);

    // My upcoming deadlines (next 30 days)
    const upcomingDeadlines = db.prepare(
      `SELECT r.id, r.code, r.status_code, r.priority_label,
              COALESCE(r.revised_deadline, r.initial_deadline) as active_deadline,
              julianday(COALESCE(r.revised_deadline, r.initial_deadline)) - julianday('now') as days_remaining
       FROM recommendations r
       WHERE r.deleted_at IS NULL
         AND (r.owner_id = ? OR r.operator_id = ?)
         AND r.status_code NOT IN ('closed', 'validated', 'abandoned')
         AND date(COALESCE(r.revised_deadline, r.initial_deadline)) BETWEEN date('now') AND date('now', '+30 days')
       ORDER BY active_deadline ASC LIMIT 10`
    ).all(userId, userId);

    // My action plans due soon
    const myActions = db.prepare(
      `SELECT ap.id, ap.title, ap.status_code, ap.progress_rate, ap.planned_end,
              r.code as recommendation_code
       FROM action_plans ap
       LEFT JOIN recommendations r ON r.id = ap.recommendation_id
       WHERE ap.deleted_at IS NULL
         AND ap.operator_id = ?
         AND ap.status_code NOT IN ('completed', 'cancelled')
       ORDER BY ap.planned_end ASC LIMIT 10`
    ).all(userId);

    // Summary counts
    const summary = db.prepare(
      `SELECT
         SUM(CASE WHEN r.owner_id = ? THEN 1 ELSE 0 END) as owned_recos,
         SUM(CASE WHEN r.operator_id = ? THEN 1 ELSE 0 END) as operated_recos,
         SUM(CASE WHEN (r.owner_id = ? OR r.operator_id = ?)
                   AND r.status_code IN ('in_progress', 'submitted', 'verified') THEN 1 ELSE 0 END) as active_recos
       FROM recommendations r
       WHERE r.deleted_at IS NULL`
    ).get(userId, userId, userId, userId);

    return res.json({
      success: true,
      data: {
        summary,
        overdueRecos,
        upcomingDeadlines,
        myActions
      }
    });
  } catch (err) {
    logger.error('getMyTasks error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch tasks.' });
  }
}

module.exports = {
  getDashboardGeneral,
  getDashboardBySource,
  getDashboardRegulatory,
  getDashboardByEntity,
  getDashboardManagement,
  getMyTasks
};
