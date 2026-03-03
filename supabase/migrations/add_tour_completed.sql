-- Add tour_completed column to professional_profiles
ALTER TABLE professional_profiles
ADD COLUMN IF NOT EXISTS tour_completed boolean DEFAULT false;
