-- ============================================================
-- Seed data for Düngungsberater
-- Run after migrations with: npx supabase db reset
-- ============================================================

-- Note: crop_nutrient_demands and fertilizer_products
-- are seeded by the app's constants files on first load via cacheStammdaten().
-- Crops are seeded here to satisfy FK constraints for user demands in E2E tests.

-- Crops (LfL Basisdaten Bayern) — needed for FK in crop_nutrient_demands
INSERT INTO public.crops (id, name_de, category, sow_month_from, sow_month_to, harvest_month_from, harvest_month_to, ref_yield_dt_ha, nmin_depth_cm) VALUES
  ('crop-winterweizen',    'Winterweizen (E, A)', 'Getreide', 9, 11, 7, 8, 80, 90),
  ('crop-winterweizen-bc', 'Winterweizen (B, C)', 'Getreide', 9, 11, 7, 8, 80, 90),
  ('crop-wintergerste',    'Wintergerste',        'Getreide', 9, 11, 6, 7, 75, 90),
  ('crop-winterroggen',    'Winterroggen',        'Getreide', 9, 11, 7, 8, 60, 90),
  ('crop-wintertriticale', 'Wintertriticale',     'Getreide', 9, 11, 7, 8, 65, 90),
  ('crop-sommergerste',    'Sommergerste (Brau)', 'Getreide', 3,  4, 7, 8, 45, 60),
  ('crop-hafer',           'Hafer',               'Getreide', 3,  4, 7, 8, 45, 60),
  ('crop-koernermais',     'Körnermais',          'Mais',     4,  5, 9,10, 90, 90),
  ('crop-kartoffeln',      'Kartoffeln',          'Hackfrüchte', 4, 5, 8,10,400, 60),
  ('crop-zuckerrueben',    'Zuckerrüben',         'Hackfrüchte', 4, 5, 9,11,600, 90),
  ('crop-winterraps',      'Winterraps',          'Ölfrüchte',   8,  9, 7, 8, 40, 90),
  ('crop-sonnenblumen',    'Sonnenblumen',        'Ölfrüchte',   4,  5, 8, 9, 28, 60),
  ('crop-silomais',        'Silomais',            'Mais',        4,  5, 9,10,450, 90),
  ('crop-kleegras',        'Kleegras (3 Schnitte)', 'Grünland', 3, 4,  5, 9,100, 60)
ON CONFLICT (id) DO NOTHING;

-- Nutrient types (required by correction_values FK)
INSERT INTO public.nutrient_types (id, code, label_de, unit, sort_order, is_system) VALUES
  ('nt-n', 'N', 'Stickstoff', 'kg/ha', 1, true),
  ('nt-p2o5', 'P2O5', 'Phosphat', 'kg/ha', 2, true),
  ('nt-k2o', 'K2O', 'Kalium', 'kg/ha', 3, true),
  ('nt-mgo', 'MgO', 'Magnesium', 'kg/ha', 4, true),
  ('nt-s', 'S', 'Schwefel', 'kg/ha', 5, true)
ON CONFLICT (id) DO NOTHING;

-- Corrections (LfL Tab. 9f) — use stable IDs matching src/constants/corrections.ts
INSERT INTO public.corrections (id, type, label_de, sort_order) VALUES
  ('corr-vf-winterraps', 'vorfrucht', 'Winterraps', 1),
  ('corr-vf-koernerleguminosen', 'vorfrucht', 'Körnerleguminosen', 2),
  ('corr-vf-kartoffeln', 'vorfrucht', 'Kartoffeln', 3),
  ('corr-vf-zuckerrueben', 'vorfrucht', 'Zuckerrüben', 4),
  ('corr-vf-mais', 'vorfrucht', 'Mais', 5),
  ('corr-vf-getreide', 'vorfrucht', 'Getreide', 6),
  ('corr-zf-leguminosen', 'zwischenfrucht', 'Leguminosen', 1),
  ('corr-zf-nichtleg-ohne', 'zwischenfrucht', 'Nichtleguminosen ohne Abfuhr (Gründüngung)', 2),
  ('corr-zf-nichtleg-mit', 'zwischenfrucht', 'Nichtleguminosen mit Abfuhr', 3),
  ('corr-humus-unter4', 'humus', '< 4% (kein Abschlag)', 1),
  ('corr-humus-ueber4', 'humus', '> 4%', 2)
ON CONFLICT (id) DO NOTHING;

-- Correction values (N-Abschläge)
INSERT INTO public.correction_values (id, correction_id, nutrient_type_id, value_kg_ha) VALUES
  ('cv-vf-winterraps-n', 'corr-vf-winterraps', 'nt-n', -10),
  ('cv-vf-koernerleg-n', 'corr-vf-koernerleguminosen', 'nt-n', -10),
  ('cv-vf-kartoffeln-n', 'corr-vf-kartoffeln', 'nt-n', -10),
  ('cv-vf-zuckerrueben-n', 'corr-vf-zuckerrueben', 'nt-n', 0),
  ('cv-vf-mais-n', 'corr-vf-mais', 'nt-n', 0),
  ('cv-vf-getreide-n', 'corr-vf-getreide', 'nt-n', 0),
  ('cv-zf-leguminosen-n', 'corr-zf-leguminosen', 'nt-n', -10),
  ('cv-zf-nichtleg-ohne-n', 'corr-zf-nichtleg-ohne', 'nt-n', -20),
  ('cv-zf-nichtleg-mit-n', 'corr-zf-nichtleg-mit', 'nt-n', 0),
  ('cv-humus-unter4-n', 'corr-humus-unter4', 'nt-n', 0),
  ('cv-humus-ueber4-n', 'corr-humus-ueber4', 'nt-n', -20)
ON CONFLICT (id) DO NOTHING;
