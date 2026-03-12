-- Add 'draft' as a valid status for plannings
-- This allows professionals to save incomplete planifications as drafts

-- Drop and recreate the CHECK constraint to include 'draft'
ALTER TABLE plannings DROP CONSTRAINT IF EXISTS plannings_status_check;
ALTER TABLE plannings ADD CONSTRAINT plannings_status_check
  CHECK (status IN ('active', 'completed', 'paused', 'draft'));
