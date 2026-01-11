ALTER TABLE handover_processes ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE handover_processes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE handover_processes ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE handover_processes ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
