-- ============================================================
-- field_geometries: Speichert Schlaggeometrien (GeoJSON Polygon/MultiPolygon)
-- importiert via iBalis ZIP oder manuell gezeichnet
-- ============================================================

CREATE TABLE IF NOT EXISTS public.field_geometries (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  field_id    text NOT NULL REFERENCES public.fields(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  geometry    jsonb NOT NULL,
  source      text NOT NULL CHECK (source IN ('ibalis', 'manual')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.field_geometries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_field_geometries_user_id ON public.field_geometries(user_id);
CREATE INDEX IF NOT EXISTS idx_field_geometries_field_id ON public.field_geometries(field_id);

DROP POLICY IF EXISTS "field_geometries_owner" ON public.field_geometries;
CREATE POLICY "field_geometries_owner"
  ON public.field_geometries
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
