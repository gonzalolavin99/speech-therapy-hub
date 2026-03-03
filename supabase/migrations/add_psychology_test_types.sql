-- =============================================
-- ADD PSYCHOLOGY TEST TYPES TO CONSTRAINT
-- PHQ-9, GAD-7, PSC-17, ASRS, SNAP-IV
-- =============================================

-- Drop the existing constraint
ALTER TABLE test_results DROP CONSTRAINT IF EXISTS test_results_test_type_check;

-- Add the updated constraint with all test types
ALTER TABLE test_results ADD CONSTRAINT test_results_test_type_check 
  CHECK (test_type IN ('mbgr', 'mmbgr-lactantes', 'tar', 'teprosif', 'reel-3', 'phq-9', 'gad-7', 'psc-17', 'asrs', 'snap-iv'));
