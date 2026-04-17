import type { Polygon, MultiPolygon, Position } from 'geojson'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IBalisNutzungscode {
  code: string
  bezeichnung: string
}

export interface IBalisNutzung {
  schlagNr: string
  nutzungscode?: IBalisNutzungscode
  flaecheInHektar: number
}

export interface IBalisFeldstueck {
  fsNummer: number
  fsName: string
  flik: string
  flaechenanteilInProzent: number
  flaecheInHektar: number
  geometryWKT: string
  nutzungen: IBalisNutzung[]
  landschaftselemente: unknown[]
}

export interface IBalisFeldstueckeResponse {
  feldstuecke: IBalisFeldstueck[]
}

// ─── OAuth2 Flow ──────────────────────────────────────────────────────────────

/**
 * Startet den iBalis OAuth2-Flow. Speichert Betriebsnummer und Jahr in
 * sessionStorage und redirected zum Backend-Proxy-Endpunkt.
 */
export function startIBalisAuth(betriebsnummer: string, jahr: number): void {
  sessionStorage.setItem('ibalis_betriebsnummer', betriebsnummer)
  sessionStorage.setItem('ibalis_jahr', String(jahr))

  const params = new URLSearchParams({
    betriebsnummer,
    jahr: String(jahr),
  })
  window.location.href = `/ibalis/auth?${params.toString()}`
}

// ─── API Calls ────────────────────────────────────────────────────────────────

/**
 * Holt die Feldstücke vom iBalis-Proxy nach erfolgreichem OAuth2-Callback.
 * Session wird via HttpOnly-Cookie automatisch mitgesendet.
 */
export async function getIBalisFeldstuecke(
  betriebsnummer: string,
  jahr: number,
): Promise<IBalisFeldstueck[]> {
  const response = await fetch(
    `/ibalis/feldstuecke/${encodeURIComponent(betriebsnummer)}/${encodeURIComponent(String(jahr))}`,
    { credentials: 'same-origin' },
  )
  if (!response.ok) {
    throw new Error(`iBalis API Fehler: ${response.status} ${response.statusText}`)
  }
  const data: IBalisFeldstueckeResponse = await response.json()
  return data.feldstuecke ?? []
}

// ─── WKT Parsing ─────────────────────────────────────────────────────────────

/**
 * Parst einen WKT-Koordinaten-String "x1 y1, x2 y2, ..." in ein GeoJSON-Ring-Array.
 * Koordinaten sind bereits WGS84 (laut iBalis-API-Spec).
 */
function parseWktRing(ringStr: string): Position[] {
  return ringStr
    .trim()
    .split(',')
    .map((pair) => {
      const parts = pair.trim().split(/\s+/)
      return [parseFloat(parts[0] ?? '0'), parseFloat(parts[1] ?? '0')] as Position
    })
}

/**
 * Extrahiert alle Ringe aus einem WKT-POLYGON-Inhalt (ohne äußere Klammern).
 * Beispiel-Input: "(x1 y1, x2 y2), (x3 y3, x4 y4)"
 */
function parseWktPolygonRings(polygonContent: string): Position[][] {
  const rings: Position[][] = []
  // Jeder Ring ist in Klammern eingeschlossen
  const ringPattern = /\(([^)]+)\)/g
  let match: RegExpExecArray | null
  while ((match = ringPattern.exec(polygonContent)) !== null) {
    if (match[1]) {
      rings.push(parseWktRing(match[1]))
    }
  }
  return rings
}

/**
 * Konvertiert einen WKT-String (POLYGON oder MULTIPOLYGON) nach GeoJSON Geometry.
 * Die iBalis-API liefert Koordinaten bereits in WGS84.
 *
 * Unterstuetzte Formate:
 * - `POLYGON ((x1 y1, x2 y2, ...))`
 * - `MULTIPOLYGON (((x1 y1, ...)), ((x3 y3, ...)))`
 */
export function wktToGeoJSON(wkt: string): Polygon | MultiPolygon {
  const trimmed = wkt.trim().toUpperCase()

  if (trimmed.startsWith('MULTIPOLYGON')) {
    // Inhalt zwischen dem aeussersten Klammernpaar extrahieren
    const outerMatch = wkt.match(/MULTIPOLYGON\s*\(\s*([\s\S]*)\s*\)\s*$/i)
    if (!outerMatch?.[1]) throw new Error(`Ungueltiges WKT MULTIPOLYGON: ${wkt}`)

    const multiContent = outerMatch[1]
    // Jeden Polygon-Block "((...))" extrahieren
    const polygonBlocks: Position[][][] = []
    const polyPattern = /\(\s*(\([^)]+\)(?:\s*,\s*\([^)]+\))*)\s*\)/g
    let polyMatch: RegExpExecArray | null
    while ((polyMatch = polyPattern.exec(multiContent)) !== null) {
      if (polyMatch[1]) {
        polygonBlocks.push(parseWktPolygonRings(polyMatch[1]))
      }
    }
    return { type: 'MultiPolygon', coordinates: polygonBlocks }
  }

  if (trimmed.startsWith('POLYGON')) {
    const innerMatch = wkt.match(/POLYGON\s*\(\s*([\s\S]*)\s*\)\s*$/i)
    if (!innerMatch?.[1]) throw new Error(`Ungueltiges WKT POLYGON: ${wkt}`)
    return { type: 'Polygon', coordinates: parseWktPolygonRings(innerMatch[1]) }
  }

  throw new Error(`Nicht unterstuetzter WKT-Geometrietyp: ${wkt.substring(0, 30)}`)
}
