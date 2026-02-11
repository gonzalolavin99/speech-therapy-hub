-- =============================================
-- ADD MMBGR-LACTANTES TO TEST_TYPE CONSTRAINT
-- =============================================

-- Drop the existing constraint
ALTER TABLE test_results DROP CONSTRAINT IF EXISTS test_results_test_type_check;

-- Add the updated constraint with mmbgr-lactantes
ALTER TABLE test_results ADD CONSTRAINT test_results_test_type_check 
  CHECK (test_type IN ('mbgr', 'mmbgr-lactantes', 'tar', 'teprosif'));
