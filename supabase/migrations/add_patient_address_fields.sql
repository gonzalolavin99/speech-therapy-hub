-- Agregar campos opcionales de dirección a la tabla patients
-- Necesarios para generar boletas de honorarios en el SII (domicilio, región, comuna)

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS comuna TEXT;

-- Comentarios descriptivos
COMMENT ON COLUMN patients.address IS 'Domicilio del paciente (opcional, necesario para BHE del SII)';
COMMENT ON COLUMN patients.region IS 'Región del paciente (opcional, necesario para BHE del SII)';
COMMENT ON COLUMN patients.comuna IS 'Comuna del paciente (opcional, necesario para BHE del SII)';
