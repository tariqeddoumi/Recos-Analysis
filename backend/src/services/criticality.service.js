'use strict';

const db = require('../config/database');

/**
 * Calculate criticality score using the banking formula:
 *
 * Criticality = severity_score × probability_score
 *               × source_coefficient
 *               × regulatory_coefficient
 *               × recurrence_coefficient
 *               × delay_coefficient
 *
 * Coefficients:
 *   regulatory: is_regulatory = 1.5, else 1.0
 *   recurrence: 0 occurrences = 1.0, 1 = 1.2, 2 = 1.4, 3+ = 1.6
 *   delay:      no initial_deadline = 1.0,
 *               >90 days remaining = 0.8,
 *               30-90 = 1.0, 7-29 = 1.2, 0-6 = 1.5, overdue = 2.0
 */
function calculateCriticality({
  severityScore,
  probabilityScore,
  sourceCoefficient = 1.0,
  isRegulatory = false,
  recurrenceCount = 0,
  initialDeadline = null,
  referenceDate = null
}) {
  if (!severityScore || !probabilityScore) return null;

  const regulatoryCoeff = isRegulatory ? 1.5 : 1.0;

  let recurrenceCoeff = 1.0;
  if (recurrenceCount === 1) recurrenceCoeff = 1.2;
  else if (recurrenceCount === 2) recurrenceCoeff = 1.4;
  else if (recurrenceCount >= 3) recurrenceCoeff = 1.6;

  let delayCoeff = 1.0;
  if (initialDeadline) {
    const ref = referenceDate ? new Date(referenceDate) : new Date();
    const deadline = new Date(initialDeadline);
    const daysRemaining = Math.floor((deadline - ref) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) delayCoeff = 2.0;          // Overdue
    else if (daysRemaining <= 6) delayCoeff = 1.5;    // 0-6 days
    else if (daysRemaining <= 29) delayCoeff = 1.2;   // 7-29 days
    else if (daysRemaining <= 90) delayCoeff = 1.0;   // 30-90 days
    else delayCoeff = 0.8;                              // >90 days
  }

  const score = severityScore * probabilityScore
    * sourceCoefficient
    * regulatoryCoeff
    * recurrenceCoeff
    * delayCoeff;

  return Math.round(score * 100) / 100;
}

/**
 * Calculate criticality for a recommendation given its IDs
 */
function calculateForRecommendation(recommendationData) {
  const {
    severity_level_id,
    probability_level_id,
    source_type_id,
    is_regulatory,
    recurrence_count,
    initial_deadline,
    revised_deadline
  } = recommendationData;

  let severityScore = null;
  let probabilityScore = null;
  let sourceCoefficient = 1.0;

  if (severity_level_id) {
    const sev = db.prepare('SELECT score FROM severity_levels WHERE id = ?').get(severity_level_id);
    if (sev) severityScore = sev.score;
  }

  if (probability_level_id) {
    const prob = db.prepare('SELECT score FROM probability_levels WHERE id = ?').get(probability_level_id);
    if (prob) probabilityScore = prob.score;
  }

  if (source_type_id) {
    const src = db.prepare('SELECT coefficient FROM source_types WHERE id = ?').get(source_type_id);
    if (src) sourceCoefficient = src.coefficient;
  }

  if (!severityScore || !probabilityScore) return { score: null, label: null };

  const activeDeadline = revised_deadline || initial_deadline;
  const score = calculateCriticality({
    severityScore,
    probabilityScore,
    sourceCoefficient,
    isRegulatory: Boolean(is_regulatory),
    recurrenceCount: recurrence_count || 0,
    initialDeadline: activeDeadline
  });

  const label = getPriorityLabel(score);
  return { score, label };
}

/**
 * Get priority label from criticality_classes table
 */
function getPriorityLabel(score) {
  if (score === null || score === undefined) return null;

  const cls = db.prepare(
    `SELECT label FROM criticality_classes
     WHERE score_min <= ? AND score_max >= ?
     ORDER BY priority DESC
     LIMIT 1`
  ).get(score, score);

  if (cls) return cls.label;

  // Fallback bands
  if (score <= 4) return 'Faible';
  if (score <= 9) return 'Modéré';
  if (score <= 16) return 'Élevé';
  return 'Critique';
}

/**
 * Get criticality class details
 */
function getCriticalityClass(score) {
  if (score === null || score === undefined) return null;

  return db.prepare(
    `SELECT * FROM criticality_classes
     WHERE score_min <= ? AND score_max >= ?
     ORDER BY priority DESC
     LIMIT 1`
  ).get(score, score);
}

/**
 * Recalculate and update criticality for all active recommendations
 * (Called by cron when deadlines approach)
 */
function recalculateAll() {
  const recommendations = db.prepare(
    `SELECT id, severity_level_id, probability_level_id, source_type_id,
            is_regulatory, recurrence_count, initial_deadline, revised_deadline
     FROM recommendations
     WHERE deleted_at IS NULL
       AND status_code NOT IN ('closed', 'abandoned', 'rejected')`
  ).all();

  const update = db.prepare(
    `UPDATE recommendations
     SET criticality_score = ?, criticality_adjusted = ?, priority_label = ?
     WHERE id = ?`
  );

  const recalc = db.transaction(() => {
    let count = 0;
    for (const rec of recommendations) {
      const { score, label } = calculateForRecommendation(rec);
      if (score !== null) {
        update.run(score, score, label, rec.id);
        count++;
      }
    }
    return count;
  });

  return recalc();
}

module.exports = {
  calculateCriticality,
  calculateForRecommendation,
  getPriorityLabel,
  getCriticalityClass,
  recalculateAll
};
