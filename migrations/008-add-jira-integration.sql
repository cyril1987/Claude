-- Add Jira integration columns to tasks
ALTER TABLE tasks ADD COLUMN jira_key TEXT DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN jira_status TEXT DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN jira_summary TEXT DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN jira_assignee TEXT DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN jira_due_date TEXT DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN jira_url TEXT DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN jira_synced_at TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_jira_key ON tasks(jira_key);
