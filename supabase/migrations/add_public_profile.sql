-- Perfil público del profesional: permite compartir una página pública
-- con info profesional, servicios y contacto

-- Agregar campos de perfil público a professional_profiles
ALTER TABLE professional_profiles
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS public_profile_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS public_phone TEXT,
  ADD COLUMN IF NOT EXISTS public_email TEXT;

-- Índice para búsqueda por slug
CREATE INDEX IF NOT EXISTS idx_professional_profiles_slug
  ON professional_profiles(slug) WHERE slug IS NOT NULL;

-- Tabla de solicitudes de contacto
CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  message TEXT,
  service_type TEXT DEFAULT 'session',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'contacted', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para contact_requests
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Los profesionales pueden ver sus propias solicitudes
CREATE POLICY "Users can view their own contact requests"
  ON contact_requests
  FOR SELECT
  USING (auth.uid() = professional_id);

-- Los profesionales pueden actualizar sus propias solicitudes
CREATE POLICY "Users can update their own contact requests"
  ON contact_requests
  FOR UPDATE
  USING (auth.uid() = professional_id);

-- Cualquiera puede crear solicitudes de contacto (perfil público)
CREATE POLICY "Anyone can create contact requests"
  ON contact_requests
  FOR INSERT
  WITH CHECK (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_contact_requests_professional
  ON contact_requests(professional_id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_status
  ON contact_requests(status);

-- RLS especial: permitir lectura anónima de perfiles públicos habilitados
-- Solo campos públicos (no rut, no phone privado)
CREATE OR REPLACE FUNCTION get_public_profile(profile_slug TEXT)
RETURNS JSON AS $$
  SELECT json_build_object(
    'id', pp.user_id,
    'full_name', pp.full_name,
    'profession', pp.profession,
    'city', pp.city,
    'specialties', pp.specialties,
    'bio', pp.bio,
    'photo_url', pp.photo_url,
    'sis_registration', pp.sis_registration,
    'session_duration', pp.session_duration,
    'session_price', pp.session_price,
    'evaluation_price', pp.evaluation_price,
    'institution', pp.institution,
    'slug', pp.slug,
    'public_phone', pp.public_phone,
    'public_email', pp.public_email
  )
  FROM professional_profiles pp
  WHERE pp.slug = profile_slug
    AND pp.public_profile_enabled = TRUE;
$$ LANGUAGE sql SECURITY DEFINER;

-- Función para enviar solicitud de contacto (acceso anónimo via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION submit_contact_request(
  p_professional_id UUID,
  p_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_service_type TEXT DEFAULT 'session'
)
RETURNS JSON AS $$
DECLARE
  new_request contact_requests;
BEGIN
  -- Validar que el profesional existe y tiene perfil público habilitado
  IF NOT EXISTS (
    SELECT 1 FROM professional_profiles
    WHERE user_id = p_professional_id
      AND public_profile_enabled = TRUE
  ) THEN
    RETURN json_build_object('error', 'Perfil no encontrado o no público');
  END IF;

  -- Validar nombre requerido
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN json_build_object('error', 'Nombre requerido');
  END IF;

  INSERT INTO contact_requests (professional_id, name, phone, email, message, service_type)
  VALUES (p_professional_id, trim(p_name), p_phone, p_email, p_message, COALESCE(p_service_type, 'session'))
  RETURNING * INTO new_request;

  RETURN json_build_object(
    'id', new_request.id,
    'status', 'success'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE contact_requests IS 'Solicitudes de contacto desde perfiles públicos de profesionales';
COMMENT ON FUNCTION get_public_profile IS 'Retorna datos públicos de un profesional por slug';
COMMENT ON FUNCTION submit_contact_request IS 'Permite enviar solicitud de contacto a un profesional con perfil público';
