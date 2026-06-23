-- ============================================================
-- Security-Hardening — Admin-View absichern + Selbst-Schutz
-- (Findings aus Security-Review, idempotent)
-- ============================================================

-- (S2) admin_users_view darf NICHT direkt über PostgREST lesbar sein.
-- migrate.sh erteilt am Ende `GRANT ALL ON ALL TABLES ... TO anon, authenticated`,
-- wodurch der View (mit allen E-Mails aus auth.users) für jeden eingeloggten
-- User per /rest/v1/admin_users_view lesbar wäre. Der Zugriff darf ausschließlich
-- über die SECURITY-DEFINER-RPC admin_list_users() (mit is_admin()-Guard) erfolgen.
-- Hinweis: migrate.sh wiederholt diesen REVOKE nach dem Blanket-GRANT, da Migrationen
-- VOR dem GRANT laufen.
REVOKE ALL ON public.admin_users_view FROM anon, authenticated;

-- (S1) Selbst-Schutz auch beim Entsperren — symmetrisch zu admin_ban_user/admin_delete_user.
CREATE OR REPLACE FUNCTION public.admin_unban_user(target_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Nur Admins dürfen User entsperren';
  END IF;
  IF target_id = auth.uid() THEN
    RAISE EXCEPTION 'Du kannst dich nicht selbst entsperren';
  END IF;
  UPDATE auth.users SET banned_until = NULL WHERE id = target_id;
END;
$$;

-- (S5) Gesperrte Accounts dürfen sich nicht selbst löschen und so die Sperre umgehen,
-- solange ihr JWT noch gültig ist.
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT banned_until FROM auth.users WHERE id = auth.uid()) > now() THEN
    RAISE EXCEPTION 'Gesperrte Accounts können nicht gelöscht werden';
  END IF;
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
