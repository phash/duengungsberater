import { describe, it, expect } from 'vitest'
import { useNumberFormat } from './useNumberFormat'

describe('useNumberFormat', () => {
  const { formatNumber, formatArea, formatNutrientPerHa, formatNutrientTotal, formatYield } = useNumberFormat()

  describe('formatNumber', () => {
    it('formats integer without decimals', () => {
      expect(formatNumber(220)).toBe('220')
    })

    it('formats decimal with German comma', () => {
      expect(formatNumber(12.5)).toBe('12,5')
    })

    it('formats with specified decimal places', () => {
      expect(formatNumber(12.5, 2)).toBe('12,50')
    })

    it('formats thousands with German dot separator', () => {
      expect(formatNumber(2750)).toBe('2.750')
    })
  })

  describe('formatArea', () => {
    it('formats area with unit', () => {
      expect(formatArea(12.5)).toBe('12,50 ha')
    })
  })

  describe('formatNutrientPerHa', () => {
    it('formats nutrient per ha with code', () => {
      expect(formatNutrientPerHa(220, 'N')).toBe('220 kg N/ha')
    })
  })

  describe('formatNutrientTotal', () => {
    it('formats total nutrient with code', () => {
      expect(formatNutrientTotal(2750, 'N')).toBe('2.750 kg N')
    })
  })

  describe('formatYield', () => {
    it('formats yield', () => {
      expect(formatYield(80)).toBe('80 dt/ha')
    })
  })
})
