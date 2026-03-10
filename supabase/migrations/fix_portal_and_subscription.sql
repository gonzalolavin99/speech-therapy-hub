-- =====================================================
-- FIX: Portal data RPC + Subscription payment function
-- 1. Fix get_portal_data to use correct session columns
-- 2. Enable pgcrypto for gen_random_bytes in subscription
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Enable pgcrypto extension (needed for gen_random_bytes)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Fix get_portal_data - use actual session column names
CREATE OR REPLACE FUNCTION get_portal_data(p_token TEXT)
RETURNS JSON AS $$
DECLARE
  token_rec RECORD;
  patient_data JSON;
  sessions_data JSON;
  plannings_data JSON;
  charges_data JSON;
  messages_data JSON;
  prof_data JSON;
  bank_data JSON;
BEGIN
  -- Validar token
  SELECT * INTO token_rec
  FROM patient_portal_tokens
  WHERE token = p_token AND is_active = TRUE
  AND (expires_at IS NULL OR expires_at > NOW());

  IF token_rec IS NULL THEN
    RETURN json_build_object('error', 'invalid_token');
  END IF;

  -- Registrar acceso
  UPDATE patient_portal_tokens
  SET last_accessed_at = NOW(), access_count = access_count + 1
  WHERE id = token_rec.id;

  -- Datos del paciente (solo nombre y status)
  SELECT json_build_object('name', p.name, 'status', p.status)
  INTO patient_data
  FROM patients p WHERE p.id = token_rec.patient_id;

  -- Sesiones próximas y recientes (max 15)
  -- Using correct column names: session_type, start_time, end_time, title
  SELECT COALESCE(json_agg(row_to_json(sub)), '[]'::json) INTO sessions_data
  FROM (
    SELECT s.id, s.title, s.session_type, s.start_time, s.end_time, s.status, s.notes
    FROM sessions s
    WHERE s.patient_id = token_rec.patient_id
    AND s.user_id = token_rec.user_id
    AND s.start_time >= (CURRENT_TIMESTAMP - INTERVAL '7 days')
    ORDER BY s.start_time ASC LIMIT 15
  ) sub;

  -- Planificaciones activas
  SELECT COALESCE(json_agg(row_to_json(sub)), '[]'::json) INTO plannings_data
  FROM (
    SELECT pl.id, pl.intervention_approach, pl.method,
           pl.total_sessions, pl.completed_sessions, pl.frequency, pl.status
    FROM plannings pl
    WHERE pl.patient_id = token_rec.patient_id
    AND pl.user_id = token_rec.user_id
    AND pl.status IN ('active', 'completed')
    ORDER BY pl.status ASC, pl.created_at DESC LIMIT 5
  ) sub;

  -- Cobros pendientes y pagados
  SELECT COALESCE(json_agg(row_to_json(sub)), '[]'::json) INTO charges_data
  FROM (
    SELECT c.id, c.description, c.amount, c.status, c.due_date,
           c.patient_confirmed_at, c.professional_confirmed_at, c.created_at
    FROM portal_charges c
    WHERE c.patient_id = token_rec.patient_id
    AND c.user_id = token_rec.user_id
    AND c.status IN ('pending', 'paid', 'confirmed')
    ORDER BY c.created_at DESC LIMIT 20
  ) sub;

  -- Mensajes (últimos 50)
  SELECT COALESCE(json_agg(row_to_json(sub)), '[]'::json) INTO messages_data
  FROM (
    SELECT m.id, m.sender_type, m.message, m.read_at, m.created_at
    FROM portal_messages m
    WHERE m.patient_id = token_rec.patient_id
    AND m.user_id = token_rec.user_id
    ORDER BY m.created_at ASC LIMIT 50
  ) sub;

  -- Info profesional (limitada)
  SELECT json_build_object(
    'full_name', pp.full_name,
    'profession', pp.profession,
    'specialties', pp.specialties,
    'photo_url', pp.photo_url,
    'institution', pp.institution,
    'portal_welcome_message', pp.portal_welcome_message
  ) INTO prof_data
  FROM professional_profiles pp WHERE pp.user_id = token_rec.user_id;

  -- Datos bancarios
  SELECT json_build_object(
    'bank_name', bi.bank_name,
    'account_type', bi.account_type,
    'account_number', bi.account_number,
    'holder_rut', bi.holder_rut,
    'holder_name', bi.holder_name,
    'email', bi.email
  ) INTO bank_data
  FROM professional_bank_info bi WHERE bi.user_id = token_rec.user_id;

  RETURN json_build_object(
    'patient', patient_data,
    'professional', prof_data,
    'sessions', sessions_data,
    'plannings', plannings_data,
    'charges', charges_data,
    'messages', messages_data,
    'bank_info', bank_data
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix create_subscription_payment to use pgcrypto properly
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

  -- Generate unique external reference using pgcrypto
  v_ext_ref := 'thub_sub_' || encode(pgcrypto.gen_random_bytes(12), 'hex');

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

COMMENT ON FUNCTION get_portal_data IS 'Retorna datos del portal del paciente (acceso anónimo via token) - columnas corregidas';
COMMENT ON FUNCTION create_subscription_payment IS 'Crea registro de pago de suscripción con referencia externa única';
