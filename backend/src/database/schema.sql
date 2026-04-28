PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
PRAGMA synchronous=NORMAL;

-- ============================================================
-- PARAMETER SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS parameter_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  label       TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'string', -- string|number|boolean|json
  module      TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- REFERENCE / LOOKUP TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS confidentiality_levels (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  rank        INTEGER NOT NULL DEFAULT 0,
  color       TEXT NOT NULL DEFAULT '#6B7280',
  description TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS source_types (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  coefficient REAL NOT NULL DEFAULT 1.0,
  description TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS risk_types (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  category    TEXT,
  description TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS severity_levels (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  score       INTEGER NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6B7280',
  description TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS probability_levels (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  score       INTEGER NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6B7280',
  description TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS criticality_classes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  score_min   REAL NOT NULL,
  score_max   REAL NOT NULL,
  label       TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6B7280',
  priority    INTEGER NOT NULL DEFAULT 0,
  description TEXT
);

-- ============================================================
-- STATUS TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS mission_status_types (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  code             TEXT NOT NULL UNIQUE,
  label            TEXT NOT NULL,
  color            TEXT NOT NULL DEFAULT '#6B7280',
  is_terminal      INTEGER NOT NULL DEFAULT 0,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  description      TEXT
);

CREATE TABLE IF NOT EXISTS recommendation_status_types (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  code                TEXT NOT NULL UNIQUE,
  label               TEXT NOT NULL,
  color               TEXT NOT NULL DEFAULT '#6B7280',
  is_terminal         INTEGER NOT NULL DEFAULT 0,
  allows_modification INTEGER NOT NULL DEFAULT 1,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  description         TEXT
);

CREATE TABLE IF NOT EXISTS action_status_types (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6B7280',
  is_terminal INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  description TEXT
);

CREATE TABLE IF NOT EXISTS evidence_status_types (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6B7280',
  is_terminal INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  description TEXT
);

CREATE TABLE IF NOT EXISTS evidence_types (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  code               TEXT NOT NULL UNIQUE,
  label              TEXT NOT NULL,
  allowed_extensions TEXT NOT NULL DEFAULT '[]', -- JSON array
  description        TEXT,
  is_active          INTEGER NOT NULL DEFAULT 1
);

-- ============================================================
-- ESCALATION & REMINDER RULES
-- ============================================================
CREATE TABLE IF NOT EXISTS escalation_rules (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type        TEXT NOT NULL, -- mission|recommendation|action_plan
  trigger_condition  TEXT NOT NULL, -- overdue|approaching|stalled
  delay_days         INTEGER NOT NULL DEFAULT 0,
  notification_level TEXT NOT NULL DEFAULT 'warning', -- info|warning|critical
  target_role        TEXT NOT NULL,
  is_active          INTEGER NOT NULL DEFAULT 1,
  description        TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reminder_rules (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  days_before_due  INTEGER,
  days_after_due   INTEGER,
  target_role      TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'reminder',
  message_template TEXT NOT NULL,
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- WORKFLOW
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_steps (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  entity_type      TEXT NOT NULL, -- mission|recommendation|action_plan|evidence
  from_status      TEXT NOT NULL,
  to_status        TEXT NOT NULL,
  required_role    TEXT NOT NULL,
  requires_proof   INTEGER NOT NULL DEFAULT 0,
  requires_comment INTEGER NOT NULL DEFAULT 0,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- REPORT TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS report_templates (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  code             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  type             TEXT NOT NULL, -- mission|recommendation|action_plan|consolidated
  format           TEXT NOT NULL DEFAULT 'excel', -- excel|pdf|csv
  template_content TEXT,
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- ROLES & PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS permissions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id    INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  module     TEXT NOT NULL,
  action     TEXT NOT NULL,
  is_allowed INTEGER NOT NULL DEFAULT 1,
  UNIQUE(role_id, module, action)
);

-- ============================================================
-- ORGANIZATIONAL STRUCTURE
-- ============================================================
CREATE TABLE IF NOT EXISTS entities (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  parent_id   INTEGER REFERENCES entities(id),
  direction   TEXT,
  description TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS directions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  entity_id   INTEGER REFERENCES entities(id),
  description TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS processes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  entity_id   INTEGER REFERENCES entities(id),
  description TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  username             TEXT NOT NULL UNIQUE,
  email                TEXT NOT NULL UNIQUE,
  password_hash        TEXT NOT NULL,
  first_name           TEXT NOT NULL,
  last_name            TEXT NOT NULL,
  role_id              INTEGER NOT NULL REFERENCES roles(id),
  entity_id            INTEGER REFERENCES entities(id),
  is_active            INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  failed_attempts      INTEGER NOT NULL DEFAULT 0,
  locked_until         TEXT,
  last_login           TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_source_permissions (
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type_id INTEGER NOT NULL REFERENCES source_types(id) ON DELETE CASCADE,
  can_create     INTEGER NOT NULL DEFAULT 0,
  can_read       INTEGER NOT NULL DEFAULT 1,
  can_update     INTEGER NOT NULL DEFAULT 0,
  can_delete     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, source_type_id)
);

CREATE TABLE IF NOT EXISTS user_confidentiality_permissions (
  user_id                  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  confidentiality_level_id INTEGER NOT NULL REFERENCES confidentiality_levels(id) ON DELETE CASCADE,
  can_read                 INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, confidentiality_level_id)
);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  is_revoked INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- MISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS missions (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  reference              TEXT NOT NULL UNIQUE,
  code                   TEXT NOT NULL UNIQUE,
  title                  TEXT NOT NULL,
  type_code              TEXT NOT NULL DEFAULT 'audit', -- audit|inspection|control|regulatory|auto_evaluation
  source_type_id         INTEGER REFERENCES source_types(id),
  issuing_authority      TEXT,
  entity_id              INTEGER REFERENCES entities(id),
  scope                  TEXT,
  period_start           TEXT,
  period_end             TEXT,
  start_date             TEXT,
  end_date               TEXT,
  report_received_date   TEXT,
  report_validated_date  TEXT,
  supervisor_id          INTEGER REFERENCES users(id),
  confidentiality_level_id INTEGER REFERENCES confidentiality_levels(id),
  status_code            TEXT NOT NULL DEFAULT 'draft',
  description            TEXT,
  observations           TEXT,
  created_by             INTEGER NOT NULL REFERENCES users(id),
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at             TEXT,
  deleted_by             INTEGER REFERENCES users(id)
);

-- ============================================================
-- RECOMMENDATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS recommendations (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  code                    TEXT NOT NULL UNIQUE,
  mission_id              INTEGER NOT NULL REFERENCES missions(id),
  source_type_id          INTEGER REFERENCES source_types(id),
  report_reference        TEXT,
  page_reference          TEXT,
  emission_date           TEXT,
  entity_id               INTEGER REFERENCES entities(id),
  direction_id            INTEGER REFERENCES directions(id),
  process_id              INTEGER REFERENCES processes(id),
  risk_type_id            INTEGER REFERENCES risk_types(id),
  constat                 TEXT,
  root_cause              TEXT,
  potential_consequence   TEXT,
  recommendation_text     TEXT NOT NULL,
  severity_level_id       INTEGER REFERENCES severity_levels(id),
  probability_level_id    INTEGER REFERENCES probability_levels(id),
  criticality_score       REAL,
  criticality_adjusted    REAL,
  priority_label          TEXT,
  owner_id                INTEGER REFERENCES users(id),
  operator_id             INTEGER REFERENCES users(id),
  initial_deadline        TEXT,
  revised_deadline        TEXT,
  actual_close_date       TEXT,
  status_code             TEXT NOT NULL DEFAULT 'draft',
  progress_rate           INTEGER NOT NULL DEFAULT 0,
  entity_comment          TEXT,
  controller_comment      TEXT,
  confidentiality_level_id INTEGER REFERENCES confidentiality_levels(id),
  is_regulatory           INTEGER NOT NULL DEFAULT 0,
  type_code               TEXT NOT NULL DEFAULT 'recommendation', -- recommendation|observation|major_finding
  recurrence_count        INTEGER NOT NULL DEFAULT 0,
  created_by              INTEGER NOT NULL REFERENCES users(id),
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at              TEXT,
  deleted_by              INTEGER REFERENCES users(id)
);

-- ============================================================
-- ACTION PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS action_plans (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  recommendation_id     INTEGER NOT NULL REFERENCES recommendations(id),
  title                 TEXT NOT NULL,
  description           TEXT,
  operator_id           INTEGER REFERENCES users(id),
  contributors          TEXT NOT NULL DEFAULT '[]', -- JSON array of user_ids
  entity_id             INTEGER REFERENCES entities(id),
  planned_start         TEXT,
  planned_end           TEXT,
  actual_end            TEXT,
  priority              INTEGER NOT NULL DEFAULT 2, -- 1=low 2=medium 3=high 4=critical
  status_code           TEXT NOT NULL DEFAULT 'draft',
  progress_rate         INTEGER NOT NULL DEFAULT 0,
  weight                INTEGER NOT NULL DEFAULT 1,
  complexity            TEXT NOT NULL DEFAULT 'medium', -- low|medium|high
  dependencies          TEXT NOT NULL DEFAULT '[]', -- JSON array of action_plan ids
  expected_deliverable  TEXT,
  expected_evidence     TEXT,
  comment               TEXT,
  is_blocked            INTEGER NOT NULL DEFAULT 0,
  block_reason          TEXT,
  created_by            INTEGER NOT NULL REFERENCES users(id),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at            TEXT,
  deleted_by            INTEGER REFERENCES users(id)
);

-- ============================================================
-- EVIDENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS evidences (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  recommendation_id INTEGER NOT NULL REFERENCES recommendations(id),
  action_plan_id    INTEGER REFERENCES action_plans(id),
  evidence_type_id  INTEGER REFERENCES evidence_types(id),
  title             TEXT NOT NULL,
  description       TEXT,
  filename          TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_path         TEXT NOT NULL,
  file_size         INTEGER NOT NULL DEFAULT 0,
  mime_type         TEXT,
  file_hash         TEXT,
  depositor_id      INTEGER NOT NULL REFERENCES users(id),
  deposit_date      TEXT NOT NULL DEFAULT (datetime('now')),
  version           INTEGER NOT NULL DEFAULT 1,
  status_code       TEXT NOT NULL DEFAULT 'deposited',
  validator_id      INTEGER REFERENCES users(id),
  validation_date   TEXT,
  validator_comment TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at        TEXT
);

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL, -- mission|recommendation|action_plan|evidence
  entity_id   INTEGER NOT NULL,
  content     TEXT NOT NULL,
  author_id   INTEGER NOT NULL REFERENCES users(id),
  is_internal INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at  TEXT
);

-- ============================================================
-- DEADLINE EXTENSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS deadline_extensions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type      TEXT NOT NULL, -- recommendation|action_plan
  entity_id        INTEGER NOT NULL,
  current_deadline TEXT NOT NULL,
  requested_deadline TEXT NOT NULL,
  reason           TEXT NOT NULL,
  justification    TEXT,
  impact           TEXT,
  requester_id     INTEGER NOT NULL REFERENCES users(id),
  request_date     TEXT NOT NULL DEFAULT (datetime('now')),
  status_code      TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  validator_id     INTEGER REFERENCES users(id),
  validation_date  TEXT,
  validator_comment TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- STATUS HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS status_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id   INTEGER NOT NULL,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  changed_by  INTEGER NOT NULL REFERENCES users(id),
  change_date TEXT NOT NULL DEFAULT (datetime('now')),
  comment     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id),
  username    TEXT,
  action      TEXT NOT NULL, -- CREATE|READ|UPDATE|DELETE|LOGIN|LOGOUT|EXPORT
  module      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   INTEGER,
  old_value   TEXT, -- JSON
  new_value   TEXT, -- JSON
  ip_address  TEXT,
  user_agent  TEXT,
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  code             TEXT NOT NULL UNIQUE,
  title_template   TEXT NOT NULL,
  message_template TEXT NOT NULL,
  type             TEXT NOT NULL DEFAULT 'info', -- info|warning|error|success
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type_code   TEXT NOT NULL DEFAULT 'info',
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  entity_type TEXT,
  entity_id   INTEGER,
  is_read     INTEGER NOT NULL DEFAULT 0,
  read_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- ATTACHMENTS (generic for entities that don't have evidence)
-- ============================================================
CREATE TABLE IF NOT EXISTS attachments (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type       TEXT NOT NULL,
  entity_id         INTEGER NOT NULL,
  filename          TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_path         TEXT NOT NULL,
  file_size         INTEGER NOT NULL DEFAULT 0,
  mime_type         TEXT,
  uploader_id       INTEGER NOT NULL REFERENCES users(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at        TEXT
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_entity_id ON users(entity_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status_code);
CREATE INDEX IF NOT EXISTS idx_missions_entity ON missions(entity_id);
CREATE INDEX IF NOT EXISTS idx_missions_source ON missions(source_type_id);
CREATE INDEX IF NOT EXISTS idx_missions_deleted ON missions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_missions_created_by ON missions(created_by);

CREATE INDEX IF NOT EXISTS idx_recommendations_mission ON recommendations(mission_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status_code);
CREATE INDEX IF NOT EXISTS idx_recommendations_entity ON recommendations(entity_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_owner ON recommendations(owner_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_operator ON recommendations(operator_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_deleted ON recommendations(deleted_at);
CREATE INDEX IF NOT EXISTS idx_recommendations_deadline ON recommendations(initial_deadline);
CREATE INDEX IF NOT EXISTS idx_recommendations_revised_deadline ON recommendations(revised_deadline);

CREATE INDEX IF NOT EXISTS idx_action_plans_recommendation ON action_plans(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_status ON action_plans(status_code);
CREATE INDEX IF NOT EXISTS idx_action_plans_operator ON action_plans(operator_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_deleted ON action_plans(deleted_at);
CREATE INDEX IF NOT EXISTS idx_action_plans_planned_end ON action_plans(planned_end);

CREATE INDEX IF NOT EXISTS idx_evidences_recommendation ON evidences(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_evidences_action_plan ON evidences(action_plan_id);
CREATE INDEX IF NOT EXISTS idx_evidences_status ON evidences(status_code);
CREATE INDEX IF NOT EXISTS idx_evidences_deleted ON evidences(deleted_at);

CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_status_history_entity ON status_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_deadline_extensions_entity ON deadline_extensions(entity_type, entity_id);

-- ============================================================
-- TRIGGERS
-- ============================================================
-- Auto-update updated_at for missions
CREATE TRIGGER IF NOT EXISTS trg_missions_updated
AFTER UPDATE ON missions
BEGIN
  UPDATE missions SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Auto-update updated_at for recommendations
CREATE TRIGGER IF NOT EXISTS trg_recommendations_updated
AFTER UPDATE ON recommendations
BEGIN
  UPDATE recommendations SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Auto-update updated_at for action_plans
CREATE TRIGGER IF NOT EXISTS trg_action_plans_updated
AFTER UPDATE ON action_plans
BEGIN
  UPDATE action_plans SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Auto-update updated_at for evidences
CREATE TRIGGER IF NOT EXISTS trg_evidences_updated
AFTER UPDATE ON evidences
BEGIN
  UPDATE evidences SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Auto-update updated_at for users
CREATE TRIGGER IF NOT EXISTS trg_users_updated
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
END;
