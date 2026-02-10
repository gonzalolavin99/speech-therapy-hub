-- Tabla de administradores del sistema
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Insertar super admin inicial
INSERT INTO admin_users (email, role) 
VALUES ('gonzalolavin99@gmail.com', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- RLS para admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver la tabla de admins
CREATE POLICY "Admins can view admin_users"
  ON admin_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.email = auth.jwt() ->> 'email'
    )
  );

-- Actualizar políticas de audit_logs para que solo admins puedan ver TODOS los logs
DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;

CREATE POLICY "Admins can view all audit logs"
  ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.email = auth.jwt() ->> 'email'
    )
  );

-- Todos los usuarios pueden insertar sus propios logs (mantener)
-- La política de INSERT ya existe

-- Función helper para verificar si un usuario es admin
CREATE OR REPLACE FUNCTION is_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE email = user_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON TABLE admin_users IS 'Usuarios con permisos de administración del sistema';
COMMENT ON FUNCTION is_admin IS 'Verifica si un email tiene permisos de administrador';
