# Kartendarstellung + iBalis Shapefile Import — Design Spec

**Datum:** 2026-03-13
**Status:** Approved

---

## Überblick

Landwirte können ihre Felder auf einer interaktiven Karte sehen. Feldgrenzen werden aus iBalis-Shapefiles importiert. Der Import läuft direkt im Browser — keine externe Infrastruktur, offline-fähig nach erstmaligem Laden der Kartenkacheln.

---

## Anforderungen

- FieldsView erhält ein Toggle oben: **Liste | Karte**
- Karte-Tab zeigt eine Leaflet-Karte mit allen Feldern, für die eine Geometrie vorhanden ist
- Klick auf Polygon → öffnet den Bearbeiten-Drawer (identisch mit Klick in der Liste)
- "iBalis importieren"-Button erscheint in **beiden** Ansichten (Liste und Karte)
- Import-Drawer: ZIP-Upload → Vorschauliste → "Feld übernehmen" legt Field + Geometrie an
- Felder ohne Geometrie erscheinen nicht auf der Karte (nur in der Liste)

---

## Datenmodell

### Neue Tabelle: `field_geometries`

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid | PK |
| `field_id` | uuid | FK → `fields.id` |
| `user_id` | uuid | FK → Auth-User |
| `geometry` | jsonb | GeoJSON Polygon (WGS84) |
| `source` | text | `'ibalis'` oder `'manual'` |
| `created_at` | timestamptz | — |

### TypeScript-Typen

```typescript
interface FieldGeometry {
  id: string
  field_id: string
  user_id: string
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
  source: 'ibalis' | 'manual'
  created_at: string
}
```

Der bestehende `Field`-Typ erhält ein optionales Feld:

```typescript
interface Field {
  // ... bestehende Felder
  geometry?: FieldGeometry
}
```

---

## Technische Umsetzung

### Neue Dependencies

| Paket | Zweck |
|---|---|
| `leaflet` + `@types/leaflet` | Kartenrendering |
| `shpjs` | Shapefile-ZIP-Parsing im Browser |
| `proj4` + `@types/proj4` | Koordinatenkonvertierung EPSG:25832 → WGS84 |

Kein Vue-Leaflet-Wrapper — Leaflet wird direkt in `onMounted`/`onUnmounted` initialisiert.

### Dateien

| Aktion | Datei | Verantwortung |
|---|---|---|
| Modify | `src/views/FieldsView.vue` | Toggle Liste/Karte, iBalis-Button, DrawerModal für Import |
| Create | `src/components/FieldMap.vue` | Leaflet-Karte, Polygon-Rendering, Click-Event |
| Create | `src/components/iBalisImportDrawer.vue` | Upload-UI, Vorschauliste, "Feld übernehmen" |
| Create | `src/composables/useIBalisImport.ts` | Parse-Logik, Koordinatenkonvertierung |
| Create | `src/composables/useIBalisImport.test.ts` | Unit-Tests für Parse-Logik |
| Create | `src/services/field-geometry.service.ts` | CRUD für `field_geometries` |
| Modify | `src/types/index.ts` | `FieldGeometry`-Typ, `Field`-Erweiterung |
| Modify | `auth-server.js` | In-Memory-Store + Endpoints für `field_geometries` |
| Modify | `tests/e2e/felder.spec.ts` | E2E-Tests für Toggle, Import-Drawer |

---

## UI-Struktur

### FieldsView — Toggle + iBalis-Button

```html
<!-- Toggle oben -->
<div class="flex gap-1 rounded-lg bg-gray-100 p-1">
  <button data-testid="toggle-liste" ...>Liste</button>
  <button data-testid="toggle-karte" ...>Karte</button>
</div>

<!-- iBalis-Button (beide Ansichten) -->
<button data-testid="ibalis-import-button" ...>
  iBalis importieren
</button>
```

### FieldMap.vue

```html
<div data-testid="field-map" ref="mapContainer" style="height: 400px" />
```

- Leaflet wird in `onMounted` initialisiert, in `onUnmounted` zerstört
- Polygone als `L.geoJSON`-Layer, `onClick` emittet `select(fieldId)`
- Props: `fields: Field[]` (mit optionalem `geometry`)

### iBalisImportDrawer.vue

```html
<DrawerModal title="iBalis importieren" ...>
  <input type="file" accept=".zip" data-testid="ibalis-file-input" />

  <!-- Nach Parse: -->
  <div v-for="feature in parsedFeatures" data-testid="ibalis-feature-row">
    <span>{{ feature.name }}</span>
    <span>{{ feature.area_ha }} ha</span>
    <button data-testid="ibalis-uebernehmen-button" @click="uebernehmen(feature)">
      Feld übernehmen
    </button>
    <!-- Nach Übernahme: -->
    <span data-testid="ibalis-uebernommen-badge">✓ Übernommen</span>
  </div>
</DrawerModal>
```

---

## iBalis Import Flow

1. User klickt "iBalis importieren" → `iBalisImportDrawer` öffnet sich
2. User wählt ZIP-Datei (iBalis-Export: `.shp`, `.dbf`, `.prj`)
3. `useIBalisImport.parseZip(file)` → GeoJSON FeatureCollection via shpjs
4. proj4 konvertiert alle Koordinaten EPSG:25832 → WGS84
5. Vorschauliste: Feldname (aus `BEZEICHNUNG`-Attribut), Fläche (aus `FLAECHE_HA` oder berechnet)
6. Pro Zeile: Button **"Feld übernehmen"** → erstellt Field-Record + FieldGeometry-Record; Button wechselt zu ✓ "Übernommen"
7. Bereits vorhandene Felder (Namensabgleich) werden grau mit Hinweis "bereits vorhanden" dargestellt
8. Drawer schließen → FieldsView lädt neu

### useIBalisImport Composable (Signatur)

```typescript
interface ParsedIBalisFeature {
  name: string
  area_ha: number
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon  // WGS84
}

function parseZip(file: File): Promise<ParsedIBalisFeature[]>
```

---

## auth-server.js Erweiterungen

Neuer In-Memory-Store `fieldGeometries` + Endpoints:

```
GET    /field_geometries?user_id=...   → alle Geometrien des Users
POST   /field_geometries               → neue Geometrie anlegen
DELETE /field_geometries/:id           → Geometrie löschen
```

---

## Tests

### Unit (`src/composables/useIBalisImport.test.ts`)

- Koordinatenkonvertierung EPSG:25832 → WGS84 (bekannte Testkoordinaten)
- Feldname + Fläche korrekt aus DBF-Attributen extrahiert
- Mehrere Features → mehrere Felder

### E2E (`tests/e2e/felder.spec.ts` erweitern)

- Toggle Liste/Karte sichtbar auf Felder-Screen (`data-testid="toggle-liste"`, `data-testid="toggle-karte"`)
- Karte-Tab zeigt Leaflet-Container (`data-testid="field-map"`)
- "iBalis importieren"-Button sichtbar in beiden Ansichten (`data-testid="ibalis-import-button"`)
- Import-Drawer öffnet und schließt sich
- Nach Import erscheint neues Feld in der Liste

Leaflet-Polygon-Interaktion wird nicht per E2E getestet (Canvas-Rendering in Playwright unzuverlässig).

---

## Nicht im Scope

- Manuelle Geometrieeingabe (Zeichnen auf der Karte)
- Offline-Kartenkacheln (Leaflet/OSM erfordert Netzwerk)
- Geometrie-Export
- Andere Shapefile-Formate als iBalis-Standard
