// --- Stammdaten (Admin-pflegbar) ---

export interface NutrientType {
  id: string
  code: string
  label_de: string
  unit: string
  sort_order: number
  is_system: boolean
}

export interface Crop {
  id: string
  name_de: string
  category: string
  sow_month_from: number
  sow_month_to: number
  harvest_month_from: number
  harvest_month_to: number
  ref_yield_dt_ha: number
  nmin_depth_cm: number
}

/**
 * Nährstoffbedarf pro Kultur.
 * per_yield_correction: Korrekturwert in kg pro dt Ertragsabweichung vom Referenzertrag.
 * Berechnungsformel: empfehlung = demand_kg_ha + (expected_yield - ref_yield) × per_yield_correction
 */
export interface CropNutrientDemand {
  id: string
  crop_id: string
  nutrient_type_id: string
  demand_kg_ha: number
  ref_yield_dt_ha: number
  per_yield_correction: number
  source: 'lfl' | 'user' | string
  user_id: string | null
  valid_from: string
}

export interface NCorrection {
  id: string
  type: 'vorfrucht' | 'zwischenfrucht' | 'humus'
  label_de: string
  correction_kg_n: number
}

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

export interface Field {
  id: string
  user_id: string
  name: string
  size_ha: number
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
  nutrient_code: string
  value_kg_ha: number
  value_kg_total: number
  source_used: string
}
