-- Fix: admin_update_subscription usaba user_id = auth.uid() pero admin_users
-- no tiene user_id seteado. Cambiar a verificar por email como las demás funciones admin.

-- También actualizar admin_users para que tenga el user_id correcto
UPDATE admin_users 
SET user_id = au.id
FROM auth.users au
WHERE admin_users.email = au.email
AND admin_users.user_id IS NULL;

-- Recrear la función con auth check por email
CREATE OR REPLACE FUNCTION admin_update_subscription(
  target_user_id UUID,
  new_plan TEXT,
  new_status TEXT DEFAULT NULL,
  new_trial_ends_at TIMESTAMPTZ DEFAULT NULL,
  notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if caller is admin (by email, consistent with other admin functions)
  IF NOT EXISTS (
    SELECT 1 FROM admin_users WHERE email = auth.jwt() ->> 'email'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Upsert subscription
  INSERT INTO subscriptions (user_id, plan, status, trial_ends_at, admin_override, admin_notes, current_period_start, current_period_end)
  VALUES (
    target_user_id,
    new_plan,
    COALESCE(new_status, 'active'),
    new_trial_ends_at,
    TRUE,
    notes,
    NOW(),
    CASE 
      WHEN new_plan = 'trial' THEN COALESCE(new_trial_ends_at, NOW() + INTERVAL '30 days')
      WHEN new_plan = 'vip' THEN NOW() + INTERVAL '100 years'
      ELSE NOW() + INTERVAL '30 days'
    END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = new_plan,
    status = COALESCE(new_status, 'active'),
    trial_ends_at = new_trial_ends_at,
    admin_override = TRUE,
    admin_notes = COALESCE(notes, subscriptions.admin_notes),
    current_period_start = NOW(),
    current_period_end = CASE 
      WHEN new_plan = 'trial' THEN COALESCE(new_trial_ends_at, NOW() + INTERVAL '30 days')
      WHEN new_plan = 'vip' THEN NOW() + INTERVAL '100 years'
      ELSE NOW() + INTERVAL '30 days'
    END;

  SELECT row_to_json(s) INTO result
  FROM subscriptions s
  WHERE s.user_id = target_user_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
