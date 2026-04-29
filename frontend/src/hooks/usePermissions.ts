import { useAuth } from './useAuth';

export const usePermissions = () => {
  const { user, hasRole, hasPermission } = useAuth();

  return {
    // Role checks
    isAdmin: hasRole(['admin', 'super_admin']),
    isAuditor: hasRole(['auditor', 'internal_auditor', 'external_auditor']),
    isResponsible: hasRole(['responsible', 'entity_responsible']),
    isValidator: hasRole(['validator', 'manager']),
    isReadOnly: hasRole('readonly'),

    // Mission permissions
    canCreateMission: hasPermission('mission:create'),
    canEditMission: hasPermission('mission:update'),
    canDeleteMission: hasPermission('mission:delete'),
    canViewMissions: hasPermission('mission:read'),

    // Recommendation permissions
    canCreateRecommendation: hasPermission('recommendation:create'),
    canEditRecommendation: hasPermission('recommendation:update'),
    canDeleteRecommendation: hasPermission('recommendation:delete'),
    canValidateRecommendation: hasPermission('recommendation:validate'),
    canCloseRecommendation: hasPermission('recommendation:close'),
    canExportRecommendations: hasPermission('recommendation:export'),

    // Action plan permissions
    canCreateActionPlan: hasPermission('action_plan:create'),
    canEditActionPlan: hasPermission('action_plan:update'),
    canDeleteActionPlan: hasPermission('action_plan:delete'),
    canUpdateProgress: hasPermission('action_plan:update_progress'),

    // Evidence permissions
    canUploadEvidence: hasPermission('evidence:upload'),
    canReviewEvidence: hasPermission('evidence:review'),
    canDeleteEvidence: hasPermission('evidence:delete'),

    // Admin permissions
    canManageUsers: hasPermission('admin:users'),
    canManageRoles: hasPermission('admin:roles'),
    canManageEntities: hasPermission('admin:entities'),
    canManageParameters: hasPermission('admin:parameters'),
    canViewAuditLogs: hasPermission('admin:audit_logs'),
    canManageWorkflow: hasPermission('admin:workflow'),

    // Generic helpers
    hasRole,
    hasPermission,
    user,
  };
};
