-- Fix schema mismatch between code and simplified_schema.sql

-- Drop tables that were created with simplified schema but don't match code expectations
DROP TABLE IF EXISTS activity_records;
DROP TABLE IF EXISTS handover_settings;

-- Re-create activity_records with full schema expected by ActivityRepository
CREATE TABLE IF NOT EXISTS activity_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  client_type VARCHAR(20) NOT NULL DEFAULT 'web',
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  signature VARCHAR(128) NOT NULL, -- HMAC for integrity verification
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create inactivity_settings with full schema expected by InactivitySettingsRepository
CREATE TABLE IF NOT EXISTS inactivity_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  threshold_days INTEGER NOT NULL DEFAULT 90 CHECK (threshold_days >= 30 AND threshold_days <= 365),
  notification_methods TEXT[] NOT NULL DEFAULT ARRAY['email'],
  emergency_contacts JSONB DEFAULT '[]'::jsonb,
  is_paused BOOLEAN DEFAULT FALSE,
  pause_reason TEXT,
  paused_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_records_user_id_created_at 
  ON activity_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_records_created_at 
  ON activity_records(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_records_activity_type 
  ON activity_records(activity_type);

CREATE INDEX IF NOT EXISTS idx_inactivity_settings_is_paused 
  ON inactivity_settings(is_paused);
