-- supabase/migrations/004_user_nutrient_demands_rls.sql

-- RLS Lesen: LfL-Werte (user_id IS NULL) sind für alle lesbar
CREATE POLICY "lfl demands are public"
  ON public.crop_nutrient_demands
  FOR SELECT
  USING (user_id IS NULL AND source = 'lfl');

-- RLS: Nutzer darf eigene user-Demands lesen/schreiben/löschen
CREATE POLICY "users manage own demands"
  ON public.crop_nutrient_demands
  FOR ALL
  USING (user_id = auth.uid() AND source = 'user')
  WITH CHECK (user_id = auth.uid() AND source = 'user');

-- RPC: Account löschen (SECURITY DEFINER nötig für auth.users-Zugriff)
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
