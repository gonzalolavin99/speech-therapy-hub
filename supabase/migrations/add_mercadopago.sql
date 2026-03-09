-- ============================================
-- INTEGRACIÓN MERCADO PAGO
-- ============================================

-- Configuración de MercadoPago por profesional
CREATE TABLE IF NOT EXISTS mercadopago_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  access_token TEXT NOT NULL,          -- Token de acceso de MercadoPago (producción o sandbox)
  public_key TEXT,                      -- Public key para el SDK frontend
  is_sandbox BOOLEAN DEFAULT TRUE,     -- Si está en modo sandbox/prueba
  is_active BOOLEAN DEFAULT TRUE,      -- Si los pagos con MP están habilitados
  webhook_secret TEXT,                  -- Secret para validar webhooks
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mercadopago_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own MP config" ON mercadopago_config
  FOR ALL USING (auth.uid() = user_id);

-- Agregar columnas de MercadoPago a portal_charges
ALTER TABLE portal_charges
  ADD COLUMN IF NOT EXISTS mp_preference_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_status TEXT,
  ADD COLUMN IF NOT EXISTS mp_init_point TEXT,
  ADD COLUMN IF NOT EXISTS mp_external_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_portal_charges_mp_external ON portal_charges(mp_external_reference);
CREATE INDEX IF NOT EXISTS idx_portal_charges_mp_payment ON portal_charges(mp_payment_id);

-- Tabla de transacciones MercadoPago (log detallado)
CREATE TABLE IF NOT EXISTS mp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  charge_id UUID REFERENCES portal_charges(id),
  mp_payment_id TEXT,
  mp_preference_id TEXT,
  mp_status TEXT,                       -- approved, pending, rejected, etc.
  mp_status_detail TEXT,                -- Detalle del status
  mp_payment_type TEXT,                 -- credit_card, debit_card, bank_transfer, etc.
  amount NUMERIC,
  currency TEXT DEFAULT 'CLP',
  payer_email TEXT,
  raw_data JSONB,                       -- Respuesta completa de MP para debugging
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mp_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own MP transactions" ON mp_transactions
  FOR ALL USING (auth.uid() = user_id);

-- RPC: Crear preferencia de MercadoPago (llamada desde Edge Function)
-- Esta función obtiene el access_token del profesional de forma segura
CREATE OR REPLACE FUNCTION get_mp_config_for_charge(p_charge_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  charge_rec RECORD;
  mp_config RECORD;
  patient_rec RECORD;
BEGIN
  -- Obtener el cobro
  SELECT * INTO charge_rec FROM portal_charges WHERE id = p_charge_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Cobro no encontrado');
  END IF;

  -- Obtener config MP del profesional
  SELECT * INTO mp_config FROM mercadopago_config
  WHERE user_id = charge_rec.user_id AND is_active = TRUE;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'MercadoPago no configurado');
  END IF;

  -- Obtener nombre del paciente
  SELECT name INTO patient_rec FROM patients WHERE id = charge_rec.patient_id;

  RETURN json_build_object(
    'access_token', mp_config.access_token,
    'is_sandbox', mp_config.is_sandbox,
    'charge', json_build_object(
      'id', charge_rec.id,
      'description', charge_rec.description,
      'amount', charge_rec.amount,
      'patient_name', patient_rec.name
    )
  );
END;
$$;

-- RPC: Actualizar cobro con datos de MercadoPago
CREATE OR REPLACE FUNCTION update_charge_mp_data(
  p_charge_id UUID,
  p_preference_id TEXT,
  p_init_point TEXT,
  p_external_reference TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE portal_charges SET
    mp_preference_id = p_preference_id,
    mp_init_point = p_init_point,
    mp_external_reference = p_external_reference,
    updated_at = NOW()
  WHERE id = p_charge_id;

  RETURN json_build_object('success', true);
END;
$$;

-- RPC: Procesar notificación de pago MP (llamada desde webhook)
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

  -- Registrar transacción
  INSERT INTO mp_transactions (
    user_id, charge_id, mp_payment_id, mp_preference_id,
    mp_status, mp_status_detail, mp_payment_type,
    amount, payer_email, raw_data
  ) VALUES (
    charge_rec.user_id, charge_rec.id, p_mp_payment_id, charge_rec.mp_preference_id,
    p_mp_status, p_mp_status_detail, p_mp_payment_type,
    p_amount, p_payer_email, p_raw_data
  );

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
  ELSIF p_mp_status = 'pending' OR p_mp_status = 'in_process' THEN
    UPDATE portal_charges SET
      mp_payment_id = p_mp_payment_id,
      mp_status = p_mp_status,
      updated_at = NOW()
    WHERE id = charge_rec.id;
  ELSIF p_mp_status = 'rejected' THEN
    UPDATE portal_charges SET
      mp_payment_id = p_mp_payment_id,
      mp_status = p_mp_status,
      updated_at = NOW()
    WHERE id = charge_rec.id;
  END IF;

  RETURN json_build_object('success', true, 'status', p_mp_status);
END;
$$;

-- RPC: Obtener link de pago MP para el portal del paciente
CREATE OR REPLACE FUNCTION get_mp_payment_link(p_token TEXT, p_charge_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token_rec RECORD;
  charge_rec RECORD;
  mp_config RECORD;
BEGIN
  -- Validar token
  SELECT * INTO token_rec FROM patient_portal_tokens
  WHERE token = p_token AND is_active = TRUE
  AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Token inválido');
  END IF;

  -- Obtener cobro
  SELECT * INTO charge_rec FROM portal_charges
  WHERE id = p_charge_id
  AND patient_id = token_rec.patient_id
  AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Cobro no encontrado o ya pagado');
  END IF;

  -- Verificar si MP está configurado
  SELECT is_active INTO mp_config FROM mercadopago_config
  WHERE user_id = charge_rec.user_id AND is_active = TRUE;

  RETURN json_build_object(
    'mp_enabled', mp_config IS NOT NULL AND mp_config.is_active,
    'mp_init_point', charge_rec.mp_init_point,
    'charge_id', charge_rec.id,
    'amount', charge_rec.amount
  );
END;
$$;

COMMENT ON TABLE mercadopago_config IS 'Configuración de MercadoPago por profesional';
COMMENT ON TABLE mp_transactions IS 'Log de transacciones procesadas por MercadoPago';
