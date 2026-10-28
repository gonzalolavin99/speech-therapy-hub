-- ============================================================
-- Asegurar RPCs internas de pagos
-- ============================================================
-- Estas funciones son SECURITY DEFINER y solo deben llamarlas las
-- Edge Functions (con service_role). En Postgres, EXECUTE se concede a
-- PUBLIC por defecto, así que cualquier cliente con la anon key podía:
--   - leer access tokens de MercadoPago (get_platform_mp_config,
--     get_mp_config_for_charge)
--   - marcar cobros como pagados (process_mp_payment, update_charge_mp_data)
--   - activar suscripciones sin pagar (process_subscription_payment)
--
-- Además, los webhooks ahora rechazan pagos aprobados cuyo monto sea
-- menor al esperado.
--
-- Ejecutar en Supabase SQL Editor. Es idempotente.
-- ============================================================

-- 1. Validar monto en pagos de cobros del portal
CREATE OR REPLACE FUNCTION process_mp_payment(
  p_external_reference TEXT,
  p_mp_payment_id TEXT,
  p_mp_status TEXT,
  p_mp_status_detail TEXT,
  p_mp_payment_type TEXT,
  p_amount NUMERIC,
  p_payer_email TEXT,
  p_raw_data JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  charge_rec RECORD;
BEGIN
  -- Buscar cobro por external_reference
  SELECT * INTO charge_rec FROM portal_charges
  WHERE mp_external_reference = p_external_reference;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Cobro no encontrado para referencia: ' || p_external_reference);
  END IF;

  -- Registrar transacción (siempre, para trazabilidad)
  INSERT INTO mp_transactions (
    user_id, charge_id, mp_payment_id, mp_preference_id,
    mp_status, mp_status_detail, mp_payment_type,
    amount, payer_email, raw_data
  ) VALUES (
    charge_rec.user_id, charge_rec.id, p_mp_payment_id, charge_rec.mp_preference_id,
    p_mp_status, p_mp_status_detail, p_mp_payment_type,
    p_amount, p_payer_email, p_raw_data
  );

  -- Un pago aprobado por menos del monto del cobro no lo confirma
  IF p_mp_status = 'approved' AND COALESCE(p_amount, 0) < charge_rec.amount THEN
    RETURN json_build_object('error', 'amount_mismatch', 'expected', charge_rec.amount, 'received', p_amount);
  END IF;

  -- Actualizar cobro según status
  IF p_mp_status = 'approved' THEN
    UPDATE portal_charges SET
      status = 'confirmed',
      mp_payment_id = p_mp_payment_id,
      mp_status = p_mp_status,
      payment_method = 'mercadopago',
      payment_reference = p_mp_payment_id,
      patient_confirmed_at = NOW(),
      professional_confirmed_at = NOW(),
      updated_at = NOW()
    WHERE id = charge_rec.id;
  ELSIF p_mp_status IN ('pending', 'in_process', 'rejected') THEN
    UPDATE portal_charges SET
      mp_payment_id = p_mp_payment_id,
      mp_status = p_mp_status,
      updated_at = NOW()
    WHERE id = charge_rec.id;
  END IF;

  RETURN json_build_object('success', true, 'status', p_mp_status);
END;
$$;

-- 2. Validar monto en pagos de suscripción
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
  v_status TEXT := p_mp_status;
BEGIN
  SELECT * INTO v_payment
  FROM subscription_payments
  WHERE mp_external_reference = p_external_reference;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'payment_not_found');
  END IF;

  -- Un pago aprobado por menos del monto del plan no activa la suscripción
  IF v_status = 'approved' AND COALESCE(p_amount, 0) < v_payment.amount THEN
    v_status := 'amount_mismatch';
  END IF;

  UPDATE subscription_payments
  SET
    mp_payment_id = p_mp_payment_id,
    mp_status = p_mp_status,
    mp_status_detail = CASE
      WHEN v_status = 'amount_mismatch' THEN 'amount_mismatch: ' || COALESCE(p_amount, 0) || ' < ' || v_payment.amount
      ELSE p_mp_status_detail
    END,
    status = CASE
      WHEN v_status = 'approved' THEN 'approved'
      WHEN v_status IN ('pending', 'in_process', 'authorized') THEN 'in_process'
      WHEN v_status IN ('rejected', 'cancelled', 'amount_mismatch') THEN 'rejected'
      ELSE 'pending'
    END,
    updated_at = NOW()
  WHERE id = v_payment.id;

  IF v_status = 'approved' THEN
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
    'mp_status', v_status
  );
END;
$$;

-- 3. Solo service_role puede ejecutar las RPCs internas (todas las sobrecargas)
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'get_platform_mp_config',
        'get_mp_config_for_charge',
        'process_mp_payment',
        'process_subscription_payment',
        'update_charge_mp_data'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.signature);
  END LOOP;
END;
$$;

-- Verificación: debe devolver solo filas con anon = false y authenticated = false
-- SELECT p.oid::regprocedure,
--        has_function_privilege('anon', p.oid, 'EXECUTE') AS anon,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.proname IN (
--   'get_platform_mp_config', 'get_mp_config_for_charge', 'process_mp_payment',
--   'process_subscription_payment', 'update_charge_mp_data');
