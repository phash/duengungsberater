-- ============================================================
-- Düngungsberater — Harden is_admin() (Defense in Depth)
-- ============================================================
-- SECURITY DEFINER ohne festen search_path ermöglicht prinzipiell
-- Schema-Shadowing-Angriffe, wenn ein Angreifer CREATE-Rechte auf
-- public bekäme. Aktuell haben anon/authenticated kein CREATE,
-- aber wir setzen search_path zur Vorsorge.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT coalesce(
    (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role') = 'admin',
    false
  );
$$;
