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

RLS: Lesen für alle, Schreiben nur Admin.

### Erweitert: `field_crop_plans`

3 neue nullable Spalten:

| Spalte | Typ |
|---|---|
| vorfrucht_correction_id | text FK → corrections, nullable |
| zwischenfrucht_correction_id | text FK → corrections, nullable |
| humus_correction_id | text FK → corrections, nullable |

Bestehende Pläne behalten `NULL` = keine Korrekturen = Stufe-1-Verhalten.

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

Aufklappbarer Bereich auf `RecommendationView`, oberhalb des Berechnen-Buttons:

- **Überschrift:** "Korrekturfaktoren (optional)" — standardmäßig eingeklappt
- **3 Dropdowns:**
  - Vorfrucht: Optionen aus `corrections` wo `type='vorfrucht'`, Default "— keine —"
  - Zwischenfrucht: Optionen aus `corrections` wo `type='zwischenfrucht'`, Default "— keine —"
  - Humus: Optionen aus `corrections` wo `type='humus'`, Default "< 4% (kein Abschlag)"
- **data-testid:** `correction-panel`, `correction-vorfrucht-select`, `correction-zwischenfrucht-select`, `correction-humus-select`

### Live-Update-Verhalten

Bei jeder Dropdown-Änderung:
1. `FieldCropPlan` wird mit den gewählten Correction-IDs aktualisiert (auto-save via `updatePlan`)
2. Berechnung wird automatisch neu ausgeführt
3. `RecommendationCard` und `ProductList` aktualisieren sich

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

| Label | N-Abschlag |
|---|---|
| Winterraps | -10 kg N/ha |
| Körnerleguminosen | -10 kg N/ha |
| Kartoffeln | -10 kg N/ha |
| Zuckerrüben | 0 kg N/ha |
| Mais | 0 kg N/ha |
| Getreide | 0 kg N/ha |

### Zwischenfrucht

| Label | N-Abschlag |
|---|---|
| Leguminosen | -10 kg N/ha |
| Nichtleguminosen ohne Abfuhr (Gründüngung) | -20 kg N/ha |
| Nichtleguminosen mit Abfuhr | 0 kg N/ha |

### Humus

| Label | N-Abschlag |
|---|---|
| < 4% (kein Abschlag) | 0 kg N/ha |
| > 4% | -20 kg N/ha |

Alle initial nur mit N-Korrekturen. Weitere Nährstoffe können über den Admin ergänzt werden.

---

## Offline & Sync

- `corrections` und `correction_values` werden in Dexie gespiegelt
- `cacheStammdaten()` cached beide Tabellen beim Login
- Fallback: `src/constants/corrections.ts` Seed-Daten wenn Dexie leer
- `syncAll()` sendet die 3 neuen FK-Spalten von `field_crop_plans` mit
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
- Dexie-Schema-Version wird erhöht

---

## Nicht im Scope (Stufe 3+)

- Nmin-Messwerte aus Bodenanalyse
- Bodentyp-Integration
- Moor-Böden (anmoorig, Hochmoor — eigene Humus-Korrekturstufen)
- Eigene Nährstoffwerte überschreiben (ProfileView Stufe 2 laut Original-Spec)
