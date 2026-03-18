-- Update free plan limits to be more restrictive
-- Previous: 5 patients, 20 sessions, 3 plannings, 5 AI requests
-- New: 3 patients, 15 sessions, 2 plannings, 3 AI requests

UPDATE plan_limits
SET
  max_patients = 3,
  max_sessions_per_month = 15,
  max_plannings = 2,
  max_ai_requests_per_month = 3
WHERE plan = 'free';

