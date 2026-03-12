import { describe, it, expect } from 'vitest'
import {
  CROPS,
  CROP_NUTRIENT_DEMANDS,
  getCropById,
  getCropsByCategory,
  getNutrientDemandsForCrop,
} from './crops'

describe('crops constants', () => {
  it('contains at least 10 crops', () => {
    expect(CROPS.length).toBeGreaterThanOrEqual(10)
  })

  it('all crops have required fields', () => {
    for (const crop of CROPS) {
      expect(crop.id).toBeTruthy()
      expect(crop.name_de).toBeTruthy()
      expect(crop.category).toBeTruthy()
      expect(crop.ref_yield_dt_ha).toBeGreaterThan(0)
    }
  })

  describe('getCropById', () => {
    it('finds Winterweizen', () => {
      const crop = getCropById('crop-winterweizen')
      expect(crop).toBeDefined()
      expect(crop!.name_de).toBe('Winterweizen (E, A)')
      expect(crop!.ref_yield_dt_ha).toBe(80)
    })

    it('returns undefined for unknown id', () => {
      expect(getCropById('unknown')).toBeUndefined()
    })
  })

  describe('getCropsByCategory', () => {
    it('filters Getreide', () => {
      const getreide = getCropsByCategory('Getreide')
      expect(getreide.length).toBeGreaterThanOrEqual(5)
      expect(getreide.every((c) => c.category === 'Getreide')).toBe(true)
    })

    it('returns empty for unknown category', () => {
      expect(getCropsByCategory('Blumen')).toHaveLength(0)
    })
  })

  describe('getNutrientDemandsForCrop', () => {
    it('returns 5 nutrient demands for Winterweizen (N, P2O5, K2O, MgO, S)', () => {
      const demands = getNutrientDemandsForCrop('crop-winterweizen')
      expect(demands).toHaveLength(5)
    })

    it('has correct N demand for Winterweizen E/A (LfL Tab. 9a: 230 kg/ha)', () => {
      const demands = getNutrientDemandsForCrop('crop-winterweizen')
      const nDemand = demands.find((d) => d.nutrient_type_id === 'nt-n')
      expect(nDemand).toBeDefined()
      expect(nDemand!.demand_kg_ha).toBe(230)
      expect(nDemand!.per_yield_correction).toBe(1.0)
    })

    it('has correct N demand for Wintergerste (LfL Tab. 9a: 180 kg/ha)', () => {
      const demands = getNutrientDemandsForCrop('crop-wintergerste')
      const nDemand = demands.find((d) => d.nutrient_type_id === 'nt-n')
      expect(nDemand).toBeDefined()
      expect(nDemand!.demand_kg_ha).toBe(180)
    })

    it('returns empty for unknown crop', () => {
      expect(getNutrientDemandsForCrop('unknown')).toHaveLength(0)
    })
  })
})

describe('CROP_NUTRIENT_DEMANDS data integrity', () => {
  it('every demand references an existing crop', () => {
    const cropIds = new Set(CROPS.map((c) => c.id))
    for (const demand of CROP_NUTRIENT_DEMANDS) {
      expect(
        cropIds.has(demand.crop_id),
        `demand ${demand.id} references unknown crop ${demand.crop_id}`,
      ).toBe(true)
    }
  })

  it('every demand has source lfl', () => {
    for (const demand of CROP_NUTRIENT_DEMANDS) {
      expect(demand.source).toBe('lfl')
    }
  })

  it('every crop has exactly 5 nutrient demands', () => {
    for (const crop of CROPS) {
      const demands = CROP_NUTRIENT_DEMANDS.filter((d) => d.crop_id === crop.id)
      expect(demands, `crop ${crop.name_de} should have 5 demands`).toHaveLength(5)
    }
  })
})
