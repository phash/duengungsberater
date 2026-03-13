# Kartendarstellung + iBalis Shapefile Import — Design Spec

**Datum:** 2026-03-13
**Status:** Approved

---

## Überblick

Landwirte können ihre Felder auf einer interaktiven Karte sehen. Feldgrenzen werden aus iBalis-Shapefiles importiert. Der Import läuft direkt im Browser — keine externe Infrastruktur.

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

### Offline-Strategie

Geometriedaten sind **online-only** in v1 — kein Dexie-Caching, kein `synced`-Flag. Begründung: Geometrien werden einmalig beim Import gespeichert und danach nur lesend genutzt; die Karte ist ohne Netzwerkverbindung (OSM-Kacheln) ohnehin eingeschränkt. Der `field-geometry.service` schreibt nicht in die IndexedDB.

### Laden der Geometrien in FieldsView

`getFields` wird **nicht** geändert. Stattdessen lädt `FieldsView` beim Mount parallel:
1. `getFields(userId)` → `Field[]`
2. `getGeometriesForUser(userId)` → `FieldGeometry[]`

Anschließend werden die Geometrien clientseitig per `field_id` zusammengeführt:

```typescript
const fieldsWithGeometry = fields.value.map((f) => ({
  ...f,
  geometry: geometries.value.find((g) => g.field_id === f.id),
}))
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

Tile-Provider: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`, Attribution: `© OpenStreetMap contributors`.

### Dateien

| Aktion | Datei | Verantwortung |
|---|---|---|
| Modify | `src/views/FieldsView.vue` | Toggle Liste/Karte, iBalis-Button, DrawerModal für Import, Geometrien laden + mergen |
| Create | `src/components/FieldMap.vue` | Leaflet-Karte, Polygon-Rendering, Click-Event, Leer-Zustand |
| Create | `src/components/iBalisImportDrawer.vue` | Upload-UI, Vorschauliste, "Feld übernehmen", Fehlerbehandlung |
| Create | `src/composables/useIBalisImport.ts` | Parse-Logik, Koordinatenkonvertierung |
| Create | `src/composables/useIBalisImport.test.ts` | Unit-Tests für Parse-Logik |
| Create | `src/services/field-geometry.service.ts` | CRUD für `field_geometries` |
| Modify | `src/types/index.ts` | `FieldGeometry`-Typ, `Field`-Erweiterung |
| Modify | `auth-server.js` | In-Memory-Store + Endpoints für `field_geometries` |
| Modify | `tests/e2e/felder.spec.ts` | E2E-Tests für Toggle, Import-Drawer |
| Create | `tests/fixtures/test-ibalis.zip` | Minimal-Shapefile-Fixture für E2E-Tests |

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
<div data-testid="field-map" ref="mapContainer" class="h-[50vh] w-full rounded-xl" />
```

- Leaflet wird in `onMounted` initialisiert, in `onUnmounted` zerstört
- Polygone als `L.geoJSON`-Layer, `onClick` emittet `select(fieldId)`
- Props: `fields: Field[]` (mit optionalem `geometry`)
- **Leer-Zustand** (keine Felder mit Geometrie): Karte wird nicht gerendert; stattdessen Placeholder-Text `data-testid="field-map-empty"`:
  ```html
  <p data-testid="field-map-empty">
    Noch keine Feldgrenzen vorhanden. iBalis importieren um Felder auf der Karte anzuzeigen.
  </p>
  ```

### iBalisImportDrawer.vue

```html
<DrawerModal title="iBalis importieren" ...>
  <input type="file" accept=".zip" data-testid="ibalis-file-input" />

  <!-- Fehler beim Parsen -->
  <p v-if="parseError" data-testid="ibalis-parse-error" class="text-red-600">
    {{ parseError }}
  </p>

  <!-- Nach Parse: -->
  <div
    v-for="(feature, index) in parsedFeatures"
    :key="index"
    :data-testid="`ibalis-feature-row-${index}`"
  >
    <span>{{ feature.name }}</span>
    <span>{{ feature.area_ha }} ha</span>

    <!-- Noch nicht übernommen, kein Namenskonflikt -->
    <button
      v-if="!feature.imported && !feature.alreadyExists"
      :data-testid="`ibalis-uebernehmen-button-${index}`"
      @click="uebernehmen(feature, index)"
    >
      Feld übernehmen
    </button>

    <!-- Bereits vorhanden (Namensabgleich) -->
    <span
      v-else-if="feature.alreadyExists"
      :data-testid="`ibalis-bereits-vorhanden-${index}`"
      class="text-gray-400"
    >
      bereits vorhanden
    </span>

    <!-- Nach Übernahme -->
    <span
      v-else
      :data-testid="`ibalis-uebernommen-badge-${index}`"
    >
      ✓ Übernommen
    </span>

    <!-- Fehler bei einzelnem Feld -->
    <p v-if="feature.error" :data-testid="`ibalis-feature-error-${index}`" class="text-red-600">
      Fehler beim Speichern
    </p>
  </div>
</DrawerModal>
```

---

## iBalis Import Flow

1. User klickt "iBalis importieren" → `iBalisImportDrawer` öffnet sich
2. User wählt ZIP-Datei (iBalis-Export: `.shp`, `.dbf`, `.prj`)
3. `useIBalisImport.parseZip(file)` → GeoJSON FeatureCollection via shpjs; proj4 konvertiert EPSG:25832 → WGS84
4. **Parse-Fehler** (korrupte ZIP, fehlendes `.dbf`, shpjs-Exception): `parseError`-Ref wird gesetzt, Fehlermeldung wird angezeigt, Liste bleibt leer
5. Vorschauliste: Feldname aus `BEZEICHNUNG`-Attribut (fallback: `FLST_BEZEICHNUNG`), Fläche aus `FLAECHE_HA` (fallback: aus GeoJSON-Geometry berechnet)
6. **Duplikat-Erkennung**: Namensabgleich case-insensitiv, trimmed. Findet ein vorhandenes Feld denselben Namen → `alreadyExists: true`, Zeile grau, kein "Übernehmen"-Button
7. Pro Zeile ohne Konflikt: Button **"Feld übernehmen"** → erstellt Field-Record + FieldGeometry-Record
8. **Netzwerkfehler** beim Speichern: `feature.error = true`, Inline-Fehlermeldung unter der Zeile, Button bleibt klickbar für erneuten Versuch
9. Button wechselt nach Erfolg zu ✓ "Übernommen"
10. Drawer schließen → FieldsView lädt neu

### Kein Update-Endpoint

Es gibt keinen `PUT`/`PATCH`-Endpoint für Geometrien. Re-Import eines bereits vorhandenen Feldes wird durch die Duplikat-Erkennung (Schritt 6) verhindert. Falls eine Geometrie ersetzt werden soll, muss der User das Feld zunächst löschen.

### useIBalisImport Composable (Signatur)

```typescript
interface ParsedIBalisFeature {
  name: string
  area_ha: number
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon  // WGS84
}

function parseZip(file: File): Promise<ParsedIBalisFeature[]>
// Wirft Error bei korrupter Datei oder fehlendem .dbf
```

---

## auth-server.js Erweiterungen

Neuer In-Memory-Store `fieldGeometries` + Endpoints:

```
GET    /field_geometries?user_id=...   → alle Geometrien des Users
POST   /field_geometries               → neue Geometrie anlegen
DELETE /field_geometries/:id           → Geometrie löschen
```

Kein `PUT`/`PATCH`-Endpoint (siehe oben).

---

## Tests

### Unit (`src/composables/useIBalisImport.test.ts`)

- Koordinatenkonvertierung EPSG:25832 → WGS84 (bekannte Testkoordinaten)
- Feldname + Fläche korrekt aus DBF-Attributen extrahiert
- Fallback: `FLST_BEZEICHNUNG` wenn `BEZEICHNUNG` fehlt
- Mehrere Features → mehrere Felder
- Korrupte Datei → Promise rejected mit sprechendem Fehler

### E2E (`tests/e2e/felder.spec.ts` erweitern)

- Toggle Liste/Karte sichtbar auf Felder-Screen (`data-testid="toggle-liste"`, `data-testid="toggle-karte"`)
- Karte-Tab zeigt Leer-Zustand wenn keine Geometrien vorhanden (`data-testid="field-map-empty"`)
- "iBalis importieren"-Button sichtbar in beiden Ansichten (`data-testid="ibalis-import-button"`)
- Import-Drawer öffnet und schließt sich
- Import mit `tests/fixtures/test-ibalis.zip` → Vorschauliste zeigt 1 Feld → "Feld übernehmen" → Badge ✓ Übernommen → nach Drawer-Schließen erscheint Feld in der Liste

**E2E-Fixture:** `tests/fixtures/test-ibalis.zip` — ein Minimal-Shapefile mit einem Feld ("Testschlag", 5.0 ha, EPSG:25832, Polygon-Koordinaten im Bereich Bayern). Wird in der Fixture-Setup-Datei über `page.setInputFiles` injiziert.

Leaflet-Polygon-Interaktion wird nicht per E2E getestet (Canvas-Rendering in Playwright unzuverlässig).

---

## Nicht im Scope

- Manuelle Geometrieeingabe (Zeichnen auf der Karte)
- Offline-Kartenkacheln (Leaflet/OSM erfordert Netzwerk)
- Geometrie-Export
- Andere Shapefile-Formate als iBalis-Standard
- Geometrie aktualisieren (v1: löschen + neu importieren)
