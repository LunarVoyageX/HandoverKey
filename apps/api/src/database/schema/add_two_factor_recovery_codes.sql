-- Add recovery codes column for two-factor authentication
ALTER TABLE users
ADD COLUMN IF NOT EXISTS two_factor_recovery_codes TEXT[];
