-- Migration: LfL Basisdaten 2025 Korrekturen + asymmetrische N-Ertragskorrektur
-- LfL Tab. 9a: Zuschlag (über Ref.) und Abschlag (unter Ref.) unterscheiden sich für N
-- Wenn NULL, wird per_yield_correction symmetrisch verwendet (P2O5/K2O/MgO/S)

-- 1. Neues Feld für asymmetrische Korrektur
ALTER TABLE crop_nutrient_demands
  ADD COLUMN IF NOT EXISTS per_yield_correction_below numeric DEFAULT NULL;

COMMENT ON COLUMN crop_nutrient_demands.per_yield_correction_below IS
  'Abschlag kg/dt bei Minderertrag (LfL 9a). NULL = symmetrisch (per_yield_correction).';

-- 2. Winterweizen umbenennen
UPDATE crops SET name_de = 'Winterweizen (A, B)' WHERE id = 'crop-winterweizen';
UPDATE crops SET name_de = 'Winterweizen (C)' WHERE id = 'crop-winterweizen-bc';

-- 3. Winterweizen E hinzufügen
INSERT INTO crops (id, name_de, category, sow_month_from, sow_month_to,
  harvest_month_from, harvest_month_to, ref_yield_dt_ha, nmin_depth_cm)
VALUES ('crop-winterweizen-e', 'Winterweizen (E)', 'Getreide', 9, 11, 7, 8, 80, 90)
ON CONFLICT (id) DO UPDATE SET name_de = EXCLUDED.name_de;

INSERT INTO crop_nutrient_demands (id, crop_id, nutrient_type_id, demand_kg_ha,
  ref_yield_dt_ha, per_yield_correction, per_yield_correction_below, source, valid_from)
VALUES
  ('cnd-wwe-n',  'crop-winterweizen-e', 'nt-n',    260,  80, 1.0,  1.5,  'lfl', '2025-01-01'),
  ('cnd-wwe-p',  'crop-winterweizen-e', 'nt-p2o5', 64,   80, 0.8,  NULL, 'lfl', '2025-01-01'),
  ('cnd-wwe-k',  'crop-winterweizen-e', 'nt-k2o',  48,   80, 0.6,  NULL, 'lfl', '2025-01-01'),
  ('cnd-wwe-mg', 'crop-winterweizen-e', 'nt-mgo',  12.8, 80, 0.16, NULL, 'lfl', '2025-01-01'),
  ('cnd-wwe-s',  'crop-winterweizen-e', 'nt-s',    9.6,  80, 0.12, NULL, 'lfl', '2025-01-01')
ON CONFLICT (id) DO UPDATE SET
  demand_kg_ha = EXCLUDED.demand_kg_ha,
  per_yield_correction = EXCLUDED.per_yield_correction,
  per_yield_correction_below = EXCLUDED.per_yield_correction_below;

-- 4. N-Abschlag setzen: Getreide (Zuschlag 1.0, Abschlag 1.5)
UPDATE crop_nutrient_demands SET per_yield_correction_below = 1.5
WHERE nutrient_type_id = 'nt-n' AND source = 'lfl'
  AND crop_id IN (SELECT id FROM crops WHERE category = 'Getreide');

-- 5. Winterraps N: Zuschlag 2.0, Abschlag 3.0
UPDATE crop_nutrient_demands
SET per_yield_correction = 2.0, per_yield_correction_below = 3.0
WHERE id = 'cnd-rap-n';

-- 6. Sonnenblumen N: Zuschlag 2.0, Abschlag 3.0
UPDATE crop_nutrient_demands
SET per_yield_correction = 2.0, per_yield_correction_below = 3.0
WHERE id = 'cnd-sb-n';

-- 7. Silomais N: Zuschlag 0.2, Abschlag 0.3
UPDATE crop_nutrient_demands
SET per_yield_correction = 0.2, per_yield_correction_below = 0.3
WHERE id = 'cnd-sm-n';

-- 8. Zuckerrüben N: Zuschlag 0.1, Abschlag 0.15
UPDATE crop_nutrient_demands SET per_yield_correction_below = 0.15
WHERE id = 'cnd-zr-n';

-- 9. Kartoffeln N: Zuschlag 0.2, Abschlag 0.2 (symmetrisch, aber explizit)
UPDATE crop_nutrient_demands SET per_yield_correction_below = 0.2
WHERE id = 'cnd-ka-n';

-- 10. Winterroggen: ref 60 → 70
UPDATE crops SET ref_yield_dt_ha = 70 WHERE id = 'crop-winterroggen';
UPDATE crop_nutrient_demands SET ref_yield_dt_ha = 70, per_yield_correction_below = 1.5 WHERE id = 'cnd-wr-n';
UPDATE crop_nutrient_demands SET demand_kg_ha = 56, ref_yield_dt_ha = 70 WHERE id = 'cnd-wr-p';
UPDATE crop_nutrient_demands SET demand_kg_ha = 42, ref_yield_dt_ha = 70 WHERE id = 'cnd-wr-k';
UPDATE crop_nutrient_demands SET demand_kg_ha = 9.1, ref_yield_dt_ha = 70 WHERE id = 'cnd-wr-mg';
UPDATE crop_nutrient_demands SET demand_kg_ha = 7.0, ref_yield_dt_ha = 70 WHERE id = 'cnd-wr-s';

-- 11. Sommerbraugerste: N 140→120, ref 55→50
UPDATE crops SET ref_yield_dt_ha = 50 WHERE id = 'crop-sommergerste';
UPDATE crop_nutrient_demands SET demand_kg_ha = 120, ref_yield_dt_ha = 50, per_yield_correction_below = 1.5 WHERE id = 'cnd-sg-n';
UPDATE crop_nutrient_demands SET demand_kg_ha = 40, ref_yield_dt_ha = 50 WHERE id = 'cnd-sg-p';
UPDATE crop_nutrient_demands SET demand_kg_ha = 30, ref_yield_dt_ha = 50 WHERE id = 'cnd-sg-k';
UPDATE crop_nutrient_demands SET demand_kg_ha = 7.0, ref_yield_dt_ha = 50 WHERE id = 'cnd-sg-mg';
UPDATE crop_nutrient_demands SET demand_kg_ha = 5.0, ref_yield_dt_ha = 50 WHERE id = 'cnd-sg-s';

-- 12. Kartoffeln: ref 400→450
UPDATE crops SET ref_yield_dt_ha = 450 WHERE id = 'crop-kartoffeln';
UPDATE crop_nutrient_demands SET ref_yield_dt_ha = 450, per_yield_correction_below = 0.2 WHERE id = 'cnd-ka-n';
UPDATE crop_nutrient_demands SET demand_kg_ha = 67.5, ref_yield_dt_ha = 450 WHERE id = 'cnd-ka-p';
UPDATE crop_nutrient_demands SET demand_kg_ha = 225, ref_yield_dt_ha = 450 WHERE id = 'cnd-ka-k';
UPDATE crop_nutrient_demands SET demand_kg_ha = 27, ref_yield_dt_ha = 450 WHERE id = 'cnd-ka-mg';
UPDATE crop_nutrient_demands SET demand_kg_ha = 18, ref_yield_dt_ha = 450 WHERE id = 'cnd-ka-s';

-- 13. nmin_depth_cm fixen (LfL 9a: "Berechnung Nmin bis 90 cm" = ja)
UPDATE crops SET nmin_depth_cm = 90 WHERE id IN ('crop-koernermais', 'crop-silomais');

-- 14. Kartoffeln Vorfrucht: 0 kg statt -10 (LfL 9f)
UPDATE correction_values SET value_kg_ha = 0 WHERE id = 'cv-vf-kartoffeln-n';
