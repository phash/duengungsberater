import { describe, it, expect } from 'vitest'
import { NUTRIENT_TYPES, getNutrientByCode } from './nutrients'

describe('nutrients constants', () => {
  it('contains 5 system nutrient types', () => {
    expect(NUTRIENT_TYPES).toHaveLength(5)
    expect(NUTRIENT_TYPES.every(n => n.is_system)).toBe(true)
  })

  it('has correct codes in sort order', () => {
    const codes = NUTRIENT_TYPES.map(n => n.code)
    expect(codes).toEqual(['N', 'P2O5', 'K2O', 'MgO', 'S'])
  })

  describe('getNutrientByCode', () => {
    it('finds N', () => {
      const n = getNutrientByCode('N')
      expect(n).toBeDefined()
      expect(n!.label_de).toBe('Stickstoff')
    })

    it('finds P2O5', () => {
      const p = getNutrientByCode('P2O5')
      expect(p).toBeDefined()
      expect(p!.label_de).toBe('Phosphat')
    })

    it('returns undefined for unknown code', () => {
      expect(getNutrientByCode('XYZ')).toBeUndefined()
    })
  })
})
