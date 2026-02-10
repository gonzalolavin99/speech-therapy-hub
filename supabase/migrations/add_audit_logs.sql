-- Tabla de logs de auditoría para cumplimiento legal y seguridad
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas eficientes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- RLS: Solo el usuario puede ver sus propios logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs"
  ON audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Comentarios para documentación
COMMENT ON TABLE audit_logs IS 'Registro de auditoría para cumplimiento de Ley 19.628 y Ley 20.584';
COMMENT ON COLUMN audit_logs.action IS 'Tipo de acción: CREATE, READ, UPDATE, DELETE, EXPORT, LOGIN, LOGOUT';
COMMENT ON COLUMN audit_logs.entity_type IS 'Tipo de entidad: patient, session, test, payment, consent';
COMMENT ON COLUMN audit_logs.details IS 'Detalles adicionales de la acción en formato JSON';
