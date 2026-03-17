import { describe, it, expect } from 'vitest'
import { mergeDemandsWithUserOverrides } from './crop.service'
import type { CropNutrientDemand } from '@/types'

const LFL_N: CropNutrientDemand = {
  id: 'd-lfl-n',
  crop_id: 'c1',
  nutrient_type_id: 'nt-n',
  demand_kg_ha: 230,
  ref_yield_dt_ha: 75,
  per_yield_correction: 3,
  source: 'lfl',
  user_id: null,
  valid_from: '2025-01-01',
}
const LFL_P: CropNutrientDemand = {
  id: 'd-lfl-p',
  crop_id: 'c1',
  nutrient_type_id: 'nt-p',
  demand_kg_ha: 64,
  ref_yield_dt_ha: 75,
  per_yield_correction: 0.8,
  source: 'lfl',
  user_id: null,
  valid_from: '2025-01-01',
}
const USER_N: CropNutrientDemand = {
  id: 'd-user-n',
  crop_id: 'c1',
  nutrient_type_id: 'nt-n',
  demand_kg_ha: 210,
  ref_yield_dt_ha: 75,
  per_yield_correction: 3,
  source: 'user',
  user_id: 'u1',
  valid_from: '2026-01-01',
}

describe('mergeDemandsWithUserOverrides', () => {
  it('returns LfL demands unchanged when user array is empty', () => {
    const result = mergeDemandsWithUserOverrides([LFL_N, LFL_P], [])
    expect(result).toEqual([LFL_N, LFL_P])
  })

  it('replaces LfL demand with user demand for same nutrient_type_id', () => {
    const result = mergeDemandsWithUserOverrides([LFL_N, LFL_P], [USER_N])
    expect(result).toHaveLength(2)
    const n = result.find((d) => d.nutrient_type_id === 'nt-n')!
    expect(n.source).toBe('user')
    expect(n.demand_kg_ha).toBe(210)
  })

  it('keeps LfL demand for nutrients without user override', () => {
    const result = mergeDemandsWithUserOverrides([LFL_N, LFL_P], [USER_N])
    const p = result.find((d) => d.nutrient_type_id === 'nt-p')!
    expect(p.source).toBe('lfl')
    expect(p.demand_kg_ha).toBe(64)
  })

  it('works with empty lflDemands array', () => {
    expect(mergeDemandsWithUserOverrides([], [])).toEqual([])
    expect(mergeDemandsWithUserOverrides([], [USER_N])).toEqual([])
  })

  it('mergeDemandsWithUserOverrides — backward compat: no user array = LfL only', () => {
    const result = mergeDemandsWithUserOverrides([LFL_N], [])
    expect(result[0].source).toBe('lfl')
  })
})
