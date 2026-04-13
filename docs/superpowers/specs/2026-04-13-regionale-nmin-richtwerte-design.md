# Design: Regionale Nmin-Richtwerte 2026

**Datum:** 2026-04-13
**Status:** Approved
**Quellen:** BLW Heft 49/2025 (vorläufig), Heft 11/2026, 13/2026, 15/2026 (endgültig)

---

## Zusammenfassung

Regionale Nmin-Richtwerte der LfL Bayern als Fallback für Felder ohne eigene Bodenprobe. Automatische Regierungsbezirk-Erkennung aus Feldgeometrie (Hybrid: Auto-Detect + manueller Dropdown). SEO-optimierte Nmin-Referenztabelle auf der Landing Page.

---

## 1. Datenmodell

### 1.1 Neue Tabelle: `nmin_regional_values`

```sql
CREATE TABLE public.nmin_regional_values (
  id             TEXT PRIMARY KEY,
  crop_group     TEXT NOT NULL,       -- LfL-Gruppenname, z.B. "W-Raps"
  region         TEXT NOT NULL,       -- Regierungsbezirk
  depth_cm       INTEGER NOT NULL,    -- 90 oder 60
  year           INTEGER NOT NULL,    -- 2026
  value_kg_ha    NUMERIC NOT NULL,    -- endgültiger Nmin-Wert
  is_preliminary BOOLEAN DEFAULT false,
  UNIQUE(crop_group, region, depth_cm, year)
);
```

**Regionen (7 Regierungsbezirke):**
`oberbayern`, `niederbayern`, `oberpfalz`, `oberfranken`, `mittelfranken`, `unterfranken`, `schwaben`

**Crop-Groups und Mapping auf App-Crops:**

| crop_group | App Crop-IDs | depth_cm |
|---|---|---|
| `W-Raps` | crop-winterraps | 90 |
| `W-Gerste` | crop-wintergerste | 90 |
| `Triticale, W-Roggen` | crop-wintertriticale, crop-winterroggen | 90 |
| `W-Weizen, Dinkel` | crop-winterweizen, crop-winterweizen-bc, crop-winterweizen-e | 90 |
| `Z-Rüben, F-Rüben` | crop-zuckerrueben | 90 |
| `Silomais, Körnermais` | crop-silomais, crop-koernermais | 90 |
| `S-Gerste, Hafer` | crop-sommergerste, crop-hafer | 60 |
| `Sonnenblumen, Lein` | crop-sonnenblumen | 60 |
| `Kartoffeln` | crop-kartoffeln | 60 |
| `Sonstige Fruchtarten` | (Fallback für unbekannte Crops) | 90 + 60 |

### 1.2 Neues Mapping: `nmin_crop_group_mapping`

```sql
CREATE TABLE public.nmin_crop_group_mapping (
  crop_id    TEXT NOT NULL REFERENCES public.crops(id),
  crop_group TEXT NOT NULL,
  PRIMARY KEY(crop_id)
);
```

Seed-Daten verbinden jede App-Crop-ID mit ihrer LfL-Gruppe.

### 1.3 Neues Feld auf `fields`: `region`

```sql
ALTER TABLE public.fields ADD COLUMN IF NOT EXISTS region TEXT;
```

Nullable. Wird bei Geometrie-Import automatisch gesetzt, sonst manuell wählbar.

---

## 2. Nmin-Daten (endgültig, Heft 15/2026)

### Tiefe 0–90 cm

| Kultur | OBB | NDB | OPF | OFR | MFR | UFR | SWA |
|---|---|---|---|---|---|---|---|
| W-Raps | 40 | 41 | 41 | 42 | 38 | 39 | 37 |
| W-Gerste | 54 | 60 | 51 | 49 | 46 | 46 | 45 |
| Triticale, W-Roggen | 48 | 57 | 48 | 50 | 44 | 48 | 47 |
| W-Weizen, Dinkel | 54 | 56 | 62 | 56 | 51 | 57 | 48 |
| S-Weizen, Durum, S-Roggen, S-Raps | 60 | 58 | 58 | 63 | 61 | 56 | 54 |
| Z-Rüben, F-Rüben | 59 | 58 | 53 | 60 | 62 | 57 | 60 |
| Silomais, Körnermais | 68 | 77 | 66 | 67 | 62 | 63 | 58 |
| Sonstige Fruchtarten | 61 | 57 | 61 | 56 | 53 | 59 | 56 |

### Tiefe 0–60 cm

| Kultur | OBB | NDB | OPF | OFR | MFR | UFR | SWA |
|---|---|---|---|---|---|---|---|
| S-Gerste, Hafer | 52 | 42 | 43 | 44 | 46 | 47 | 47 |
| Sonnenblumen, Lein | 49 | 44 | 47 | 49 | 48 | 50 | 47 |
| Kartoffeln | 38 | 40 | 41 | 38 | 37 | 41 | 40 |
| Sonstige Fruchtarten | 45 | 43 | 45 | 41 | 40 | 44 | 42 |

**Quelle:** LfL Bayern, BLW Heft 15/2026 (02.04.2026) — alle Werte sind endgültig.

---

## 3. Region-Erkennung (Hybrid)

### 3.1 Auto-Detect aus Geometrie

**Datei:** `src/constants/regions.ts`
- Vereinfachte GeoJSON-Polygone der 7 Regierungsbezirke (~30KB)
- Quelle: OpenData Bayern, vereinfacht auf ~100 Punkte pro Bezirk

**Algorithmus:** Point-in-Polygon (Ray-Casting)
- Centroid des Feld-Polygons berechnen
- Gegen alle 7 Bezirksgrenzen prüfen
- Reiner JS-Code, läuft offline, kein PostGIS

**Composable:** `src/composables/useRegionDetection.ts`
```typescript
function detectRegion(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): string | null
function getRegionLabel(regionCode: string): string
```

### 3.2 Manueller Fallback (FieldForm)

Neuer optionaler Dropdown im FieldForm unterhalb der Nmin-Sektion:
- Label: "Regierungsbezirk"
- 7 Optionen + "Nicht angeben"
- Vorausgefüllt wenn Geometrie vorhanden (Auto-Detect)
- Editierbar (User kann Auto-Detect überschreiben)

### 3.3 Timing

- **Bei iBalis-Import:** Region wird automatisch aus importierter Geometrie erkannt und auf `fields.region` gesetzt
- **Bei manuellem Feld-Anlegen:** Dropdown im FieldForm
- **Bestehende Felder:** Beim nächsten Laden: wenn Geometrie vorhanden und region NULL → Auto-Detect und speichern

---

## 4. Empfehlungs-Integration

### 4.1 Nmin-Quelle Priorität

1. **Eigene Bodenprobe** (nmin_0_30 + nmin_30_60 + nmin_60_90 > 0) → Volle Kontrolle
2. **LfL-Richtwert** (region + crop_group + year → Lookup) → Automatischer Fallback
3. **Kein Nmin** (weder Probe noch Region) → 0 kg N/ha Abzug

### 4.2 UI in RecommendationView

**Wenn eigene Bodenprobe vorhanden (wie bisher):**
```
Nmin: 45 kg N/ha (0–90 cm) — Bodenprobe
```

**Wenn LfL-Richtwert (NEU):**
```
Nmin: 54 kg N/ha (0–90 cm) — LfL-Richtwert Oberbayern 2026
[Eigene Bodenprobe eintragen]
```
Wheat-50 Badge mit Info-Icon. Link zu Bodenproben-Eingabe im FieldForm.

**Wenn kein Nmin möglich:**
```
Nmin: nicht verfügbar — Regierungsbezirk und Bodenprobe fehlen
[Feld bearbeiten]
```

### 4.3 Berechnung

In `useNutrientCalculation.ts` ändert sich nichts — der Nmin-Wert wird weiterhin als `nminKgHa: number` übergeben. Die Quelle (Bodenprobe vs. Richtwert) wird in `RecommendationView.vue` aufgelöst:

```typescript
const nminSource = computed(() => {
  const probe = field.value ? sumNmin(field.value, crop.value) : 0
  if (probe > 0) return { value: probe, source: 'bodenprobe' as const }
  
  const richtwert = lookupRegionalNmin(field.value?.region, crop.value, 2026)
  if (richtwert) return { value: richtwert, source: 'lfl' as const }
  
  return { value: 0, source: 'none' as const }
})
```

---

## 5. Landing Page — Neue Sektion

### 5.1 Sektion "Aktuelle Nmin-Richtwerte 2026"

**Position:** Nach "Fünf Nährstoffe", vor "iBalis-Import"

**Aufbau:**
- Überschrift: "Nmin-Richtwerte 2026 — Ihr Regierungsbezirk auf einen Blick"
- Region-Dropdown (7 Bezirke) — interaktiv, kein Login nötig
- Tabelle: Kultur × Nmin-Wert für gewählte Region (beide Tiefen)
- Quellenangabe: "Endgültige Werte · LfL Bayern, BLW 15/2026"
- CTA: "Berechnung starten →" (→ /felder)

**Design:** Terrain-System, card-lift auf der Tabelle, field-Grün Akzente.

### 5.2 SEO-Updates

**Meta Description (index.html):**
```
Bedarfsgerecht düngen nach LfL-Richtwerten Bayern. Aktuelle Nmin-Richtwerte 2026 nach Regierungsbezirk. Kostenlose PWA für Landwirte mit iBalis-Import.
```

**Keywords hinzufügen:**
`Nmin-Richtwerte 2026`, `Regierungsbezirk`, `Oberbayern`, `Niederbayern`, `Oberpfalz`, `Oberfranken`, `Mittelfranken`, `Unterfranken`, `Schwaben`, `Nmin Mais`, `Nmin Winterweizen`, `endgültige Nmin-Werte`

**JSON-LD FAQ — Neue Frage:**
```json
{
  "@type": "Question",
  "name": "Welche Nmin-Werte gelten 2026 in Bayern?",
  "acceptedAnswer": {
    "@type": "Answer",
    "text": "Die endgültigen Nmin-Richtwerte 2026 der LfL Bayern variieren nach Regierungsbezirk und Kultur. Beispiel Winterweizen (0–90 cm): Oberbayern 54, Niederbayern 56, Oberpfalz 62, Oberfranken 56, Mittelfranken 51, Unterfranken 57, Schwaben 48 kg N/ha. Der Düngungsberater verwendet diese Werte automatisch, wenn keine eigene Bodenprobe vorliegt."
  }
}
```

**JSON-LD WebApplication features — Ergänzen:**
`"Regionale Nmin-Richtwerte 2026 nach Regierungsbezirk"`

**Noscript-Fallback:**
Vollständige Nmin-Tabelle als statisches HTML (für Crawler ohne JS).

**Sitemap:**
Keine neue URL nötig — die Nmin-Sektion ist Teil der Landing Page.

### 5.3 Durchwurzelungstiefe-Hinweis

Auf der Landing Page und in der Empfehlung:
- Bei Tiefe 0–90cm: Hinweis "Bei max. 60 cm Durchwurzelung: 75 % ansetzen. Bei max. 30 cm: 45 %."
- Dieser Hinweis stammt direkt aus den LfL-Dokumenten.

---

## 6. Services & Caching

### 6.1 Nmin-Service

**Datei:** `src/services/nmin-regional.service.ts`

```typescript
export async function getRegionalNminValues(year: number): Promise<NminRegionalValue[]>
export function lookupNmin(region: string, cropId: string, year: number): number | null
```

- Lädt alle Werte für ein Jahr aus Supabase
- Cachet in Dexie (IndexedDB) für Offline-Nutzung
- Mapping crop_id → crop_group über `nmin_crop_group_mapping`

### 6.2 Offline-Cache

Neue Dexie-Tabelle `nminRegionalValues` — wird bei App-Start und Sync geladen.

---

## 7. Nicht im Scope

- Jährliche Auto-Updates der Nmin-Werte (Admin pflegt manuell per Migration)
- Crops die wir nicht führen (Durum, Lein, F-Rüben etc.)
- Vorläufige Werte als separate Anzeige (nur endgültige)
- PostGIS oder externe Geocoding-APIs
