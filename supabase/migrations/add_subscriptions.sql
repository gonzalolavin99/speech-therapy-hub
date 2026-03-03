-- =====================================================
-- SUBSCRIPTIONS SYSTEM
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Plan limits (configurable by admin)
CREATE TABLE IF NOT EXISTS plan_limits (
  plan TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  max_patients INTEGER NOT NULL DEFAULT -1,          -- -1 = unlimited
  max_sessions_per_month INTEGER NOT NULL DEFAULT -1,
  max_plannings INTEGER NOT NULL DEFAULT -1,
  max_ai_requests_per_month INTEGER NOT NULL DEFAULT -1,
  available_tests TEXT[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  price_monthly INTEGER DEFAULT 0,
  price_yearly INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- 2. Seed plan_limits with initial data
INSERT INTO plan_limits (plan, label, max_patients, max_sessions_per_month, max_plannings, max_ai_requests_per_month, available_tests, features, price_monthly, price_yearly, sort_order)
VALUES
  ('free', 'Free', 5, 20, 3, 5, 
   ARRAY['mbgr', 'tar'], 
   ARRAY['consent'], 
   0, 0, 0),
  ('trial', 'Trial (30 días)', -1, -1, -1, 50, 
   ARRAY['mbgr', 'mmbgr-lactantes', 'tar', 'teprosif', 'reel-3', 'phq-9', 'gad-7', 'psc-17', 'asrs'], 
   ARRAY['consent', 'pdf_export', 'google_calendar', 'boleta_pdf', 'patient_export'], 
   0, 0, 1),
  ('professional', 'Profesional', -1, -1, -1, 50, 
   ARRAY['mbgr', 'mmbgr-lactantes', 'tar', 'teprosif', 'reel-3', 'phq-9', 'gad-7', 'psc-17', 'asrs'], 
   ARRAY['consent', 'pdf_export', 'google_calendar', 'boleta_pdf', 'patient_export'], 
   9990, 89990, 2),
  ('clinic', 'Clínica', -1, -1, -1, -1, 
   ARRAY['mbgr', 'mmbgr-lactantes', 'tar', 'teprosif', 'reel-3', 'phq-9', 'gad-7', 'psc-17', 'asrs'], 
   ARRAY['consent', 'pdf_export', 'google_calendar', 'boleta_pdf', 'patient_export', 'whatsapp', 'custom_branding', 'multi_user'], 
   24990, 229990, 3),
  ('vip', 'VIP', -1, -1, -1, -1, 
   ARRAY['mbgr', 'mmbgr-lactantes', 'tar', 'teprosif', 'reel-3', 'phq-9', 'gad-7', 'psc-17', 'asrs'], 
   ARRAY['consent', 'pdf_export', 'google_calendar', 'boleta_pdf', 'patient_export', 'whatsapp', 'custom_branding', 'multi_user'], 
   0, 0, 4)
ON CONFLICT (plan) DO NOTHING;

-- 3. Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'trial' REFERENCES plan_limits(plan),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'suspended')),
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  payment_provider TEXT,
  payment_provider_subscription_id TEXT,
  admin_override BOOLEAN DEFAULT FALSE,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Usage tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  metric TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  period TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, metric, period)
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period ON usage_tracking(user_id, period);

-- 6. RLS for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can NOT modify their own subscription (only admin or server)
-- Admins can view all subscriptions
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
CREATE POLICY "Admins can view all subscriptions"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update subscriptions" ON subscriptions;
CREATE POLICY "Admins can update subscriptions"
  ON subscriptions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can insert subscriptions" ON subscriptions;
CREATE POLICY "Admins can insert subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    OR auth.uid() = user_id
  );

-- 7. RLS for usage_tracking
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own usage" ON usage_tracking;
CREATE POLICY "Users can view own usage"
  ON usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert own usage" ON usage_tracking;
CREATE POLICY "Users can upsert own usage"
  ON usage_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own usage" ON usage_tracking;
CREATE POLICY "Users can update own usage"
  ON usage_tracking FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all usage" ON usage_tracking;
CREATE POLICY "Admins can view all usage"
  ON usage_tracking FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- 8. RLS for plan_limits (everyone can read, only admin can modify)
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read plan limits" ON plan_limits;
CREATE POLICY "Anyone can read plan limits"
  ON plan_limits FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can modify plan limits" ON plan_limits;
CREATE POLICY "Admins can modify plan limits"
  ON plan_limits FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- 9. Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usage_tracking_updated_at ON usage_tracking;
CREATE TRIGGER update_usage_tracking_updated_at
  BEFORE UPDATE ON usage_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Auto-create trial subscription when a profile is created
CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan, status, trial_ends_at, current_period_start, current_period_end)
  VALUES (
    NEW.user_id,
    'trial',
    'active',
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW() + INTERVAL '30 days'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_create_subscription ON professional_profiles;
CREATE TRIGGER on_profile_created_create_subscription
  AFTER INSERT ON professional_profiles
  FOR EACH ROW EXECUTE FUNCTION create_trial_subscription();

-- 11. RPC: Get subscription with plan limits (for the current user)
CREATE OR REPLACE FUNCTION get_my_subscription()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'subscription', row_to_json(s),
    'limits', row_to_json(pl)
  ) INTO result
  FROM subscriptions s
  JOIN plan_limits pl ON pl.plan = s.plan
  WHERE s.user_id = auth.uid();
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. RPC: Admin update subscription
CREATE OR REPLACE FUNCTION admin_update_subscription(
  target_user_id UUID,
  new_plan TEXT,
  new_status TEXT DEFAULT NULL,
  new_trial_ends_at TIMESTAMPTZ DEFAULT NULL,
  notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Upsert subscription
  INSERT INTO subscriptions (user_id, plan, status, trial_ends_at, admin_override, admin_notes)
  VALUES (
    target_user_id,
    new_plan,
    COALESCE(new_status, 'active'),
    new_trial_ends_at,
    TRUE,
    notes
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = new_plan,
    status = COALESCE(new_status, subscriptions.status),
    trial_ends_at = COALESCE(new_trial_ends_at, subscriptions.trial_ends_at),
    admin_override = TRUE,
    admin_notes = COALESCE(notes, subscriptions.admin_notes),
    current_period_start = NOW(),
    current_period_end = CASE 
      WHEN new_plan = 'trial' THEN COALESCE(new_trial_ends_at, NOW() + INTERVAL '30 days')
      ELSE NOW() + INTERVAL '30 days'
    END;

  SELECT row_to_json(s) INTO result
  FROM subscriptions s
  WHERE s.user_id = target_user_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create subscriptions for existing users who don't have one
INSERT INTO subscriptions (user_id, plan, status, trial_ends_at, current_period_start, current_period_end, admin_override, admin_notes)
SELECT 
  pp.user_id,
  'professional',
  'active',
  NULL,
  NOW(),
  NOW() + INTERVAL '1 year',
  TRUE,
  'Auto-created for existing user at migration time'
FROM professional_profiles pp
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.user_id = pp.user_id
);
