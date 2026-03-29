-- ============================================================
-- Admin User Management — View + RPC Functions
-- ============================================================

-- View: Admin-sichtbare User-Daten aus auth.users
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT
  id,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at,
  banned_until,
  coalesce(raw_app_meta_data->>'role', 'user') AS role
FROM auth.users
ORDER BY created_at DESC;

-- RPC: Alle User auflisten (nur für Admins)
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  banned_until timestamptz,
  role text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Nur Admins dürfen User auflisten';
  END IF;
  RETURN QUERY
    SELECT v.id, v.email, v.created_at, v.last_sign_in_at, v.email_confirmed_at, v.banned_until, v.role
    FROM public.admin_users_view v;
END;
$$;

-- RPC: User sperren
CREATE OR REPLACE FUNCTION public.admin_ban_user(target_id uuid, ban_until timestamptz DEFAULT '2999-12-31'::timestamptz)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Nur Admins dürfen User sperren';
  END IF;
  IF target_id = auth.uid() THEN
    RAISE EXCEPTION 'Du kannst dich nicht selbst sperren';
  END IF;
  UPDATE auth.users SET banned_until = ban_until WHERE id = target_id;
END;
$$;

-- RPC: User entsperren
CREATE OR REPLACE FUNCTION public.admin_unban_user(target_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Nur Admins dürfen User entsperren';
  END IF;
  UPDATE auth.users SET banned_until = NULL WHERE id = target_id;
END;
$$;

-- RPC: User löschen (CASCADE löscht Felder, Pläne, Empfehlungen mit)
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Nur Admins dürfen User löschen';
  END IF;
  IF target_id = auth.uid() THEN
    RAISE EXCEPTION 'Du kannst dich nicht selbst löschen';
  END IF;
  DELETE FROM auth.users WHERE id = target_id;
END;
$$;
