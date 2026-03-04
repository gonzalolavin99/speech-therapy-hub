-- =====================================================
-- CLINICS MULTI-TENANT SYSTEM
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Add max_members column to plan_limits
ALTER TABLE plan_limits ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 0;

UPDATE plan_limits SET max_members = 0 WHERE plan IN ('free', 'trial', 'professional');
UPDATE plan_limits SET max_members = 5 WHERE plan = 'clinic';
UPDATE plan_limits SET max_members = -1 WHERE plan = 'vip';

-- 2. Clinics table
CREATE TABLE IF NOT EXISTS clinics (
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

-- 3. Clinic members table
CREATE TABLE IF NOT EXISTS clinic_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('clinic_admin', 'member')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  UNIQUE(clinic_id, email)
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_clinics_owner ON clinics(owner_id);
CREATE INDEX IF NOT EXISTS idx_clinics_slug ON clinics(slug);
CREATE INDEX IF NOT EXISTS idx_clinic_members_clinic ON clinic_members(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_members_user ON clinic_members(user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_members_email ON clinic_members(email);
CREATE INDEX IF NOT EXISTS idx_clinic_members_status ON clinic_members(status);

-- 5. RLS for clinics
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

-- Clinic owner and members can view their clinic
CREATE POLICY "Users can view their clinic"
  ON clinics FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM clinic_members cm
      WHERE cm.clinic_id = clinics.id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM admin_users WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Only clinic owner can update clinic info
CREATE POLICY "Owner can update clinic"
  ON clinics FOR UPDATE
  USING (owner_id = auth.uid());

-- Authenticated users can create a clinic (when purchasing clinic plan)
CREATE POLICY "Authenticated users can create clinic"
  ON clinics FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Only owner can delete clinic
CREATE POLICY "Owner can delete clinic"
  ON clinics FOR DELETE
  USING (owner_id = auth.uid());

-- 6. RLS for clinic_members
ALTER TABLE clinic_members ENABLE ROW LEVEL SECURITY;

-- Clinic admins can see all members; members see themselves
CREATE POLICY "View clinic members"
  ON clinic_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM clinic_members cm2
      WHERE cm2.clinic_id = clinic_members.clinic_id
      AND cm2.user_id = auth.uid()
      AND cm2.role = 'clinic_admin'
      AND cm2.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM clinics c
      WHERE c.id = clinic_members.clinic_id
      AND c.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM admin_users WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Clinic admins can insert members (invitations)
CREATE POLICY "Clinic admin can invite members"
  ON clinic_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinic_members cm2
      WHERE cm2.clinic_id = clinic_members.clinic_id
      AND cm2.user_id = auth.uid()
      AND cm2.role = 'clinic_admin'
      AND cm2.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM clinics c
      WHERE c.id = clinic_members.clinic_id
      AND c.owner_id = auth.uid()
    )
  );

-- Clinic admins can update members (change status, role)
CREATE POLICY "Clinic admin can update members"
  ON clinic_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clinic_members cm2
      WHERE cm2.clinic_id = clinic_members.clinic_id
      AND cm2.user_id = auth.uid()
      AND cm2.role = 'clinic_admin'
      AND cm2.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM clinics c
      WHERE c.id = clinic_members.clinic_id
      AND c.owner_id = auth.uid()
    )
    -- Members can update their own record (to accept invitation)
    OR (clinic_members.email = auth.jwt() ->> 'email')
  );

-- Clinic admins can delete members
CREATE POLICY "Clinic admin can delete members"
  ON clinic_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clinics c
      WHERE c.id = clinic_members.clinic_id
      AND c.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM clinic_members cm2
      WHERE cm2.clinic_id = clinic_members.clinic_id
      AND cm2.user_id = auth.uid()
      AND cm2.role = 'clinic_admin'
      AND cm2.status = 'active'
    )
  );

-- 7. RPC: Create clinic (called when user activates clinic plan)
CREATE OR REPLACE FUNCTION create_clinic(
  clinic_name TEXT,
  clinic_slug TEXT,
  clinic_address TEXT DEFAULT NULL,
  clinic_city TEXT DEFAULT NULL,
  clinic_phone TEXT DEFAULT NULL,
  clinic_email TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  new_clinic clinics;
  caller_email TEXT;
BEGIN
  -- Verify user has clinic or vip plan
  IF NOT EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.user_id = auth.uid()
    AND s.plan IN ('clinic', 'vip')
    AND s.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Se requiere plan Clínica o VIP para crear una clínica';
  END IF;

  -- Check user doesn't already own a clinic
  IF EXISTS (SELECT 1 FROM clinics WHERE owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Ya tienes una clínica registrada';
  END IF;

  -- Check slug is unique
  IF EXISTS (SELECT 1 FROM clinics WHERE slug = clinic_slug) THEN
    RAISE EXCEPTION 'El identificador de clínica ya está en uso';
  END IF;

  -- Get caller email
  SELECT auth.jwt() ->> 'email' INTO caller_email;

  -- Create clinic
  INSERT INTO clinics (name, slug, owner_id, address, city, phone, email)
  VALUES (clinic_name, clinic_slug, auth.uid(), clinic_address, clinic_city, clinic_phone, clinic_email)
  RETURNING * INTO new_clinic;

  -- Add owner as clinic_admin member
  INSERT INTO clinic_members (clinic_id, user_id, email, role, status, invited_by, joined_at)
  VALUES (new_clinic.id, auth.uid(), caller_email, 'clinic_admin', 'active', auth.uid(), NOW());

  RETURN row_to_json(new_clinic);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC: Invite member to clinic
CREATE OR REPLACE FUNCTION invite_clinic_member(
  p_clinic_id UUID,
  p_email TEXT,
  p_role TEXT DEFAULT 'member'
)
RETURNS JSON AS $$
DECLARE
  result clinic_members;
  clinic_record clinics;
  member_count INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Verify caller is clinic admin or owner
  SELECT c.* INTO clinic_record
  FROM clinics c
  WHERE c.id = p_clinic_id;

  IF clinic_record IS NULL THEN
    RAISE EXCEPTION 'Clínica no encontrada';
  END IF;

  IF clinic_record.owner_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM clinic_members cm
    WHERE cm.clinic_id = p_clinic_id
    AND cm.user_id = auth.uid()
    AND cm.role = 'clinic_admin'
    AND cm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para invitar miembros';
  END IF;

  -- Check member limit from plan
  SELECT pl.max_members INTO max_allowed
  FROM subscriptions s
  JOIN plan_limits pl ON pl.plan = s.plan
  WHERE s.user_id = clinic_record.owner_id;

  SELECT COUNT(*) INTO member_count
  FROM clinic_members
  WHERE clinic_id = p_clinic_id
  AND status IN ('active', 'invited');

  IF max_allowed != -1 AND member_count >= max_allowed THEN
    RAISE EXCEPTION 'Has alcanzado el límite de miembros de tu plan (% de %)', member_count, max_allowed;
  END IF;

  -- Check if already invited
  IF EXISTS (
    SELECT 1 FROM clinic_members
    WHERE clinic_id = p_clinic_id AND email = p_email AND status IN ('active', 'invited')
  ) THEN
    RAISE EXCEPTION 'Este email ya tiene una invitación o es miembro activo';
  END IF;

  -- Create invitation
  INSERT INTO clinic_members (clinic_id, email, role, status, invited_by)
  VALUES (p_clinic_id, p_email, p_role, 'invited', auth.uid())
  ON CONFLICT (clinic_id, email) DO UPDATE SET
    status = 'invited',
    role = p_role,
    invited_by = auth.uid(),
    invited_at = NOW()
  RETURNING * INTO result;

  RETURN row_to_json(result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC: Accept clinic invitation (called by the invited user)
CREATE OR REPLACE FUNCTION accept_clinic_invitation(p_clinic_id UUID)
RETURNS JSON AS $$
DECLARE
  result clinic_members;
  caller_email TEXT;
BEGIN
  SELECT auth.jwt() ->> 'email' INTO caller_email;

  UPDATE clinic_members
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC: Get my clinic (returns clinic + members if user belongs to one)
CREATE OR REPLACE FUNCTION get_my_clinic()
RETURNS JSON AS $$
DECLARE
  clinic_record JSON;
  members_list JSON;
  my_membership clinic_members;
  pending_invites JSON;
BEGIN
  -- Check if user is a member of any clinic
  SELECT cm.* INTO my_membership
  FROM clinic_members cm
  WHERE cm.user_id = auth.uid()
  AND cm.status = 'active'
  LIMIT 1;

  -- Also check if user has pending invitations (by email)
  SELECT json_agg(row_to_json(inv)) INTO pending_invites
  FROM (
    SELECT cm.id, cm.clinic_id, c.name AS clinic_name, cm.role, cm.invited_at
    FROM clinic_members cm
    JOIN clinics c ON c.id = cm.clinic_id
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

  -- Get clinic info
  SELECT row_to_json(c) INTO clinic_record
  FROM clinics c
  WHERE c.id = my_membership.clinic_id;

  -- If clinic_admin, get all members
  IF my_membership.role = 'clinic_admin' THEN
    SELECT json_agg(row_to_json(m)) INTO members_list
    FROM (
      SELECT cm.id, cm.user_id, cm.email, cm.role, cm.status, cm.invited_at, cm.joined_at,
             pp.full_name, pp.profession
      FROM clinic_members cm
      LEFT JOIN professional_profiles pp ON pp.user_id = cm.user_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. RPC: Get clinic subscription for a member (used by enforcement)
-- Returns the clinic owner's subscription if user is an active clinic member
CREATE OR REPLACE FUNCTION get_clinic_subscription()
RETURNS JSON AS $$
DECLARE
  result JSON;
  clinic_owner_id UUID;
BEGIN
  -- Find the clinic owner for this user's active membership
  SELECT c.owner_id INTO clinic_owner_id
  FROM clinic_members cm
  JOIN clinics c ON c.id = cm.clinic_id
  WHERE cm.user_id = auth.uid()
  AND cm.status = 'active'
  LIMIT 1;

  IF clinic_owner_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Return the clinic owner's subscription with limits
  SELECT json_build_object(
    'subscription', row_to_json(s),
    'limits', row_to_json(pl)
  ) INTO result
  FROM subscriptions s
  JOIN plan_limits pl ON pl.plan = s.plan
  WHERE s.user_id = clinic_owner_id
  AND s.status = 'active';

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. RPC: Remove/suspend clinic member
CREATE OR REPLACE FUNCTION update_clinic_member(
  p_member_id UUID,
  p_status TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result clinic_members;
  target clinic_members;
BEGIN
  -- Get target member
  SELECT * INTO target FROM clinic_members WHERE id = p_member_id;
  IF target IS NULL THEN
    RAISE EXCEPTION 'Miembro no encontrado';
  END IF;

  -- Verify caller is clinic admin or owner
  IF NOT EXISTS (
    SELECT 1 FROM clinics c WHERE c.id = target.clinic_id AND c.owner_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM clinic_members cm
    WHERE cm.clinic_id = target.clinic_id
    AND cm.user_id = auth.uid()
    AND cm.role = 'clinic_admin'
    AND cm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para modificar miembros';
  END IF;

  -- Cannot modify yourself if you're the owner
  IF target.user_id = auth.uid() AND p_status = 'removed' THEN
    RAISE EXCEPTION 'No puedes eliminarte a ti mismo de la clínica';
  END IF;

  UPDATE clinic_members SET
    status = COALESCE(p_status, status),
    role = COALESCE(p_role, role)
  WHERE id = p_member_id
  RETURNING * INTO result;

  RETURN row_to_json(result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Super admin: view all clinics
CREATE POLICY "Super admin can view all clinics"
  ON clinics FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt() ->> 'email')
  );

-- Comments
COMMENT ON TABLE clinics IS 'Clínicas registradas en el sistema. Cada clínica tiene un dueño con plan Clínica.';
COMMENT ON TABLE clinic_members IS 'Miembros de clínicas. Incluye invitaciones pendientes y miembros activos.';
COMMENT ON FUNCTION create_clinic IS 'Crea una clínica. Requiere plan Clínica o VIP.';
COMMENT ON FUNCTION invite_clinic_member IS 'Invita un profesional a la clínica por email.';
COMMENT ON FUNCTION accept_clinic_invitation IS 'El usuario invitado acepta la invitación.';
COMMENT ON FUNCTION get_my_clinic IS 'Retorna la clínica del usuario, sus miembros e invitaciones pendientes.';
COMMENT ON FUNCTION get_clinic_subscription IS 'Retorna la suscripción de la clínica para enforcement de miembros.';
