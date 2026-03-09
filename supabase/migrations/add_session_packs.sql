-- Packs de sesiones: permite a profesionales vender paquetes con descuento
-- Ejemplo: "Pack 10 sesiones fonoaudiologia $300.000" (vs $350.000 individual)

CREATE TABLE IF NOT EXISTS session_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Pack de sesiones',
  total_sessions INTEGER NOT NULL CHECK (total_sessions > 0),
  used_sessions INTEGER NOT NULL DEFAULT 0 CHECK (used_sessions >= 0),
  price_total INTEGER NOT NULL CHECK (price_total >= 0),
  price_per_session INTEGER GENERATED ALWAYS AS (
    CASE WHEN total_sessions > 0 THEN price_total / total_sessions ELSE 0 END
  ) STORED,
  original_price_per_session INTEGER NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN original_price_per_session > 0 AND total_sessions > 0
      THEN ROUND((1.0 - (price_total::NUMERIC / (original_price_per_session * total_sessions))) * 100, 2)
      ELSE 0
    END
  ) STORED,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'expired')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  notes TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE session_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own packs"
  ON session_packs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_session_packs_user ON session_packs(user_id);
CREATE INDEX idx_session_packs_patient ON session_packs(patient_id);
CREATE INDEX idx_session_packs_status ON session_packs(status);

-- Auto-complete pack when all sessions are used
CREATE OR REPLACE FUNCTION check_pack_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.used_sessions >= NEW.total_sessions AND NEW.status = 'active' THEN
    NEW.status := 'completed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_pack_completion
  BEFORE UPDATE ON session_packs
  FOR EACH ROW
  EXECUTE FUNCTION check_pack_completion();

-- Updated_at trigger
CREATE TRIGGER update_session_packs_updated_at
  BEFORE UPDATE ON session_packs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE session_packs IS 'Packs de sesiones con descuento por volumen';
COMMENT ON COLUMN session_packs.original_price_per_session IS 'Precio normal por sesion (sin descuento), para calcular el % de descuento';
