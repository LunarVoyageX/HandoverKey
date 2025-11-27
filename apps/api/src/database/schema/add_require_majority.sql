-- Add require_majority column to inactivity_settings table
ALTER TABLE inactivity_settings 
ADD COLUMN IF NOT EXISTS require_majority BOOLEAN DEFAULT false;
