// src/composables/useIBalisImport.ts
import shp from 'shpjs'
import proj4 from 'proj4'
import type { Polygon, MultiPolygon, Position } from 'geojson'

export interface ParsedIBalisFeature {
  name: string
  area_ha: number
  geometry: Polygon | MultiPolygon
}

// EPSG:25832 (ETRS89 / UTM zone 32N)
const EPSG25832 =
  '+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'

function convertRing(ring: Position[]): Position[] {
  return ring.map(([x, y]) => proj4(EPSG25832, 'WGS84', [x, y]))
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
