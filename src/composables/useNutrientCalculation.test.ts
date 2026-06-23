import { describe, it, expect } from 'vitest'
import { useNutrientCalculation } from './useNutrientCalculation'
import type { CropNutrientDemand, NutrientType, ActiveCorrection } from '@/types'

const NUTRIENT_TYPES: NutrientType[] = [
  { id: 'nt-n', code: 'N', label_de: 'Stickstoff', unit: 'kg/ha', sort_order: 1, is_system: true },
  {
    id: 'nt-p2o5',
    code: 'P2O5',
    label_de: 'Phosphat',
    unit: 'kg/ha',
    sort_order: 2,
    is_system: true,
  },
  { id: 'nt-k2o', code: 'K2O', label_de: 'Kalium', unit: 'kg/ha', sort_order: 3, is_system: true },
  {
    id: 'nt-mgo',
    code: 'MgO',
    label_de: 'Magnesium',
    unit: 'kg/ha',
    sort_order: 4,
    is_system: true,
  },
  { id: 'nt-s', code: 'S', label_de: 'Schwefel', unit: 'kg/ha', sort_order: 5, is_system: true },
]

const WINTERWEIZEN_DEMANDS: CropNutrientDemand[] = [
  {
    id: 'cnd-ww-n',
    crop_id: 'crop-winterweizen',
    nutrient_type_id: 'nt-n',
    demand_kg_ha: 230,
    ref_yield_dt_ha: 80,
    per_yield_correction: 1.0,
    source: 'lfl',
    user_id: null,
    valid_from: '2025-01-01',
  },
  {
    id: 'cnd-ww-p',
    crop_id: 'crop-winterweizen',
    nutrient_type_id: 'nt-p2o5',
    demand_kg_ha: 64,
    ref_yield_dt_ha: 80,
    per_yield_correction: 0.8,
    source: 'lfl',
    user_id: null,
    valid_from: '2025-01-01',
  },
  {
    id: 'cnd-ww-k',
    crop_id: 'crop-winterweizen',
    nutrient_type_id: 'nt-k2o',
    demand_kg_ha: 48,
    ref_yield_dt_ha: 80,
    per_yield_correction: 0.6,
    source: 'lfl',
    user_id: null,
    valid_from: '2025-01-01',
  },
  {
    id: 'cnd-ww-mg',
    crop_id: 'crop-winterweizen',
    nutrient_type_id: 'nt-mgo',
    demand_kg_ha: 12.8,
    ref_yield_dt_ha: 80,
    per_yield_correction: 0.16,
    source: 'lfl',
    user_id: null,
    valid_from: '2025-01-01',
  },
  {
    id: 'cnd-ww-s',
    crop_id: 'crop-winterweizen',
    nutrient_type_id: 'nt-s',
    demand_kg_ha: 9.6,
    ref_yield_dt_ha: 80,
    per_yield_correction: 0.12,
    source: 'lfl',
    user_id: null,
    valid_from: '2025-01-01',
  },
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
      const withEmptyParam = calculateNutrientDemand(
        WINTERWEIZEN_DEMANDS,
        NUTRIENT_TYPES,
        80,
        10,
        [],
      )
      expect(withoutParam).toEqual(withEmptyParam)
    })

    it('applies single N correction (Vorfrucht Winterraps: -10 kg N/ha)', () => {
      const corrections: ActiveCorrection[] = [
        {
          correction: { id: 'c1', type: 'vorfrucht', label_de: 'Winterraps', sort_order: 1 },
          values: [{ id: 'cv1', correction_id: 'c1', nutrient_type_id: 'nt-n', value_kg_ha: -10 }],
        },
      ]
      const results = calculateNutrientDemand(
        WINTERWEIZEN_DEMANDS,
        NUTRIENT_TYPES,
        80,
        10,
        corrections,
      )
      const n = results.find((r) => r.nutrient_code === 'N')!
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
          correction: {
            id: 'c2',
            type: 'zwischenfrucht',
            label_de: 'Nichtleg. ohne Abfuhr',
            sort_order: 1,
          },
          values: [{ id: 'cv2', correction_id: 'c2', nutrient_type_id: 'nt-n', value_kg_ha: -20 }],
        },
        {
          correction: { id: 'c3', type: 'humus', label_de: '> 4%', sort_order: 1 },
          values: [{ id: 'cv3', correction_id: 'c3', nutrient_type_id: 'nt-n', value_kg_ha: -20 }],
        },
      ]
      const results = calculateNutrientDemand(
        WINTERWEIZEN_DEMANDS,
        NUTRIENT_TYPES,
        80,
        10,
        corrections,
      )
      const n = results.find((r) => r.nutrient_code === 'N')!
      expect(n.value_kg_ha).toBe(180) // 230 - 50
    })

    it('clamps to zero when corrections make result negative', () => {
      const corrections: ActiveCorrection[] = [
        {
          correction: { id: 'c1', type: 'vorfrucht', label_de: 'Test', sort_order: 1 },
          values: [{ id: 'cv1', correction_id: 'c1', nutrient_type_id: 'nt-s', value_kg_ha: -100 }],
        },
      ]
      const results = calculateNutrientDemand(
        WINTERWEIZEN_DEMANDS,
        NUTRIENT_TYPES,
        80,
        1,
        corrections,
      )
      const s = results.find((r) => r.nutrient_code === 'S')!
      // S raw = 9.6 - 100 = -90.4 → clamped to 0
      expect(s.value_kg_ha).toBe(0)
    })

    it('does not affect nutrients without correction values', () => {
      const corrections: ActiveCorrection[] = [
        {
          correction: { id: 'c1', type: 'vorfrucht', label_de: 'Winterraps', sort_order: 1 },
          values: [{ id: 'cv1', correction_id: 'c1', nutrient_type_id: 'nt-n', value_kg_ha: -10 }],
        },
      ]
      const results = calculateNutrientDemand(
        WINTERWEIZEN_DEMANDS,
        NUTRIENT_TYPES,
        80,
        10,
        corrections,
      )
      const p = results.find((r) => r.nutrient_code === 'P2O5')!
      expect(p.value_kg_ha).toBe(64) // unchanged
    })

    it('includes breakdown when corrections are provided', () => {
      const corrections: ActiveCorrection[] = [
        {
          correction: { id: 'c1', type: 'vorfrucht', label_de: 'Winterraps', sort_order: 1 },
          values: [{ id: 'cv1', correction_id: 'c1', nutrient_type_id: 'nt-n', value_kg_ha: -10 }],
        },
      ]
      const results = calculateNutrientDemand(
        WINTERWEIZEN_DEMANDS,
        NUTRIENT_TYPES,
        90,
        10,
        corrections,
      )
      const n = results.find((r) => r.nutrient_code === 'N')!
      expect(n.breakdown).toBeDefined()
      expect(n.breakdown!.base_demand_kg_ha).toBe(230)
      expect(n.breakdown!.yield_correction_kg_ha).toBe(10) // (90-80)*1.0
      expect(n.breakdown!.corrections_kg_ha).toEqual([
        { label: 'Vorfrucht (Winterraps)', value_kg_ha: -10 },
      ])
      expect(n.value_kg_ha).toBe(230) // 230 + 10 - 10 = 230
    })

    // --- Stufe 3: Nmin-Messwerte ---

    it('returns identical N results without nminKgHa parameter (backward compat)', () => {
      const withoutNmin = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 10)
      const withZeroNmin = calculateNutrientDemand(
        WINTERWEIZEN_DEMANDS,
        NUTRIENT_TYPES,
        80,
        10,
        undefined,
        0,
      )
      const withUndefinedNmin = calculateNutrientDemand(
        WINTERWEIZEN_DEMANDS,
        NUTRIENT_TYPES,
        80,
        10,
        undefined,
        undefined,
      )
      expect(withoutNmin).toEqual(withZeroNmin)
      expect(withoutNmin).toEqual(withUndefinedNmin)
    })

    it('deducts Nmin from N only (45 kg N/ha)', () => {
      const results = calculateNutrientDemand(
        WINTERWEIZEN_DEMANDS,
        NUTRIENT_TYPES,
        80,
        10,
        undefined,
        45,
      )
      const n = results.find((r) => r.nutrient_code === 'N')!
      expect(n.value_kg_ha).toBe(185) // 230 - 45
      expect(n.value_kg_total).toBe(1850)
    })

    it('does not deduct Nmin from P2O5, K2O, MgO, S', () => {
      const results = calculateNutrientDemand(
        WINTERWEIZEN_DEMANDS,
        NUTRIENT_TYPES,
        80,
        10,
        undefined,
        45,
      )
      expect(results.find((r) => r.nutrient_code === 'P2O5')!.value_kg_ha).toBe(64)
      expect(results.find((r) => r.nutrient_code === 'K2O')!.value_kg_ha).toBe(48)
      expect(results.find((r) => r.nutrient_code === 'MgO')!.value_kg_ha).toBe(12.8)
      expect(results.find((r) => r.nutrient_code === 'S')!.value_kg_ha).toBe(9.6)
    })

    it('clamps to zero when Nmin exceeds N demand', () => {
      const results = calculateNutrientDemand(
        WINTERWEIZEN_DEMANDS,
        NUTRIENT_TYPES,
        80,
        10,
        undefined,
        999,
      )
      const n = results.find((r) => r.nutrient_code === 'N')!
      expect(n.value_kg_ha).toBe(0)
      expect(n.value_kg_total).toBe(0)
    })

    it('applies both corrections and Nmin deduction', () => {
      const corrections: ActiveCorrection[] = [
        {
          correction: { id: 'c1', type: 'vorfrucht', label_de: 'Winterraps', sort_order: 1 },
          values: [{ id: 'cv1', correction_id: 'c1', nutrient_type_id: 'nt-n', value_kg_ha: -10 }],
        },
      ]
      const results = calculateNutrientDemand(
        WINTERWEIZEN_DEMANDS,
        NUTRIENT_TYPES,
        80,
        10,
        corrections,
        45,
      )
      const n = results.find((r) => r.nutrient_code === 'N')!
      expect(n.value_kg_ha).toBe(175) // 230 - 10 - 45
    })

    it('includes Nmin in breakdown when nminKgHa > 0', () => {
      const results = calculateNutrientDemand(
        WINTERWEIZEN_DEMANDS,
        NUTRIENT_TYPES,
        80,
        10,
        undefined,
        45,
      )
      const n = results.find((r) => r.nutrient_code === 'N')!
      expect(n.breakdown).toBeDefined()
      expect(n.breakdown!.corrections_kg_ha).toEqual([
        { label: 'Nmin (Bodenprobe)', value_kg_ha: -45 },
      ])
    })

    it('includes both correction and Nmin items in breakdown', () => {
      const corrections: ActiveCorrection[] = [
        {
          correction: { id: 'c1', type: 'vorfrucht', label_de: 'Winterraps', sort_order: 1 },
          values: [{ id: 'cv1', correction_id: 'c1', nutrient_type_id: 'nt-n', value_kg_ha: -10 }],
        },
      ]
      const results = calculateNutrientDemand(
        WINTERWEIZEN_DEMANDS,
        NUTRIENT_TYPES,
        80,
        10,
        corrections,
        45,
      )
      const n = results.find((r) => r.nutrient_code === 'N')!
      expect(n.breakdown!.corrections_kg_ha).toEqual([
        { label: 'Vorfrucht (Winterraps)', value_kg_ha: -10 },
        { label: 'Nmin (Bodenprobe)', value_kg_ha: -45 },
      ])
    })

    // --- Stufe 4: Asymmetrische Ertragskorrektur (LfL Tab. 9a) ---

    describe('asymmetric yield correction (LfL Tab. 9a)', () => {
      // Winterraps-ähnlich: Zuschlag 2.0, Abschlag 3.0
      const ASYM_DEMANDS: CropNutrientDemand[] = [
        {
          id: 'cnd-asym-n',
          crop_id: 'crop-test',
          nutrient_type_id: 'nt-n',
          demand_kg_ha: 200,
          ref_yield_dt_ha: 40,
          per_yield_correction: 2.0,
          per_yield_correction_below: 3.0,
          source: 'lfl',
          user_id: null,
          valid_from: '2025-01-01',
        },
        {
          id: 'cnd-asym-p',
          crop_id: 'crop-test',
          nutrient_type_id: 'nt-p2o5',
          demand_kg_ha: 48,
          ref_yield_dt_ha: 40,
          per_yield_correction: 1.2,
          source: 'lfl',
          user_id: null,
          valid_from: '2025-01-01',
        },
      ]

      it('uses per_yield_correction (Zuschlag) when yield is ABOVE reference', () => {
        const results = calculateNutrientDemand(ASYM_DEMANDS, NUTRIENT_TYPES, 45, 1)
        const n = results.find((r) => r.nutrient_code === 'N')!
        // 200 + (45-40) * 2.0 = 210
        expect(n.value_kg_ha).toBe(210)
      })

      it('uses per_yield_correction_below (Abschlag) when yield is BELOW reference', () => {
        const results = calculateNutrientDemand(ASYM_DEMANDS, NUTRIENT_TYPES, 35, 1)
        const n = results.find((r) => r.nutrient_code === 'N')!
        // 200 + (35-40) * 3.0 = 200 - 15 = 185
        expect(n.value_kg_ha).toBe(185)
      })

      it('uses per_yield_correction for both directions when _below is not set (P2O5)', () => {
        const results = calculateNutrientDemand(ASYM_DEMANDS, NUTRIENT_TYPES, 35, 1)
        const p = results.find((r) => r.nutrient_code === 'P2O5')!
        // 48 + (35-40) * 1.2 = 48 - 6 = 42
        expect(p.value_kg_ha).toBe(42)
      })

      it('uses per_yield_correction at exact reference yield (no correction)', () => {
        const results = calculateNutrientDemand(ASYM_DEMANDS, NUTRIENT_TYPES, 40, 1)
        const n = results.find((r) => r.nutrient_code === 'N')!
        expect(n.value_kg_ha).toBe(200)
      })

      it('reports correct yield_correction_kg_ha in breakdown (below)', () => {
        const corrections: ActiveCorrection[] = [
          {
            correction: { id: 'c1', type: 'vorfrucht', label_de: 'Dummy', sort_order: 1 },
            values: [{ id: 'cv1', correction_id: 'c1', nutrient_type_id: 'nt-n', value_kg_ha: 0 }],
          },
        ]
        const results = calculateNutrientDemand(ASYM_DEMANDS, NUTRIENT_TYPES, 35, 1, corrections)
        const n = results.find((r) => r.nutrient_code === 'N')!
        expect(n.breakdown!.yield_correction_kg_ha).toBe(-15) // (35-40)*3.0
      })
    })

    // --- Nmin-Label spiegelt die Quelle wider (Bodenprobe vs. LfL-Richtwert) ---

    it('uses "Nmin (Bodenprobe)" as default breakdown label (backward compat)', () => {
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 10, undefined, 45)
      const n = results.find((r) => r.nutrient_code === 'N')!
      expect(n.breakdown!.corrections_kg_ha).toEqual([
        { label: 'Nmin (Bodenprobe)', value_kg_ha: -45 },
      ])
    })

    it('uses a custom Nmin source label in the breakdown when provided', () => {
      const results = calculateNutrientDemand(
        WINTERWEIZEN_DEMANDS,
        NUTRIENT_TYPES,
        80,
        10,
        undefined,
        45,
        'LfL-Richtwert Oberbayern 2026',
      )
      const n = results.find((r) => r.nutrient_code === 'N')!
      expect(n.breakdown!.corrections_kg_ha).toEqual([
        { label: 'Nmin (LfL-Richtwert Oberbayern 2026)', value_kg_ha: -45 },
      ])
    })
  })

  describe('splitNminToLayers', () => {
    const { splitNminToLayers } = useNutrientCalculation()

    it('splits an evenly divisible total into equal thirds', () => {
      expect(splitNminToLayers(90)).toEqual({ nmin_0_30: 30, nmin_30_60: 30, nmin_60_90: 30 })
    })

    it('always preserves the total sum across layers', () => {
      for (const total of [0, 1, 7, 100, 101, 137, 250]) {
        const r = splitNminToLayers(total)
        expect(r.nmin_0_30 + r.nmin_30_60 + r.nmin_60_90).toBe(total)
      }
    })

    it('assigns the remainder to the topsoil layer (0–30 cm, agronomisch nährstoffreichste)', () => {
      expect(splitNminToLayers(100)).toEqual({ nmin_0_30: 34, nmin_30_60: 33, nmin_60_90: 33 })
      expect(splitNminToLayers(101)).toEqual({ nmin_0_30: 35, nmin_30_60: 33, nmin_60_90: 33 })
    })

    it('handles zero', () => {
      expect(splitNminToLayers(0)).toEqual({ nmin_0_30: 0, nmin_30_60: 0, nmin_60_90: 0 })
    })
  })
})
