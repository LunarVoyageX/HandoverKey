-- Simplified HandoverKey Database Schema
-- This replaces the over-engineered schema with a KISS approach

-- Core user table (already exists, but ensure it has email_verified)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP;

-- Handover settings per user (simplified from inactivity_settings)
CREATE TABLE IF NOT EXISTS handover_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  threshold_days INTEGER DEFAULT 90 CHECK (threshold_days BETWEEN 30 AND 365),
  require_majority BOOLEAN DEFAULT false,
  is_paused BOOLEAN DEFAULT false,
  paused_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Simple activity tracking (replaces complex activity_records)
CREATE TABLE IF NOT EXISTS activity_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  ip_address INET
);

-- Simple handover processes (simplified from complex handover_processes)
CREATE TABLE IF NOT EXISTS handover_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'GRACE_PERIOD',
  initiated_at TIMESTAMP DEFAULT NOW(),
  grace_period_ends TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Essential indexes only
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_activity_records_user_timestamp ON activity_records(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_handover_processes_user_status ON handover_processes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_handover_processes_grace_period ON handover_processes(grace_period_ends) WHERE status = 'GRACE_PERIOD';
CREATE INDEX IF NOT EXISTS idx_handover_settings_paused ON handover_settings(is_paused, paused_until);

-- Simple trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_handover_settings_updated_at 
  BEFORE UPDATE ON handover_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default handover settings for existing users
INSERT INTO handover_settings (user_id, threshold_days, require_majority)
SELECT id, 90, false
FROM users 
WHERE id NOT IN (SELECT user_id FROM handover_settings)
ON CONFLICT (user_id) DO NOTHING;