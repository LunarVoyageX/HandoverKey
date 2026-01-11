-- Add encrypted_share column to successors table
ALTER TABLE successors ADD COLUMN IF NOT EXISTS encrypted_share TEXT;
