# Kartendarstellung + iBalis Shapefile Import — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Feldkarte als Toggle-Tab in FieldsView (Liste | Karte) mit iBalis-Shapefile-Import, der neue Felder + Geometrien anlegt.

**Architecture:** Leaflet-Karte in `FieldMap.vue` zeigt Felder-Polygone aus separater `field_geometries`-Tabelle (online-only). `useIBalisImport.ts` kapselt ZIP-Parsing (shpjs) + Koordinatenkonvertierung EPSG:25832 → WGS84 (proj4). `iBalisImportDrawer.vue` steuert den Import-Dialog. `FieldsView` lädt Geometrien parallel zu Feldern und merged sie clientseitig.

**Tech Stack:** Vue 3, TypeScript, Tailwind CSS, Leaflet, shpjs, proj4, Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-03-13-kartendarstellung-design.md`

---

## Dateiübersicht

| Aktion | Datei | Verantwortung |
|---|---|---|
| Modify | `src/types/index.ts` | `FieldGeometry`-Typ, `Field`-Erweiterung |
| Create | `src/services/field-geometry.service.ts` | CRUD für `field_geometries` (online-only) |
| Modify | `auth-server.js` | `field_geometries` in tables-Map |
| Create | `src/composables/useIBalisImport.ts` | ZIP-Parse + EPSG:25832→WGS84 |
| Create | `src/composables/useIBalisImport.test.ts` | Unit-Tests |
| Create | `tests/fixtures/generate-ibalis-fixture.cjs` | Einmalig: Test-ZIP erzeugen |
| Create | `tests/fixtures/test-ibalis.zip` | Generiertes Fixture für E2E |
| Create | `src/components/FieldMap.vue` | Leaflet-Karte, Polygon-Rendering |
| Create | `src/components/iBalisImportDrawer.vue` | Import-Dialog |
| Modify | `src/views/FieldsView.vue` | Toggle, iBalis-Button, Geometrien laden |
| Modify | `tests/e2e/felder.spec.ts` | E2E-Tests |

---

## Chunk 1: Foundation — Types, Service, auth-server

### Task 1: FieldGeometry-Typ + field-geometry.service.ts

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/services/field-geometry.service.ts`

- [ ] **Step 1: FieldGeometry-Typ und Field-Erweiterung ergänzen**

In `src/types/index.ts`, nach dem `Field`-Interface (Zeile 96) einfügen:

```typescript
export interface FieldGeometry {
  id: string
  field_id: string
  user_id: string
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
  source: 'ibalis' | 'manual'
  created_at: string
}
```

Das `Field`-Interface um `geometry?` erweitern:

```typescript
export interface Field {
  id: string
  user_id: string
  name: string
  size_ha: number
  nmin_0_30: number | null
  nmin_30_60: number | null
  nmin_60_90: number | null
  synced: boolean
  created_at: string
  updated_at: string
  geometry?: FieldGeometry
}
```

Da `GeoJSON` als globaler Namespace in TypeScript nicht automatisch verfügbar ist, muss `@types/geojson` installiert oder der Namespace manuell importiert werden. Prüfen ob vorhanden:

```bash
cat node_modules/@types/geojson/package.json 2>/dev/null | grep '"name"' || echo "nicht vorhanden"
```

Falls nicht vorhanden:
```bash
npm install --save-dev @types/geojson
```

Alternativ: Typen direkt aus `geojson` importieren. In `src/types/index.ts` am Anfang ergänzen:

```typescript
import type { Polygon, MultiPolygon } from 'geojson'
```

Und im Interface verwenden:
```typescript
  geometry: Polygon | MultiPolygon
```

- [ ] **Step 2: field-geometry.service.ts erstellen**

```typescript
import { supabase } from './supabase'
import type { FieldGeometry } from '@/types'

export async function getGeometriesForUser(userId: string): Promise<FieldGeometry[]> {
  const { data, error } = await supabase
    .from('field_geometries')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return data as FieldGeometry[]
}

export async function createFieldGeometry(
  payload: Pick<FieldGeometry, 'field_id' | 'user_id' | 'geometry' | 'source'>,
): Promise<FieldGeometry> {
  const { data, error } = await supabase
    .from('field_geometries')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data as FieldGeometry
}

export async function deleteFieldGeometry(id: string): Promise<void> {
  const { error } = await supabase.from('field_geometries').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 3: TypeScript prüfen**

```bash
npx vue-tsc --noEmit
```

Expected: keine Fehler im neuen Code.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/services/field-geometry.service.ts
git commit -m "feat(karte): add FieldGeometry type and field-geometry service"
```

---

### Task 2: auth-server.js — field_geometries-Tabelle

**Files:**
- Modify: `auth-server.js:14-23`

Der bestehende `tables`-Map kennt `field_geometries` noch nicht. Der generische `/rest/v1/:table`-Handler gibt `404` zurück wenn die Tabelle fehlt. Das `field-geometry.service.ts` ruft `supabase.from('field_geometries')` auf, was gegen `/rest/v1/field_geometries` geht.

- [ ] **Step 1: `field_geometries` in die tables-Map eintragen**

In `auth-server.js`, die `tables`-Map-Deklaration (Zeile 14–23) anpassen:

```javascript
const tables = new Map([
  ['fields', new Map()],
  ['field_crop_plans', new Map()],
  ['crops', new Map()],
  ['nutrient_types', new Map()],
  ['crop_nutrient_demands', new Map()],
  ['corrections', new Map()],
  ['correction_values', new Map()],
  ['fertilizer_products', new Map()],
  ['field_geometries', new Map()],
]);
```

- [ ] **Step 2: Server manuell testen**

```bash
node auth-server.js &
sleep 1
# Login und Test-GET (muss leeres Array zurückgeben)
TOKEN=$(curl -s -X POST http://localhost:3000/auth/v1/token \
  -H 'Content-Type: application/json' \
  -d '{"grant_type":"password","username":"test@test.de","password":"pw"}' | \
  node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.parse(d).access_token || '')")
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/rest/v1/field_geometries?user_id=eq.test" | node -e "console.log(require('fs').readFileSync('/dev/stdin','utf8'))"
kill %1
```

Expected: `[]` (oder Auth-Fehler wenn kein User existiert — beide Fälle korrekt).

- [ ] **Step 3: Commit**

```bash
git add auth-server.js
git commit -m "feat(karte): add field_geometries table to auth-server mock"
```

---

## Chunk 2: iBalis Parse-Logik

### Task 3: Abhängigkeiten installieren

**Files:** `package.json`

- [ ] **Step 1: Leaflet, shpjs, proj4 installieren**

```bash
npm install leaflet shpjs proj4
npm install --save-dev @types/leaflet @types/proj4
```

- [ ] **Step 2: Installation prüfen**

```bash
node -e "require('./node_modules/leaflet/package.json'); require('./node_modules/shpjs/package.json'); require('./node_modules/proj4/package.json'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(karte): install leaflet, shpjs, proj4 dependencies"
```

---

### Task 4: useIBalisImport.ts (TDD)

**Files:**
- Create: `src/composables/useIBalisImport.test.ts`
- Create: `src/composables/useIBalisImport.ts`

- [ ] **Step 1: Tests schreiben**

```typescript
// src/composables/useIBalisImport.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Polygon } from 'geojson'

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
    } as any)

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
    } as any)

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
    } as any)

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
    } as any)

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
    } as any)

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
```

- [ ] **Step 2: Tests ausführen — Failures erwarten**

```bash
npx vitest run src/composables/useIBalisImport.test.ts
```

Expected: FAIL — `useIBalisImport.ts` existiert nicht.

- [ ] **Step 3: useIBalisImport.ts implementieren**

```typescript
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
```

- [ ] **Step 4: Tests ausführen — alle grün**

```bash
npx vitest run src/composables/useIBalisImport.test.ts
```

Expected: 6 Tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useIBalisImport.ts src/composables/useIBalisImport.test.ts
git commit -m "feat(karte): add useIBalisImport composable with TDD"
```

---

### Task 5: E2E-Fixture erstellen

**Files:**
- Create: `tests/fixtures/generate-ibalis-fixture.cjs`
- Create: `tests/fixtures/test-ibalis.zip` (generiert)

Ein gültiges iBalis-Shapefile-ZIP mit einem Polygon ("Testschlag", 5.0 ha, EPSG:25832, Bayern). Wird einmalig generiert und committed.

- [ ] **Step 1: jszip als dev-Abhängigkeit installieren**

```bash
npm install --save-dev jszip
```

- [ ] **Step 2: Fixture-Generator erstellen**

```javascript
// tests/fixtures/generate-ibalis-fixture.cjs
'use strict'
const JSZip = require('jszip')
const fs = require('fs')
const path = require('path')

// Minimales Shapefile mit einem Rechteck-Polygon
// EPSG:25832 Koordinaten nahe München: 5 Punkte (geschlossener Ring)
const POINTS = [
  [680000, 5334000],
  [680100, 5334000],
  [680100, 5334100],
  [680000, 5334100],
  [680000, 5334000],
]

function writeSHP() {
  // Polygon content: 4 (type) + 32 (bbox) + 4 (numParts) + 4 (numPoints) + 4 (parts[0]) + 5*16 (points)
  // = 4 + 32 + 4 + 4 + 4 + 80 = 128 bytes = 64 16-bit words
  const contentBytes = 128
  const totalBytes = 100 + 8 + contentBytes // header + record header + content = 236

  const buf = Buffer.alloc(totalBytes, 0)

  // File header (100 bytes)
  buf.writeInt32BE(9994, 0)              // file code
  buf.writeInt32BE(totalBytes / 2, 24)  // file length in 16-bit words
  buf.writeInt32LE(1000, 28)            // version
  buf.writeInt32LE(5, 32)               // shape type: polygon
  buf.writeDoubleLE(680000, 36)         // Xmin
  buf.writeDoubleLE(5334000, 44)        // Ymin
  buf.writeDoubleLE(680100, 52)         // Xmax
  buf.writeDoubleLE(5334100, 60)        // Ymax
  // Zmin, Zmax, Mmin, Mmax at 68–99: already 0

  // Record header (8 bytes at offset 100)
  buf.writeInt32BE(1, 100)              // record number
  buf.writeInt32BE(contentBytes / 2, 104) // content length in 16-bit words

  // Polygon content (at offset 108)
  let o = 108
  buf.writeInt32LE(5, o); o += 4         // shape type
  buf.writeDoubleLE(680000, o); o += 8   // Xmin
  buf.writeDoubleLE(5334000, o); o += 8  // Ymin
  buf.writeDoubleLE(680100, o); o += 8   // Xmax
  buf.writeDoubleLE(5334100, o); o += 8  // Ymax
  buf.writeInt32LE(1, o); o += 4         // num parts
  buf.writeInt32LE(5, o); o += 4         // num points
  buf.writeInt32LE(0, o); o += 4         // parts[0]
  for (const [x, y] of POINTS) {
    buf.writeDoubleLE(x, o); o += 8
    buf.writeDoubleLE(y, o); o += 8
  }
  return buf
}

function writeDBF() {
  // 2 Felder: BEZEICHNUNG (C, 11) und FLAECHE_HA (N, 8, 2 dec)
  // Header: 32 + 2*32 + 1 = 97 bytes
  // Record: 1 (flag) + 11 (BEZEICHNUNG) + 8 (FLAECHE_HA) = 20 bytes
  // EOF: 1 byte
  const headerSize = 32 + 2 * 32 + 1
  const recordSize = 1 + 11 + 8
  const buf = Buffer.alloc(headerSize + recordSize + 1, 0)

  // Header
  buf[0] = 3                           // dBASE III
  buf[1] = 26; buf[2] = 3; buf[3] = 13 // date: 2026-03-13
  buf.writeUInt32LE(1, 4)              // num records
  buf.writeUInt16LE(headerSize, 8)     // header size
  buf.writeUInt16LE(recordSize, 10)    // record size

  // Field 1: BEZEICHNUNG (char, 11)
  buf.write('BEZEICHNUNG', 32, 'ascii')
  buf[32 + 11] = 0x43                  // type 'C'
  buf[32 + 16] = 11                    // field length

  // Field 2: FLAECHE_HA (numeric, 8, 2 decimals)
  buf.write('FLAECHE_HA', 64, 'ascii') // 10 chars + null = 11 bytes
  buf[64 + 11] = 0x4e                  // type 'N'
  buf[64 + 16] = 8                     // field length
  buf[64 + 17] = 2                     // decimal count

  // Header terminator
  buf[96] = 0x0d

  // Record (at offset 97)
  buf[97] = 0x20                       // valid record flag
  buf.write('Testschlag ', 98, 'ascii') // BEZEICHNUNG (11 chars, space-padded)
  buf.write('    5.00', 109, 'ascii')   // FLAECHE_HA  (8 chars, right-aligned)

  // EOF
  buf[headerSize + recordSize] = 0x1a
  return buf
}

function writePRJ() {
  return Buffer.from(
    'PROJCS["ETRS89 / UTM zone 32N",' +
    'GEOGCS["ETRS89",' +
    'DATUM["European_Terrestrial_Reference_System_1989",' +
    'SPHEROID["GRS 1980",6378137,298.257222101]],' +
    'PRIMEM["Greenwich",0],' +
    'UNIT["degree",0.0174532925199433]],' +
    'PROJECTION["Transverse_Mercator"],' +
    'PARAMETER["latitude_of_origin",0],' +
    'PARAMETER["central_meridian",9],' +
    'PARAMETER["scale_factor",0.9996],' +
    'PARAMETER["false_easting",500000],' +
    'PARAMETER["false_northing",0],' +
    'UNIT["metre",1],' +
    'AUTHORITY["EPSG","25832"]]',
    'ascii',
  )
}

async function main() {
  const zip = new JSZip()
  zip.file('testschlag.shp', writeSHP())
  zip.file('testschlag.dbf', writeDBF())
  zip.file('testschlag.prj', writePRJ())

  const content = await zip.generateAsync({ type: 'nodebuffer' })
  const outPath = path.join(__dirname, 'test-ibalis.zip')
  fs.writeFileSync(outPath, content)
  console.log(`✅ Written: ${outPath} (${content.length} bytes)`)
}

main().catch((err) => { console.error(err); process.exit(1) })
```

- [ ] **Step 3: Fixture generieren**

```bash
node tests/fixtures/generate-ibalis-fixture.cjs
```

Expected: `✅ Written: .../tests/fixtures/test-ibalis.zip (...)` — Datei vorhanden.

```bash
ls -lh tests/fixtures/test-ibalis.zip
```

- [ ] **Step 4: Commit**

```bash
git add tests/fixtures/generate-ibalis-fixture.cjs tests/fixtures/test-ibalis.zip package.json package-lock.json
git commit -m "test(karte): add iBalis E2E fixture and generator script"
```

---

## Chunk 3: UI-Komponenten

### Task 6: FieldMap.vue

**Files:**
- Create: `src/components/FieldMap.vue`

Leaflet-Karte. Empfängt `fields: Field[]` (mit optionalem `.geometry`). Filtert auf Felder mit Geometrie, rendert Polygone. Click → `select(fieldId)`. Leer-Zustand wenn keine Geometrien vorhanden.

**Wichtig:** Leaflet's Standard-Marker-Icons sind per Webpack/Vite kaputt (Icon-URL-Problem). Da wir keine Marker verwenden (nur Polygone), ist das kein Problem.

- [ ] **Step 1: FieldMap.vue erstellen**

```vue
<template>
  <div v-if="fieldsWithGeometry.length === 0" data-testid="field-map-empty" class="py-12 text-center text-gray-400">
    <p>Noch keine Feldgrenzen vorhanden.</p>
    <p class="mt-1 text-sm">Importiere eine iBalis-Datei um Felder auf der Karte anzuzeigen.</p>
  </div>
  <div
    v-else
    data-testid="field-map"
    ref="mapContainer"
    class="h-[50vh] w-full rounded-xl overflow-hidden"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { Field } from '@/types'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const props = defineProps<{
  fields: Field[]
}>()

const emit = defineEmits<{
  select: [fieldId: string]
}>()

const mapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let geoJsonLayer: L.GeoJSON | null = null

const fieldsWithGeometry = computed(() => props.fields.filter((f) => f.geometry))

function renderPolygons() {
  if (!map) return

  if (geoJsonLayer) {
    geoJsonLayer.removeFrom(map)
    geoJsonLayer = null
  }

  if (fieldsWithGeometry.value.length === 0) return

  const featureCollection: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: fieldsWithGeometry.value.map((f) => ({
      type: 'Feature' as const,
      properties: { fieldId: f.id, name: f.name },
      geometry: f.geometry!.geometry,
    })),
  }

  geoJsonLayer = L.geoJSON(featureCollection, {
    style: {
      color: '#16a34a',
      weight: 2,
      fillColor: '#22c55e',
      fillOpacity: 0.3,
    },
    onEachFeature(feature, layer) {
      layer.on('click', () => {
        emit('select', feature.properties!.fieldId as string)
      })
    },
  }).addTo(map)

  map.fitBounds(geoJsonLayer.getBounds(), { padding: [20, 20] })
}

onMounted(() => {
  if (!mapContainer.value) return

  map = L.map(mapContainer.value).setView([48.5, 11.5], 9)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map)

  renderPolygons()
})

onUnmounted(() => {
  map?.remove()
  map = null
  geoJsonLayer = null
})

watch(() => props.fields, renderPolygons, { deep: true })
</script>
```

- [ ] **Step 2: TypeScript prüfen**

```bash
npx vue-tsc --noEmit
```

Expected: keine Fehler in FieldMap.vue.

- [ ] **Step 3: Commit**

```bash
git add src/components/FieldMap.vue
git commit -m "feat(karte): add FieldMap component with Leaflet"
```

---

### Task 7: iBalisImportDrawer.vue

**Files:**
- Create: `src/components/iBalisImportDrawer.vue`

Import-Dialog: Datei-Upload → Parse → Vorschauliste → "Feld übernehmen". Empfängt `existingFields` (zum Duplikat-Check) und `userId`. Emittet `imported` wenn ein Feld erfolgreich angelegt wurde.

- [ ] **Step 1: iBalisImportDrawer.vue erstellen**

```vue
<template>
  <DrawerModal title="iBalis importieren" :open="open" @close="$emit('close')">
    <div class="space-y-4">
      <!-- Datei-Auswahl -->
      <div v-if="parsedFeatures.length === 0">
        <label class="block text-sm font-medium text-gray-700 mb-1">iBalis ZIP-Datei wählen</label>
        <input
          type="file"
          accept=".zip"
          data-testid="ibalis-file-input"
          class="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-green-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-green-700 hover:file:bg-green-100"
          @change="onFileChange"
        />
        <p v-if="parseError" data-testid="ibalis-parse-error" class="mt-2 text-sm text-red-600">
          {{ parseError }}
        </p>
        <p v-if="parsing" class="mt-2 text-sm text-gray-500">Datei wird gelesen…</p>
      </div>

      <!-- Vorschauliste -->
      <div v-if="parsedFeatures.length > 0" class="space-y-2">
        <p class="text-sm text-gray-500">{{ parsedFeatures.length }} Felder gefunden:</p>
        <div
          v-for="(feature, index) in parsedFeatures"
          :key="index"
          :data-testid="`ibalis-feature-row-${index}`"
          class="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
        >
          <div>
            <p class="text-sm font-medium">{{ feature.name }}</p>
            <p class="text-xs text-gray-500">{{ formatArea(feature.area_ha) }} ha</p>
          </div>
          <div>
            <button
              v-if="!feature.imported && !feature.alreadyExists"
              :data-testid="`ibalis-uebernehmen-button-${index}`"
              class="rounded-lg bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50"
              :disabled="feature.saving"
              @click="uebernehmen(index)"
            >
              {{ feature.saving ? '…' : 'Feld übernehmen' }}
            </button>
            <span
              v-else-if="feature.alreadyExists"
              :data-testid="`ibalis-bereits-vorhanden-${index}`"
              class="text-xs text-gray-400"
            >
              bereits vorhanden
            </span>
            <span
              v-else
              :data-testid="`ibalis-uebernommen-badge-${index}`"
              class="text-xs font-medium text-green-600"
            >
              ✓ Übernommen
            </span>
          </div>
        </div>
        <p
          v-for="(feature, index) in parsedFeatures"
          v-show="feature.error"
          :key="`err-${index}`"
          :data-testid="`ibalis-feature-error-${index}`"
          class="text-xs text-red-600"
        >
          Fehler beim Speichern von „{{ feature.name }}"
        </p>

        <button
          class="mt-2 text-sm text-gray-400 hover:text-gray-600"
          @click="reset"
        >
          Andere Datei wählen
        </button>
      </div>
    </div>
  </DrawerModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DrawerModal from './DrawerModal.vue'
import { parseZip } from '@/composables/useIBalisImport'
import { createField } from '@/services/field.service'
import { createFieldGeometry } from '@/services/field-geometry.service'
import type { Field } from '@/types'

const props = defineProps<{
  open: boolean
  userId: string
  existingFields: Field[]
}>()

const emit = defineEmits<{
  close: []
  imported: []
}>()

interface ImportFeature {
  name: string
  area_ha: number
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
  alreadyExists: boolean
  imported: boolean
  saving: boolean
  error: boolean
}

const parsedFeatures = ref<ImportFeature[]>([])
const parseError = ref('')
const parsing = ref(false)

const existingNames = computed(
  () => new Set(props.existingFields.map((f) => f.name.trim().toLowerCase())),
)

async function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  parseError.value = ''
  parsing.value = true

  try {
    const features = await parseZip(file)
    parsedFeatures.value = features.map((f) => ({
      ...f,
      alreadyExists: existingNames.value.has(f.name.trim().toLowerCase()),
      imported: false,
      saving: false,
      error: false,
    }))
  } catch (e) {
    parseError.value = 'Datei konnte nicht gelesen werden. Bitte eine gültige iBalis ZIP-Datei wählen.'
    console.error('iBalis parse error:', e)
  } finally {
    parsing.value = false
  }
}

async function uebernehmen(index: number) {
  const feature = parsedFeatures.value[index]
  feature.saving = true
  feature.error = false

  try {
    const newField = await createField({
      name: feature.name,
      size_ha: feature.area_ha,
      nmin_0_30: null,
      nmin_30_60: null,
      nmin_60_90: null,
      user_id: props.userId,
    })

    await createFieldGeometry({
      field_id: newField.id,
      user_id: props.userId,
      geometry: feature.geometry,
      source: 'ibalis',
    })

    feature.imported = true
    emit('imported')
  } catch (e) {
    feature.error = true
    console.error('iBalis uebernehmen error:', e)
  } finally {
    feature.saving = false
  }
}

function reset() {
  parsedFeatures.value = []
  parseError.value = ''
}

function formatArea(value: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(value)
}
</script>
```

- [ ] **Step 2: TypeScript prüfen**

```bash
npx vue-tsc --noEmit
```

Expected: keine Fehler.

- [ ] **Step 3: Commit**

```bash
git add src/components/iBalisImportDrawer.vue
git commit -m "feat(karte): add iBalisImportDrawer component"
```

---

## Chunk 4: FieldsView Integration + E2E

### Task 8: FieldsView.vue — Toggle + Import-Button + Geometrien

**Files:**
- Modify: `src/views/FieldsView.vue`

- [ ] **Step 1: FieldsView.vue ersetzen**

```vue
<template>
  <AppLayout title="Meine Felder">
    <div class="space-y-4">
      <!-- Toggle Liste / Karte -->
      <div class="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          data-testid="toggle-liste"
          class="flex-1 rounded-md py-1.5 text-sm font-medium transition-colors"
          :class="activeTab === 'liste' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
          @click="activeTab = 'liste'"
        >
          Liste
        </button>
        <button
          data-testid="toggle-karte"
          class="flex-1 rounded-md py-1.5 text-sm font-medium transition-colors"
          :class="activeTab === 'karte' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
          @click="activeTab = 'karte'"
        >
          Karte
        </button>
      </div>

      <!-- Listen-Ansicht -->
      <template v-if="activeTab === 'liste'">
        <button
          data-testid="feld-anlegen-button"
          class="w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 hover:border-green-500 hover:text-green-700"
          @click="openNew"
        >
          + Feld anlegen
        </button>

        <button
          data-testid="ibalis-import-button"
          class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
          @click="importDrawerOpen = true"
        >
          iBalis importieren
        </button>

        <p
          v-if="errorMessage"
          data-testid="fields-error"
          class="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600"
        >
          {{ errorMessage }}
        </p>

        <FieldList
          :fields="fieldsWithGeometry"
          :plan-counts="planCounts"
          @select="openEdit"
          @navigate="navigateToPlan"
        />
      </template>

      <!-- Karten-Ansicht -->
      <template v-else>
        <button
          data-testid="ibalis-import-button"
          class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
          @click="importDrawerOpen = true"
        >
          iBalis importieren
        </button>

        <FieldMap
          :fields="fieldsWithGeometry"
          @select="openEdit"
        />
      </template>
    </div>

    <!-- Feld bearbeiten/anlegen -->
    <DrawerModal
      :open="drawerOpen"
      :title="editingField ? 'Feld bearbeiten' : 'Neues Feld'"
      @close="closeDrawer"
    >
      <FieldForm :field="editingField" @save="handleSave" @delete="handleDelete" />
    </DrawerModal>

    <!-- iBalis Import -->
    <iBalisImportDrawer
      :open="importDrawerOpen"
      :user-id="auth.userId ?? ''"
      :existing-fields="fields"
      @close="importDrawerOpen = false"
      @imported="onImported"
    />
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { getFields, createField, updateField, deleteField } from '@/services/field.service'
import { getGeometriesForUser } from '@/services/field-geometry.service'
import { getPlansForField } from '@/services/field-crop-plan.service'
import type { Field, FieldGeometry } from '@/types'
import AppLayout from '@/components/AppLayout.vue'
import DrawerModal from '@/components/DrawerModal.vue'
import FieldList from '@/components/FieldList.vue'
import FieldForm from '@/components/FieldForm.vue'
import FieldMap from '@/components/FieldMap.vue'
import iBalisImportDrawer from '@/components/iBalisImportDrawer.vue'

const auth = useAuthStore()
const router = useRouter()

const fields = ref<Field[]>([])
const geometries = ref<FieldGeometry[]>([])
const planCounts = ref<Record<string, number>>({})
const drawerOpen = ref(false)
const importDrawerOpen = ref(false)
const editingField = ref<Field | undefined>()
const errorMessage = ref('')
const activeTab = ref<'liste' | 'karte'>('liste')

const fieldsWithGeometry = computed(() =>
  fields.value.map((f) => ({
    ...f,
    geometry: geometries.value.find((g) => g.field_id === f.id),
  })),
)

async function loadFields() {
  if (!auth.userId) return
  fields.value = await getFields(auth.userId)

  const counts: Record<string, number> = {}
  for (const field of fields.value) {
    const plans = await getPlansForField(field.id)
    counts[field.id] = plans.length
  }
  planCounts.value = counts
}

async function loadGeometries() {
  if (!auth.userId) return
  try {
    geometries.value = await getGeometriesForUser(auth.userId)
  } catch (e) {
    console.error('Geometrien konnten nicht geladen werden:', e)
  }
}

function openNew() {
  editingField.value = undefined
  drawerOpen.value = true
}

function openEdit(fieldId: string) {
  editingField.value = fields.value.find((f) => f.id === fieldId)
  drawerOpen.value = true
}

function closeDrawer() {
  drawerOpen.value = false
  editingField.value = undefined
}

async function handleSave(data: {
  name: string
  size_ha: number
  nmin_0_30: number | null
  nmin_30_60: number | null
  nmin_60_90: number | null
}) {
  if (!auth.userId) return
  errorMessage.value = ''

  try {
    if (editingField.value) {
      await updateField(editingField.value.id, data)
    } else {
      await createField({ ...data, user_id: auth.userId })
    }
    closeDrawer()
    await loadFields()
  } catch (e) {
    console.error('Fehler beim Speichern:', e)
    errorMessage.value = 'Fehler beim Speichern. Bitte erneut versuchen.'
  }
}

async function handleDelete() {
  if (!editingField.value) return
  errorMessage.value = ''

  try {
    await deleteField(editingField.value.id)
    closeDrawer()
    await loadFields()
  } catch (e) {
    console.error('Fehler beim Löschen:', e)
    errorMessage.value = 'Fehler beim Löschen. Bitte erneut versuchen.'
  }
}

async function onImported() {
  await Promise.all([loadFields(), loadGeometries()])
}

function navigateToPlan(fieldId: string) {
  router.push({ name: 'anbauplanung', params: { fieldId } })
}

onMounted(() => {
  loadFields()
  loadGeometries()
})
</script>
```

- [ ] **Step 2: TypeScript prüfen**

```bash
npx vue-tsc --noEmit
```

Expected: keine Fehler.

- [ ] **Step 3: Alle Unit-Tests ausführen**

```bash
npm run test:run
```

Expected: alle bestehenden Tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/views/FieldsView.vue
git commit -m "feat(karte): integrate FieldMap and iBalisImportDrawer into FieldsView"
```

---

### Task 9: E2E-Tests

**Files:**
- Modify: `tests/e2e/felder.spec.ts`

- [ ] **Step 1: Failing E2E-Tests ans Ende der Datei anhängen**

Am Ende von `tests/e2e/felder.spec.ts` (nach dem letzten `})`) einfügen:

```typescript
import path from 'path'

test.describe('UC-L-xx: Kartendarstellung + iBalis Import', () => {
  test('Toggle Liste/Karte ist auf der Felder-Seite sichtbar', async ({ page }) => {
    await page.goto('/felder')
    await expect(page.getByTestId('toggle-liste')).toBeVisible()
    await expect(page.getByTestId('toggle-karte')).toBeVisible()
  })

  test('Karte-Tab zeigt Leer-Zustand wenn keine Geometrien vorhanden', async ({ page }) => {
    await page.goto('/felder')
    await page.getByTestId('toggle-karte').click()
    await expect(page.getByTestId('field-map-empty')).toBeVisible()
  })

  test('iBalis-Import-Button ist in der Listen-Ansicht sichtbar', async ({ page }) => {
    await page.goto('/felder')
    await expect(page.getByTestId('ibalis-import-button')).toBeVisible()
  })

  test('iBalis-Import-Button ist in der Karten-Ansicht sichtbar', async ({ page }) => {
    await page.goto('/felder')
    await page.getByTestId('toggle-karte').click()
    await expect(page.getByTestId('ibalis-import-button')).toBeVisible()
  })

  test('Import-Drawer öffnet und schließt', async ({ page }) => {
    await page.goto('/felder')
    await page.getByTestId('ibalis-import-button').click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await page.getByTestId('drawer-close-button').click()
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
  })

  test('iBalis ZIP importieren → Vorschau → Feld übernehmen → Feld in Liste', async ({ page }) => {
    const fixturePath = path.resolve('tests/fixtures/test-ibalis.zip')
    await page.goto('/felder')
    await page.getByTestId('ibalis-import-button').click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()

    await page.getByTestId('ibalis-file-input').setInputFiles(fixturePath)

    // Vorschau: 1 Feld "Testschlag" gefunden
    await expect(page.getByTestId('ibalis-feature-row-0')).toBeVisible()
    await expect(page.getByTestId('ibalis-feature-row-0')).toContainText('Testschlag')

    // "Feld übernehmen" klicken
    await page.getByTestId('ibalis-uebernehmen-button-0').click()

    // Badge erscheint
    await expect(page.getByTestId('ibalis-uebernommen-badge-0')).toBeVisible()

    // Drawer schließen → Feld in Liste
    await page.getByTestId('drawer-close-button').click()
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
    await expect(page.locator('[data-testid^="field-item-"]').filter({ hasText: 'Testschlag' })).toBeVisible()
  })
})
```

**Hinweis:** `import path from 'path'` muss am Anfang der Datei stehen. Die bestehende Datei beginnt mit `import { test, expect } from '@playwright/test'` — `path` hinzufügen:

```typescript
import { test, expect } from '@playwright/test'
import path from 'path'
import { deleteField } from './helpers/delete-field'
```

- [ ] **Step 2: E2E-Tests ausführen — Failures erwarten**

```bash
npx playwright test tests/e2e/felder.spec.ts --grep "Kartendarstellung"
```

Expected: Alle 6 neuen Tests FAIL — Toggle existiert noch nicht.

- [ ] **Step 3: Nach Task 8 (FieldsView-Integration) — alle E2E-Tests ausführen**

```bash
npx playwright test tests/e2e/felder.spec.ts
```

Expected: Alle Tests PASS (inkl. bestehende UC-L-03 bis UC-L-05).

- [ ] **Step 4: Alle Unit-Tests nochmals ausführen**

```bash
npm run test:run
```

Expected: alle PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/felder.spec.ts
git commit -m "test(karte): add E2E tests for map toggle and iBalis import"
```
