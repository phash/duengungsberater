import { describe, it, expect } from 'vitest'
import { useNumberFormat } from './useNumberFormat'

describe('useNumberFormat', () => {
  const { formatNumber, formatWithUnit } = useNumberFormat()

  it('formats integer without decimals', () => {
    expect(formatNumber(220)).toBe('220')
  })

  it('formats decimal with German comma', () => {
    expect(formatNumber(12.5)).toBe('12,5')
  })

  it('formats thousands with German dot', () => {
    expect(formatNumber(2750)).toBe('2.750')
  })

  it('formats with unit', () => {
    expect(formatWithUnit(220, 'kg N/ha')).toBe('220 kg N/ha')
  })

  it('formats area', () => {
    expect(formatWithUnit(12.5, 'ha')).toBe('12,5 ha')
  })

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0')
  })
})
