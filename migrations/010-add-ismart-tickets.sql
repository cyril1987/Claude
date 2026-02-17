-- Separate table for iSmart ticket data
-- Stores full ticket details; linked to tasks via reference_id = tasks.source_ref
CREATE TABLE IF NOT EXISTS ismart_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_id TEXT NOT NULL UNIQUE,
  incident_id TEXT DEFAULT NULL,
  priority TEXT DEFAULT NULL,
  short_description TEXT DEFAULT NULL,
  description TEXT DEFAULT NULL,
  state TEXT DEFAULT NULL,
  internal_state TEXT DEFAULT NULL,
  category TEXT DEFAULT NULL,
  subcategory TEXT DEFAULT NULL,
  subcategory2 TEXT DEFAULT NULL,
  opened_at TEXT DEFAULT NULL,
  updated_at TEXT DEFAULT NULL,
  due_date TEXT DEFAULT NULL,
  opened_by TEXT DEFAULT NULL,
  assigned_to TEXT DEFAULT NULL,
  group_name TEXT DEFAULT NULL,
  business_service TEXT DEFAULT NULL,
  impact TEXT DEFAULT NULL,
  urgency TEXT DEFAULT NULL,
  hold_reason TEXT DEFAULT NULL,
  has_breached TEXT DEFAULT NULL,
  location TEXT DEFAULT NULL,
  channel TEXT DEFAULT NULL,
  program_name TEXT DEFAULT NULL,
  task_id INTEGER DEFAULT NULL REFERENCES tasks(id) ON DELETE SET NULL,
  imported_at TEXT NOT NULL DEFAULT (datetime('now')),
  imported_by INTEGER DEFAULT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ismart_reference_id ON ismart_tickets(reference_id);
CREATE INDEX IF NOT EXISTS idx_ismart_task_id ON ismart_tickets(task_id);
CREATE INDEX IF NOT EXISTS idx_ismart_state ON ismart_tickets(state);
CREATE INDEX IF NOT EXISTS idx_tasks_source_ref ON tasks(source_ref);
