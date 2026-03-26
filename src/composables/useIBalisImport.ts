// src/composables/useIBalisImport.ts
import shp from 'shpjs'
import proj4 from 'proj4'
import type { Polygon, MultiPolygon, Position } from 'geojson'
import sqlWasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url'

// ─── GeoPackage (.gpkg) support ───────────────────────────────────────────────

const WKB_POLYGON = 3
const WKB_MULTIPOLYGON = 6

class WkbReader {
  private view: DataView
  private pos: number
  private le: boolean

  constructor(blob: Uint8Array, offset: number) {
    const slice = blob.slice(offset)
    this.view = new DataView(slice.buffer)
    this.le = slice[0] === 1
    this.pos = 1
  }

  private uint32(): number {
    const v = this.view.getUint32(this.pos, this.le)
    this.pos += 4
    return v
  }

  private float64(): number {
    const v = this.view.getFloat64(this.pos, this.le)
    this.pos += 8
    return v
  }

  private ring(): Position[] {
    const n = this.uint32()
    if (n > 100000) throw new Error(`Ring hat zu viele Punkte: ${n}`)
    const pts: Position[] = []
    for (let i = 0; i < n; i++) {
      const x = this.float64()
      const y = this.float64()
      pts.push(proj4(EPSG25832, 'WGS84', [x, y]) as Position)
    }
    return pts
  }

  private polygon(): Polygon {
    this.pos += 1 // nested byte order byte
    const type = this.uint32()
    if (type !== WKB_POLYGON) throw new Error(`Expected Polygon (3), got ${type}`)
    const numRings = this.uint32()
    const coords: Position[][] = []
    for (let i = 0; i < numRings; i++) coords.push(this.ring())
    return { type: 'Polygon', coordinates: coords }
  }

  read(): Polygon | MultiPolygon {
    const type = this.uint32()
    if (type === WKB_POLYGON) {
      const numRings = this.uint32()
      const coords: Position[][] = []
      for (let i = 0; i < numRings; i++) coords.push(this.ring())
      return { type: 'Polygon', coordinates: coords }
    }
    if (type === WKB_MULTIPOLYGON) {
      const numPolys = this.uint32()
      const polys: Polygon[] = []
      for (let i = 0; i < numPolys; i++) polys.push(this.polygon())
      return { type: 'MultiPolygon', coordinates: polys.map((p) => p.coordinates) }
    }
    throw new Error(`Unsupported WKB geometry type: ${type}`)
  }
}

function parseGpkgGeometry(blob: Uint8Array): Polygon | MultiPolygon {
  // GPKG header: magic(2) + version(1) + flags(1) + srs_id(4) = 8 bytes
  // flags bits 1-3: envelope type → 0=none(0B), 1=bbox(32B), 2=+Z(48B), 3=+M(48B), 4=+ZM(64B)
  const flags = blob[3]!
  const envelopeType = (flags >> 1) & 7
  const envBytes = [0, 32, 48, 48, 64][envelopeType] ?? 0
  const wkbOffset = 8 + envBytes
  return new WkbReader(blob, wkbOffset).read()
}

function parseGpkgArea(raw: unknown): number {
  // Bavarian viewer stores "4,9150 ha" — German decimal comma
  const str = String(raw ?? '0')
    .replace(',', '.')
    .replace(/\s*ha.*/i, '')
    .trim()
  return parseFloat(str) || 0
}

export async function parseGpkg(file: File): Promise<ParsedIBalisFeature[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import('sql.js/dist/sql-wasm-browser.js')
  const initSqlJs = mod.default ?? mod
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl })

  const buffer = await file.arrayBuffer()
  const sqlDb = new SQL.Database(new Uint8Array(buffer))

  const runQuery = (sql: string) => sqlDb.exec(sql)

  // Find the first feature layer
  const contentsRes = runQuery(
    "SELECT table_name FROM gpkg_contents WHERE data_type = 'features' LIMIT 1",
  )
  const tableName =
    (contentsRes[0]?.values[0]?.[0] as string | undefined) ?? 'Feldstücke 2026'

  // Validate table name to prevent SQL injection from manipulated GPKG files
  if (!/^[\w\s\u00C0-\u024F\-().]+$/.test(tableName)) {
    sqlDb.close()
    throw new Error(`Ungültiger Tabellenname in GPKG: ${tableName}`)
  }

  // Find geometry column
  const geomColRes = runQuery(
    `SELECT column_name FROM gpkg_geometry_columns WHERE table_name = '${tableName}' LIMIT 1`,
  )
  const geomCol = (geomColRes[0]?.values[0]?.[0] as string | undefined) ?? 'geometry'

  const rows = runQuery(`SELECT * FROM "${tableName}"`)
  sqlDb.close()

  if (!rows[0]) return []

  const { columns, values } = rows[0]
  const geomIdx = columns.indexOf(geomCol)

  const nameIdx = ['Name', 'BEZEICHNUNG', 'FLST_BEZEICHNUNG', 'NAME']
    .map((k) => columns.indexOf(k))
    .find((i) => i >= 0) ?? -1
  const areaIdx = ['Fläche', 'FLAECHE_HA', 'FLAECHE', 'AREA_HA']
    .map((k) => columns.indexOf(k))
    .find((i) => i >= 0) ?? -1

  return values
    .filter((row: unknown[]) => row[geomIdx] != null)
    .map((row: unknown[]) => ({
      name: nameIdx >= 0 ? String(row[nameIdx] ?? 'Unbekanntes Feld').trim() : 'Unbekanntes Feld',
      area_ha: areaIdx >= 0 ? parseGpkgArea(row[areaIdx]) : 0,
      geometry: parseGpkgGeometry(row[geomIdx] as Uint8Array),
    }))
}

export interface ParsedIBalisFeature {
  name: string
  area_ha: number
  geometry: Polygon | MultiPolygon
}

// EPSG:25832 (ETRS89 / UTM zone 32N)
const EPSG25832 =
  '+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'

function convertRing(ring: Position[]): Position[] {
  return ring.map(([x, y]) => proj4(EPSG25832, 'WGS84', [x!, y!]) as Position)
}

function convertPolygon(geom: Polygon): Polygon {
  return { ...geom, coordinates: geom.coordinates.map(convertRing) }
}

function convertMultiPolygon(geom: MultiPolygon): MultiPolygon {
  return {
    ...geom,
    coordinates: geom.coordinates.map((poly) => poly.map(convertRing)),
  }
}

function convertGeometry(geom: Polygon | MultiPolygon): Polygon | MultiPolygon {
  if (geom.type === 'Polygon') return convertPolygon(geom)
  return convertMultiPolygon(geom)
}

function extractName(props: Record<string, unknown>): string {
  const val =
    props['BEZEICHNUNG'] ?? props['FLST_BEZEICHNUNG'] ?? props['NAME'] ?? 'Unbekanntes Feld'
  return String(val).trim()
}

function extractArea(props: Record<string, unknown>): number {
  const val = props['FLAECHE_HA'] ?? props['FLAECHE'] ?? props['AREA_HA']
  if (val != null) return parseFloat(String(val))
  return 0
}

export async function parseZip(file: File): Promise<ParsedIBalisFeature[]> {
  const arrayBuffer = await file.arrayBuffer()
  const geojson = await shp(arrayBuffer)

  // shpjs returns FeatureCollection or FeatureCollection[]
  const fc = Array.isArray(geojson) ? geojson[0] : geojson
  if (!fc) return []

  return fc.features.map((feature) => {
    const props = (feature.properties ?? {}) as Record<string, unknown>
    const geom = feature.geometry as Polygon | MultiPolygon
    return {
      name: extractName(props),
      area_ha: extractArea(props),
      geometry: convertGeometry(geom),
    }
  })
}
