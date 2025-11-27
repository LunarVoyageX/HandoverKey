-- Add salt column to vault_entries table
ALTER TABLE vault_entries ADD COLUMN IF NOT EXISTS salt BYTEA;
