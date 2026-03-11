-- ============================================================
-- Düngungsberater MVP — Initiales Datenbankschema
-- ============================================================

-- Admin-Rolle für Stammdatenpflege
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT coalesce(
    (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role') = 'admin',
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- Stammdaten (Admin-pflegbar)
-- ============================================================

CREATE TABLE public.nutrient_types (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code text NOT NULL UNIQUE,
  label_de text NOT NULL,
  unit text NOT NULL DEFAULT 'kg/ha',
  sort_order integer NOT NULL DEFAULT 0,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nutrient_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nutrient_types_read" ON public.nutrient_types FOR SELECT USING (true);
CREATE POLICY "nutrient_types_admin" ON public.nutrient_types FOR ALL USING (public.is_admin());

CREATE TABLE public.crops (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name_de text NOT NULL,
  category text NOT NULL,
  sow_month_from integer NOT NULL CHECK (sow_month_from BETWEEN 1 AND 12),
  sow_month_to integer NOT NULL CHECK (sow_month_to BETWEEN 1 AND 12),
  harvest_month_from integer NOT NULL CHECK (harvest_month_from BETWEEN 1 AND 12),
  harvest_month_to integer NOT NULL CHECK (harvest_month_to BETWEEN 1 AND 12),
  ref_yield_dt_ha numeric NOT NULL CHECK (ref_yield_dt_ha > 0),
  nmin_depth_cm integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crops_read" ON public.crops FOR SELECT USING (true);
CREATE POLICY "crops_admin" ON public.crops FOR ALL USING (public.is_admin());

CREATE TABLE public.crop_nutrient_demands (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  crop_id text NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
  nutrient_type_id text NOT NULL REFERENCES public.nutrient_types(id) ON DELETE CASCADE,
  demand_kg_ha numeric NOT NULL,
  ref_yield_dt_ha numeric NOT NULL,
  per_yield_correction numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'lfl',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (crop_id, nutrient_type_id, source, user_id)
);

ALTER TABLE public.crop_nutrient_demands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cnd_read" ON public.crop_nutrient_demands FOR SELECT USING (true);
CREATE POLICY "cnd_admin" ON public.crop_nutrient_demands FOR ALL USING (public.is_admin());
CREATE POLICY "cnd_user_own" ON public.crop_nutrient_demands
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND source = 'user');

CREATE TABLE public.n_corrections (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type text NOT NULL CHECK (type IN ('vorfrucht', 'zwischenfrucht', 'humus')),
  label_de text NOT NULL,
  correction_kg_n numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.n_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "n_corrections_read" ON public.n_corrections FOR SELECT USING (true);
CREATE POLICY "n_corrections_admin" ON public.n_corrections FOR ALL USING (public.is_admin());

CREATE TABLE public.fertilizer_products (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  n_pct numeric NOT NULL DEFAULT 0,
  p2o5_pct numeric NOT NULL DEFAULT 0,
  k2o_pct numeric NOT NULL DEFAULT 0,
  mgo_pct numeric NOT NULL DEFAULT 0,
  s_pct numeric NOT NULL DEFAULT 0,
  form text NOT NULL DEFAULT 'mineral' CHECK (form IN ('mineral', 'organic')),
  affiliate_url text NOT NULL DEFAULT '',
  shop_name text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fertilizer_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_read" ON public.fertilizer_products FOR SELECT USING (active = true);
CREATE POLICY "products_admin" ON public.fertilizer_products FOR ALL USING (public.is_admin());

-- Many-to-many: Produkte ↔ Kulturen (Spec: "many-to-many zu crops")
CREATE TABLE public.crop_fertilizer_products (
  crop_id text NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.fertilizer_products(id) ON DELETE CASCADE,
  PRIMARY KEY (crop_id, product_id)
);

ALTER TABLE public.crop_fertilizer_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cfp_read" ON public.crop_fertilizer_products FOR SELECT USING (true);
CREATE POLICY "cfp_admin" ON public.crop_fertilizer_products FOR ALL USING (public.is_admin());

-- ============================================================
-- Landwirt-Daten (RLS: nur eigene Daten)
-- ============================================================

CREATE TABLE public.fields (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  size_ha numeric NOT NULL CHECK (size_ha > 0),
  synced boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fields_own" ON public.fields
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.field_crop_plans (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  field_id text NOT NULL REFERENCES public.fields(id) ON DELETE CASCADE,
  crop_id text NOT NULL REFERENCES public.crops(id),
  season_year integer NOT NULL CHECK (season_year >= 2020 AND season_year <= 2100),
  expected_yield_dt_ha numeric NOT NULL CHECK (expected_yield_dt_ha > 0),
  synced boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.field_crop_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_own" ON public.field_crop_plans
  FOR ALL USING (
    field_id IN (SELECT id FROM public.fields WHERE user_id = auth.uid())
  )
  WITH CHECK (
    field_id IN (SELECT id FROM public.fields WHERE user_id = auth.uid())
  );

CREATE TABLE public.recommendations (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  field_crop_plan_id text NOT NULL REFERENCES public.field_crop_plans(id) ON DELETE CASCADE,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  calculated_offline boolean NOT NULL DEFAULT false
);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recommendations_own" ON public.recommendations
  FOR ALL USING (
    field_crop_plan_id IN (
      SELECT fcp.id FROM public.field_crop_plans fcp
      JOIN public.fields f ON f.id = fcp.field_id
      WHERE f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    field_crop_plan_id IN (
      SELECT fcp.id FROM public.field_crop_plans fcp
      JOIN public.fields f ON f.id = fcp.field_id
      WHERE f.user_id = auth.uid()
    )
  );

CREATE TABLE public.recommendation_values (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  recommendation_id text NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  nutrient_type_id text NOT NULL REFERENCES public.nutrient_types(id),
  value_kg_ha numeric NOT NULL,
  value_kg_total numeric NOT NULL,
  source_used text NOT NULL DEFAULT 'lfl' CHECK (source_used IN ('lfl', 'user'))
);

ALTER TABLE public.recommendation_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rec_values_own" ON public.recommendation_values
  FOR ALL USING (
    recommendation_id IN (
      SELECT r.id FROM public.recommendations r
      JOIN public.field_crop_plans fcp ON fcp.id = r.field_crop_plan_id
      JOIN public.fields f ON f.id = fcp.field_id
      WHERE f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    recommendation_id IN (
      SELECT r.id FROM public.recommendations r
      JOIN public.field_crop_plans fcp ON fcp.id = r.field_crop_plan_id
      JOIN public.fields f ON f.id = fcp.field_id
      WHERE f.user_id = auth.uid()
    )
  );

-- ============================================================
-- FK-Indexe für performante Joins
-- ============================================================

CREATE INDEX idx_field_crop_plans_field_id ON public.field_crop_plans(field_id);
CREATE INDEX idx_recommendations_field_crop_plan_id ON public.recommendations(field_crop_plan_id);
CREATE INDEX idx_recommendation_values_recommendation_id ON public.recommendation_values(recommendation_id);
CREATE INDEX idx_crop_nutrient_demands_crop_id ON public.crop_nutrient_demands(crop_id);
CREATE INDEX idx_crop_nutrient_demands_nutrient_type_id ON public.crop_nutrient_demands(nutrient_type_id);

-- ============================================================
-- updated_at Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fields_updated_at
  BEFORE UPDATE ON public.fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER field_crop_plans_updated_at
  BEFORE UPDATE ON public.field_crop_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
