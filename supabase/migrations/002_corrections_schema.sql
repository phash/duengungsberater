-- ============================================================
-- Stufe 2: Korrekturfaktoren (LfL Tab. 9f)
-- Replaces n_corrections with normalized corrections + correction_values
-- ============================================================

-- 1. corrections table
CREATE TABLE public.corrections (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type text NOT NULL CHECK (type IN ('vorfrucht', 'zwischenfrucht', 'humus')),
  label_de text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "corrections_read" ON public.corrections FOR SELECT USING (true);
CREATE POLICY "corrections_admin" ON public.corrections FOR ALL USING (public.is_admin());

-- 2. correction_values table
CREATE TABLE public.correction_values (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  correction_id text NOT NULL REFERENCES public.corrections(id) ON DELETE CASCADE,
  nutrient_type_id text NOT NULL REFERENCES public.nutrient_types(id) ON DELETE CASCADE,
  value_kg_ha numeric NOT NULL,
  UNIQUE (correction_id, nutrient_type_id)
);

ALTER TABLE public.correction_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "correction_values_read" ON public.correction_values FOR SELECT USING (true);
CREATE POLICY "correction_values_admin" ON public.correction_values FOR ALL USING (public.is_admin());

CREATE INDEX idx_correction_values_correction_id ON public.correction_values(correction_id);

-- 3. Migrate data from n_corrections → corrections (sort_order=0 as placeholder)
INSERT INTO public.corrections (id, type, label_de, sort_order)
SELECT id, type, label_de, 0
FROM public.n_corrections;

-- 3b. Set proper sort_order values for known seed data
UPDATE public.corrections SET sort_order = row_number FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY type ORDER BY label_de) AS row_number
  FROM public.corrections
) sub WHERE corrections.id = sub.id;

-- 4. Migrate correction values (correction_kg_n → correction_values with N nutrient)
INSERT INTO public.correction_values (correction_id, nutrient_type_id, value_kg_ha)
SELECT nc.id, nt.id, nc.correction_kg_n
FROM public.n_corrections nc
CROSS JOIN public.nutrient_types nt
WHERE nt.code = 'N';

-- 5. Add 3 FK columns to field_crop_plans
ALTER TABLE public.field_crop_plans
  ADD COLUMN vorfrucht_correction_id text REFERENCES public.corrections(id),
  ADD COLUMN zwischenfrucht_correction_id text REFERENCES public.corrections(id),
  ADD COLUMN humus_correction_id text REFERENCES public.corrections(id);

-- 6. Drop old table
DROP TABLE public.n_corrections;
