import { describe, it, expect } from 'vitest'
import { detectRegionFromCoordinates, detectRegionFromGeometry, getRegionLabel } from './regions'

describe('detectRegionFromCoordinates', () => {
  it('detects all 7 Bavarian Regierungsbezirke', () => {
    expect(detectRegionFromCoordinates(11.582, 48.135)).toBe('oberbayern')     // München
    expect(detectRegionFromCoordinates(13.440, 48.574)).toBe('niederbayern')   // Passau
    expect(detectRegionFromCoordinates(12.102, 49.013)).toBe('oberpfalz')      // Regensburg
    expect(detectRegionFromCoordinates(11.058, 50.265)).toBe('oberfranken')    // Bayreuth
    expect(detectRegionFromCoordinates(11.078, 49.454)).toBe('mittelfranken')  // Nürnberg
    expect(detectRegionFromCoordinates(9.930, 49.794)).toBe('unterfranken')    // Würzburg
    expect(detectRegionFromCoordinates(10.898, 48.371)).toBe('schwaben')       // Augsburg
  })

  it('returns null for coordinates outside Bavaria', () => {
    expect(detectRegionFromCoordinates(13.405, 52.520)).toBeNull()  // Berlin
    expect(detectRegionFromCoordinates(8.682, 50.110)).toBeNull()   // Frankfurt
  })
})

describe('detectRegionFromGeometry', () => {
  it('detects region from a simple Polygon', () => {
    // Small polygon around München
    const geometry = {
      type: 'Polygon' as const,
      coordinates: [[[11.5, 48.1], [11.6, 48.1], [11.6, 48.2], [11.5, 48.2], [11.5, 48.1]]],
    }
    expect(detectRegionFromGeometry(geometry)).toBe('oberbayern')
  })

  it('returns null for empty geometry', () => {
    expect(detectRegionFromGeometry({ type: 'Polygon', coordinates: [[]] })).toBeNull()
  })
})

describe('getRegionLabel', () => {
  it('returns label for known codes', () => {
    expect(getRegionLabel('oberbayern')).toBe('Oberbayern')
    expect(getRegionLabel('schwaben')).toBe('Schwaben')
  })

  it('returns code itself for unknown codes', () => {
    expect(getRegionLabel('unknown')).toBe('unknown')
  })
})
