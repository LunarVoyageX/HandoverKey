-- Add deleted_at column to vault_entries table for soft delete support
ALTER TABLE vault_entries 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- Add index for better query performance on non-deleted entries
CREATE INDEX IF NOT EXISTS idx_vault_entries_deleted_at ON vault_entries(deleted_at) WHERE deleted_at IS NULL;
