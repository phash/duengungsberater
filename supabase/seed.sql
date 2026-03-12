-- ============================================================
-- Seed data for Düngungsberater
-- Run after migrations with: npx supabase db reset
-- ============================================================

-- Note: Crops, crop_nutrient_demands, and fertilizer_products
-- are seeded by the app's constants files on first load via cacheStammdaten().

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
