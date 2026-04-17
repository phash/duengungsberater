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
  // PK\x03\x04 Magic-Bytes für ZIP-Validierung
  const magic = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
  return new File([magic, 'dummy'], 'test.zip', { type: 'application/zip' })
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

describe('Security-Limits', () => {
  it('MAX_FILE_SIZE_BYTES ist 50 MB', async () => {
    const { MAX_FILE_SIZE_BYTES } = await import('./useIBalisImport')
    expect(MAX_FILE_SIZE_BYTES).toBe(50 * 1024 * 1024)
  })

  it('MAX_RINGS ist 1000', async () => {
    const { MAX_RINGS } = await import('./useIBalisImport')
    expect(MAX_RINGS).toBe(1000)
  })

  it('MAX_POLYGONS ist 1000', async () => {
    const { MAX_POLYGONS } = await import('./useIBalisImport')
    expect(MAX_POLYGONS).toBe(1000)
  })

  it('parseZip lehnt Datei > 50 MB ab', async () => {
    // File.size wird über den Blob berechnet; 51 MB-Array
    const big = new Uint8Array(51 * 1024 * 1024)
    // Magic-Bytes voran, damit Size-Check vor Magic-Check zuschlägt
    big[0] = 0x50; big[1] = 0x4b; big[2] = 0x03; big[3] = 0x04
    const bigFile = new File([big], 'huge.zip', { type: 'application/zip' })
    await expect(parseZip(bigFile)).rejects.toThrow(/zu groß/i)
  })

  it('parseZip lehnt Datei ohne ZIP-Magic-Bytes ab', async () => {
    const fakeFile = new File(
      [new Uint8Array([0x00, 0x01, 0x02, 0x03])],
      'fake.zip',
      { type: 'application/zip' },
    )
    await expect(parseZip(fakeFile)).rejects.toThrow(/kein gültiges zip|magic/i)
  })

  it('parseGpkg lehnt Datei > 50 MB ab', async () => {
    const big = new Uint8Array(51 * 1024 * 1024)
    // SQLite format 3\0 Magic
    const gpkgMagic = [
      0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66,
      0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00,
    ]
    gpkgMagic.forEach((b, i) => { big[i] = b })
    const bigFile = new File([big], 'huge.gpkg', { type: 'application/geopackage+sqlite3' })
    const { parseGpkg } = await import('./useIBalisImport')
    await expect(parseGpkg(bigFile)).rejects.toThrow(/zu groß/i)
  })

  it('parseGpkg lehnt Datei ohne SQLite-Magic-Bytes ab', async () => {
    const fakeFile = new File(
      [new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f])],
      'fake.gpkg',
      { type: 'application/geopackage+sqlite3' },
    )
    const { parseGpkg } = await import('./useIBalisImport')
    await expect(parseGpkg(fakeFile)).rejects.toThrow(/kein gültiges geopackage|sqlite/i)
  })
})
