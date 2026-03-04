-- =====================================================
-- SCRIPT CONSOLIDADO — Ejecutar TODO junto en Supabase SQL Editor
-- Incluye: fix admin RPC + security search_path + clinics tables + clinic RPCs
-- =====================================================

-- ========== PARTE 1: Fix admin_users user_id ==========
UPDATE admin_users 
SET user_id = au.id
FROM auth.users au
WHERE admin_users.email = au.email
AND admin_users.user_id IS NULL;

-- ========== PARTE 2: Fix search_path en funciones existentes ==========

-- is_admin
CREATE OR REPLACE FUNCTION public.is_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users WHERE email = user_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- get_user_emails
CREATE OR REPLACE FUNCTION public.get_user_emails()
RETURNS TABLE(user_id UUID, email TEXT) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users WHERE admin_users.email = auth.jwt() ->> 'email'
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT au.id AS user_id, au.email::TEXT AS email
  FROM auth.users au;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- create_trial_subscription (trigger)
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, trial_ends_at, current_period_start, current_period_end)
  VALUES (
    NEW.user_id,
    'trial',
    'active',
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW() + INTERVAL '30 days'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- get_my_subscription
CREATE OR REPLACE FUNCTION public.get_my_subscription()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'subscription', row_to_json(s),
    'limits', row_to_json(pl)
  ) INTO result
  FROM public.subscriptions s
  JOIN public.plan_limits pl ON pl.plan = s.plan
  WHERE s.user_id = auth.uid();

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- admin_update_subscription (con auth por email + VIP 100 years)
CREATE OR REPLACE FUNCTION public.admin_update_subscription(
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
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users WHERE admin_users.email = auth.jwt() ->> 'email'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.subscriptions (user_id, plan, status, trial_ends_at, admin_override, admin_notes, current_period_start, current_period_end)
  VALUES (
    target_user_id,
    new_plan,
    COALESCE(new_status, 'active'),
    new_trial_ends_at,
    TRUE,
    notes,
    NOW(),
    CASE
      WHEN new_plan = 'vip' THEN NOW() + INTERVAL '100 years'
      WHEN new_trial_ends_at IS NOT NULL THEN new_trial_ends_at
      ELSE NOW() + INTERVAL '30 days'
    END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = new_plan,
    status = COALESCE(new_status, public.subscriptions.status),
    trial_ends_at = COALESCE(new_trial_ends_at, public.subscriptions.trial_ends_at),
    admin_override = TRUE,
    admin_notes = COALESCE(notes, public.subscriptions.admin_notes),
    current_period_start = NOW(),
    current_period_end = CASE
      WHEN new_plan = 'vip' THEN NOW() + INTERVAL '100 years'
      WHEN new_trial_ends_at IS NOT NULL THEN new_trial_ends_at
      ELSE NOW() + INTERVAL '30 days'
    END;

  SELECT row_to_json(s) INTO result
  FROM public.subscriptions s
  WHERE s.user_id = target_user_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- update_updated_at_column (trigger)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- ========== PARTE 3: Tablas de clínica + plan_limits update ==========

ALTER TABLE public.plan_limits ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 0;

UPDATE public.plan_limits SET max_members = 0 WHERE plan IN ('free', 'trial', 'professional');
UPDATE public.plan_limits SET max_members = 5 WHERE plan = 'clinic';
UPDATE public.plan_limits SET max_members = -1 WHERE plan = 'vip';

CREATE TABLE IF NOT EXISTS public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  logo_url TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clinic_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('clinic_admin', 'member')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  UNIQUE(clinic_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clinics_owner ON public.clinics(owner_id);
CREATE INDEX IF NOT EXISTS idx_clinics_slug ON public.clinics(slug);
CREATE INDEX IF NOT EXISTS idx_clinic_members_clinic ON public.clinic_members(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_members_user ON public.clinic_members(user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_members_email ON public.clinic_members(email);
CREATE INDEX IF NOT EXISTS idx_clinic_members_status ON public.clinic_members(status);

-- ========== PARTE 4: RLS para clínicas ==========

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their clinic" ON public.clinics;
CREATE POLICY "Users can view their clinic"
  ON public.clinics FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.clinic_members cm
      WHERE cm.clinic_id = clinics.id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users WHERE email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Owner can update clinic" ON public.clinics;
CREATE POLICY "Owner can update clinic"
  ON public.clinics FOR UPDATE
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create clinic" ON public.clinics;
CREATE POLICY "Authenticated users can create clinic"
  ON public.clinics FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owner can delete clinic" ON public.clinics;
CREATE POLICY "Owner can delete clinic"
  ON public.clinics FOR DELETE
  USING (owner_id = auth.uid());

ALTER TABLE public.clinic_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View clinic members" ON public.clinic_members;
CREATE POLICY "View clinic members"
  ON public.clinic_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.clinic_members cm2
      WHERE cm2.clinic_id = clinic_members.clinic_id
      AND cm2.user_id = auth.uid()
      AND cm2.role = 'clinic_admin'
      AND cm2.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.clinics c
      WHERE c.id = clinic_members.clinic_id
      AND c.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users WHERE email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Clinic admin can invite members" ON public.clinic_members;
CREATE POLICY "Clinic admin can invite members"
  ON public.clinic_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinic_members cm2
      WHERE cm2.clinic_id = clinic_members.clinic_id
      AND cm2.user_id = auth.uid()
      AND cm2.role = 'clinic_admin'
      AND cm2.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.clinics c
      WHERE c.id = clinic_members.clinic_id
      AND c.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users WHERE email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Clinic admin can update members" ON public.clinic_members;
CREATE POLICY "Clinic admin can update members"
  ON public.clinic_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clinic_members cm2
      WHERE cm2.clinic_id = clinic_members.clinic_id
      AND cm2.user_id = auth.uid()
      AND cm2.role = 'clinic_admin'
      AND cm2.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.clinics c
      WHERE c.id = clinic_members.clinic_id
      AND c.owner_id = auth.uid()
    )
    OR (clinic_members.email = auth.jwt() ->> 'email')
    OR EXISTS (
      SELECT 1 FROM public.admin_users WHERE email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Clinic admin can delete members" ON public.clinic_members;
CREATE POLICY "Clinic admin can delete members"
  ON public.clinic_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.clinics c
      WHERE c.id = clinic_members.clinic_id
      AND c.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.clinic_members cm2
      WHERE cm2.clinic_id = clinic_members.clinic_id
      AND cm2.user_id = auth.uid()
      AND cm2.role = 'clinic_admin'
      AND cm2.status = 'active'
    )
  );

-- ========== PARTE 5: RPCs de clínica (ahora que las tablas existen) ==========

-- create_clinic
CREATE OR REPLACE FUNCTION public.create_clinic(
  clinic_name TEXT,
  clinic_slug TEXT,
  clinic_address TEXT DEFAULT NULL,
  clinic_city TEXT DEFAULT NULL,
  clinic_phone TEXT DEFAULT NULL,
  clinic_email TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  new_clinic RECORD;
  caller_email TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = auth.uid()
    AND s.plan IN ('clinic', 'vip')
    AND s.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Se requiere plan Clínica o VIP para crear una clínica';
  END IF;

  IF EXISTS (SELECT 1 FROM public.clinics WHERE owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Ya tienes una clínica registrada';
  END IF;

  IF EXISTS (SELECT 1 FROM public.clinics WHERE slug = clinic_slug) THEN
    RAISE EXCEPTION 'El identificador de clínica ya está en uso';
  END IF;

  SELECT auth.jwt() ->> 'email' INTO caller_email;

  INSERT INTO public.clinics (name, slug, owner_id, address, city, phone, email)
  VALUES (clinic_name, clinic_slug, auth.uid(), clinic_address, clinic_city, clinic_phone, clinic_email)
  RETURNING * INTO new_clinic;

  INSERT INTO public.clinic_members (clinic_id, user_id, email, role, status, invited_by, joined_at)
  VALUES (new_clinic.id, auth.uid(), caller_email, 'clinic_admin', 'active', auth.uid(), NOW());

  RETURN row_to_json(new_clinic);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- invite_clinic_member
CREATE OR REPLACE FUNCTION public.invite_clinic_member(
  p_clinic_id UUID,
  p_email TEXT,
  p_role TEXT DEFAULT 'member'
)
RETURNS JSON AS $$
DECLARE
  result RECORD;
  clinic_record RECORD;
  member_count INTEGER;
  max_allowed INTEGER;
BEGIN
  SELECT c.* INTO clinic_record
  FROM public.clinics c
  WHERE c.id = p_clinic_id;

  IF clinic_record IS NULL THEN
    RAISE EXCEPTION 'Clínica no encontrada';
  END IF;

  IF clinic_record.owner_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.clinic_members cm
    WHERE cm.clinic_id = p_clinic_id
    AND cm.user_id = auth.uid()
    AND cm.role = 'clinic_admin'
    AND cm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para invitar miembros';
  END IF;

  SELECT pl.max_members INTO max_allowed
  FROM public.subscriptions s
  JOIN public.plan_limits pl ON pl.plan = s.plan
  WHERE s.user_id = clinic_record.owner_id;

  SELECT COUNT(*) INTO member_count
  FROM public.clinic_members
  WHERE clinic_id = p_clinic_id
  AND status IN ('active', 'invited');

  IF max_allowed != -1 AND member_count >= max_allowed THEN
    RAISE EXCEPTION 'Has alcanzado el límite de miembros de tu plan (% de %)', member_count, max_allowed;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.clinic_members
    WHERE clinic_id = p_clinic_id AND email = p_email AND status IN ('active', 'invited')
  ) THEN
    RAISE EXCEPTION 'Este email ya tiene una invitación o es miembro activo';
  END IF;

  INSERT INTO public.clinic_members (clinic_id, email, role, status, invited_by)
  VALUES (p_clinic_id, p_email, p_role, 'invited', auth.uid())
  ON CONFLICT (clinic_id, email) DO UPDATE SET
    status = 'invited',
    role = p_role,
    invited_by = auth.uid(),
    invited_at = NOW()
  RETURNING * INTO result;

  RETURN row_to_json(result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- accept_clinic_invitation
CREATE OR REPLACE FUNCTION public.accept_clinic_invitation(p_clinic_id UUID)
RETURNS JSON AS $$
DECLARE
  result RECORD;
  caller_email TEXT;
BEGIN
  SELECT auth.jwt() ->> 'email' INTO caller_email;

  UPDATE public.clinic_members
  SET user_id = auth.uid(), status = 'active', joined_at = NOW()
  WHERE clinic_id = p_clinic_id
  AND email = caller_email
  AND status = 'invited'
  RETURNING * INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'No se encontró invitación pendiente para tu email';
  END IF;

  RETURN row_to_json(result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- get_my_clinic
CREATE OR REPLACE FUNCTION public.get_my_clinic()
RETURNS JSON AS $$
DECLARE
  clinic_record JSON;
  members_list JSON;
  my_membership RECORD;
  pending_invites JSON;
BEGIN
  SELECT cm.* INTO my_membership
  FROM public.clinic_members cm
  WHERE cm.user_id = auth.uid()
  AND cm.status = 'active'
  LIMIT 1;

  SELECT json_agg(row_to_json(inv)) INTO pending_invites
  FROM (
    SELECT cm.id, cm.clinic_id, c.name AS clinic_name, cm.role, cm.invited_at
    FROM public.clinic_members cm
    JOIN public.clinics c ON c.id = cm.clinic_id
    WHERE cm.email = auth.jwt() ->> 'email'
    AND cm.status = 'invited'
  ) inv;

  IF my_membership IS NULL THEN
    RETURN json_build_object(
      'clinic', NULL,
      'membership', NULL,
      'members', '[]'::json,
      'pending_invitations', COALESCE(pending_invites, '[]'::json)
    );
  END IF;

  SELECT row_to_json(c) INTO clinic_record
  FROM public.clinics c
  WHERE c.id = my_membership.clinic_id;

  IF my_membership.role = 'clinic_admin' THEN
    SELECT json_agg(row_to_json(m)) INTO members_list
    FROM (
      SELECT cm.id, cm.user_id, cm.email, cm.role, cm.status, cm.invited_at, cm.joined_at,
             pp.full_name, pp.profession
      FROM public.clinic_members cm
      LEFT JOIN public.professional_profiles pp ON pp.user_id = cm.user_id
      WHERE cm.clinic_id = my_membership.clinic_id
      ORDER BY cm.role DESC, cm.joined_at
    ) m;
  ELSE
    members_list := '[]'::json;
  END IF;

  RETURN json_build_object(
    'clinic', clinic_record,
    'membership', row_to_json(my_membership),
    'members', COALESCE(members_list, '[]'::json),
    'pending_invitations', COALESCE(pending_invites, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- get_clinic_subscription
CREATE OR REPLACE FUNCTION public.get_clinic_subscription()
RETURNS JSON AS $$
DECLARE
  result JSON;
  clinic_owner_id UUID;
BEGIN
  SELECT c.owner_id INTO clinic_owner_id
  FROM public.clinic_members cm
  JOIN public.clinics c ON c.id = cm.clinic_id
  WHERE cm.user_id = auth.uid()
  AND cm.status = 'active'
  LIMIT 1;

  IF clinic_owner_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'subscription', row_to_json(s),
    'limits', row_to_json(pl)
  ) INTO result
  FROM public.subscriptions s
  JOIN public.plan_limits pl ON pl.plan = s.plan
  WHERE s.user_id = clinic_owner_id
  AND s.status = 'active';

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- update_clinic_member
CREATE OR REPLACE FUNCTION public.update_clinic_member(
  p_member_id UUID,
  p_status TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result RECORD;
  target RECORD;
BEGIN
  SELECT * INTO target FROM public.clinic_members WHERE id = p_member_id;
  IF target IS NULL THEN
    RAISE EXCEPTION 'Miembro no encontrado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.clinics c WHERE c.id = target.clinic_id AND c.owner_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.clinic_members cm
    WHERE cm.clinic_id = target.clinic_id
    AND cm.user_id = auth.uid()
    AND cm.role = 'clinic_admin'
    AND cm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para modificar miembros';
  END IF;

  IF target.user_id = auth.uid() AND p_status = 'removed' THEN
    RAISE EXCEPTION 'No puedes eliminarte a ti mismo de la clínica';
  END IF;

  UPDATE public.clinic_members SET
    status = COALESCE(p_status, status),
    role = COALESCE(p_role, role)
  WHERE id = p_member_id
  RETURNING * INTO result;

  RETURN row_to_json(result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ========== LISTO ==========
-- Ahora ve a Authentication > Attack Protection y habilita "Leaked Password Protection"
