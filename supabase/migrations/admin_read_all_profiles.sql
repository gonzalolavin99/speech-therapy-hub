-- Permitir que administradores lean TODOS los perfiles profesionales
-- Actualmente la política RLS solo permite leer el propio perfil (user_id = auth.uid())

-- Política: admins pueden ver todos los perfiles
CREATE POLICY "Admins can view all professional profiles"
  ON professional_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.email = auth.jwt() ->> 'email'
    )
  );

-- Política: admins pueden actualizar todos los perfiles (para aprobar/revocar)
CREATE POLICY "Admins can update all professional profiles"
  ON professional_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.email = auth.jwt() ->> 'email'
    )
  );

-- Función RPC para obtener emails de auth.users (solo admins)
-- auth.users no es accesible directamente desde el cliente
CREATE OR REPLACE FUNCTION get_user_emails()
RETURNS TABLE(user_id UUID, email TEXT) AS $$
BEGIN
  -- Verificar que el caller sea admin
  IF NOT EXISTS (
    SELECT 1 FROM admin_users WHERE email = auth.jwt() ->> 'email'
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT au.id AS user_id, au.email::TEXT AS email
  FROM auth.users au;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_emails IS 'Retorna emails de auth.users. Solo accesible por administradores.';
