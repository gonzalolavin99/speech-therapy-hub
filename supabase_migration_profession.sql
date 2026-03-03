-- ============================================================
-- Migration: Add profession + approved columns to professional_profiles
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Add profession column (default 'fonoaudiologo' for existing users)
ALTER TABLE professional_profiles
ADD COLUMN IF NOT EXISTS profession TEXT NOT NULL DEFAULT 'fonoaudiologo';

-- Add approved column (default true for existing users so they keep access)
ALTER TABLE professional_profiles
ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT true;

-- For NEW users created after this migration, approved should default to false.
-- We set the column default to true above to not break existing users.
-- The app will explicitly set approved=false when creating new profiles via onboarding.

-- Optional: index for quick filtering
CREATE INDEX IF NOT EXISTS idx_profiles_profession ON professional_profiles(profession);
CREATE INDEX IF NOT EXISTS idx_profiles_approved ON professional_profiles(approved);
