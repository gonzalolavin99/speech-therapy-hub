-- Agregar opción para ocultar precios en perfil público
ALTER TABLE professional_profiles
  ADD COLUMN IF NOT EXISTS show_public_prices BOOLEAN DEFAULT TRUE;

-- Actualizar RPC para incluir show_public_prices
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
    'public_email', pp.public_email,
    'show_public_prices', COALESCE(pp.show_public_prices, TRUE)
  )
  FROM professional_profiles pp
  WHERE pp.slug = profile_slug
    AND pp.public_profile_enabled = TRUE;
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON COLUMN professional_profiles.show_public_prices IS 'Si se muestran los precios en el perfil público';
