-- ============================================================
-- Nmin-Richtwerte nach Regierungsbezirk (LfL Bayern)
-- ============================================================

-- ============================================================
-- 1. Tabelle: nmin_regional_values
-- ============================================================

CREATE TABLE IF NOT EXISTS public.nmin_regional_values (
  id TEXT PRIMARY KEY,
  crop_group TEXT NOT NULL,
  region TEXT NOT NULL,
  depth_cm INTEGER NOT NULL,
  year INTEGER NOT NULL,
  value_kg_ha NUMERIC NOT NULL,
  is_preliminary BOOLEAN DEFAULT false,
  UNIQUE(crop_group, region, depth_cm, year)
);

ALTER TABLE public.nmin_regional_values ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nmin_regional_values_read" ON public.nmin_regional_values;
CREATE POLICY "nmin_regional_values_read" ON public.nmin_regional_values
  FOR SELECT USING (true);

-- ============================================================
-- 2. Tabelle: nmin_crop_group_mapping
-- ============================================================

CREATE TABLE IF NOT EXISTS public.nmin_crop_group_mapping (
  crop_id TEXT PRIMARY KEY REFERENCES public.crops(id),
  crop_group TEXT NOT NULL
);

ALTER TABLE public.nmin_crop_group_mapping ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nmin_crop_group_mapping_read" ON public.nmin_crop_group_mapping;
CREATE POLICY "nmin_crop_group_mapping_read" ON public.nmin_crop_group_mapping
  FOR SELECT USING (true);

-- ============================================================
-- 3. Region-Spalte auf fields
-- ============================================================

ALTER TABLE public.fields ADD COLUMN IF NOT EXISTS region TEXT;

-- ============================================================
-- 4. Seed: nmin_crop_group_mapping
-- ============================================================

INSERT INTO public.nmin_crop_group_mapping (crop_id, crop_group) VALUES
  ('crop-winterraps',       'W-Raps'),
  ('crop-wintergerste',     'W-Gerste'),
  ('crop-wintertriticale',  'Triticale, W-Roggen'),
  ('crop-winterroggen',     'Triticale, W-Roggen'),
  ('crop-winterweizen',     'W-Weizen, Dinkel'),
  ('crop-winterweizen-bc',  'W-Weizen, Dinkel'),
  ('crop-winterweizen-e',   'W-Weizen, Dinkel'),
  ('crop-zuckerrueben',     'Z-Rüben, F-Rüben'),
  ('crop-silomais',         'Silomais, Körnermais'),
  ('crop-koernermais',      'Silomais, Körnermais'),
  ('crop-sommergerste',     'S-Gerste, Hafer'),
  ('crop-hafer',            'S-Gerste, Hafer'),
  ('crop-sonnenblumen',     'Sonnenblumen, Lein'),
  ('crop-kartoffeln',       'Kartoffeln')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. Seed: nmin_regional_values — Endgültige Werte 2026 (LfL Heft 15/2026)
-- ============================================================

-- ----- 0-90 cm Tiefe -----

-- W-Raps (90 cm)
INSERT INTO public.nmin_regional_values (id, crop_group, region, depth_cm, year, value_kg_ha, is_preliminary) VALUES
  ('nmin-2026-w-raps-oberbayern-90',    'W-Raps', 'oberbayern',    90, 2026, 40, false),
  ('nmin-2026-w-raps-niederbayern-90',   'W-Raps', 'niederbayern',  90, 2026, 41, false),
  ('nmin-2026-w-raps-oberpfalz-90',      'W-Raps', 'oberpfalz',     90, 2026, 41, false),
  ('nmin-2026-w-raps-oberfranken-90',    'W-Raps', 'oberfranken',   90, 2026, 42, false),
  ('nmin-2026-w-raps-mittelfranken-90',  'W-Raps', 'mittelfranken', 90, 2026, 38, false),
  ('nmin-2026-w-raps-unterfranken-90',   'W-Raps', 'unterfranken',  90, 2026, 39, false),
  ('nmin-2026-w-raps-schwaben-90',       'W-Raps', 'schwaben',      90, 2026, 37, false)
ON CONFLICT DO NOTHING;

-- W-Gerste (90 cm)
INSERT INTO public.nmin_regional_values (id, crop_group, region, depth_cm, year, value_kg_ha, is_preliminary) VALUES
  ('nmin-2026-w-gerste-oberbayern-90',    'W-Gerste', 'oberbayern',    90, 2026, 54, false),
  ('nmin-2026-w-gerste-niederbayern-90',   'W-Gerste', 'niederbayern',  90, 2026, 60, false),
  ('nmin-2026-w-gerste-oberpfalz-90',      'W-Gerste', 'oberpfalz',     90, 2026, 51, false),
  ('nmin-2026-w-gerste-oberfranken-90',    'W-Gerste', 'oberfranken',   90, 2026, 49, false),
  ('nmin-2026-w-gerste-mittelfranken-90',  'W-Gerste', 'mittelfranken', 90, 2026, 46, false),
  ('nmin-2026-w-gerste-unterfranken-90',   'W-Gerste', 'unterfranken',  90, 2026, 46, false),
  ('nmin-2026-w-gerste-schwaben-90',       'W-Gerste', 'schwaben',      90, 2026, 45, false)
ON CONFLICT DO NOTHING;

-- Triticale, W-Roggen (90 cm)
INSERT INTO public.nmin_regional_values (id, crop_group, region, depth_cm, year, value_kg_ha, is_preliminary) VALUES
  ('nmin-2026-triticale-w-roggen-oberbayern-90',    'Triticale, W-Roggen', 'oberbayern',    90, 2026, 48, false),
  ('nmin-2026-triticale-w-roggen-niederbayern-90',   'Triticale, W-Roggen', 'niederbayern',  90, 2026, 57, false),
  ('nmin-2026-triticale-w-roggen-oberpfalz-90',      'Triticale, W-Roggen', 'oberpfalz',     90, 2026, 48, false),
  ('nmin-2026-triticale-w-roggen-oberfranken-90',    'Triticale, W-Roggen', 'oberfranken',   90, 2026, 50, false),
  ('nmin-2026-triticale-w-roggen-mittelfranken-90',  'Triticale, W-Roggen', 'mittelfranken', 90, 2026, 44, false),
  ('nmin-2026-triticale-w-roggen-unterfranken-90',   'Triticale, W-Roggen', 'unterfranken',  90, 2026, 48, false),
  ('nmin-2026-triticale-w-roggen-schwaben-90',       'Triticale, W-Roggen', 'schwaben',      90, 2026, 47, false)
ON CONFLICT DO NOTHING;

-- W-Weizen, Dinkel (90 cm)
INSERT INTO public.nmin_regional_values (id, crop_group, region, depth_cm, year, value_kg_ha, is_preliminary) VALUES
  ('nmin-2026-w-weizen-dinkel-oberbayern-90',    'W-Weizen, Dinkel', 'oberbayern',    90, 2026, 54, false),
  ('nmin-2026-w-weizen-dinkel-niederbayern-90',   'W-Weizen, Dinkel', 'niederbayern',  90, 2026, 56, false),
  ('nmin-2026-w-weizen-dinkel-oberpfalz-90',      'W-Weizen, Dinkel', 'oberpfalz',     90, 2026, 62, false),
  ('nmin-2026-w-weizen-dinkel-oberfranken-90',    'W-Weizen, Dinkel', 'oberfranken',   90, 2026, 56, false),
  ('nmin-2026-w-weizen-dinkel-mittelfranken-90',  'W-Weizen, Dinkel', 'mittelfranken', 90, 2026, 51, false),
  ('nmin-2026-w-weizen-dinkel-unterfranken-90',   'W-Weizen, Dinkel', 'unterfranken',  90, 2026, 57, false),
  ('nmin-2026-w-weizen-dinkel-schwaben-90',       'W-Weizen, Dinkel', 'schwaben',      90, 2026, 48, false)
ON CONFLICT DO NOTHING;

-- Z-Rüben, F-Rüben (90 cm)
INSERT INTO public.nmin_regional_values (id, crop_group, region, depth_cm, year, value_kg_ha, is_preliminary) VALUES
  ('nmin-2026-z-rueben-f-rueben-oberbayern-90',    'Z-Rüben, F-Rüben', 'oberbayern',    90, 2026, 59, false),
  ('nmin-2026-z-rueben-f-rueben-niederbayern-90',   'Z-Rüben, F-Rüben', 'niederbayern',  90, 2026, 58, false),
  ('nmin-2026-z-rueben-f-rueben-oberpfalz-90',      'Z-Rüben, F-Rüben', 'oberpfalz',     90, 2026, 53, false),
  ('nmin-2026-z-rueben-f-rueben-oberfranken-90',    'Z-Rüben, F-Rüben', 'oberfranken',   90, 2026, 60, false),
  ('nmin-2026-z-rueben-f-rueben-mittelfranken-90',  'Z-Rüben, F-Rüben', 'mittelfranken', 90, 2026, 62, false),
  ('nmin-2026-z-rueben-f-rueben-unterfranken-90',   'Z-Rüben, F-Rüben', 'unterfranken',  90, 2026, 57, false),
  ('nmin-2026-z-rueben-f-rueben-schwaben-90',       'Z-Rüben, F-Rüben', 'schwaben',      90, 2026, 60, false)
ON CONFLICT DO NOTHING;

-- Silomais, Körnermais (90 cm)
INSERT INTO public.nmin_regional_values (id, crop_group, region, depth_cm, year, value_kg_ha, is_preliminary) VALUES
  ('nmin-2026-silomais-koernermais-oberbayern-90',    'Silomais, Körnermais', 'oberbayern',    90, 2026, 68, false),
  ('nmin-2026-silomais-koernermais-niederbayern-90',   'Silomais, Körnermais', 'niederbayern',  90, 2026, 77, false),
  ('nmin-2026-silomais-koernermais-oberpfalz-90',      'Silomais, Körnermais', 'oberpfalz',     90, 2026, 66, false),
  ('nmin-2026-silomais-koernermais-oberfranken-90',    'Silomais, Körnermais', 'oberfranken',   90, 2026, 67, false),
  ('nmin-2026-silomais-koernermais-mittelfranken-90',  'Silomais, Körnermais', 'mittelfranken', 90, 2026, 62, false),
  ('nmin-2026-silomais-koernermais-unterfranken-90',   'Silomais, Körnermais', 'unterfranken',  90, 2026, 63, false),
  ('nmin-2026-silomais-koernermais-schwaben-90',       'Silomais, Körnermais', 'schwaben',      90, 2026, 58, false)
ON CONFLICT DO NOTHING;

-- Sonstige Fruchtarten 90 cm
INSERT INTO public.nmin_regional_values (id, crop_group, region, depth_cm, year, value_kg_ha, is_preliminary) VALUES
  ('nmin-2026-sonstige-90-oberbayern-90',    'Sonstige Fruchtarten (90)', 'oberbayern',    90, 2026, 61, false),
  ('nmin-2026-sonstige-90-niederbayern-90',   'Sonstige Fruchtarten (90)', 'niederbayern',  90, 2026, 57, false),
  ('nmin-2026-sonstige-90-oberpfalz-90',      'Sonstige Fruchtarten (90)', 'oberpfalz',     90, 2026, 61, false),
  ('nmin-2026-sonstige-90-oberfranken-90',    'Sonstige Fruchtarten (90)', 'oberfranken',   90, 2026, 56, false),
  ('nmin-2026-sonstige-90-mittelfranken-90',  'Sonstige Fruchtarten (90)', 'mittelfranken', 90, 2026, 53, false),
  ('nmin-2026-sonstige-90-unterfranken-90',   'Sonstige Fruchtarten (90)', 'unterfranken',  90, 2026, 59, false),
  ('nmin-2026-sonstige-90-schwaben-90',       'Sonstige Fruchtarten (90)', 'schwaben',      90, 2026, 56, false)
ON CONFLICT DO NOTHING;

-- ----- 0-60 cm Tiefe -----

-- S-Gerste, Hafer (60 cm)
INSERT INTO public.nmin_regional_values (id, crop_group, region, depth_cm, year, value_kg_ha, is_preliminary) VALUES
  ('nmin-2026-s-gerste-hafer-oberbayern-60',    'S-Gerste, Hafer', 'oberbayern',    60, 2026, 52, false),
  ('nmin-2026-s-gerste-hafer-niederbayern-60',   'S-Gerste, Hafer', 'niederbayern',  60, 2026, 42, false),
  ('nmin-2026-s-gerste-hafer-oberpfalz-60',      'S-Gerste, Hafer', 'oberpfalz',     60, 2026, 43, false),
  ('nmin-2026-s-gerste-hafer-oberfranken-60',    'S-Gerste, Hafer', 'oberfranken',   60, 2026, 44, false),
  ('nmin-2026-s-gerste-hafer-mittelfranken-60',  'S-Gerste, Hafer', 'mittelfranken', 60, 2026, 46, false),
  ('nmin-2026-s-gerste-hafer-unterfranken-60',   'S-Gerste, Hafer', 'unterfranken',  60, 2026, 47, false),
  ('nmin-2026-s-gerste-hafer-schwaben-60',       'S-Gerste, Hafer', 'schwaben',      60, 2026, 47, false)
ON CONFLICT DO NOTHING;

-- Sonnenblumen, Lein (60 cm)
INSERT INTO public.nmin_regional_values (id, crop_group, region, depth_cm, year, value_kg_ha, is_preliminary) VALUES
  ('nmin-2026-sonnenblumen-lein-oberbayern-60',    'Sonnenblumen, Lein', 'oberbayern',    60, 2026, 49, false),
  ('nmin-2026-sonnenblumen-lein-niederbayern-60',   'Sonnenblumen, Lein', 'niederbayern',  60, 2026, 44, false),
  ('nmin-2026-sonnenblumen-lein-oberpfalz-60',      'Sonnenblumen, Lein', 'oberpfalz',     60, 2026, 47, false),
  ('nmin-2026-sonnenblumen-lein-oberfranken-60',    'Sonnenblumen, Lein', 'oberfranken',   60, 2026, 49, false),
  ('nmin-2026-sonnenblumen-lein-mittelfranken-60',  'Sonnenblumen, Lein', 'mittelfranken', 60, 2026, 48, false),
  ('nmin-2026-sonnenblumen-lein-unterfranken-60',   'Sonnenblumen, Lein', 'unterfranken',  60, 2026, 50, false),
  ('nmin-2026-sonnenblumen-lein-schwaben-60',       'Sonnenblumen, Lein', 'schwaben',      60, 2026, 47, false)
ON CONFLICT DO NOTHING;

-- Kartoffeln (60 cm)
INSERT INTO public.nmin_regional_values (id, crop_group, region, depth_cm, year, value_kg_ha, is_preliminary) VALUES
  ('nmin-2026-kartoffeln-oberbayern-60',    'Kartoffeln', 'oberbayern',    60, 2026, 38, false),
  ('nmin-2026-kartoffeln-niederbayern-60',   'Kartoffeln', 'niederbayern',  60, 2026, 40, false),
  ('nmin-2026-kartoffeln-oberpfalz-60',      'Kartoffeln', 'oberpfalz',     60, 2026, 41, false),
  ('nmin-2026-kartoffeln-oberfranken-60',    'Kartoffeln', 'oberfranken',   60, 2026, 38, false),
  ('nmin-2026-kartoffeln-mittelfranken-60',  'Kartoffeln', 'mittelfranken', 60, 2026, 37, false),
  ('nmin-2026-kartoffeln-unterfranken-60',   'Kartoffeln', 'unterfranken',  60, 2026, 41, false),
  ('nmin-2026-kartoffeln-schwaben-60',       'Kartoffeln', 'schwaben',      60, 2026, 40, false)
ON CONFLICT DO NOTHING;

-- Sonstige Fruchtarten 60 cm
INSERT INTO public.nmin_regional_values (id, crop_group, region, depth_cm, year, value_kg_ha, is_preliminary) VALUES
  ('nmin-2026-sonstige-60-oberbayern-60',    'Sonstige Fruchtarten (60)', 'oberbayern',    60, 2026, 45, false),
  ('nmin-2026-sonstige-60-niederbayern-60',   'Sonstige Fruchtarten (60)', 'niederbayern',  60, 2026, 43, false),
  ('nmin-2026-sonstige-60-oberpfalz-60',      'Sonstige Fruchtarten (60)', 'oberpfalz',     60, 2026, 45, false),
  ('nmin-2026-sonstige-60-oberfranken-60',    'Sonstige Fruchtarten (60)', 'oberfranken',   60, 2026, 41, false),
  ('nmin-2026-sonstige-60-mittelfranken-60',  'Sonstige Fruchtarten (60)', 'mittelfranken', 60, 2026, 40, false),
  ('nmin-2026-sonstige-60-unterfranken-60',   'Sonstige Fruchtarten (60)', 'unterfranken',  60, 2026, 44, false),
  ('nmin-2026-sonstige-60-schwaben-60',       'Sonstige Fruchtarten (60)', 'schwaben',      60, 2026, 42, false)
ON CONFLICT DO NOTHING;
