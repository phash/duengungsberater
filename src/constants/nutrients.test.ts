import { describe, it, expect } from 'vitest'
import { NUTRIENT_TYPES, getNutrientTypeByCode } from './nutrients'

describe('NUTRIENT_TYPES', () => {
  it('contains 5 system nutrients', () => {
    expect(NUTRIENT_TYPES).toHaveLength(5)
  })

  it('has N as first entry', () => {
    expect(NUTRIENT_TYPES[0].code).toBe('N')
    expect(NUTRIENT_TYPES[0].label_de).toBe('Stickstoff')
  })

  it('all have is_system = true', () => {
    NUTRIENT_TYPES.forEach((nt) => expect(nt.is_system).toBe(true))
  })

  it('all have unique ids and codes', () => {
    const ids = NUTRIENT_TYPES.map((nt) => nt.id)
    const codes = NUTRIENT_TYPES.map((nt) => nt.code)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(codes).size).toBe(codes.length)
  })
})

describe('getNutrientTypeByCode', () => {
  it('returns N type', () => {
    expect(getNutrientTypeByCode('N')?.id).toBe('nt-n')
  })

  it('returns undefined for unknown code', () => {
    expect(getNutrientTypeByCode('XYZ')).toBeUndefined()
  })
})
