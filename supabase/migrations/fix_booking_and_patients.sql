-- ============================================================
-- Fix: Allow patients to be created without RUT (for online booking)
-- Fix: confirm_booking RPC to handle optional RUT
-- ============================================================

-- 1. Make rut column nullable (was NOT NULL, blocking online bookings)
ALTER TABLE patients ALTER COLUMN rut DROP NOT NULL;

-- 2. Recreate confirm_booking to handle the nullable rut
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
      (v_booking.patient_phone IS NOT NULL AND v_booking.patient_phone != '' AND p.phone = v_booking.patient_phone)
      OR (v_booking.patient_email IS NOT NULL AND v_booking.patient_email != '' AND p.email = v_booking.patient_email)
    )
  LIMIT 1;

  -- If no match, create new patient (without rut - they can fill it in later)
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
