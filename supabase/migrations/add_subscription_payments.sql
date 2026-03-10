-- =====================================================
-- SUBSCRIPTION PAYMENTS + PLATFORM MP CONFIG
-- Allows users to pay for TherapyHub plans via MercadoPago
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Platform MercadoPago config (TherapyHub's own MP account, managed by admin)
CREATE TABLE IF NOT EXISTS platform_mp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT NOT NULL,
  public_key TEXT,
  is_sandbox BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one row should exist
ALTER TABLE platform_mp_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage platform MP config" ON platform_mp_config;
CREATE POLICY "Admins can manage platform MP config"
  ON platform_mp_config FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- 2. Subscription payments table — tracks each payment for plan subscriptions
CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan TEXT NOT NULL REFERENCES plan_limits(plan),
  billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
  amount INTEGER NOT NULL, -- CLP
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'in_process', 'refunded')),
  mp_preference_id TEXT,
  mp_payment_id TEXT,
  mp_status TEXT,
  mp_status_detail TEXT,
  mp_external_reference TEXT UNIQUE,
  mp_init_point TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_user ON subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_ext_ref ON subscription_payments(mp_external_reference);

ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscription payments" ON subscription_payments;
CREATE POLICY "Users can view own subscription payments"
  ON subscription_payments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all subscription payments" ON subscription_payments;
CREATE POLICY "Admins can view all subscription payments"
  ON subscription_payments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- 3. RPC: Create a subscription payment intent
-- Returns the payment record for creating the MP preference
CREATE OR REPLACE FUNCTION create_subscription_payment(
  p_plan TEXT,
  p_billing_period TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_amount INTEGER;
  v_plan_row plan_limits%ROWTYPE;
  v_payment subscription_payments;
  v_ext_ref TEXT;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'not_authenticated');
  END IF;

  -- Validate plan
  SELECT * INTO v_plan_row FROM plan_limits WHERE plan = p_plan;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'invalid_plan');
  END IF;

  IF p_plan NOT IN ('professional', 'clinic') THEN
    RETURN json_build_object('error', 'only_paid_plans');
  END IF;

  -- Calculate amount
  IF p_billing_period = 'monthly' THEN
    v_amount := v_plan_row.price_monthly;
  ELSIF p_billing_period = 'yearly' THEN
    v_amount := v_plan_row.price_yearly;
  ELSE
    RETURN json_build_object('error', 'invalid_billing_period');
  END IF;

  -- Calculate period
  v_period_start := NOW();
  IF p_billing_period = 'monthly' THEN
    v_period_end := NOW() + INTERVAL '1 month';
  ELSE
    v_period_end := NOW() + INTERVAL '1 year';
  END IF;

  -- Generate unique external reference
  v_ext_ref := 'thub_sub_' || encode(gen_random_bytes(12), 'hex');

  -- Create payment record
  INSERT INTO subscription_payments (
    user_id, plan, billing_period, amount, status,
    mp_external_reference, period_start, period_end
  ) VALUES (
    v_user_id, p_plan, p_billing_period, v_amount, 'pending',
    v_ext_ref, v_period_start, v_period_end
  ) RETURNING * INTO v_payment;

  RETURN json_build_object(
    'id', v_payment.id,
    'plan', v_payment.plan,
    'billing_period', v_payment.billing_period,
    'amount', v_payment.amount,
    'external_reference', v_payment.mp_external_reference,
    'period_start', v_payment.period_start,
    'period_end', v_payment.period_end
  );
END;
$$;

-- 4. RPC: Process subscription payment (called by webhook)
CREATE OR REPLACE FUNCTION process_subscription_payment(
  p_external_reference TEXT,
  p_mp_payment_id TEXT,
  p_mp_status TEXT,
  p_mp_status_detail TEXT DEFAULT '',
  p_amount INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment subscription_payments;
BEGIN
  -- Find the payment by external reference
  SELECT * INTO v_payment
  FROM subscription_payments
  WHERE mp_external_reference = p_external_reference;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'payment_not_found');
  END IF;

  -- Update payment record
  UPDATE subscription_payments
  SET
    mp_payment_id = p_mp_payment_id,
    mp_status = p_mp_status,
    mp_status_detail = p_mp_status_detail,
    status = CASE
      WHEN p_mp_status = 'approved' THEN 'approved'
      WHEN p_mp_status IN ('pending', 'in_process', 'authorized') THEN 'in_process'
      WHEN p_mp_status IN ('rejected', 'cancelled') THEN 'rejected'
      ELSE 'pending'
    END,
    updated_at = NOW()
  WHERE id = v_payment.id;

  -- If approved, update the user's subscription
  IF p_mp_status = 'approved' THEN
    UPDATE subscriptions
    SET
      plan = v_payment.plan,
      status = 'active',
      payment_provider = 'mercadopago',
      payment_provider_subscription_id = p_mp_payment_id,
      current_period_start = v_payment.period_start,
      current_period_end = v_payment.period_end,
      trial_ends_at = NULL,
      admin_override = FALSE,
      admin_notes = NULL,
      updated_at = NOW()
    WHERE user_id = v_payment.user_id;

    -- If no subscription exists, create one
    IF NOT FOUND THEN
      INSERT INTO subscriptions (
        user_id, plan, status, payment_provider,
        payment_provider_subscription_id,
        current_period_start, current_period_end
      ) VALUES (
        v_payment.user_id, v_payment.plan, 'active', 'mercadopago',
        p_mp_payment_id, v_payment.period_start, v_payment.period_end
      );
    END IF;
  END IF;

  RETURN json_build_object(
    'status', 'ok',
    'payment_id', v_payment.id,
    'mp_status', p_mp_status
  );
END;
$$;

-- 5. RPC: Get platform MP config (for edge functions, admin only)
CREATE OR REPLACE FUNCTION get_platform_mp_config()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config platform_mp_config;
BEGIN
  SELECT * INTO v_config FROM platform_mp_config WHERE is_active = TRUE LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'no_config');
  END IF;

  RETURN json_build_object(
    'access_token', v_config.access_token,
    'public_key', v_config.public_key,
    'is_sandbox', v_config.is_sandbox
  );
END;
$$;

-- 6. Updated_at trigger
DROP TRIGGER IF EXISTS update_subscription_payments_updated_at ON subscription_payments;
CREATE TRIGGER update_subscription_payments_updated_at
  BEFORE UPDATE ON subscription_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_platform_mp_config_updated_at ON platform_mp_config;
CREATE TRIGGER update_platform_mp_config_updated_at
  BEFORE UPDATE ON platform_mp_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE subscription_payments IS 'Pagos de suscripción de TherapyHub via MercadoPago';
COMMENT ON TABLE platform_mp_config IS 'Configuración de MercadoPago de la plataforma TherapyHub (administrador)';
