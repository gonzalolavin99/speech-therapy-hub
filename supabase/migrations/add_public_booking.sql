-- ============================================================
-- Agenda Pública / Public Booking System
-- Allows patients to book appointments from the public profile
-- ============================================================

-- 1. Availability table: professional's weekly schedule
CREATE TABLE IF NOT EXISTS professional_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Monday, 6=Sunday
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  is_active BOOLEAN NOT NULL DEFAULT true,
  slot_duration INT NOT NULL DEFAULT 45, -- minutes
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_of_week),
  CHECK (end_time > start_time)
);

-- 2. Booking requests table
CREATE TABLE IF NOT EXISTS booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- the professional
  patient_name TEXT NOT NULL,
  patient_phone TEXT,
  patient_email TEXT,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL, -- linked after confirmation
  session_type TEXT NOT NULL DEFAULT 'therapy',
  requested_date DATE NOT NULL,
  requested_start_time TIME NOT NULL,
  slot_duration INT NOT NULL DEFAULT 45,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled')),
  notes TEXT,
  rejection_reason TEXT,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL, -- linked after confirmation
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Add booking_enabled to professional_profiles
DO $$ BEGIN
  ALTER TABLE professional_profiles ADD COLUMN booking_enabled BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_availability_user ON professional_availability(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_user ON booking_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON booking_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_booking_requests_date ON booking_requests(requested_date);

-- 5. Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_availability_updated ON professional_availability;
CREATE TRIGGER trg_availability_updated
  BEFORE UPDATE ON professional_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_booking_requests_updated ON booking_requests;
CREATE TRIGGER trg_booking_requests_updated
  BEFORE UPDATE ON booking_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. RLS Policies
ALTER TABLE professional_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;

-- Availability: owner can CRUD
DROP POLICY IF EXISTS "availability_owner_all" ON professional_availability;
CREATE POLICY "availability_owner_all" ON professional_availability
  FOR ALL USING (auth.uid() = user_id);

-- Booking requests: owner can read/update
DROP POLICY IF EXISTS "booking_requests_owner_all" ON booking_requests;
CREATE POLICY "booking_requests_owner_all" ON booking_requests
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- RPC: get_available_slots
-- Returns available time slots for a given professional and date
-- Accessible by anonymous users (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION get_available_slots(
  p_slug TEXT,
  p_date DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_day_of_week INT;
  v_availability RECORD;
  v_slots JSONB := '[]'::JSONB;
  v_slot_start TIME;
  v_slot_end TIME;
  v_occupied JSONB;
  v_booking_enabled BOOLEAN;
BEGIN
  -- Get professional by slug
  SELECT pp.user_id, pp.booking_enabled
  INTO v_user_id, v_booking_enabled
  FROM professional_profiles pp
  WHERE pp.slug = p_slug AND pp.public_profile_enabled = true;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Profesional no encontrado');
  END IF;

  IF NOT COALESCE(v_booking_enabled, false) THEN
    RETURN jsonb_build_object('error', 'Agenda en línea no habilitada');
  END IF;

  -- Don't allow booking in the past
  IF p_date < CURRENT_DATE THEN
    RETURN jsonb_build_object('slots', '[]'::JSONB);
  END IF;

  -- Get day of week (0=Monday, 6=Sunday) matching ISO standard
  -- EXTRACT(DOW) gives 0=Sunday, so we convert
  v_day_of_week := (EXTRACT(DOW FROM p_date)::INT + 6) % 7;

  -- Get availability for this day
  SELECT * INTO v_availability
  FROM professional_availability
  WHERE user_id = v_user_id
    AND day_of_week = v_day_of_week
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('slots', '[]'::JSONB);
  END IF;

  -- Get occupied slots (existing sessions for this date)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'start', (s.start_time AT TIME ZONE 'America/Santiago')::TIME,
    'end', (s.end_time AT TIME ZONE 'America/Santiago')::TIME
  )), '[]'::JSONB)
  INTO v_occupied
  FROM sessions s
  WHERE s.user_id = v_user_id
    AND (s.start_time AT TIME ZONE 'America/Santiago')::DATE = p_date
    AND s.status NOT IN ('cancelled', 'no_show');

  -- Also get pending booking requests for this date
  SELECT v_occupied || COALESCE(jsonb_agg(jsonb_build_object(
    'start', br.requested_start_time,
    'end', (br.requested_start_time + (br.slot_duration || ' minutes')::INTERVAL)::TIME
  )), '[]'::JSONB)
  INTO v_occupied
  FROM booking_requests br
  WHERE br.user_id = v_user_id
    AND br.requested_date = p_date
    AND br.status = 'pending';

  -- Generate slots
  v_slot_start := v_availability.start_time;

  WHILE v_slot_start + (v_availability.slot_duration || ' minutes')::INTERVAL <= v_availability.end_time LOOP
    v_slot_end := (v_slot_start + (v_availability.slot_duration || ' minutes')::INTERVAL)::TIME;

    -- Check if this slot is available (not overlapping with any occupied slot)
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_occupied) AS occ
      WHERE (occ->>'start')::TIME < v_slot_end
        AND (occ->>'end')::TIME > v_slot_start
    ) THEN
      -- For today, skip past slots
      IF p_date > CURRENT_DATE OR (p_date = CURRENT_DATE AND v_slot_start > LOCALTIME) THEN
        v_slots := v_slots || jsonb_build_object(
          'start_time', v_slot_start::TEXT,
          'end_time', v_slot_end::TEXT
        );
      END IF;
    END IF;

    v_slot_start := v_slot_end;
  END LOOP;

  RETURN jsonb_build_object(
    'slots', v_slots,
    'slot_duration', v_availability.slot_duration
  );
END;
$$;

-- ============================================================
-- RPC: create_booking_request
-- Creates a booking request from a public user
-- Accessible by anonymous users (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION create_booking_request(
  p_slug TEXT,
  p_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_session_type TEXT DEFAULT 'therapy',
  p_date DATE DEFAULT NULL,
  p_start_time TIME DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_booking_enabled BOOLEAN;
  v_slot_duration INT;
  v_slot_end TIME;
  v_booking_id UUID;
  v_available JSONB;
BEGIN
  -- Validate required fields
  IF p_name IS NULL OR p_name = '' THEN
    RETURN jsonb_build_object('error', 'Nombre es requerido');
  END IF;
  IF p_date IS NULL OR p_start_time IS NULL THEN
    RETURN jsonb_build_object('error', 'Fecha y hora son requeridos');
  END IF;

  -- Get professional
  SELECT pp.user_id, pp.booking_enabled
  INTO v_user_id, v_booking_enabled
  FROM professional_profiles pp
  WHERE pp.slug = p_slug AND pp.public_profile_enabled = true;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Profesional no encontrado');
  END IF;

  IF NOT COALESCE(v_booking_enabled, false) THEN
    RETURN jsonb_build_object('error', 'Agenda en línea no habilitada');
  END IF;

  -- Get slot duration from availability
  SELECT pa.slot_duration INTO v_slot_duration
  FROM professional_availability pa
  WHERE pa.user_id = v_user_id
    AND pa.day_of_week = (EXTRACT(DOW FROM p_date)::INT + 6) % 7
    AND pa.is_active = true;

  IF v_slot_duration IS NULL THEN
    RETURN jsonb_build_object('error', 'No hay disponibilidad para ese día');
  END IF;

  -- Verify slot is still available (race condition check)
  v_available := get_available_slots(p_slug, p_date);
  IF v_available ? 'error' THEN
    RETURN v_available;
  END IF;

  -- Check if the requested slot exists in available slots
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_available->'slots') AS slot
    WHERE (slot->>'start_time')::TIME = p_start_time
  ) THEN
    RETURN jsonb_build_object('error', 'Este horario ya no está disponible. Por favor selecciona otro.');
  END IF;

  -- Create booking request
  INSERT INTO booking_requests (
    user_id, patient_name, patient_phone, patient_email,
    session_type, requested_date, requested_start_time,
    slot_duration, status, notes
  ) VALUES (
    v_user_id, p_name, p_phone, p_email,
    p_session_type, p_date, p_start_time,
    v_slot_duration, 'pending', p_notes
  )
  RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object(
    'id', v_booking_id,
    'status', 'pending',
    'message', 'Solicitud de cita enviada exitosamente. El profesional te confirmará pronto.'
  );
END;
$$;

-- ============================================================
-- RPC: confirm_booking
-- Professional confirms a booking request → creates session + patient
-- Requires authentication
-- ============================================================
CREATE OR REPLACE FUNCTION confirm_booking(
  p_booking_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_patient_id UUID;
  v_session_id UUID;
  v_start_ts TIMESTAMPTZ;
  v_end_ts TIMESTAMPTZ;
BEGIN
  -- Get booking request
  SELECT * INTO v_booking
  FROM booking_requests
  WHERE id = p_booking_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Solicitud no encontrada');
  END IF;

  IF v_booking.status != 'pending' THEN
    RETURN jsonb_build_object('error', 'Esta solicitud ya fue procesada');
  END IF;

  -- Find or create patient
  -- First try to match by phone or email
  SELECT p.id INTO v_patient_id
  FROM patients p
  WHERE p.user_id = auth.uid()
    AND (
      (v_booking.patient_phone IS NOT NULL AND p.phone = v_booking.patient_phone)
      OR (v_booking.patient_email IS NOT NULL AND p.email = v_booking.patient_email)
    )
  LIMIT 1;

  -- If no match, create new patient
  IF v_patient_id IS NULL THEN
    INSERT INTO patients (user_id, name, phone, email, status)
    VALUES (
      auth.uid(),
      v_booking.patient_name,
      v_booking.patient_phone,
      v_booking.patient_email,
      'active'
    )
    RETURNING id INTO v_patient_id;
  END IF;

  -- Build timestamps in Chile timezone
  v_start_ts := (v_booking.requested_date || ' ' || v_booking.requested_start_time)::TIMESTAMP AT TIME ZONE 'America/Santiago';
  v_end_ts := v_start_ts + (v_booking.slot_duration || ' minutes')::INTERVAL;

  -- Create session
  INSERT INTO sessions (
    user_id, patient_id, title, session_type, start_time, end_time, status
  ) VALUES (
    auth.uid(),
    v_patient_id,
    'Cita - ' || v_booking.patient_name,
    v_booking.session_type,
    v_start_ts,
    v_end_ts,
    'confirmed'
  )
  RETURNING id INTO v_session_id;

  -- Update booking request
  UPDATE booking_requests
  SET status = 'confirmed',
      patient_id = v_patient_id,
      session_id = v_session_id
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'status', 'confirmed',
    'session_id', v_session_id,
    'patient_id', v_patient_id,
    'message', 'Cita confirmada exitosamente'
  );
END;
$$;

-- ============================================================
-- RPC: reject_booking
-- Professional rejects a booking request
-- Requires authentication
-- ============================================================
CREATE OR REPLACE FUNCTION reject_booking(
  p_booking_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE booking_requests
  SET status = 'rejected',
      rejection_reason = p_reason
  WHERE id = p_booking_id
    AND user_id = auth.uid()
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Solicitud no encontrada o ya procesada');
  END IF;

  RETURN jsonb_build_object(
    'status', 'rejected',
    'message', 'Solicitud rechazada'
  );
END;
$$;

-- Grant anonymous access to public RPCs
GRANT EXECUTE ON FUNCTION get_available_slots(TEXT, DATE) TO anon;
GRANT EXECUTE ON FUNCTION create_booking_request(TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TIME, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_available_slots(TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION create_booking_request(TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TIME, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_booking(UUID, TEXT) TO authenticated;

-- Update get_public_profile to include booking_enabled
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
    'show_public_prices', COALESCE(pp.show_public_prices, TRUE),
    'booking_enabled', COALESCE(pp.booking_enabled, FALSE)
  )
  FROM professional_profiles pp
  WHERE pp.slug = profile_slug
    AND pp.public_profile_enabled = TRUE;
$$ LANGUAGE sql SECURITY DEFINER;
