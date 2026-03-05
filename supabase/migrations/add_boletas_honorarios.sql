-- =====================================================
-- BOLETAS DE HONORARIOS SYSTEM
-- Módulo para gestión de BHE (Boletas de Honorarios Electrónicas)
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Crear tabla boletas_honorarios
CREATE TABLE IF NOT EXISTS boletas_honorarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  boleta_number TEXT NOT NULL,
  sii_folio TEXT,
  amount_bruto INTEGER NOT NULL,
  retencion_percent NUMERIC(5,2) NOT NULL DEFAULT 15.25,
  retencion_amount INTEGER NOT NULL,
  amount_liquido INTEGER NOT NULL,
  description TEXT NOT NULL,
  service_date DATE NOT NULL,
  emission_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_sii', 'emitted', 'voided')),
  professional_rut TEXT,
  professional_name TEXT NOT NULL,
  patient_rut TEXT,
  patient_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_boletas_user_id ON boletas_honorarios(user_id);
CREATE INDEX IF NOT EXISTS idx_boletas_payment_id ON boletas_honorarios(payment_id);
CREATE INDEX IF NOT EXISTS idx_boletas_patient_id ON boletas_honorarios(patient_id);
CREATE INDEX IF NOT EXISTS idx_boletas_status ON boletas_honorarios(status);
CREATE INDEX IF NOT EXISTS idx_boletas_service_date ON boletas_honorarios(service_date);

-- 3. RLS
ALTER TABLE boletas_honorarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own boletas" ON boletas_honorarios;
CREATE POLICY "Users can view own boletas"
  ON boletas_honorarios FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own boletas" ON boletas_honorarios;
CREATE POLICY "Users can insert own boletas"
  ON boletas_honorarios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own boletas" ON boletas_honorarios;
CREATE POLICY "Users can update own boletas"
  ON boletas_honorarios FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own boletas" ON boletas_honorarios;
CREATE POLICY "Users can delete own boletas"
  ON boletas_honorarios FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all boletas" ON boletas_honorarios;
CREATE POLICY "Admins can view all boletas"
  ON boletas_honorarios FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- 4. Trigger updated_at (reutiliza función existente)
DROP TRIGGER IF EXISTS update_boletas_honorarios_updated_at ON boletas_honorarios;
CREATE TRIGGER update_boletas_honorarios_updated_at
  BEFORE UPDATE ON boletas_honorarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
