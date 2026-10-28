-- ============================================================
-- Ciclo de vida de pagos: estados, idempotencia, eventos,
-- reembolsos, rate limiting y reconciliación
-- ============================================================
-- Requiere: secure_payment_rpcs.sql
-- Ejecutar en Supabase SQL Editor. Es idempotente.
--
-- Separación de responsabilidades:
--   portal_charges / subscription_payments = la orden (qué se cobra)
--   gateway_payments                       = cada pago en MercadoPago y su estado
--   payment_state_transitions              = historial auditable de estados
--   payment_webhook_events                 = eventos recibidos (deduplicación)
--   idempotency_keys                       = resultado de operaciones repetibles
--   payment_refunds                        = cada reembolso con su propia identidad
--   rate_limit_buckets                     = límites de intentos por clave
--
-- Todas las funciones de escritura son SECURITY DEFINER y solo las
-- ejecuta service_role (Edge Functions). La máquina de estados está
-- replicada en supabase/functions/_shared/payments.ts.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tablas
-- ------------------------------------------------------------

ALTER TABLE portal_charges
  ADD COLUMN IF NOT EXISTS mp_preference_created_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS gateway_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  provider_payment_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('portal_charge', 'subscription')),
  external_reference TEXT NOT NULL,
  charge_id UUID REFERENCES portal_charges(id) ON DELETE SET NULL,
  subscription_payment_id UUID REFERENCES subscription_payments(id) ON DELETE SET NULL,
  owner_user_id UUID NOT NULL,
  state TEXT NOT NULL CHECK (state IN (
    'pending', 'processing', 'requires_action', 'under_review', 'succeeded',
    'failed', 'cancelled', 'disputed', 'refunded', 'partially_refunded',
    'charged_back', 'unknown'
  )),
  provider_status TEXT,
  provider_status_detail TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  expected_amount NUMERIC NOT NULL,
  refunded_amount NUMERIC NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  review_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_payment_id)
);

CREATE INDEX IF NOT EXISTS idx_gateway_payments_charge ON gateway_payments(charge_id);
CREATE INDEX IF NOT EXISTS idx_gateway_payments_sub ON gateway_payments(subscription_payment_id);
CREATE INDEX IF NOT EXISTS idx_gateway_payments_owner ON gateway_payments(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_gateway_payments_state ON gateway_payments(state, updated_at);

CREATE TABLE IF NOT EXISTS payment_state_transitions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  gateway_payment_id UUID NOT NULL REFERENCES gateway_payments(id) ON DELETE CASCADE,
  from_state TEXT,
  to_state TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('webhook', 'reconcile', 'refund', 'manual')),
  provider_status TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transitions_payment ON payment_state_transitions(gateway_payment_id, created_at);

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  endpoint TEXT NOT NULL,
  request_id TEXT NOT NULL,
  topic TEXT,
  resource_id TEXT,
  signature_valid BOOLEAN,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'ignored', 'failed')),
  result JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE (provider, endpoint, request_id)
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
  response JSONB,
  http_status INTEGER,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  PRIMARY KEY (scope, key)
);

CREATE TABLE IF NOT EXISTS payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_payment_id UUID NOT NULL REFERENCES gateway_payments(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL UNIQUE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  provider_refund_id TEXT UNIQUE,
  requested_by UUID NOT NULL,
  reason TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment ON payment_refunds(gateway_payment_id);

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

-- RLS: el profesional ve sus pagos, transiciones y reembolsos; el resto solo service_role
ALTER TABLE gateway_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners view own gateway payments" ON gateway_payments;
CREATE POLICY "Owners view own gateway payments" ON gateway_payments
  FOR SELECT USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Owners view own payment transitions" ON payment_state_transitions;
CREATE POLICY "Owners view own payment transitions" ON payment_state_transitions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM gateway_payments gp
    WHERE gp.id = gateway_payment_id AND gp.owner_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Owners view own refunds" ON payment_refunds;
CREATE POLICY "Owners view own refunds" ON payment_refunds
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM gateway_payments gp
    WHERE gp.id = gateway_payment_id AND gp.owner_user_id = auth.uid()
  ));

-- ------------------------------------------------------------
-- 2. Máquina de estados
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION map_mp_status(p_status TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_status
    WHEN 'approved' THEN 'succeeded'
    WHEN 'authorized' THEN 'processing'
    WHEN 'pending' THEN 'pending'
    WHEN 'in_process' THEN 'processing'
    WHEN 'in_mediation' THEN 'disputed'
    WHEN 'rejected' THEN 'failed'
    WHEN 'cancelled' THEN 'cancelled'
    WHEN 'refunded' THEN 'refunded'
    WHEN 'charged_back' THEN 'charged_back'
    ELSE 'unknown'
  END;
$$;

CREATE OR REPLACE FUNCTION payment_transition_allowed(p_from TEXT, p_to TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_from IS NULL THEN TRUE
    WHEN p_from = p_to THEN TRUE
    WHEN p_from IN ('pending', 'processing', 'requires_action', 'unknown') THEN TRUE
    WHEN p_from = 'under_review' THEN p_to IN ('succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded', 'charged_back')
    WHEN p_from = 'succeeded' THEN p_to IN ('disputed', 'refunded', 'partially_refunded', 'charged_back')
    WHEN p_from = 'partially_refunded' THEN p_to IN ('refunded', 'disputed', 'charged_back')
    WHEN p_from = 'disputed' THEN p_to IN ('succeeded', 'refunded', 'partially_refunded', 'charged_back')
    ELSE FALSE -- failed, cancelled, refunded, charged_back son terminales
  END;
$$;

-- ------------------------------------------------------------
-- 3. Aplicar un pago verificado contra MercadoPago
-- ------------------------------------------------------------
-- Lo llaman los webhooks y la reconciliación DESPUÉS de consultar el
-- pago en la API de MercadoPago (nunca con datos del webhook).
-- Bloquea la orden con FOR UPDATE para serializar webhooks concurrentes.

CREATE OR REPLACE FUNCTION apply_gateway_payment(
  p_external_reference TEXT,
  p_provider_payment_id TEXT,
  p_provider_status TEXT,
  p_provider_status_detail TEXT,
  p_amount NUMERIC,
  p_currency TEXT,
  p_refunded_amount NUMERIC,
  p_source TEXT,
  p_expected_owner UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind TEXT;
  v_charge portal_charges%ROWTYPE;
  v_sub subscription_payments%ROWTYPE;
  v_owner UUID;
  v_expected NUMERIC;
  v_existing gateway_payments%ROWTYPE;
  v_from TEXT;
  v_to TEXT;
  v_review_reason TEXT;
  v_payment_id UUID;
  v_fulfillment TEXT := 'none';
  v_current subscriptions%ROWTYPE;
BEGIN
  -- Identificar la orden por la referencia (la generó el backend)
  IF p_external_reference LIKE 'thub\_sub\_%' THEN
    v_kind := 'subscription';
    SELECT * INTO v_sub FROM subscription_payments
      WHERE mp_external_reference = p_external_reference FOR UPDATE;
    IF NOT FOUND THEN
      RETURN json_build_object('status', 'error', 'error', 'order_not_found');
    END IF;
    v_owner := v_sub.user_id;
    v_expected := v_sub.amount;
  ELSIF p_external_reference LIKE 'thub\_%' THEN
    v_kind := 'portal_charge';
    SELECT * INTO v_charge FROM portal_charges
      WHERE mp_external_reference = p_external_reference FOR UPDATE;
    IF NOT FOUND THEN
      RETURN json_build_object('status', 'error', 'error', 'order_not_found');
    END IF;
    v_owner := v_charge.user_id;
    v_expected := v_charge.amount;
  ELSE
    RETURN json_build_object('status', 'error', 'error', 'unknown_reference');
  END IF;

  -- El webhook de cobros sabe de qué profesional es el token usado
  IF p_expected_owner IS NOT NULL AND p_expected_owner <> v_owner THEN
    RETURN json_build_object('status', 'error', 'error', 'owner_mismatch');
  END IF;

  -- Estado objetivo según MercadoPago
  v_to := map_mp_status(p_provider_status);
  IF v_to = 'succeeded' AND COALESCE(p_refunded_amount, 0) > 0 THEN
    v_to := CASE WHEN p_refunded_amount >= p_amount THEN 'refunded' ELSE 'partially_refunded' END;
  END IF;

  SELECT * INTO v_existing FROM gateway_payments
    WHERE provider = 'mercadopago' AND provider_payment_id = p_provider_payment_id
    FOR UPDATE;
  v_from := CASE WHEN FOUND THEN v_existing.state ELSE NULL END;

  -- Monto y moneda: un pago aprobado que no cuadra queda en revisión
  IF v_to = 'succeeded' AND (v_from IS NULL OR v_from NOT IN ('succeeded', 'partially_refunded', 'disputed')) THEN
    IF COALESCE(p_currency, '') <> 'CLP' THEN
      v_to := 'under_review';
      v_review_reason := 'currency_mismatch: ' || COALESCE(p_currency, 'null');
    ELSIF COALESCE(p_amount, 0) < v_expected THEN
      v_to := 'under_review';
      v_review_reason := 'amount_mismatch: ' || COALESCE(p_amount, 0) || ' < ' || v_expected;
    END IF;
  END IF;

  -- Eventos fuera de orden: nunca retroceder (p.ej. pending después de succeeded)
  IF NOT payment_transition_allowed(v_from, v_to) THEN
    RETURN json_build_object('status', 'ignored', 'reason', 'invalid_transition', 'from', v_from, 'to', v_to);
  END IF;

  IF v_from IS NULL THEN
    INSERT INTO gateway_payments (
      provider_payment_id, kind, external_reference, charge_id, subscription_payment_id,
      owner_user_id, state, provider_status, provider_status_detail,
      amount, currency, expected_amount, refunded_amount, review_reason
    ) VALUES (
      p_provider_payment_id, v_kind, p_external_reference,
      CASE WHEN v_kind = 'portal_charge' THEN v_charge.id END,
      CASE WHEN v_kind = 'subscription' THEN v_sub.id END,
      v_owner, v_to, p_provider_status, p_provider_status_detail,
      COALESCE(p_amount, 0), COALESCE(p_currency, ''), v_expected,
      COALESCE(p_refunded_amount, 0), v_review_reason
    ) RETURNING id INTO v_payment_id;
  ELSE
    v_payment_id := v_existing.id;
    IF v_from = v_to
       AND v_existing.provider_status IS NOT DISTINCT FROM p_provider_status
       AND v_existing.refunded_amount = COALESCE(p_refunded_amount, 0) THEN
      RETURN json_build_object('status', 'noop', 'state', v_to, 'payment_id', v_payment_id);
    END IF;
    UPDATE gateway_payments SET
      state = v_to,
      provider_status = p_provider_status,
      provider_status_detail = p_provider_status_detail,
      refunded_amount = GREATEST(refunded_amount, COALESCE(p_refunded_amount, 0)),
      review_reason = COALESCE(v_review_reason, review_reason),
      updated_at = NOW()
    WHERE id = v_payment_id;
  END IF;

  IF v_from IS DISTINCT FROM v_to THEN
    INSERT INTO payment_state_transitions (gateway_payment_id, from_state, to_state, source, provider_status, note)
    VALUES (v_payment_id, v_from, v_to, p_source, p_provider_status, v_review_reason);
  END IF;

  -- Entrega idempotente: solo la primera vez que un pago llega a succeeded
  IF v_to = 'succeeded' AND v_from IS DISTINCT FROM 'succeeded' AND v_from IS DISTINCT FROM 'disputed' THEN
    IF v_kind = 'portal_charge' THEN
      UPDATE portal_charges SET
        status = 'confirmed',
        mp_payment_id = p_provider_payment_id,
        mp_status = p_provider_status,
        payment_method = 'mercadopago',
        payment_reference = p_provider_payment_id,
        patient_confirmed_at = COALESCE(patient_confirmed_at, NOW()),
        professional_confirmed_at = COALESCE(professional_confirmed_at, NOW()),
        updated_at = NOW()
      WHERE id = v_charge.id AND status IN ('pending', 'paid');
      -- Si el cobro ya estaba confirmado por otro pago, es un pago duplicado (alerta)
      v_fulfillment := CASE WHEN FOUND THEN 'charge_confirmed' ELSE 'duplicate_payment' END;
    ELSE
      IF v_sub.status <> 'approved' THEN
        UPDATE subscription_payments SET
          mp_payment_id = p_provider_payment_id,
          mp_status = p_provider_status,
          mp_status_detail = p_provider_status_detail,
          status = 'approved',
          updated_at = NOW()
        WHERE id = v_sub.id;

        -- Un plan VIP o asignado por un admin no se reemplaza con un plan pagado:
        -- el pago queda registrado y se alerta para reembolsarlo
        SELECT * INTO v_current FROM subscriptions WHERE user_id = v_sub.user_id FOR UPDATE;
        IF FOUND AND v_current.status = 'active' AND (v_current.admin_override OR v_current.plan = 'vip') THEN
          UPDATE gateway_payments SET review_reason = 'kept_existing_plan: ' || v_current.plan
          WHERE id = v_payment_id;
          RETURN json_build_object(
            'status', 'applied', 'payment_id', v_payment_id, 'from', v_from, 'to', v_to,
            'fulfillment', 'kept_existing_plan', 'review_reason', 'kept_existing_plan: ' || v_current.plan
          );
        END IF;

        UPDATE subscriptions SET
          plan = v_sub.plan,
          status = 'active',
          payment_provider = 'mercadopago',
          payment_provider_subscription_id = p_provider_payment_id,
          current_period_start = v_sub.period_start,
          current_period_end = v_sub.period_end,
          trial_ends_at = NULL,
          admin_override = FALSE,
          admin_notes = NULL,
          updated_at = NOW()
        WHERE user_id = v_sub.user_id;

        IF NOT FOUND THEN
          INSERT INTO subscriptions (
            user_id, plan, status, payment_provider, payment_provider_subscription_id,
            current_period_start, current_period_end
          ) VALUES (
            v_sub.user_id, v_sub.plan, 'active', 'mercadopago', p_provider_payment_id,
            v_sub.period_start, v_sub.period_end
          );
        END IF;
        v_fulfillment := 'subscription_activated';
      ELSE
        v_fulfillment := 'duplicate_payment';
      END IF;
    END IF;
  ELSIF v_kind = 'portal_charge' THEN
    -- Reflejar el último estado del proveedor sin reescribir la historia de la orden
    UPDATE portal_charges SET mp_status = p_provider_status, updated_at = NOW()
    WHERE id = v_charge.id;
  ELSIF v_kind = 'subscription' THEN
    UPDATE subscription_payments SET
      mp_payment_id = p_provider_payment_id,
      mp_status = p_provider_status,
      mp_status_detail = COALESCE(v_review_reason, p_provider_status_detail),
      status = CASE
        WHEN status = 'approved' AND v_to IN ('refunded', 'charged_back') THEN 'refunded'
        WHEN status = 'approved' THEN status
        WHEN v_to IN ('pending', 'processing', 'requires_action', 'unknown') THEN 'in_process'
        WHEN v_to IN ('failed', 'under_review') THEN 'rejected'
        WHEN v_to = 'cancelled' THEN 'cancelled'
        ELSE status
      END,
      updated_at = NOW()
    WHERE id = v_sub.id;
  END IF;

  RETURN json_build_object(
    'status', 'applied',
    'payment_id', v_payment_id,
    'from', v_from,
    'to', v_to,
    'fulfillment', v_fulfillment,
    'review_reason', v_review_reason
  );
END;
$$;

-- ------------------------------------------------------------
-- 4. Idempotencia de operaciones de la API
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION reserve_idempotency_key(
  p_scope TEXT,
  p_key TEXT,
  p_request_hash TEXT,
  p_lock_timeout_seconds INTEGER DEFAULT 60
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row idempotency_keys%ROWTYPE;
BEGIN
  INSERT INTO idempotency_keys (scope, key, request_hash, status)
  VALUES (p_scope, p_key, p_request_hash, 'in_progress')
  ON CONFLICT (scope, key) DO NOTHING;

  IF FOUND THEN
    RETURN json_build_object('status', 'reserved');
  END IF;

  SELECT * INTO v_row FROM idempotency_keys
    WHERE scope = p_scope AND key = p_key FOR UPDATE;

  -- Clave vencida: se puede reutilizar como operación nueva
  IF v_row.expires_at < NOW() THEN
    UPDATE idempotency_keys SET
      request_hash = p_request_hash, status = 'in_progress', response = NULL,
      http_status = NULL, locked_at = NOW(), created_at = NOW(),
      expires_at = NOW() + INTERVAL '24 hours'
    WHERE scope = p_scope AND key = p_key;
    RETURN json_build_object('status', 'reserved');
  END IF;

  -- Misma clave con otro contenido: no se procesa en silencio
  IF v_row.request_hash <> p_request_hash THEN
    RETURN json_build_object('status', 'mismatch');
  END IF;

  IF v_row.status = 'completed' THEN
    RETURN json_build_object('status', 'replay', 'response', v_row.response, 'http_status', v_row.http_status);
  END IF;

  -- Falló antes o quedó abandonada (proceso caído): se puede reintentar
  IF v_row.status = 'failed' OR v_row.locked_at < NOW() - make_interval(secs => p_lock_timeout_seconds) THEN
    UPDATE idempotency_keys SET status = 'in_progress', locked_at = NOW()
    WHERE scope = p_scope AND key = p_key;
    RETURN json_build_object('status', 'reserved');
  END IF;

  RETURN json_build_object('status', 'in_progress');
END;
$$;

CREATE OR REPLACE FUNCTION complete_idempotency_key(
  p_scope TEXT,
  p_key TEXT,
  p_status TEXT,
  p_response JSONB,
  p_http_status INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('completed', 'failed') THEN
    RAISE EXCEPTION 'invalid idempotency status: %', p_status;
  END IF;
  UPDATE idempotency_keys SET
    status = p_status, response = p_response, http_status = p_http_status
  WHERE scope = p_scope AND key = p_key;
END;
$$;

-- ------------------------------------------------------------
-- 5. Rate limiting (ventana fija)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_max INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  v_window := to_timestamp(floor(extract(epoch FROM NOW()) / p_window_seconds) * p_window_seconds);

  INSERT INTO rate_limit_buckets (key, window_start, count)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limit_buckets.count + 1
  RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

-- ------------------------------------------------------------
-- 6. Reembolsos
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_refund_request(
  p_gateway_payment_id UUID,
  p_amount NUMERIC,
  p_idempotency_key TEXT,
  p_requested_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment gateway_payments%ROWTYPE;
  v_existing payment_refunds%ROWTYPE;
  v_committed NUMERIC;
  v_amount NUMERIC;
  v_refund_id UUID;
BEGIN
  -- Bloquear el pago: dos reembolsos simultáneos se serializan aquí
  SELECT * INTO v_payment FROM gateway_payments WHERE id = p_gateway_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('status', 'error', 'error', 'payment_not_found');
  END IF;

  IF v_payment.owner_user_id <> p_requested_by THEN
    RETURN json_build_object('status', 'error', 'error', 'forbidden');
  END IF;

  -- Reintento con la misma clave: devolver el reembolso existente
  SELECT * INTO v_existing FROM payment_refunds WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.gateway_payment_id <> p_gateway_payment_id
       OR (p_amount IS NOT NULL AND v_existing.amount <> p_amount) THEN
      RETURN json_build_object('status', 'error', 'error', 'idempotency_mismatch');
    END IF;
    RETURN json_build_object(
      'status', 'replay', 'refund_id', v_existing.id, 'refund_status', v_existing.status,
      'amount', v_existing.amount, 'provider_payment_id', v_payment.provider_payment_id
    );
  END IF;

  IF v_payment.state NOT IN ('succeeded', 'partially_refunded') THEN
    RETURN json_build_object('status', 'error', 'error', 'not_refundable', 'state', v_payment.state);
  END IF;

  -- Lo ya reembolsado o en curso cuenta contra el máximo
  SELECT COALESCE(SUM(amount), 0) INTO v_committed
  FROM payment_refunds
  WHERE gateway_payment_id = p_gateway_payment_id AND status IN ('pending', 'succeeded');

  v_amount := COALESCE(p_amount, v_payment.amount - v_committed);

  IF v_amount <= 0 OR v_committed + v_amount > v_payment.amount THEN
    RETURN json_build_object(
      'status', 'error', 'error', 'exceeds_refundable',
      'refundable', GREATEST(v_payment.amount - v_committed, 0)
    );
  END IF;

  INSERT INTO payment_refunds (gateway_payment_id, idempotency_key, amount, requested_by, reason)
  VALUES (p_gateway_payment_id, p_idempotency_key, v_amount, p_requested_by, p_reason)
  RETURNING id INTO v_refund_id;

  RETURN json_build_object(
    'status', 'created', 'refund_id', v_refund_id, 'amount', v_amount,
    'is_full', v_committed + v_amount = v_payment.amount,
    'provider_payment_id', v_payment.provider_payment_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION complete_refund(
  p_refund_id UUID,
  p_status TEXT,
  p_provider_refund_id TEXT DEFAULT NULL,
  p_failure_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_refund payment_refunds%ROWTYPE;
  v_payment gateway_payments%ROWTYPE;
  v_refunded NUMERIC;
  v_to TEXT;
BEGIN
  IF p_status NOT IN ('succeeded', 'failed') THEN
    RETURN json_build_object('status', 'error', 'error', 'invalid_status');
  END IF;

  SELECT * INTO v_refund FROM payment_refunds WHERE id = p_refund_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('status', 'error', 'error', 'refund_not_found');
  END IF;

  -- Ya resuelto: idempotente
  IF v_refund.status <> 'pending' THEN
    RETURN json_build_object('status', 'noop', 'refund_status', v_refund.status);
  END IF;

  UPDATE payment_refunds SET
    status = p_status,
    provider_refund_id = COALESCE(p_provider_refund_id, provider_refund_id),
    failure_reason = p_failure_reason,
    updated_at = NOW()
  WHERE id = p_refund_id;

  IF p_status = 'failed' THEN
    RETURN json_build_object('status', 'failed');
  END IF;

  SELECT * INTO v_payment FROM gateway_payments WHERE id = v_refund.gateway_payment_id FOR UPDATE;

  SELECT COALESCE(SUM(amount), 0) INTO v_refunded
  FROM payment_refunds
  WHERE gateway_payment_id = v_payment.id AND status = 'succeeded';

  v_to := CASE WHEN v_refunded >= v_payment.amount THEN 'refunded' ELSE 'partially_refunded' END;

  UPDATE gateway_payments SET
    refunded_amount = GREATEST(refunded_amount, v_refunded),
    state = CASE WHEN payment_transition_allowed(state, v_to) THEN v_to ELSE state END,
    updated_at = NOW()
  WHERE id = v_payment.id;

  IF v_payment.state IS DISTINCT FROM v_to AND payment_transition_allowed(v_payment.state, v_to) THEN
    INSERT INTO payment_state_transitions (gateway_payment_id, from_state, to_state, source, note)
    VALUES (v_payment.id, v_payment.state, v_to, 'refund', 'refund ' || p_refund_id);
  END IF;

  IF v_to = 'refunded' AND v_payment.kind = 'subscription' THEN
    UPDATE subscription_payments SET status = 'refunded', updated_at = NOW()
    WHERE id = v_payment.subscription_payment_id;
  END IF;

  RETURN json_build_object('status', 'succeeded', 'payment_state', v_to, 'refunded_amount', v_refunded);
END;
$$;

-- ------------------------------------------------------------
-- 7. Reconciliación y alertas
-- ------------------------------------------------------------

-- Órdenes con pago iniciado que no han llegado a un estado final
CREATE OR REPLACE FUNCTION payments_needing_reconciliation(p_older_than_minutes INTEGER DEFAULT 15)
RETURNS TABLE (kind TEXT, external_reference TEXT, owner_user_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'portal_charge', c.mp_external_reference, c.user_id
  FROM portal_charges c
  WHERE c.mp_external_reference IS NOT NULL
    AND c.status IN ('pending', 'paid')
    AND COALESCE(c.mp_preference_created_at, c.updated_at) < NOW() - make_interval(mins => p_older_than_minutes)
    AND COALESCE(c.mp_preference_created_at, c.updated_at) > NOW() - INTERVAL '30 days'
  UNION
  SELECT 'subscription', s.mp_external_reference, s.user_id
  FROM subscription_payments s
  WHERE s.mp_external_reference IS NOT NULL
    AND s.mp_preference_id IS NOT NULL
    AND s.status IN ('pending', 'in_process')
    AND s.created_at < NOW() - make_interval(mins => p_older_than_minutes)
    AND s.created_at > NOW() - INTERVAL '30 days'
  UNION
  SELECT gp.kind, gp.external_reference, gp.owner_user_id
  FROM gateway_payments gp
  WHERE gp.state IN ('pending', 'processing', 'requires_action', 'unknown', 'disputed')
    AND gp.updated_at < NOW() - make_interval(mins => p_older_than_minutes);
$$;

CREATE OR REPLACE FUNCTION pending_refunds_for_reconciliation(p_older_than_minutes INTEGER DEFAULT 5)
RETURNS TABLE (refund_id UUID, amount NUMERIC, provider_payment_id TEXT, owner_user_id UUID, kind TEXT, idempotency_key TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.amount, gp.provider_payment_id, gp.owner_user_id, gp.kind, r.idempotency_key
  FROM payment_refunds r
  JOIN gateway_payments gp ON gp.id = r.gateway_payment_id
  WHERE r.status = 'pending'
    AND r.created_at < NOW() - make_interval(mins => p_older_than_minutes);
$$;

-- Discrepancias que requieren a una persona (para el panel de admin)
CREATE OR REPLACE FUNCTION get_payment_alerts()
RETURNS TABLE (alert TEXT, gateway_payment_id UUID, external_reference TEXT, state TEXT, detail TEXT, since TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt() ->> 'email') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT 'stuck_payment'::TEXT, gp.id, gp.external_reference, gp.state,
         'Sin estado final hace más de 24 h'::TEXT, gp.updated_at
  FROM gateway_payments gp
  WHERE gp.state IN ('pending', 'processing', 'requires_action', 'unknown')
    AND gp.updated_at < NOW() - INTERVAL '24 hours'
  UNION ALL
  SELECT 'under_review', gp.id, gp.external_reference, gp.state, gp.review_reason, gp.updated_at
  FROM gateway_payments gp WHERE gp.state = 'under_review'
  UNION ALL
  SELECT 'dispute', gp.id, gp.external_reference, gp.state, gp.provider_status_detail, gp.updated_at
  FROM gateway_payments gp WHERE gp.state IN ('disputed', 'charged_back')
  UNION ALL
  SELECT 'duplicate_payment', gp.id, gp.external_reference, gp.state,
         'La orden tiene más de un pago exitoso: reembolsar el sobrante'::TEXT, gp.updated_at
  FROM gateway_payments gp
  WHERE gp.state IN ('succeeded', 'partially_refunded')
    AND gp.external_reference IN (
      SELECT g2.external_reference FROM gateway_payments g2
      WHERE g2.state IN ('succeeded', 'partially_refunded')
      GROUP BY g2.external_reference HAVING COUNT(*) > 1
    )
  UNION ALL
  SELECT 'kept_existing_plan', gp.id, gp.external_reference, gp.state,
         'Pagó un plan teniendo uno VIP/asignado por admin: reembolsar'::TEXT, gp.updated_at
  FROM gateway_payments gp WHERE gp.review_reason LIKE 'kept_existing_plan%'
  UNION ALL
  SELECT 'stuck_refund', r.gateway_payment_id, gp.external_reference, r.status,
         'Reembolso pendiente hace más de 1 h'::TEXT, r.created_at
  FROM payment_refunds r JOIN gateway_payments gp ON gp.id = r.gateway_payment_id
  WHERE r.status = 'pending' AND r.created_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- Limpieza de datos efímeros (la llama la reconciliación)
CREATE OR REPLACE FUNCTION purge_payment_ephemera()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM idempotency_keys WHERE expires_at < NOW() - INTERVAL '1 day';
  DELETE FROM rate_limit_buckets WHERE window_start < NOW() - INTERVAL '1 day';
$$;

-- ------------------------------------------------------------
-- 8. Permisos: solo service_role (admin para alertas)
-- ------------------------------------------------------------
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'apply_gateway_payment', 'reserve_idempotency_key', 'complete_idempotency_key',
        'check_rate_limit', 'create_refund_request', 'complete_refund',
        'payments_needing_reconciliation', 'pending_refunds_for_reconciliation',
        'purge_payment_ephemera', 'get_payment_alerts'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.signature);
    IF fn.proname = 'get_payment_alerts' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.signature);
    END IF;
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- 9. Programar la reconciliación cada 15 minutos (aplicado en producción)
-- ------------------------------------------------------------
-- Requiere pg_cron y pg_net. El secreto compartido se guarda en Supabase Vault
-- (nombre 'payments_cron_secret', mismo valor que el secreto CRON_SECRET de las
-- Edge Functions) y el job lo lee en cada ejecución: no queda escrito en cron.job.
--
-- SELECT vault.create_secret('<CRON_SECRET>', 'payments_cron_secret');
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule(
--   'payments-reconcile',
--   '*/15 * * * *',
--   $job$
--   SELECT net.http_post(
--     url := 'https://<project-ref>.supabase.co/functions/v1/payments-reconcile',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'payments_cron_secret')
--     ),
--     body := '{}'::jsonb,
--     timeout_milliseconds := 30000
--   );
--   $job$
-- );
--
-- Verificar: SELECT jobname, schedule, active FROM cron.job;
--            SELECT status_code, content FROM net._http_response ORDER BY created DESC LIMIT 5;
