-- Ensure last_activity column exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP;
