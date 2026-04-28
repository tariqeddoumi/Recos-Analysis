// ============================================================
// ENUMS & LITERAL TYPES
// ============================================================

export type MissionStatus = 'draft' | 'active' | 'closed' | 'archived';
export type MissionType = 'internal_audit' | 'external_audit' | 'regulatory' | 'inspection';

export type RecommendationStatus =
  | 'draft'
  | 'open'
  | 'in_progress'
  | 'pending_validation'
  | 'validated'
  | 'closed'
  | 'rejected'
  | 'overdue';

export type ActionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'overdue';

export type EvidenceStatus =
  | 'pending'
  | 'submitted'
  | 'approved'
  | 'rejected';

export type NotificationType =
  | 'deadline_approaching'
  | 'deadline_overdue'
  | 'status_changed'
  | 'comment_added'
  | 'evidence_submitted'
  | 'evidence_approved'
  | 'evidence_rejected'
  | 'extension_requested'
  | 'extension_approved'
  | 'extension_rejected'
  | 'assigned'
  | 'reminder';

export type SeverityLevel = 1 | 2 | 3 | 4 | 5;
export type ProbabilityLevel = 1 | 2 | 3 | 4 | 5;
export type CriticalityClass = 'low' | 'medium' | 'high' | 'critical';

export type PriorityLevel = 'low' | 'medium' | 'high' | 'very_high' | 'critical';
export type ConfidentialityLevel = 'public' | 'internal' | 'confidential' | 'secret';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'login'
  | 'logout'
  | 'export'
  | 'upload'
  | 'download';

export type AuditModule =
  | 'auth'
  | 'mission'
  | 'recommendation'
  | 'action_plan'
  | 'evidence'
  | 'user'
  | 'admin'
  | 'report';

// ============================================================
// CORE ENTITIES
// ============================================================

export interface Permission {
  id: number;
  code: string;
  label: string;
  module: string;
  description?: string;
}

export interface Role {
  id: number;
  code: string;
  label: string;
  description?: string;
  permissions: Permission[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Entity {
  id: number;
  code: string;
  label: string;
  type: string;
  parent_id?: number;
  parent?: Entity;
  children?: Entity[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: Role;
  entity?: Entity;
  entity_id?: number;
  phone?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  avatar_url?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  notifications_email: boolean;
  notifications_sms: boolean;
  language: string;
  timezone: string;
  theme: 'light' | 'dark';
}

export interface SourceType {
  id: number;
  code: string;
  label: string;
  category: string;
  is_regulatory: boolean;
  is_active: boolean;
  description?: string;
}

export interface RiskType {
  id: number;
  code: string;
  label: string;
  description?: string;
  is_active: boolean;
}

// ============================================================
// MISSIONS
// ============================================================

export interface Mission {
  id: number;
  reference: string;
  title: string;
  type: MissionType;
  source_type: SourceType;
  source_type_id: number;
  entity: Entity;
  entity_id: number;
  status: MissionStatus;
  start_date: string;
  end_date?: string;
  report_date?: string;
  description?: string;
  scope?: string;
  auditors?: User[];
  manager?: User;
  manager_id?: number;
  recommendations_count?: number;
  open_recommendations_count?: number;
  closed_recommendations_count?: number;
  progress_rate?: number;
  attachments?: Attachment[];
  created_by: User;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: number;
  filename: string;
  original_name: string;
  mimetype: string;
  size: number;
  url: string;
  uploaded_by: User;
  created_at: string;
}

// ============================================================
// RECOMMENDATIONS
// ============================================================

export interface RiskQualification {
  severity: SeverityLevel;
  probability: ProbabilityLevel;
  criticality_score: number;
  criticality_class: CriticalityClass;
  priority: PriorityLevel;
  risk_type?: RiskType;
  risk_type_id?: number;
  impact_financial: boolean;
  impact_regulatory: boolean;
  impact_operational: boolean;
  impact_reputational: boolean;
  impact_strategic: boolean;
}

export interface Recommendation {
  id: number;
  code: string;
  mission: Mission;
  mission_id: number;
  source_type: SourceType;
  source_type_id: number;
  entity: Entity;
  entity_id: number;
  reference_externe?: string;
  constat: string;
  recommendation_text: string;
  recommendation_detail?: string;
  status: RecommendationStatus;
  is_regulatory: boolean;
  is_recurrent: boolean;
  recurrence_count?: number;
  confidentiality: ConfidentialityLevel;
  risk_qualification: RiskQualification;
  responsible_user?: User;
  responsible_user_id?: number;
  responsible_entity?: Entity;
  responsible_entity_id?: number;
  validator_user?: User;
  validator_user_id?: number;
  initial_deadline: string;
  extended_deadline?: string;
  effective_deadline: string;
  closure_date?: string;
  progress_rate: number;
  action_plans?: ActionPlan[];
  action_plans_count?: number;
  completed_actions_count?: number;
  evidences?: Evidence[];
  evidences_count?: number;
  comments?: Comment[];
  status_history?: StatusHistory[];
  deadline_extensions?: DeadlineExtension[];
  tags?: string[];
  created_by: User;
  created_at: string;
  updated_at: string;
}

export interface StatusHistory {
  id: number;
  entity_type: string;
  entity_id: number;
  previous_status: string;
  new_status: string;
  comment?: string;
  changed_by: User;
  created_at: string;
}

export interface DeadlineExtension {
  id: number;
  recommendation_id: number;
  original_deadline: string;
  new_deadline: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_by: User;
  reviewed_by?: User;
  review_comment?: string;
  created_at: string;
  reviewed_at?: string;
}

// ============================================================
// ACTION PLANS
// ============================================================

export interface ActionPlan {
  id: number;
  recommendation: Recommendation;
  recommendation_id: number;
  title: string;
  description?: string;
  status: ActionStatus;
  responsible_user?: User;
  responsible_user_id?: number;
  responsible_entity?: Entity;
  responsible_entity_id?: number;
  start_date?: string;
  deadline: string;
  completion_date?: string;
  progress_rate: number;
  budget_allocated?: number;
  budget_consumed?: number;
  evidences?: Evidence[];
  evidences_count?: number;
  comments?: Comment[];
  created_by: User;
  created_at: string;
  updated_at: string;
}

// ============================================================
// EVIDENCES
// ============================================================

export interface Evidence {
  id: number;
  recommendation_id?: number;
  action_plan_id?: number;
  title: string;
  description?: string;
  filename: string;
  original_name: string;
  mimetype: string;
  size: number;
  url: string;
  status: EvidenceStatus;
  reviewer?: User;
  reviewer_id?: number;
  review_comment?: string;
  reviewed_at?: string;
  uploaded_by: User;
  created_at: string;
  updated_at: string;
}

// ============================================================
// COMMENTS
// ============================================================

export interface Comment {
  id: number;
  entity_type: string;
  entity_id: number;
  content: string;
  is_internal: boolean;
  parent_id?: number;
  replies?: Comment[];
  author: User;
  created_at: string;
  updated_at: string;
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  entity_type?: string;
  entity_id?: number;
  link?: string;
  created_at: string;
  read_at?: string;
}

// ============================================================
// AUDIT LOGS
// ============================================================

export interface AuditLog {
  id: number;
  user?: User;
  user_id?: number;
  action: AuditAction;
  module: AuditModule;
  entity_type?: string;
  entity_id?: number;
  entity_label?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  description: string;
  created_at: string;
}

// ============================================================
// DASHBOARD KPIs
// ============================================================

export interface DashboardKpis {
  total_recommendations: number;
  open_recommendations: number;
  overdue_recommendations: number;
  critical_recommendations: number;
  closure_rate: number;
  average_progress: number;
  my_pending_count: number;
  regulatory_open: number;
  near_deadline_count: number;
  total_missions: number;
  active_missions: number;
}

export interface DashboardMyTasks {
  my_recommendations: Recommendation[];
  my_actions: ActionPlan[];
  upcoming_deadlines: Array<{
    type: 'recommendation' | 'action_plan';
    id: number;
    title: string;
    deadline: string;
    days_remaining: number;
    status: string;
  }>;
}

export interface ChartDataBySource {
  source: string;
  total: number;
  open: number;
  closed: number;
  overdue: number;
}

export interface ChartDataByStatus {
  status: RecommendationStatus;
  label: string;
  count: number;
  percentage: number;
}

export interface TrendDataPoint {
  month: string;
  opened: number;
  closed: number;
  overdue: number;
}

export interface DashboardData {
  kpis: DashboardKpis;
  my_tasks: DashboardMyTasks;
  by_source: ChartDataBySource[];
  by_status: ChartDataByStatus[];
  trend: TrendDataPoint[];
  critical_recommendations: Recommendation[];
  regulatory_alerts: Recommendation[];
}

// ============================================================
// PARAMETERS
// ============================================================

export interface Parameter {
  id: number;
  key: string;
  label: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description?: string;
  is_editable: boolean;
  updated_by?: User;
  updated_at: string;
}

export interface WorkflowStep {
  id: number;
  status: RecommendationStatus;
  label: string;
  allowed_transitions: RecommendationStatus[];
  required_role?: string;
  required_permission?: string;
  is_terminal: boolean;
  order: number;
  color: string;
}

export interface ReminderRule {
  id: number;
  name: string;
  entity_type: string;
  trigger_type: 'before_deadline' | 'after_deadline' | 'status_change';
  days_offset?: number;
  frequency?: number;
  notification_type: NotificationType;
  recipients: string[];
  template?: string;
  is_active: boolean;
  created_at: string;
}

// ============================================================
// API / PAGINATION
// ============================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string | string[];
  source_type_id?: number;
  entity_id?: number;
  mission_id?: number;
  responsible_user_id?: number;
  priority?: PriorityLevel | PriorityLevel[];
  risk_type_id?: number;
  is_regulatory?: boolean;
  is_overdue?: boolean;
  date_from?: string;
  date_to?: string;
  deadline_from?: string;
  deadline_to?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// ============================================================
// FORM TYPES
// ============================================================

export interface LoginForm {
  username: string;
  password: string;
}

export interface ChangePasswordForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface MissionForm {
  title: string;
  type: MissionType;
  source_type_id: number;
  entity_id: number;
  start_date: string;
  end_date?: string;
  report_date?: string;
  description?: string;
  scope?: string;
  manager_id?: number;
}

export interface RecommendationForm {
  mission_id: number;
  source_type_id: number;
  entity_id: number;
  reference_externe?: string;
  constat: string;
  recommendation_text: string;
  recommendation_detail?: string;
  is_regulatory: boolean;
  confidentiality: ConfidentialityLevel;
  severity: SeverityLevel;
  probability: ProbabilityLevel;
  risk_type_id?: number;
  impact_financial: boolean;
  impact_regulatory: boolean;
  impact_operational: boolean;
  impact_reputational: boolean;
  impact_strategic: boolean;
  responsible_user_id?: number;
  responsible_entity_id?: number;
  validator_user_id?: number;
  initial_deadline: string;
  tags?: string[];
}

export interface ActionPlanForm {
  recommendation_id: number;
  title: string;
  description?: string;
  responsible_user_id?: number;
  responsible_entity_id?: number;
  start_date?: string;
  deadline: string;
  budget_allocated?: number;
}

export interface CommentForm {
  content: string;
  is_internal: boolean;
  parent_id?: number;
}

export interface DeadlineExtensionForm {
  new_deadline: string;
  reason: string;
}

export interface UserForm {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role_id: number;
  entity_id?: number;
  phone?: string;
  password?: string;
  is_active: boolean;
}

export interface EntityForm {
  code: string;
  label: string;
  type: string;
  parent_id?: number;
  is_active: boolean;
}

export interface SourceTypeForm {
  code: string;
  label: string;
  category: string;
  is_regulatory: boolean;
  is_active: boolean;
  description?: string;
}
