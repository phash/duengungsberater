# Stufe 2: Korrekturfaktoren — Design Spec

**Datum:** 2026-03-12
**Status:** Approved
**Vorgänger:** `2026-03-11-duenger-design.md` (MVP / Stufe 1)

---

## Überblick

Erweiterung der Düngeempfehlung um Korrekturfaktoren nach LfL Tab. 9f: Vorfrucht, Zwischenfrucht und Humusgehalt. Die Korrekturen werden auf der Empfehlungsseite als aufklappbare Dropdowns angeboten und beeinflussen die Berechnung live. Das Datenmodell ist nährstoff-flexibel — Korrekturen können beliebige Nährstoffe betreffen, nicht nur N.

---

## Datenmodell

### Neue Tabelle: `corrections` (ersetzt `n_corrections`)

| Spalte | Typ | Beschreibung |
|---|---|---|
| id | text PK | |
| type | text NOT NULL | `'vorfrucht'` \| `'zwischenfrucht'` \| `'humus'` |
| label_de | text NOT NULL | Anzeigename, z.B. "Winterraps", "> 4%" |
| sort_order | integer NOT NULL DEFAULT 0 | Reihenfolge im Dropdown |

RLS: Lesen für alle, Schreiben nur Admin.

### Neue Tabelle: `correction_values`

| Spalte | Typ | Beschreibung |
|---|---|---|
| id | text PK | |
| correction_id | text FK → corrections ON DELETE CASCADE | |
| nutrient_type_id | text FK → nutrient_types ON DELETE CASCADE | |
| value_kg_ha | numeric NOT NULL | Abschlag (negativ) oder Zuschlag (positiv) |

UNIQUE-Constraint: `(correction_id, nutrient_type_id)` — verhindert doppelte Nährstoff-Einträge pro Korrektur.

RLS: Lesen für alle, Schreiben nur Admin.

### Erweitert: `field_crop_plans`

3 neue nullable Spalten:

| Spalte | Typ |
|---|---|
| vorfrucht_correction_id | text FK → corrections, nullable |
| zwischenfrucht_correction_id | text FK → corrections, nullable |
| humus_correction_id | text FK → corrections, nullable |

Bestehende Pläne behalten `NULL` = keine Korrekturen = Stufe-1-Verhalten.

**Hinweis:** Die Original-Spec (`2026-03-11`) sah `humus_over_4pct` (boolean) auf `field_crop_plans` vor. Stufe 2 verwendet stattdessen `humus_correction_id` (FK → corrections) — flexibler, erlaubt gestufte Humus-Korrekturen und ist konsistent mit den anderen beiden FK-Spalten.

### Migration

- Daten aus `n_corrections` in `corrections` + `correction_values` migrieren
- `n_corrections`-Tabelle droppen
- Migrationsdatei: `002_corrections_schema.sql`

---

## TypeScript-Typen

```typescript
export interface Correction {
  id: string
  type: 'vorfrucht' | 'zwischenfrucht' | 'humus'
  label_de: string
  sort_order: number
}

export interface CorrectionValue {
  id: string
  correction_id: string
  nutrient_type_id: string
  value_kg_ha: number
}
```

`NCorrection` wird entfernt und durch `Correction` + `CorrectionValue` ersetzt.

`FieldCropPlan` wird erweitert:

```typescript
export interface FieldCropPlan {
  // ... bestehende Felder ...
  vorfrucht_correction_id: string | null
  zwischenfrucht_correction_id: string | null
  humus_correction_id: string | null
}
```

---

## Berechnungslogik

### Formel

```
empfehlung_kg_ha = demand_kg_ha
                 + (expected_yield - ref_yield) × per_yield_correction
                 + sum(correction_values für diesen Nährstoff)
```

Die `correction_values.value_kg_ha`-Werte sind bereits vorzeichenbehaftet (negativ = Abschlag, positiv = Zuschlag). Die Summierung addiert die vorzeichenbehafteten Werte direkt.

`Math.max(0, ...)` bleibt als Floor.

### Funktionssignatur

```typescript
function calculateNutrientDemand(
  demands: CropNutrientDemand[],
  nutrientTypes: NutrientType[],
  expectedYieldDtHa: number,
  fieldSizeHa: number,
  corrections?: CorrectionValue[],  // NEU, optional
): NutrientResult[]
```

`corrections` enthält alle `CorrectionValue`-Einträge der gewählten Korrekturen (aufgelöst aus den 3 Correction-IDs). Pro Nährstoff werden alle passenden `value_kg_ha` aufsummiert und zum Grundwert addiert.

### NutrientResult-Erweiterung

```typescript
export interface NutrientResult {
  nutrient_code: string
  nutrient_label: string
  value_kg_ha: number
  value_kg_total: number
  unit: string
  // NEU: optionale Aufschlüsselung
  breakdown?: {
    base_demand_kg_ha: number
    yield_correction_kg_ha: number
    corrections_kg_ha: CorrectionBreakdownItem[]
  }
}

export interface CorrectionBreakdownItem {
  label: string         // z.B. "Vorfrucht (Winterraps)"
  value_kg_ha: number   // z.B. -10
}
```

---

## UI: Empfehlungsseite

### Korrekturfaktoren-Bereich

Aufklappbarer Bereich auf `RecommendationView`, zwischen dem Kontext-Card (Kultur/Ertrag/Feld) und den Ergebnissen (RecommendationCard + ProductList):

- **Überschrift:** "Korrekturfaktoren (optional)" — standardmäßig eingeklappt
- **3 Dropdowns:**
  - Vorfrucht: Optionen aus `corrections` wo `type='vorfrucht'`, Default "— keine —"
  - Zwischenfrucht: Optionen aus `corrections` wo `type='zwischenfrucht'`, Default "— keine —"
  - Humus: Optionen aus `corrections` wo `type='humus'`, Default "< 4% (kein Abschlag)"
- **data-testid:** `correction-panel`, `correction-panel-toggle` (Expand/Collapse-Button), `correction-vorfrucht-select`, `correction-zwischenfrucht-select`, `correction-humus-select`

### Live-Update-Verhalten

Bei jeder Dropdown-Änderung:
1. `FieldCropPlan` wird mit den gewählten Correction-IDs aktualisiert (auto-save via `updatePlan`)
2. Berechnung wird automatisch neu ausgeführt — der "Empfehlung berechnen"-Button entfällt. Bei Erstaufruf ohne bestehende Empfehlung wird ebenfalls automatisch berechnet sobald die Seite geladen ist.
3. `RecommendationCard` und `ProductList` aktualisieren sich

**Änderung gegenüber Stufe 1:** Der explizite "Berechnen"-Button wird durch automatische Berechnung ersetzt. Die Berechnung ist rein lokal (Composable), daher kein Performance-Problem.

### Aufschlüsselung in RecommendationCard

Jede Nährstoff-Zeile ist antippbar. Bei Tap wird eine Aufschlüsselung sichtbar:
- Grundbedarf: 230 kg N/ha
- Ertragskorrektur: +10 kg N/ha
- Vorfrucht (Winterraps): -10 kg N/ha
- **Empfehlung: 230 kg N/ha**

- **data-testid:** `nutrient-breakdown-{code}` auf dem aufklappbaren Detail

---

## Admin-Bereich

### Vierter Tab: "Korrekturen"

Im bestehenden `AdminView` neben Kulturen / Nährstoffwerte / Produkte.
- **data-testid:** `admin-tab-corrections` (Tab-Button), `admin-correction-anlegen-button` (Anlegen-Button)

**AdminCorrectionList:**
- Zeigt Korrekturen gruppiert nach Typ (Vorfrucht / Zwischenfrucht / Humus)
- Pro Eintrag: Label + Vorschau der Nährstoff-Abschläge (z.B. "N: -10 kg/ha")
- Emit: `select(correctionId)`
- **data-testid:** `admin-correction-item-{id}`

**AdminCorrectionForm:**
- Felder: Label (text), Typ (dropdown: vorfrucht/zwischenfrucht/humus), Sortierung (number)
- Dynamische Liste der Nährstoff-Abschläge:
  - Pro Zeile: Nährstoff-Dropdown + Wert (kg/ha) + Entfernen-Button
  - "Nährstoff hinzufügen"-Button für neue Zeilen
- Speichern, Löschen (mit Bestätigung)
- **data-testid:** `admin-correction-label-input`, `admin-correction-type-select`, `admin-correction-nutrient-row-{index}`, `admin-correction-add-nutrient-button`, `admin-correction-speichern-button`, `admin-correction-loeschen-button`

---

## Seed-Daten (LfL Tab. 9f)

`src/constants/corrections.ts`:

### Vorfrucht

| Label | sort_order | N-Abschlag |
|---|---|---|
| Winterraps | 1 | -10 kg N/ha |
| Körnerleguminosen | 2 | -10 kg N/ha |
| Kartoffeln | 3 | -10 kg N/ha |
| Zuckerrüben | 4 | 0 kg N/ha |
| Mais | 5 | 0 kg N/ha |
| Getreide | 6 | 0 kg N/ha |

### Zwischenfrucht

| Label | sort_order | N-Abschlag |
|---|---|---|
| Leguminosen | 1 | -10 kg N/ha |
| Nichtleguminosen ohne Abfuhr (Gründüngung) | 2 | -20 kg N/ha |
| Nichtleguminosen mit Abfuhr | 3 | 0 kg N/ha |

### Humus

| Label | sort_order | N-Abschlag |
|---|---|---|
| < 4% (kein Abschlag) | 1 | 0 kg N/ha |
| > 4% | 2 | -20 kg N/ha |

Alle initial nur mit N-Korrekturen. Weitere Nährstoffe können über den Admin ergänzt werden.

---

## Offline & Sync

### Dexie-Schema

Dexie-Version wird von 1 auf 2 erhöht. Neue Stores ersetzen `nCorrections`:

```typescript
// db.ts — Version 2
db.version(2).stores({
  // bestehende Stores bleiben
  nutrientTypes: 'id, code',
  crops: 'id',
  cropNutrientDemands: 'id, crop_id',
  fertilizerProducts: 'id',
  cropFertilizerProducts: '[crop_id+product_id]',
  fields: 'id, user_id',
  fieldCropPlans: 'id, field_id',
  recommendations: 'id, field_crop_plan_id',
  recommendationValues: 'id, recommendation_id',
  // NEU: ersetzt nCorrections
  corrections: 'id, type',
  correctionValues: 'id, correction_id',
})
```

### Caching

`cacheStammdaten()` in `sync.service.ts` wird angepasst:
- **Entfernt:** `n_corrections`-Fetch + Dexie-Insert
- **Neu:** `corrections`-Fetch → `db.corrections.bulkPut()` + `correction_values`-Fetch → `db.correctionValues.bulkPut()`

### Sync

`syncAll()` muss beim Upsert von `field_crop_plans` die 3 neuen FK-Spalten mitsenden:

```typescript
// In syncAll() — field_crop_plans upsert erweitern:
const { error } = await supabase.from('field_crop_plans').upsert({
  // ... bestehende Felder ...
  vorfrucht_correction_id: plan.vorfrucht_correction_id,
  zwischenfrucht_correction_id: plan.zwischenfrucht_correction_id,
  humus_correction_id: plan.humus_correction_id,
})
```

### updatePlan Service

`updatePlan()` in `field-crop-plan.service.ts` muss die 3 neuen FK-Spalten im Update-Payload akzeptieren und weitergeben:

```typescript
async function updatePlan(
  planId: string,
  updates: Partial<Pick<FieldCropPlan,
    'expected_yield_dt_ha' | 'crop_id' | 'season_year'
    | 'vorfrucht_correction_id' | 'zwischenfrucht_correction_id' | 'humus_correction_id'
  >>
): Promise<void>
```

### Fallback-Kette

- `getCorrections()` → Supabase → Dexie → `src/constants/corrections.ts` Seed-Daten
- Offline-Auswahl von Korrekturen funktioniert über gecachte Stammdaten

### Neuer Service: `correction.service.ts`

- `getCorrections()` — alle Korrekturen lesen (Supabase → Dexie → Constants)
- `getCorrectionValues(correctionIds: string[])` — Werte für gewählte Korrekturen
- Admin-CRUD: `createCorrection`, `updateCorrection`, `deleteCorrection`

---

## Abwärtskompatibilität

- Bestehende Pläne: 3 neue FK-Spalten sind nullable → `NULL` = keine Korrekturen
- Berechnung: ohne `corrections`-Parameter identisch zu Stufe 1
- Alte `NCorrection`-Referenzen im Code werden durch neue Typen ersetzt
- Dexie-Schema-Version wird von 1 auf 2 erhöht (siehe Offline & Sync)

---

## Akzeptanzkriterien / Testszenarien

### Unit-Tests (Vitest)

1. **Berechnung ohne Korrekturen:** `calculateNutrientDemand(demands, types, yield, size)` ohne `corrections`-Parameter liefert identische Ergebnisse wie Stufe 1
2. **Berechnung mit N-Korrektur:** Vorfrucht Winterraps (-10 N) reduziert N-Empfehlung um 10 kg/ha
3. **Mehrere Korrekturen kumulativ:** Vorfrucht (-10 N) + Zwischenfrucht (-20 N) + Humus (-20 N) werden aufsummiert (-50 N)
4. **Floor bei 0:** Negative Empfehlung nach Korrekturen wird auf 0 geclampt
5. **Korrekturen nur für betroffene Nährstoffe:** P₂O₅-Ergebnis bleibt unverändert wenn nur N-Korrekturen aktiv
6. **Breakdown korrekt:** `NutrientResult.breakdown` enthält base_demand, yield_correction und jede Korrektur einzeln

### E2E-Tests (Playwright)

7. **Korrektur-Panel UI:** Panel ist standardmäßig eingeklappt, lässt sich öffnen, enthält 3 Dropdowns
8. **Live-Update:** Auswahl einer Vorfrucht-Korrektur aktualisiert RecommendationCard sofort (ohne Button-Klick)
9. **Persistenz:** Gewählte Korrekturen bleiben nach Seitenwechsel und Rückkehr erhalten
10. **Admin CRUD:** Neue Korrektur anlegen, bearbeiten, löschen — erscheint/verschwindet in Admin-Liste
11. **Automatische Berechnung:** RecommendationView berechnet beim Laden automatisch (kein "Berechnen"-Button mehr)

### Migrations-Test

12. **Migration 002:** Bestehende `n_corrections`-Daten werden korrekt in `corrections` + `correction_values` migriert; `n_corrections` wird gedroppt

---

## Nicht im Scope (Stufe 3+)

- Nmin-Messwerte aus Bodenanalyse
- Bodentyp-Integration
- Moor-Böden (anmoorig, Hochmoor — eigene Humus-Korrekturstufen)
- Eigene Nährstoffwerte überschreiben (ProfileView Stufe 2 laut Original-Spec)
