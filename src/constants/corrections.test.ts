import { describe, it, expect } from 'vitest'
import { DEFAULT_CORRECTIONS, DEFAULT_CORRECTION_VALUES, getCorrectionsByType } from './corrections'

describe('corrections constants (LfL Tab. 9f)', () => {
  it('Kartoffeln Vorfrucht has 0 kg N/ha', () => {
    const kartoffelnCorr = DEFAULT_CORRECTIONS.find((c) => c.label_de === 'Kartoffeln')
    expect(kartoffelnCorr).toBeDefined()
    const nValue = DEFAULT_CORRECTION_VALUES.find(
      (cv) => cv.correction_id === kartoffelnCorr!.id && cv.nutrient_type_id === 'nt-n',
    )
    expect(nValue!.value_kg_ha).toBe(0)
  })

  it('Winterraps Vorfrucht has -10 kg N/ha', () => {
    const rapsCorr = DEFAULT_CORRECTIONS.find((c) => c.label_de === 'Winterraps')
    expect(rapsCorr).toBeDefined()
    const nValue = DEFAULT_CORRECTION_VALUES.find(
      (cv) => cv.correction_id === rapsCorr!.id && cv.nutrient_type_id === 'nt-n',
    )
    expect(nValue!.value_kg_ha).toBe(-10)
  })

  it('Humus > 4% has -20 kg N/ha', () => {
    const humusCorr = DEFAULT_CORRECTIONS.find((c) => c.label_de === '> 4%')
    expect(humusCorr).toBeDefined()
    const nValue = DEFAULT_CORRECTION_VALUES.find(
      (cv) => cv.correction_id === humusCorr!.id && cv.nutrient_type_id === 'nt-n',
    )
    expect(nValue!.value_kg_ha).toBe(-20)
  })

  it('getCorrectionsByType returns sorted vorfrucht corrections', () => {
    const vf = getCorrectionsByType('vorfrucht')
    expect(vf.length).toBeGreaterThanOrEqual(6)
    expect(vf[0].sort_order).toBeLessThanOrEqual(vf[1].sort_order)
  })
})
