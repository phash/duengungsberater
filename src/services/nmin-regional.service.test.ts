import { describe, it, expect } from 'vitest'
import { lookupNmin } from './nmin-regional.service'
import type { NminRegionalValue, NminCropGroupMapping } from '@/types'

const mappings: NminCropGroupMapping[] = [
  { crop_id: 'crop-winterweizen', crop_group: 'W-Weizen, Dinkel' },
  { crop_id: 'crop-kartoffeln', crop_group: 'Kartoffeln' },
]

const values: NminRegionalValue[] = [
  { id: '1', crop_group: 'W-Weizen, Dinkel', region: 'oberbayern', depth_cm: 90, year: 2026, value_kg_ha: 54, is_preliminary: false },
  { id: '2', crop_group: 'W-Weizen, Dinkel', region: 'schwaben', depth_cm: 90, year: 2026, value_kg_ha: 48, is_preliminary: false },
  { id: '3', crop_group: 'Kartoffeln', region: 'oberbayern', depth_cm: 60, year: 2026, value_kg_ha: 38, is_preliminary: false },
  { id: '4', crop_group: 'Sonstige Fruchtarten (90)', region: 'oberbayern', depth_cm: 90, year: 2026, value_kg_ha: 61, is_preliminary: false },
  { id: '5', crop_group: 'Sonstige Fruchtarten (60)', region: 'oberbayern', depth_cm: 60, year: 2026, value_kg_ha: 45, is_preliminary: false },
]

describe('lookupNmin', () => {
  it('returns correct value for mapped crop + region', () => {
    expect(lookupNmin(values, mappings, 'crop-winterweizen', 'oberbayern', 90)).toBe(54)
    expect(lookupNmin(values, mappings, 'crop-winterweizen', 'schwaben', 90)).toBe(48)
    expect(lookupNmin(values, mappings, 'crop-kartoffeln', 'oberbayern', 60)).toBe(38)
  })

  it('returns null for unknown region', () => {
    expect(lookupNmin(values, mappings, 'crop-winterweizen', 'berlin', 90)).toBeNull()
  })

  it('falls back to Sonstige Fruchtarten for unmapped crops', () => {
    expect(lookupNmin(values, mappings, 'crop-unknown', 'oberbayern', 90)).toBe(61)
    expect(lookupNmin(values, mappings, 'crop-unknown', 'oberbayern', 60)).toBe(45)
  })

  it('returns null when no values exist at all', () => {
    expect(lookupNmin([], mappings, 'crop-winterweizen', 'oberbayern', 90)).toBeNull()
  })
})
