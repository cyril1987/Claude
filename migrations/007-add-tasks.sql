-- Task Categories
CREATE TABLE IF NOT EXISTS task_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#2a9d8f',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed default categories
INSERT OR IGNORE INTO task_categories (name, color) VALUES
    ('General', '#2a9d8f'),
    ('iSmart Ticket', '#6366f1'),
    ('Action Item', '#f59e0b'),
    ('Recurring', '#8b5cf6'),
    ('Urgent', '#f43f5e');

-- Tasks table (serves as both regular tasks and recurring templates)
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    source TEXT NOT NULL DEFAULT 'manual',
    source_ref TEXT DEFAULT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'todo',
    due_date TEXT DEFAULT NULL,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by INTEGER NOT NULL REFERENCES users(id),
    category_id INTEGER REFERENCES task_categories(id) ON DELETE SET NULL,
    parent_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    is_recurring_template INTEGER NOT NULL DEFAULT 0,
    recurrence_pattern TEXT DEFAULT NULL,
    recurrence_next_at TEXT DEFAULT NULL,
    recurrence_end_at TEXT DEFAULT NULL,
    recurring_template_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_recurring_template ON tasks(is_recurring_template);
CREATE INDEX IF NOT EXISTS idx_tasks_recurring_template_id ON tasks(recurring_template_id);
CREATE INDEX IF NOT EXISTS idx_tasks_source ON tasks(source);

-- Task Comments / Activity Log
CREATE TABLE IF NOT EXISTS task_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);

-- Task notification log
CREATE TABLE IF NOT EXISTS task_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    email TEXT NOT NULL,
    sent_at TEXT NOT NULL DEFAULT (datetime('now')),
    details TEXT
);

CREATE INDEX IF NOT EXISTS idx_task_notifications_task_id ON task_notifications(task_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_type_sent ON task_notifications(task_id, type, sent_at);
