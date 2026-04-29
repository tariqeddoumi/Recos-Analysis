'use strict';

const db = require('../config/database');
const logger = require('../config/logger');
const notificationService = require('./notification.service');

/**
 * Check deadlines and send reminders based on reminder_rules
 */
function checkAndSendReminders() {
  logger.info('[reminder] Running deadline reminder check...');
  let sentCount = 0;

  try {
    const rules = db.prepare(
      'SELECT * FROM reminder_rules WHERE is_active = 1'
    ).all();

    for (const rule of rules) {
      sentCount += processReminderRule(rule);
    }

    logger.info(`[reminder] Sent ${sentCount} reminder notifications.`);
  } catch (err) {
    logger.error('[reminder] Error in checkAndSendReminders:', err);
  }

  return sentCount;
}

function processReminderRule(rule) {
  let count = 0;
  const today = new Date().toISOString().split('T')[0];

  // Build date conditions
  let dateCondition = '';
  const dateParams = [];

  if (rule.days_before_due !== null && rule.days_before_due !== undefined) {
    // J-N: deadline is N days away
    dateCondition = `date(COALESCE(r.revised_deadline, r.initial_deadline)) = date('now', '+${rule.days_before_due} days')`;
  } else if (rule.days_after_due !== null && rule.days_after_due !== undefined) {
    // J+N: N days after deadline
    dateCondition = `date(COALESCE(r.revised_deadline, r.initial_deadline)) = date('now', '-${rule.days_after_due} days')`;
  } else {
    return 0;
  }

  // Find recommendations matching this rule
  const recommendations = db.prepare(
    `SELECT r.id, r.code, r.recommendation_text, r.status_code,
            r.initial_deadline, r.revised_deadline, r.owner_id, r.operator_id,
            r.entity_id,
            m.title as mission_title
     FROM recommendations r
     JOIN missions m ON m.id = r.mission_id
     WHERE r.deleted_at IS NULL
       AND r.status_code NOT IN ('closed', 'abandoned', 'rejected', 'validated')
       AND ${dateCondition}`
  ).all();

  for (const rec of recommendations) {
    const deadline = rec.revised_deadline || rec.initial_deadline;
    const daysText = rule.days_before_due !== null
      ? `dans ${rule.days_before_due} jour(s)`
      : `depuis ${rule.days_after_due} jour(s) (DÉPASSÉE)`;

    const message = rule.message_template
      .replace('{code}', rec.code)
      .replace('{deadline}', deadline)
      .replace('{days}', daysText)
      .replace('{mission}', rec.mission_title);

    // Determine recipients based on target_role
    const recipients = getRecipientsByRole(rule.target_role, rec);

    for (const userId of recipients) {
      notificationService.sendNotification({
        userId,
        typeCode: 'reminder',
        title: `Échéance: ${rec.code}`,
        message,
        entityType: 'recommendation',
        entityId: rec.id
      });
      count++;
    }
  }

  // Also check action plans
  const actionPlans = db.prepare(
    `SELECT ap.id, ap.title, ap.status_code, ap.planned_end, ap.operator_id,
            ap.recommendation_id, r.code as rec_code
     FROM action_plans ap
     JOIN recommendations r ON r.id = ap.recommendation_id
     WHERE ap.deleted_at IS NULL
       AND ap.status_code NOT IN ('completed', 'cancelled', 'rejected')
       AND ${dateCondition.replace(/r\./g, 'ap.').replace('initial_deadline', 'planned_end').replace('revised_deadline', 'planned_end')}`
  ).all();

  for (const ap of actionPlans) {
    if (!ap.operator_id) continue;

    const deadline = ap.planned_end;
    const daysText = rule.days_before_due !== null
      ? `dans ${rule.days_before_due} jour(s)`
      : `depuis ${rule.days_after_due} jour(s) (DÉPASSÉE)`;

    const message = `Action "${ap.title}" (Reco: ${ap.rec_code}) - Échéance ${daysText}: ${deadline}`;

    notificationService.sendNotification({
      userId: ap.operator_id,
      typeCode: 'reminder',
      title: `Échéance action: ${ap.title}`,
      message,
      entityType: 'action_plan',
      entityId: ap.id
    });
    count++;
  }

  return count;
}

function getRecipientsByRole(targetRole, recommendation) {
  const ids = new Set();

  if (targetRole === 'owner' || targetRole === 'responsable_action') {
    if (recommendation.owner_id) ids.add(recommendation.owner_id);
  }
  if (targetRole === 'operator' || targetRole === 'responsable_action') {
    if (recommendation.operator_id) ids.add(recommendation.operator_id);
  }
  if (targetRole === 'entity') {
    // All users in the entity
    const entityUsers = db.prepare(
      'SELECT id FROM users WHERE entity_id = ? AND is_active = 1'
    ).all(recommendation.entity_id);
    entityUsers.forEach(u => ids.add(u.id));
  }
  if (targetRole === 'validateur' || targetRole === 'admin_metier') {
    const validators = db.prepare(
      `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
       WHERE r.code = ? AND u.is_active = 1`
    ).all(targetRole);
    validators.forEach(u => ids.add(u.id));
  }

  // Fallback: owner + operator
  if (ids.size === 0) {
    if (recommendation.owner_id) ids.add(recommendation.owner_id);
    if (recommendation.operator_id) ids.add(recommendation.operator_id);
  }

  return Array.from(ids);
}

/**
 * Process escalations for overdue recommendations
 */
function processEscalations() {
  logger.info('[escalation] Running escalation check...');
  let escalationCount = 0;

  try {
    const rules = db.prepare(
      'SELECT * FROM escalation_rules WHERE is_active = 1'
    ).all();

    for (const rule of rules) {
      escalationCount += processEscalationRule(rule);
    }

    logger.info(`[escalation] Created ${escalationCount} escalation notifications.`);
  } catch (err) {
    logger.error('[escalation] Error in processEscalations:', err);
  }

  return escalationCount;
}

function processEscalationRule(rule) {
  let count = 0;

  if (rule.entity_type === 'recommendation') {
    let condition = '';
    if (rule.trigger_condition === 'overdue') {
      condition = `date(COALESCE(r.revised_deadline, r.initial_deadline)) < date('now', '-${rule.delay_days} days')`;
    } else if (rule.trigger_condition === 'stalled') {
      // No progress update in N days
      condition = `r.updated_at < datetime('now', '-${rule.delay_days} days') AND r.progress_rate < 50`;
    } else {
      return 0;
    }

    const recs = db.prepare(
      `SELECT r.id, r.code, r.owner_id, r.entity_id,
              COALESCE(r.revised_deadline, r.initial_deadline) as active_deadline
       FROM recommendations r
       WHERE r.deleted_at IS NULL
         AND r.status_code NOT IN ('closed', 'abandoned', 'rejected', 'validated')
         AND ${condition}`
    ).all();

    for (const rec of recs) {
      // Notify target role
      const targets = db.prepare(
        `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
         WHERE r.code = ? AND u.is_active = 1`
      ).all(rule.target_role);

      const title = `[ESCALADE ${rule.notification_level.toUpperCase()}] Recommandation ${rec.code}`;
      const message = `La recommandation ${rec.code} (échéance: ${rec.active_deadline}) nécessite une escalade.`;

      for (const t of targets) {
        notificationService.sendNotification({
          userId: t.id,
          typeCode: 'escalation',
          title,
          message,
          entityType: 'recommendation',
          entityId: rec.id
        });
        count++;
      }
    }
  }

  return count;
}

/**
 * Send status change notification
 */
function notifyStatusChange(entityType, entityId, fromStatus, toStatus, affectedUserIds) {
  const title = `Changement de statut`;
  const message = `Statut changé: ${fromStatus} → ${toStatus}`;

  notificationService.sendBulkNotifications(affectedUserIds, {
    typeCode: 'status_change',
    title,
    message,
    entityType,
    entityId
  });
}

module.exports = {
  checkAndSendReminders,
  processEscalations,
  notifyStatusChange
};
