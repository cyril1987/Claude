-- Add private flag to tasks
ALTER TABLE tasks ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0;
