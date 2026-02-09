-- Migration: Add Google Calendar integration
-- Run this in Supabase SQL Editor

-- Add google_calendar_token column to professional_profiles
ALTER TABLE professional_profiles 
ADD COLUMN IF NOT EXISTS google_calendar_token JSONB;

-- Comment for documentation
COMMENT ON COLUMN professional_profiles.google_calendar_token IS 'Stores Google OAuth token for Calendar integration (access_token, expires_at)';
