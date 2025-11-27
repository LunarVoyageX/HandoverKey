-- Add missing Dead Man's Switch tables

-- Notification delivery tracking
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  handover_process_id UUID REFERENCES handover_processes(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  method VARCHAR(20) NOT NULL,
  recipient TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  delivered_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Check-in tokens for secure links
CREATE TABLE IF NOT EXISTS checkin_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Successor notifications for handover processes
CREATE TABLE IF NOT EXISTS successor_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_process_id UUID REFERENCES handover_processes(id) ON DELETE CASCADE,
  successor_id UUID REFERENCES successors(id) ON DELETE CASCADE,
  notified_at TIMESTAMP DEFAULT NOW(),
  verification_status VARCHAR(20) DEFAULT 'PENDING',
  verified_at TIMESTAMP,
  response_deadline TIMESTAMP NOT NULL,
  verification_token VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- System status tracking for downtime handling
CREATE TABLE IF NOT EXISTS system_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) NOT NULL DEFAULT 'OPERATIONAL',
  downtime_start TIMESTAMP,
  downtime_end TIMESTAMP,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_id ON notification_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status ON notification_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_handover_process_id ON notification_deliveries(handover_process_id);

CREATE INDEX IF NOT EXISTS idx_checkin_tokens_token_hash ON checkin_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_checkin_tokens_user_id ON checkin_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_successor_notifications_handover_process_id ON successor_notifications(handover_process_id);
CREATE INDEX IF NOT EXISTS idx_successor_notifications_successor_id ON successor_notifications(successor_id);

CREATE INDEX IF NOT EXISTS idx_system_status_status ON system_status(status);
