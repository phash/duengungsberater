import { describe, it, expect } from 'vitest'
import { CROPS, CROP_NUTRIENT_DEMANDS, getCropById, getDemandsForCrop } from './crops'

describe('CROPS', () => {
  it('contains at least 5 crops', () => {
    expect(CROPS.length).toBeGreaterThanOrEqual(5)
  })

  it('has Winterweizen as first entry', () => {
    const ww = CROPS.find((c) => c.id === 'crop-winterweizen')
    expect(ww).toBeDefined()
    expect(ww!.name_de).toBe('Winterweizen (E, A)')
  })

  it('all have unique ids', () => {
    const ids = CROPS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('Winterweizen has ref_yield 80 dt/ha', () => {
    const ww = getCropById('crop-winterweizen')
    expect(ww?.ref_yield_dt_ha).toBe(80)
  })

  it('Silomais has ref_yield 450 dt/ha (Frischmasse)', () => {
    const sm = getCropById('crop-silomais')
    expect(sm?.ref_yield_dt_ha).toBe(450)
  })
})

describe('CROP_NUTRIENT_DEMANDS', () => {
  it('has 25 demands (5 crops × 5 nutrients)', () => {
    expect(CROP_NUTRIENT_DEMANDS).toHaveLength(25)
  })

  it('all have unique ids', () => {
    const ids = CROP_NUTRIENT_DEMANDS.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all have source lfl', () => {
    CROP_NUTRIENT_DEMANDS.forEach((d) => expect(d.source).toBe('lfl'))
  })

  it('Winterweizen N demand = 230 kg/ha', () => {
    const d = CROP_NUTRIENT_DEMANDS.find((d) => d.id === 'cnd-winterweizen-n')
    expect(d).toBeDefined()
    expect(d!.demand_kg_ha).toBe(230)
    expect(d!.per_yield_correction).toBe(1.0)
    expect(d!.ref_yield_dt_ha).toBe(80)
  })

  it('Winterweizen P2O5 demand = 64 kg/ha (0.80 × 80)', () => {
    const d = CROP_NUTRIENT_DEMANDS.find((d) => d.id === 'cnd-winterweizen-p2o5')
    expect(d).toBeDefined()
    expect(d!.demand_kg_ha).toBe(64)
    expect(d!.per_yield_correction).toBe(0.80)
  })

  it('Winterraps N demand = 200 kg/ha with per_yield 1.5', () => {
    const d = CROP_NUTRIENT_DEMANDS.find((d) => d.id === 'cnd-winterraps-n')
    expect(d).toBeDefined()
    expect(d!.demand_kg_ha).toBe(200)
    expect(d!.per_yield_correction).toBe(1.5)
  })

  it('Silomais K2O demand = 216 kg/ha (0.48 × 450)', () => {
    const d = CROP_NUTRIENT_DEMANDS.find((d) => d.id === 'cnd-silomais-k2o')
    expect(d).toBeDefined()
    expect(d!.demand_kg_ha).toBe(216)
    expect(d!.per_yield_correction).toBe(0.48)
  })
})

describe('getCropById', () => {
  it('returns Winterweizen', () => {
    expect(getCropById('crop-winterweizen')?.name_de).toBe('Winterweizen (E, A)')
  })

  it('returns undefined for unknown id', () => {
    expect(getCropById('unknown')).toBeUndefined()
  })
})

describe('getDemandsForCrop', () => {
  it('returns 5 demands for Winterweizen', () => {
    const demands = getDemandsForCrop('crop-winterweizen')
    expect(demands).toHaveLength(5)
  })

  it('returns empty array for unknown crop', () => {
    expect(getDemandsForCrop('unknown')).toHaveLength(0)
  })
})
