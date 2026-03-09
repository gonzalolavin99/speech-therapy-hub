-- ================================================
-- PORTAL DEL PACIENTE
-- Acceso via token único, sin cuenta de usuario
-- Incluye: citas, progreso, cobros, mensajes
-- ================================================

-- 1. Tokens de acceso al portal
CREATE TABLE IF NOT EXISTS patient_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_portal_tokens_token ON patient_portal_tokens(token) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_portal_tokens_user ON patient_portal_tokens(user_id);

ALTER TABLE patient_portal_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own portal tokens"
  ON patient_portal_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own portal tokens"
  ON patient_portal_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portal tokens"
  ON patient_portal_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own portal tokens"
  ON patient_portal_tokens FOR DELETE USING (auth.uid() = user_id);

-- 2. Cobros del profesional al paciente
CREATE TABLE IF NOT EXISTS portal_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'confirmed', 'cancelled')),
  payment_method TEXT,
  payment_reference TEXT,
  patient_confirmed_at TIMESTAMPTZ,
  professional_confirmed_at TIMESTAMPTZ,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_charges_user ON portal_charges(user_id);
CREATE INDEX IF NOT EXISTS idx_portal_charges_patient ON portal_charges(patient_id);
CREATE INDEX IF NOT EXISTS idx_portal_charges_status ON portal_charges(status);

ALTER TABLE portal_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own portal charges"
  ON portal_charges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own portal charges"
  ON portal_charges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portal charges"
  ON portal_charges FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own portal charges"
  ON portal_charges FOR DELETE USING (auth.uid() = user_id);

-- 3. Mensajes bidireccionales
CREATE TABLE IF NOT EXISTS portal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('patient', 'professional')),
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_messages_user_patient ON portal_messages(user_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_created ON portal_messages(created_at);

ALTER TABLE portal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own portal messages"
  ON portal_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own portal messages"
  ON portal_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portal messages"
  ON portal_messages FOR UPDATE USING (auth.uid() = user_id);

-- 4. Datos bancarios del profesional
CREATE TABLE IF NOT EXISTS professional_bank_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  bank_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  account_number TEXT NOT NULL,
  holder_rut TEXT NOT NULL,
  holder_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE professional_bank_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bank info"
  ON professional_bank_info FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bank info"
  ON professional_bank_info FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bank info"
  ON professional_bank_info FOR UPDATE USING (auth.uid() = user_id);

-- 5. Mensaje de bienvenida en perfil
ALTER TABLE professional_profiles
  ADD COLUMN IF NOT EXISTS portal_welcome_message TEXT;

-- ================================================
-- RPC FUNCTIONS
-- ================================================

-- Generar token del portal (autenticado)
CREATE OR REPLACE FUNCTION generate_portal_token(p_patient_id UUID)
RETURNS JSON AS $$
DECLARE
  new_token TEXT;
  result RECORD;
BEGIN
  -- Verificar que el paciente pertenece al usuario
  IF NOT EXISTS (
    SELECT 1 FROM patients WHERE id = p_patient_id AND user_id = auth.uid()
  ) THEN
    RETURN json_build_object('error', 'Paciente no encontrado');
  END IF;

  new_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO patient_portal_tokens (user_id, patient_id, token, is_active)
  VALUES (auth.uid(), p_patient_id, new_token, TRUE)
  ON CONFLICT (user_id, patient_id) DO UPDATE SET
    token = new_token,
    is_active = TRUE,
    access_count = 0,
    last_accessed_at = NULL,
    updated_at = NOW()
  RETURNING * INTO result;

  RETURN json_build_object('token', result.token);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Obtener datos del portal (anónimo)
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
  SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json) INTO sessions_data
  FROM (
    SELECT s.id, s.type, s.date, s.time, s.duration_minutes, s.status, s.notes
    FROM sessions s
    WHERE s.patient_id = token_rec.patient_id
    AND s.user_id = token_rec.user_id
    AND s.date >= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY s.date ASC, s.time ASC LIMIT 15
  ) s;

  -- Planificaciones activas
  SELECT COALESCE(json_agg(row_to_json(pl)), '[]'::json) INTO plannings_data
  FROM (
    SELECT pl.id, pl.intervention_approach, pl.method,
           pl.total_sessions, pl.completed_sessions, pl.frequency, pl.status
    FROM plannings pl
    WHERE pl.patient_id = token_rec.patient_id
    AND pl.user_id = token_rec.user_id
    AND pl.status IN ('active', 'completed')
    ORDER BY pl.status ASC, pl.created_at DESC LIMIT 5
  ) pl;

  -- Cobros pendientes y pagados
  SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json) INTO charges_data
  FROM (
    SELECT c.id, c.description, c.amount, c.status, c.due_date,
           c.patient_confirmed_at, c.professional_confirmed_at, c.created_at
    FROM portal_charges c
    WHERE c.patient_id = token_rec.patient_id
    AND c.user_id = token_rec.user_id
    AND c.status IN ('pending', 'paid', 'confirmed')
    ORDER BY c.created_at DESC LIMIT 20
  ) c;

  -- Mensajes (últimos 50)
  SELECT COALESCE(json_agg(row_to_json(m)), '[]'::json) INTO messages_data
  FROM (
    SELECT m.id, m.sender_type, m.message, m.read_at, m.created_at
    FROM portal_messages m
    WHERE m.patient_id = token_rec.patient_id
    AND m.user_id = token_rec.user_id
    ORDER BY m.created_at ASC LIMIT 50
  ) m;

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

-- Confirmar pago (anónimo via token)
CREATE OR REPLACE FUNCTION portal_confirm_payment(
  p_token TEXT,
  p_charge_id UUID,
  p_reference TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  token_rec RECORD;
BEGIN
  SELECT * INTO token_rec
  FROM patient_portal_tokens
  WHERE token = p_token AND is_active = TRUE
  AND (expires_at IS NULL OR expires_at > NOW());

  IF token_rec IS NULL THEN
    RETURN json_build_object('error', 'invalid_token');
  END IF;

  -- Verificar que el cobro pertenece al paciente y está pendiente
  IF NOT EXISTS (
    SELECT 1 FROM portal_charges
    WHERE id = p_charge_id
    AND patient_id = token_rec.patient_id
    AND user_id = token_rec.user_id
    AND status = 'pending'
  ) THEN
    RETURN json_build_object('error', 'charge_not_found');
  END IF;

  UPDATE portal_charges
  SET status = 'paid',
      payment_method = 'transferencia',
      payment_reference = p_reference,
      patient_confirmed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_charge_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enviar mensaje (anónimo via token)
CREATE OR REPLACE FUNCTION portal_send_message(
  p_token TEXT,
  p_message TEXT
)
RETURNS JSON AS $$
DECLARE
  token_rec RECORD;
  new_msg RECORD;
BEGIN
  SELECT * INTO token_rec
  FROM patient_portal_tokens
  WHERE token = p_token AND is_active = TRUE
  AND (expires_at IS NULL OR expires_at > NOW());

  IF token_rec IS NULL THEN
    RETURN json_build_object('error', 'invalid_token');
  END IF;

  -- Rate limit: max 10 mensajes por hora
  IF (
    SELECT COUNT(*) FROM portal_messages
    WHERE patient_id = token_rec.patient_id
    AND user_id = token_rec.user_id
    AND sender_type = 'patient'
    AND created_at > NOW() - INTERVAL '1 hour'
  ) >= 10 THEN
    RETURN json_build_object('error', 'rate_limited');
  END IF;

  INSERT INTO portal_messages (user_id, patient_id, sender_type, message)
  VALUES (token_rec.user_id, token_rec.patient_id, 'patient', LEFT(trim(p_message), 2000))
  RETURNING * INTO new_msg;

  RETURN json_build_object('success', true, 'message_id', new_msg.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON TABLE patient_portal_tokens IS 'Tokens de acceso al portal del paciente';
COMMENT ON TABLE portal_charges IS 'Cobros del profesional al paciente via portal';
COMMENT ON TABLE portal_messages IS 'Mensajes entre paciente y profesional via portal';
COMMENT ON TABLE professional_bank_info IS 'Datos bancarios del profesional para transferencias';
COMMENT ON FUNCTION generate_portal_token IS 'Genera o regenera token de acceso al portal del paciente';
COMMENT ON FUNCTION get_portal_data IS 'Retorna datos del portal del paciente (acceso anónimo via token)';
COMMENT ON FUNCTION portal_confirm_payment IS 'Paciente confirma transferencia bancaria';
COMMENT ON FUNCTION portal_send_message IS 'Paciente envía mensaje al profesional';
