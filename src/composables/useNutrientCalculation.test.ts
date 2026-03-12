import { describe, it, expect } from 'vitest'
import { useNutrientCalculation } from './useNutrientCalculation'
import type { CropNutrientDemand, NutrientType, ActiveCorrection } from '@/types'

const NUTRIENT_TYPES: NutrientType[] = [
  { id: 'nt-n',    code: 'N',    label_de: 'Stickstoff', unit: 'kg/ha', sort_order: 1, is_system: true },
  { id: 'nt-p2o5', code: 'P2O5', label_de: 'Phosphat',   unit: 'kg/ha', sort_order: 2, is_system: true },
  { id: 'nt-k2o',  code: 'K2O',  label_de: 'Kalium',     unit: 'kg/ha', sort_order: 3, is_system: true },
  { id: 'nt-mgo',  code: 'MgO',  label_de: 'Magnesium',  unit: 'kg/ha', sort_order: 4, is_system: true },
  { id: 'nt-s',    code: 'S',    label_de: 'Schwefel',    unit: 'kg/ha', sort_order: 5, is_system: true },
]

const WINTERWEIZEN_DEMANDS: CropNutrientDemand[] = [
  { id: 'cnd-ww-n',  crop_id: 'crop-winterweizen', nutrient_type_id: 'nt-n',    demand_kg_ha: 230, ref_yield_dt_ha: 80, per_yield_correction: 1.0,  source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-ww-p',  crop_id: 'crop-winterweizen', nutrient_type_id: 'nt-p2o5', demand_kg_ha: 64,  ref_yield_dt_ha: 80, per_yield_correction: 0.80, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-ww-k',  crop_id: 'crop-winterweizen', nutrient_type_id: 'nt-k2o',  demand_kg_ha: 48,  ref_yield_dt_ha: 80, per_yield_correction: 0.60, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-ww-mg', crop_id: 'crop-winterweizen', nutrient_type_id: 'nt-mgo',  demand_kg_ha: 12.8, ref_yield_dt_ha: 80, per_yield_correction: 0.16, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-ww-s',  crop_id: 'crop-winterweizen', nutrient_type_id: 'nt-s',    demand_kg_ha: 9.6, ref_yield_dt_ha: 80, per_yield_correction: 0.12, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
]

describe('useNutrientCalculation', () => {
  const { calculateNutrientDemand } = useNutrientCalculation()

  describe('calculateNutrientDemand', () => {
    it('calculates N demand at reference yield (no correction)', () => {
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 10)
      const n = results.find((r) => r.nutrient_code === 'N')!
      expect(n.value_kg_ha).toBe(230)
      expect(n.value_kg_total).toBe(2300)
    })

    it('calculates N demand with higher yield (+10 dt/ha)', () => {
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 90, 10)
      const n = results.find((r) => r.nutrient_code === 'N')!
      expect(n.value_kg_ha).toBe(240)
      expect(n.value_kg_total).toBe(2400)
    })

    it('calculates N demand with lower yield (-20 dt/ha)', () => {
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 60, 5)
      const n = results.find((r) => r.nutrient_code === 'N')!
      expect(n.value_kg_ha).toBe(210)
      expect(n.value_kg_total).toBe(1050)
    })

    it('calculates P2O5 demand at reference yield', () => {
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 12.5)
      const p = results.find((r) => r.nutrient_code === 'P2O5')!
      expect(p.value_kg_ha).toBe(64)
      expect(p.value_kg_total).toBe(800)
    })

    it('calculates P2O5 demand with yield correction', () => {
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 90, 10)
      const p = results.find((r) => r.nutrient_code === 'P2O5')!
      expect(p.value_kg_ha).toBe(72)
    })

    it('calculates all 5 nutrients (N, P2O5, K2O, MgO, S)', () => {
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 10)
      expect(results).toHaveLength(5)
      expect(results.map((r) => r.nutrient_code)).toEqual(['N', 'P2O5', 'K2O', 'MgO', 'S'])
    })

    it('sorts results by nutrient sort_order', () => {
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 10)
      expect(results[0].nutrient_code).toBe('N')
      expect(results[4].nutrient_code).toBe('S')
    })

    it('returns empty array when no demands provided', () => {
      const results = calculateNutrientDemand([], NUTRIENT_TYPES, 80, 10)
      expect(results).toHaveLength(0)
    })

    it('sets nutrient_label and unit from NutrientType', () => {
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 10)
      const n = results.find((r) => r.nutrient_code === 'N')!
      expect(n.nutrient_label).toBe('Stickstoff')
      expect(n.unit).toBe('kg/ha')
    })

    it('clamps value_kg_ha to zero when yield diff would make it negative', () => {
      // S has demand=9.6 at ref_yield=80, per_yield_correction=0.12
      // At yield=0: raw = 9.6 + (0-80)*0.12 = 9.6 - 9.6 = 0
      // Need even lower yield to trigger negative clamp
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, -100, 1)
      const s = results.find((r) => r.nutrient_code === 'S')!
      // raw = 9.6 + (-100-80)*0.12 = 9.6 - 21.6 = -12.0 → clamped to 0
      expect(s.value_kg_ha).toBe(0)
    })

    // --- Stufe 2: Korrekturfaktoren ---

    it('returns identical results without activeCorrections parameter (backward compat)', () => {
      const withoutParam = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 10)
      const withEmptyParam = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 10, [])
      expect(withoutParam).toEqual(withEmptyParam)
    })

    it('applies single N correction (Vorfrucht Winterraps: -10 kg N/ha)', () => {
      const corrections: ActiveCorrection[] = [{
        correction: { id: 'c1', type: 'vorfrucht', label_de: 'Winterraps', sort_order: 1 },
        values: [{ id: 'cv1', correction_id: 'c1', nutrient_type_id: 'nt-n', value_kg_ha: -10 }],
      }]
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 10, corrections)
      const n = results.find(r => r.nutrient_code === 'N')!
      expect(n.value_kg_ha).toBe(220) // 230 - 10
      expect(n.value_kg_total).toBe(2200)
    })

    it('applies cumulative corrections (-10 -20 -20 = -50 kg N/ha)', () => {
      const corrections: ActiveCorrection[] = [
        {
          correction: { id: 'c1', type: 'vorfrucht', label_de: 'Winterraps', sort_order: 1 },
          values: [{ id: 'cv1', correction_id: 'c1', nutrient_type_id: 'nt-n', value_kg_ha: -10 }],
        },
        {
          correction: { id: 'c2', type: 'zwischenfrucht', label_de: 'Nichtleg. ohne Abfuhr', sort_order: 1 },
          values: [{ id: 'cv2', correction_id: 'c2', nutrient_type_id: 'nt-n', value_kg_ha: -20 }],
        },
        {
          correction: { id: 'c3', type: 'humus', label_de: '> 4%', sort_order: 1 },
          values: [{ id: 'cv3', correction_id: 'c3', nutrient_type_id: 'nt-n', value_kg_ha: -20 }],
        },
      ]
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 10, corrections)
      const n = results.find(r => r.nutrient_code === 'N')!
      expect(n.value_kg_ha).toBe(180) // 230 - 50
    })

    it('clamps to zero when corrections make result negative', () => {
      const corrections: ActiveCorrection[] = [{
        correction: { id: 'c1', type: 'vorfrucht', label_de: 'Test', sort_order: 1 },
        values: [{ id: 'cv1', correction_id: 'c1', nutrient_type_id: 'nt-s', value_kg_ha: -100 }],
      }]
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 1, corrections)
      const s = results.find(r => r.nutrient_code === 'S')!
      // S raw = 9.6 - 100 = -90.4 → clamped to 0
      expect(s.value_kg_ha).toBe(0)
    })

    it('does not affect nutrients without correction values', () => {
      const corrections: ActiveCorrection[] = [{
        correction: { id: 'c1', type: 'vorfrucht', label_de: 'Winterraps', sort_order: 1 },
        values: [{ id: 'cv1', correction_id: 'c1', nutrient_type_id: 'nt-n', value_kg_ha: -10 }],
      }]
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 10, corrections)
      const p = results.find(r => r.nutrient_code === 'P2O5')!
      expect(p.value_kg_ha).toBe(64) // unchanged
    })

    it('includes breakdown when corrections are provided', () => {
      const corrections: ActiveCorrection[] = [{
        correction: { id: 'c1', type: 'vorfrucht', label_de: 'Winterraps', sort_order: 1 },
        values: [{ id: 'cv1', correction_id: 'c1', nutrient_type_id: 'nt-n', value_kg_ha: -10 }],
      }]
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 90, 10, corrections)
      const n = results.find(r => r.nutrient_code === 'N')!
      expect(n.breakdown).toBeDefined()
      expect(n.breakdown!.base_demand_kg_ha).toBe(230)
      expect(n.breakdown!.yield_correction_kg_ha).toBe(10) // (90-80)*1.0
      expect(n.breakdown!.corrections_kg_ha).toEqual([
        { label: 'Vorfrucht (Winterraps)', value_kg_ha: -10 },
      ])
      expect(n.value_kg_ha).toBe(230) // 230 + 10 - 10 = 230
    })
  })
})
