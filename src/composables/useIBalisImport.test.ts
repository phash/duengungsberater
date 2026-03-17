import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FeatureCollection, Polygon } from 'geojson'

// Mock shpjs before importing the module under test
vi.mock('shpjs', () => ({
  default: vi.fn(),
}))

import shp from 'shpjs'
import { parseZip } from './useIBalisImport'

const mockPolygon: Polygon = {
  type: 'Polygon',
  // EPSG:25832 coordinates near Munich: E~691576, N~5334844
  coordinates: [
    [
      [691576, 5334844],
      [691676, 5334844],
      [691676, 5334944],
      [691576, 5334944],
      [691576, 5334844],
    ],
  ],
}

function makeFile() {
  return new File(['dummy'], 'test.zip', { type: 'application/zip' })
}

describe('parseZip', () => {
  beforeEach(() => {
    vi.mocked(shp).mockReset()
  })

  it('extracts field name from BEZEICHNUNG attribute', async () => {
    vi.mocked(shp).mockResolvedValue({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { BEZEICHNUNG: 'Schlag Nord', FLAECHE_HA: '12.5' },
          geometry: mockPolygon,
        },
      ],
    } as FeatureCollection)

    const result = await parseZip(makeFile())
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Schlag Nord')
  })

  it('falls back to FLST_BEZEICHNUNG when BEZEICHNUNG is missing', async () => {
    vi.mocked(shp).mockResolvedValue({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { FLST_BEZEICHNUNG: 'Schlag Süd', FLAECHE_HA: '8.0' },
          geometry: mockPolygon,
        },
      ],
    } as FeatureCollection)

    const result = await parseZip(makeFile())
    expect(result[0].name).toBe('Schlag Süd')
  })

  it('extracts area_ha from FLAECHE_HA attribute', async () => {
    vi.mocked(shp).mockResolvedValue({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { BEZEICHNUNG: 'Test', FLAECHE_HA: '5.25' },
          geometry: mockPolygon,
        },
      ],
    } as FeatureCollection)

    const result = await parseZip(makeFile())
    expect(result[0].area_ha).toBeCloseTo(5.25, 2)
  })

  it('converts EPSG:25832 coordinates to WGS84', async () => {
    vi.mocked(shp).mockResolvedValue({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { BEZEICHNUNG: 'München Mitte', FLAECHE_HA: '1.0' },
          geometry: mockPolygon,
        },
      ],
    } as FeatureCollection)

    const result = await parseZip(makeFile())
    const [lon, lat] = result[0].geometry.coordinates[0][0] as [number, number]

    // Munich area: lon ~11.5, lat ~48.1
    expect(lon).toBeGreaterThan(11)
    expect(lon).toBeLessThan(12)
    expect(lat).toBeGreaterThan(47.5)
    expect(lat).toBeLessThan(48.5)
  })

  it('handles multiple features', async () => {
    vi.mocked(shp).mockResolvedValue({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { BEZEICHNUNG: 'Feld A', FLAECHE_HA: '10' },
          geometry: mockPolygon,
        },
        {
          type: 'Feature',
          properties: { BEZEICHNUNG: 'Feld B', FLAECHE_HA: '5' },
          geometry: mockPolygon,
        },
      ],
    } as FeatureCollection)

    const result = await parseZip(makeFile())
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Feld A')
    expect(result[1].name).toBe('Feld B')
  })

  it('throws on parse error', async () => {
    vi.mocked(shp).mockRejectedValue(new Error('Invalid ZIP'))

    await expect(parseZip(makeFile())).rejects.toThrow()
  })
})
