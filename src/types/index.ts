// --- Stammdaten (Admin-pflegbar) ---

export interface NutrientType {
  id: string
  code: string        // 'N' | 'P2O5' | 'K2O' | 'MgO' | 'S' | ...
  label_de: string    // 'Stickstoff' | 'Phosphat' | ...
  unit: string        // 'kg/ha'
  sort_order: number
  is_system: boolean  // true = LfL-Standard, false = user-angelegt
}

export interface Crop {
  id: string
  name_de: string
  category: string         // 'Getreide' | 'Hackfrüchte' | 'Futterpflanzen' | ...
  sow_month_from: number   // 1-12
  sow_month_to: number
  harvest_month_from: number
  harvest_month_to: number
  ref_yield_dt_ha: number  // Referenzertrag dt/ha
  nmin_depth_cm: number    // 0, 60, oder 90
}

/**
 * Nährstoffbedarf pro Kultur.
 *
 * `per_yield_correction`: Korrekturwert in kg pro dt Ertragsabweichung vom Referenzertrag.
 * - Für N (Tab. 9a): Zuschlag/Abschlag zum N-Bedarfswert pro dt Mehrertrag/Minderertrag.
 * - Für P2O5/K2O/MgO/S (Tab. 1a): Nährstoffgehalt in kg/dt Frischmasse.
 *   `demand_kg_ha = gehalt_kg_dt × ref_yield_dt_ha`, Ertragskorrektur = `gehalt_kg_dt × yield_diff`.
 *
 * Die Berechnungsformel ist für alle Nährstoffe identisch:
 *   empfehlung = demand_kg_ha + (expected_yield - ref_yield) × per_yield_correction
 */
export interface CropNutrientDemand {
  id: string
  crop_id: string
  nutrient_type_id: string
  demand_kg_ha: number
  ref_yield_dt_ha: number
  per_yield_correction: number
  source: 'lfl' | 'user'
  user_id: string | null         // null = globaler LfL-Wert
  valid_from: string             // ISO-Datum
}

export interface Correction {
  id: string
  type: 'vorfrucht' | 'zwischenfrucht' | 'humus'
  label_de: string
  sort_order: number
  created_at?: string
}

export interface CorrectionValue {
  id: string
  correction_id: string
  nutrient_type_id: string
  value_kg_ha: number
}

export interface ActiveCorrection {
  correction: Correction
  values: CorrectionValue[]
}

// Spec-Erweiterung: mgo_pct und s_pct hinzugefügt (→ Spec Task 0)
export interface FertilizerProduct {
  id: string
  name: string
  n_pct: number
  p2o5_pct: number
  k2o_pct: number
  mgo_pct: number
  s_pct: number
  form: 'mineral' | 'organic'
  affiliate_url: string
  shop_name: string
  active: boolean
}

// --- Landwirt-Daten ---
// Spec-Erweiterung: synced, created_at, updated_at hinzugefügt (→ Spec Task 0)

export interface Field {
  id: string
  user_id: string
  name: string
  size_ha: number
  nmin_0_30: number | null
  nmin_30_60: number | null
  nmin_60_90: number | null
  synced: boolean
  created_at: string
  updated_at: string
}

export interface FieldCropPlan {
  id: string
  field_id: string
  crop_id: string
  season_year: number
  expected_yield_dt_ha: number
  vorfrucht_correction_id: string | null
  zwischenfrucht_correction_id: string | null
  humus_correction_id: string | null
  synced: boolean
  created_at: string
  updated_at: string
}

export interface Recommendation {
  id: string
  field_crop_plan_id: string
  calculated_at: string
  calculated_offline: boolean
}

export interface RecommendationValue {
  id: string
  recommendation_id: string
  nutrient_type_id: string
  value_kg_ha: number
  value_kg_total: number
  source_used: 'lfl' | 'user'
}

// --- UI-spezifische Typen ---

export interface CorrectionBreakdownItem {
  label: string
  value_kg_ha: number
}

export interface NutrientResult {
  nutrient_code: string
  nutrient_label: string
  value_kg_ha: number
  value_kg_total: number
  unit: string
  breakdown?: {
    base_demand_kg_ha: number
    yield_correction_kg_ha: number
    corrections_kg_ha: CorrectionBreakdownItem[]
  }
}

export interface ProductMatch {
  product: FertilizerProduct
  amount_kg_ha: number
  amount_kg_total: number
}
