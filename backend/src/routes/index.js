'use strict';

const express = require('express');
const router = express.Router();

const { authenticate, requireRole, requirePermission } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const { loginLimiter, uploadLimiter, exportLimiter } = require('../middleware/rateLimiter');

// ── Controllers ──────────────────────────────────────────────────
const authController      = require('../controllers/auth.controller');
const missionController   = require('../controllers/mission.controller');
const recoController      = require('../controllers/recommendation.controller');
const actionController    = require('../controllers/actionPlan.controller');
const evidenceController  = require('../controllers/evidence.controller');
const deadlineController  = require('../controllers/deadline.controller');
const dashboardController = require('../controllers/dashboard.controller');
const notifController     = require('../controllers/notification.controller');
const auditController     = require('../controllers/audit.controller');
const reportController    = require('../controllers/report.controller');
const adminController     = require('../controllers/admin.controller');

// ============================================================
// HEALTH CHECK
// ============================================================
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is running.', timestamp: new Date().toISOString() });
});

// ============================================================
// AUTH ROUTES  /api/auth
// ============================================================
const authRouter = express.Router();
authRouter.post('/login',  loginLimiter, ...authController.loginValidation, authController.login);
authRouter.post('/logout', authenticate, authController.logout);
authRouter.get('/me',      authenticate, authController.getMe);
authRouter.put('/change-password', authenticate, ...authController.changePasswordValidation, authController.changePassword);
authRouter.post('/refresh', authController.refreshToken);
router.use('/auth', authRouter);

// ============================================================
// MISSIONS  /api/missions
// ============================================================
const missionRouter = express.Router();
missionRouter.use(authenticate, auditMiddleware);
missionRouter.get('/',    missionController.getMissions);
missionRouter.get('/:id', missionController.getMissionById);
missionRouter.post('/',   requirePermission('missions', 'create'), ...missionController.createMissionValidation, missionController.createMission);
missionRouter.put('/:id', requirePermission('missions', 'update'), missionController.updateMission);
missionRouter.delete('/:id', requirePermission('missions', 'delete'), missionController.deleteMission);
missionRouter.put('/:id/status', requirePermission('missions', 'update'), missionController.updateMissionStatus);
missionRouter.get('/:id/recommendations', missionController.getMissionRecommendations);
missionRouter.get('/:id/history', missionController.getMissionHistory);
router.use('/missions', missionRouter);

// ============================================================
// RECOMMENDATIONS  /api/recommendations
// ============================================================
const recoRouter = express.Router();
recoRouter.use(authenticate, auditMiddleware);
recoRouter.get('/',    recoController.getRecommendations);
recoRouter.get('/:id', recoController.getRecommendationById);
recoRouter.post('/',   requirePermission('recommendations', 'create'), ...recoController.createRecommendationValidation, recoController.createRecommendation);
recoRouter.put('/:id', requirePermission('recommendations', 'update'), recoController.updateRecommendation);
recoRouter.delete('/:id', requirePermission('recommendations', 'delete'), recoController.deleteRecommendation);
recoRouter.put('/:id/status',   requirePermission('recommendations', 'update'), recoController.updateRecommendationStatus);
recoRouter.put('/:id/progress', requirePermission('recommendations', 'update'), recoController.updateRecommendationProgress);
recoRouter.get('/:id/actions',   recoController.getRecommendationActions);
recoRouter.get('/:id/evidences', recoController.getRecommendationEvidences);
recoRouter.get('/:id/history',   recoController.getRecommendationHistory);
recoRouter.get('/:id/comments',  recoController.getRecommendationComments);
recoRouter.post('/:id/comments', recoController.addRecommendationComment);
router.use('/recommendations', recoRouter);

// ============================================================
// ACTION PLANS  /api/action-plans
// ============================================================
const actionRouter = express.Router();
actionRouter.use(authenticate, auditMiddleware);
actionRouter.get('/',    actionController.getActionPlans);
actionRouter.get('/:id', actionController.getActionPlanById);
actionRouter.post('/',   requirePermission('action_plans', 'create'), ...actionController.createActionPlanValidation, actionController.createActionPlan);
actionRouter.put('/:id', requirePermission('action_plans', 'update'), actionController.updateActionPlan);
actionRouter.delete('/:id', requirePermission('action_plans', 'delete'), actionController.deleteActionPlan);
actionRouter.put('/:id/status',   requirePermission('action_plans', 'update'), actionController.updateActionPlanStatus);
actionRouter.put('/:id/progress', requirePermission('action_plans', 'update'), actionController.updateActionPlanProgress);
actionRouter.get('/:id/evidences', actionController.getActionPlanEvidences);
actionRouter.get('/:id/history',   actionController.getActionPlanHistory);
router.use('/action-plans', actionRouter);

// ============================================================
// EVIDENCES  /api/evidences
// ============================================================
const evidenceRouter = express.Router();
evidenceRouter.use(authenticate);
evidenceRouter.get('/',    evidenceController.getEvidences);
evidenceRouter.get('/:id', evidenceController.getEvidenceById);
evidenceRouter.post('/',   uploadLimiter, requirePermission('evidences', 'create'), evidenceController.createEvidence);
evidenceRouter.put('/:id/status', auditMiddleware, requirePermission('evidences', 'validate'), evidenceController.updateEvidenceStatus);
evidenceRouter.get('/:id/download', evidenceController.downloadEvidence);
evidenceRouter.delete('/:id', auditMiddleware, requirePermission('evidences', 'delete'), evidenceController.deleteEvidence);
router.use('/evidences', evidenceRouter);

// ============================================================
// DEADLINE EXTENSIONS  /api/deadline-extensions
// ============================================================
const deadlineRouter = express.Router();
deadlineRouter.use(authenticate, auditMiddleware);
deadlineRouter.get('/',    deadlineController.getDeadlineExtensions);
deadlineRouter.get('/:id', deadlineController.getDeadlineExtensionById);
deadlineRouter.post('/',   ...deadlineController.createExtensionValidation, deadlineController.createDeadlineExtension);
deadlineRouter.put('/:id/status', requireRole('admin_system', 'admin_metier', 'validateur'), deadlineController.updateExtensionStatus);
router.use('/deadline-extensions', deadlineRouter);

// ============================================================
// DASHBOARD  /api/dashboard
// ============================================================
const dashboardRouter = express.Router();
dashboardRouter.use(authenticate);
dashboardRouter.get('/general',    dashboardController.getDashboardGeneral);
dashboardRouter.get('/by-source',  dashboardController.getDashboardBySource);
dashboardRouter.get('/regulatory', dashboardController.getDashboardRegulatory);
dashboardRouter.get('/by-entity',  dashboardController.getDashboardByEntity);
dashboardRouter.get('/management', requireRole('admin_system', 'admin_metier', 'management'), dashboardController.getDashboardManagement);
dashboardRouter.get('/my-tasks',   dashboardController.getMyTasks);
router.use('/dashboard', dashboardRouter);

// ============================================================
// NOTIFICATIONS  /api/notifications
// ============================================================
const notifRouter = express.Router();
notifRouter.use(authenticate);
notifRouter.get('/',              notifController.getNotifications);
notifRouter.get('/count',         notifController.getNotificationCount);
notifRouter.put('/read-all',      notifController.markAllNotificationsRead);
notifRouter.put('/:id/read',      notifController.markNotificationRead);
router.use('/notifications', notifRouter);

// ============================================================
// AUDIT LOGS  /api/audit-logs
// ============================================================
const auditRouter = express.Router();
auditRouter.use(authenticate, requireRole('admin_system', 'admin_metier', 'regulateur'));
auditRouter.get('/',        auditController.getAuditLogs);
auditRouter.get('/export',  exportLimiter, auditController.exportAuditLogs);
router.use('/audit-logs', auditRouter);

// ============================================================
// REPORTS  /api/reports
// ============================================================
const reportRouter = express.Router();
reportRouter.use(authenticate);
reportRouter.get('/templates',    reportController.getReportTemplates);
reportRouter.get('/export-excel', exportLimiter, reportController.exportExcel);
reportRouter.get('/export-pdf',   exportLimiter, reportController.exportPdf);
reportRouter.post('/generate',    reportController.generateReport);
router.use('/reports', reportRouter);

// ============================================================
// ADMIN ROUTES  /api/admin  (admin_system + admin_metier)
// ============================================================
const adminRouter = express.Router();
adminRouter.use(authenticate, requireRole('admin_system', 'admin_metier'), auditMiddleware);

// Sources
adminRouter.get('/sources',        adminController.getSources);
adminRouter.post('/sources',       adminController.createSource);
adminRouter.put('/sources/:id',    adminController.updateSource);
adminRouter.delete('/sources/:id', adminController.deleteSource);

// Risk types
adminRouter.get('/risk-types',        adminController.getRiskTypes);
adminRouter.post('/risk-types',       adminController.createRiskType);
adminRouter.put('/risk-types/:id',    adminController.updateRiskType);
adminRouter.delete('/risk-types/:id', adminController.deleteRiskType);

// Severity levels
adminRouter.get('/severity-levels',     adminController.getSeverityLevels);
adminRouter.post('/severity-levels',    adminController.createSeverityLevel);
adminRouter.put('/severity-levels/:id', adminController.updateSeverityLevel);

// Probability levels
adminRouter.get('/probability-levels',     adminController.getProbabilityLevels);
adminRouter.post('/probability-levels',    adminController.createProbabilityLevel);
adminRouter.put('/probability-levels/:id', adminController.updateProbabilityLevel);

// Mission statuses
adminRouter.get('/mission-statuses',     adminController.getMissionStatuses);
adminRouter.post('/mission-statuses',    adminController.createMissionStatus);
adminRouter.put('/mission-statuses/:id', adminController.updateMissionStatus);

// Recommendation statuses
adminRouter.get('/recommendation-statuses',     adminController.getRecommendationStatuses);
adminRouter.post('/recommendation-statuses',    adminController.createRecommendationStatus);
adminRouter.put('/recommendation-statuses/:id', adminController.updateRecommendationStatus);

// Action statuses
adminRouter.get('/action-statuses',     adminController.getActionStatuses);
adminRouter.post('/action-statuses',    adminController.createActionStatus);
adminRouter.put('/action-statuses/:id', adminController.updateActionStatus);

// Entities
adminRouter.get('/entities',        adminController.getEntities);
adminRouter.post('/entities',       adminController.createEntity);
adminRouter.put('/entities/:id',    adminController.updateEntity);
adminRouter.delete('/entities/:id', adminController.deleteEntity);

// Users (admin_system only for sensitive ops)
adminRouter.get('/users',        adminController.getUsers);
adminRouter.get('/users/:id',    adminController.getUserById);
adminRouter.post('/users',       requireRole('admin_system'), adminController.createUser);
adminRouter.put('/users/:id',    requireRole('admin_system'), adminController.updateUser);
adminRouter.delete('/users/:id', requireRole('admin_system'), adminController.deleteUser);

// Roles
adminRouter.get('/roles',     adminController.getRoles);
adminRouter.post('/roles',    requireRole('admin_system'), adminController.createRole);
adminRouter.put('/roles/:id', requireRole('admin_system'), adminController.updateRole);

// Permissions
adminRouter.get('/permissions/:roleId',    adminController.getPermissions);
adminRouter.put('/permissions/:roleId',    requireRole('admin_system'), adminController.updatePermissions);

// Parameters
adminRouter.get('/parameters',       adminController.getParameters);
adminRouter.put('/parameters',       adminController.updateParameters);
adminRouter.put('/parameters/:key',  adminController.updateParameter);

// Reminder rules
adminRouter.get('/reminder-rules',        adminController.getReminderRules);
adminRouter.post('/reminder-rules',       adminController.createReminderRule);
adminRouter.put('/reminder-rules/:id',    adminController.updateReminderRule);
adminRouter.delete('/reminder-rules/:id', adminController.deleteReminderRule);

// Escalation rules
adminRouter.get('/escalation-rules',        adminController.getEscalationRules);
adminRouter.post('/escalation-rules',       adminController.createEscalationRule);
adminRouter.put('/escalation-rules/:id',    adminController.updateEscalationRule);
adminRouter.delete('/escalation-rules/:id', adminController.deleteEscalationRule);

// Workflow steps
adminRouter.get('/workflow-steps',        adminController.getWorkflowSteps);
adminRouter.post('/workflow-steps',       adminController.createWorkflowStep);
adminRouter.put('/workflow-steps/:id',    adminController.updateWorkflowStep);
adminRouter.delete('/workflow-steps/:id', adminController.deleteWorkflowStep);

// Confidentiality levels
adminRouter.get('/confidentiality-levels',     adminController.getConfidentialityLevels);
adminRouter.post('/confidentiality-levels',    adminController.createConfidentialityLevel);
adminRouter.put('/confidentiality-levels/:id', adminController.updateConfidentialityLevel);

// Evidence types
adminRouter.get('/evidence-types',     adminController.getEvidenceTypes);
adminRouter.post('/evidence-types',    adminController.createEvidenceType);
adminRouter.put('/evidence-types/:id', adminController.updateEvidenceType);

router.use('/admin', adminRouter);

module.exports = router;
