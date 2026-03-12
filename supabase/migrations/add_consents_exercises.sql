-- ============================================
-- CONSENTIMIENTO INFORMADO DIGITAL
-- ============================================

-- Plantillas de consentimiento del profesional
CREATE TABLE IF NOT EXISTS consent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,             -- Texto del consentimiento (puede incluir HTML básico)
  profession TEXT NOT NULL DEFAULT 'fonoaudiologo',
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,  -- Si se aplica automáticamente a nuevos pacientes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE consent_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own consent templates" ON consent_templates
  FOR ALL USING (auth.uid() = user_id);

-- Registros de consentimiento firmado
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  patient_id UUID REFERENCES patients(id) NOT NULL,
  template_id UUID REFERENCES consent_templates(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,              -- Snapshot del contenido al momento de firma
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, signed, revoked
  signed_at TIMESTAMPTZ,
  signature_data TEXT,                -- Base64 de firma digital (canvas)
  signer_name TEXT,                   -- Nombre de quien firma
  signer_rut TEXT,                    -- RUT de quien firma
  ip_address TEXT,                    -- IP al momento de firma (para validez legal)
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own consent records" ON consent_records
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_consent_records_patient ON consent_records(patient_id);
CREATE INDEX idx_consent_records_status ON consent_records(status);

-- ============================================
-- BIBLIOTECA DE EJERCICIOS
-- ============================================

-- Ejercicios creados por el profesional
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,                  -- Instrucciones paso a paso
  category TEXT NOT NULL,             -- articulacion, lenguaje, voz, deglucion, respiracion, motricidad, otro
  difficulty TEXT DEFAULT 'medium',   -- easy, medium, hard
  target_age TEXT,                    -- infantil, adolescente, adulto, todos
  materials TEXT,                     -- Materiales necesarios
  duration_minutes INTEGER,           -- Duración estimada
  image_url TEXT,                     -- Imagen/ilustración del ejercicio
  video_url TEXT,                     -- Link a video demostrativo
  is_template BOOLEAN DEFAULT FALSE,  -- Si es plantilla compartible
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own exercises" ON exercises
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_exercises_category ON exercises(category);

-- Ejercicios asignados a pacientes
CREATE TABLE IF NOT EXISTS exercise_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  patient_id UUID REFERENCES patients(id) NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  status TEXT DEFAULT 'assigned',     -- assigned, in_progress, completed
  frequency TEXT,                     -- diario, 3_veces_semana, semanal
  notes TEXT,                         -- Notas específicas para este paciente
  start_date DATE,
  end_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE exercise_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own exercise assignments" ON exercise_assignments
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_exercise_assignments_patient ON exercise_assignments(patient_id);

-- ============================================
-- RPCs para acceso desde Portal del Paciente
-- ============================================

-- Obtener consentimientos pendientes para un paciente (via token)
CREATE OR REPLACE FUNCTION get_patient_consents(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token_rec RECORD;
  consents_data JSON;
BEGIN
  -- Validar token
  SELECT * INTO token_rec FROM patient_portal_tokens
  WHERE token = p_token AND is_active = TRUE
  AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Token inválido o expirado');
  END IF;

  SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json) INTO consents_data
  FROM (
    SELECT cr.id, cr.title, cr.content, cr.status, cr.signed_at, cr.created_at
    FROM consent_records cr
    WHERE cr.patient_id = token_rec.patient_id
    AND cr.user_id = token_rec.user_id
    ORDER BY cr.created_at DESC
  ) c;

  RETURN json_build_object('consents', consents_data);
END;
$$;

-- Firmar consentimiento desde el portal
CREATE OR REPLACE FUNCTION portal_sign_consent(
  p_token TEXT,
  p_consent_id UUID,
  p_signature_data TEXT,
  p_signer_name TEXT,
  p_signer_rut TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token_rec RECORD;
  consent_rec RECORD;
BEGIN
  -- Validar token
  SELECT * INTO token_rec FROM patient_portal_tokens
  WHERE token = p_token AND is_active = TRUE
  AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Token inválido o expirado');
  END IF;

  -- Validar consentimiento
  SELECT * INTO consent_rec FROM consent_records
  WHERE id = p_consent_id
  AND patient_id = token_rec.patient_id
  AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Consentimiento no encontrado o ya firmado');
  END IF;

  -- Firmar
  UPDATE consent_records SET
    status = 'signed',
    signed_at = NOW(),
    signature_data = p_signature_data,
    signer_name = p_signer_name,
    signer_rut = p_signer_rut
  WHERE id = p_consent_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Obtener ejercicios asignados al paciente (via token)
CREATE OR REPLACE FUNCTION get_patient_exercises(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token_rec RECORD;
  exercises_data JSON;
BEGIN
  -- Validar token
  SELECT * INTO token_rec FROM patient_portal_tokens
  WHERE token = p_token AND is_active = TRUE
  AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Token inválido o expirado');
  END IF;

  SELECT COALESCE(json_agg(row_to_json(e)), '[]'::json) INTO exercises_data
  FROM (
    SELECT ea.id as assignment_id, ea.status, ea.frequency, ea.notes as assignment_notes,
           ea.start_date, ea.end_date,
           ex.title, ex.description, ex.instructions, ex.category, ex.difficulty,
           ex.materials, ex.duration_minutes, ex.image_url, ex.video_url
    FROM exercise_assignments ea
    JOIN exercises ex ON ex.id = ea.exercise_id
    WHERE ea.patient_id = token_rec.patient_id
    AND ea.user_id = token_rec.user_id
    AND ea.status != 'completed'
    ORDER BY ea.created_at DESC
  ) e;

  RETURN json_build_object('exercises', exercises_data);
END;
$$;

-- Comentarios para documentación
COMMENT ON TABLE consent_templates IS 'Plantillas de consentimiento informado por profesional';
COMMENT ON TABLE consent_records IS 'Registros de consentimiento firmado por pacientes';
COMMENT ON TABLE exercises IS 'Biblioteca de ejercicios terapéuticos del profesional';
COMMENT ON TABLE exercise_assignments IS 'Ejercicios asignados a pacientes específicos';
