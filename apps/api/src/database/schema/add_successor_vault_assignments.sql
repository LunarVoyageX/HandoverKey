-- Enable optional per-successor vault entry restrictions
ALTER TABLE successors
ADD COLUMN IF NOT EXISTS restrict_to_assigned_entries BOOLEAN NOT NULL DEFAULT FALSE;

-- Explicit entry assignments for each successor
CREATE TABLE IF NOT EXISTS successor_vault_entries (
  successor_id UUID NOT NULL REFERENCES successors(id) ON DELETE CASCADE,
  vault_entry_id UUID NOT NULL REFERENCES vault_entries(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (successor_id, vault_entry_id)
);

CREATE INDEX IF NOT EXISTS idx_successor_vault_entries_successor
  ON successor_vault_entries(successor_id);

CREATE INDEX IF NOT EXISTS idx_successor_vault_entries_vault_entry
  ON successor_vault_entries(vault_entry_id);
