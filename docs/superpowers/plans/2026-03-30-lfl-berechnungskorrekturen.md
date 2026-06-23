# LfL-Berechnungskorrekturen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alle Berechnungswerte gegen LfL Basisdaten 2025 (Tab. 9a, 9f, 1a) korrigieren und asymmetrische N-Ertragskorrektur implementieren.

**Architecture:** Neues optionales Feld `per_yield_correction_below` in `CropNutrientDemand` für den Abschlag bei Minderertrag (LfL Tab. 9a Spalte "Abschlag"). Wenn nicht gesetzt, wird symmetrisch `per_yield_correction` verwendet (= P2O5/K2O/MgO/S Verhalten). Berechnung in `useNutrientCalculation.ts` prüft Ertragsrichtung und wählt den passenden Korrekturfaktor.

**Tech Stack:** Vue 3, TypeScript, Vitest, Supabase (PostgreSQL), Dexie.js

**Quelle:** LfL Bayern Basisdaten 2025 — Tabelle 9a (N-Bedarfswerte, Stand Nov 2024), Tabelle 9f (Kenngrößen Düngebedarfsermittlung)

---

## Zusammenfassung der Fehler

| # | Problem | Ist | Soll (LfL) |
|---|---------|-----|------------|
| 1 | WW E fehlt, E+A falsch gruppiert | "WW (E, A)" = 230 | WW E = 260, WW A/B = 230, WW C = 210 |
| 2 | Winterroggen Ref.-Ertrag | 60 dt/ha | 70 dt/ha |
| 3 | Sommergerste Brau: N-Wert + Ertrag | 140 kg N, 55 dt/ha | 120 kg N, 50 dt/ha |
| 4 | Kartoffeln Ref.-Ertrag | 400 dt/ha | 450 dt/ha (Speise/Stärke) |
| 5 | Asymmetrische Ertragskorrektur fehlt | 1 Wert symmetrisch | Zuschlag ≠ Abschlag für N |
| 6 | Winterraps per_yield_correction N | 1.5 | Zuschlag 2.0, Abschlag 3.0 |
| 7 | Sonnenblumen per_yield_correction N | 1.5 | Zuschlag 2.0, Abschlag 3.0 |
| 8 | Silomais per_yield_correction N | 0.3 | Zuschlag 0.2, Abschlag 0.3 |
| 9 | Kartoffeln Vorfrucht-Abschlag | -10 kg N | 0 kg N (LfL 9f) |
| 10 | Körnermais nmin_depth_cm | 60 | 90 |
| 11 | Silomais nmin_depth_cm | 60 | 90 |

---

## File Structure

| Aktion | Datei | Verantwortung |
|--------|-------|---------------|
| Modify | `src/types/index.ts` | `per_yield_correction_below` zu CropNutrientDemand |
| Modify | `src/constants/crops.ts` | Crop-Daten + N-Demands korrigieren |
| Modify | `src/constants/corrections.ts` | Kartoffeln Vorfrucht fix |
| Modify | `src/composables/useNutrientCalculation.ts` | Asymmetrische Korrektur |
| Modify | `src/constants/crops.test.ts` | Tests an neue Daten anpassen |
| Modify | `src/composables/useNutrientCalculation.test.ts` | Tests für asymmetrische Korrektur |
| Modify | `src/services/nutrient.service.ts` | Pick-Type erweitern |
| Modify | `src/components/AdminNutrientForm.vue` | Optional: Abschlag-Feld |
| Modify | `src/views/NutrientValuesView.vue` | Optional: Abschlag anzeigen |
| Create | `supabase/migrations/007_asymmetric_yield_correction.sql` | DB-Schema erweitern |
| Modify | `supabase/seed.sql` | Seed-Daten aktualisieren |

---

### Task 1: Type erweitern — `per_yield_correction_below`

**Files:**
- Modify: `src/types/index.ts:37-47`

- [ ] **Step 1: Feld zu CropNutrientDemand hinzufügen**

In `src/types/index.ts`, im Interface `CropNutrientDemand` nach `per_yield_correction` einfügen:

```typescript
export interface CropNutrientDemand {
  id: string
  crop_id: string
  nutrient_type_id: string
  demand_kg_ha: number
  ref_yield_dt_ha: number
  per_yield_correction: number
  per_yield_correction_below?: number // LfL 9a: Abschlag/dt bei Minderertrag (wenn != Zuschlag)
  source: 'lfl' | 'user'
  user_id: string | null
  valid_from: string
}
```

JSDoc-Kommentar über dem Interface aktualisieren:

```typescript
/**
 * Nährstoffbedarf pro Kultur.
 *
 * `per_yield_correction`: Zuschlag in kg pro dt Ertragsabweichung ÜBER Referenzertrag.
 * `per_yield_correction_below`: Abschlag in kg pro dt UNTER Referenzertrag (optional).
 *   Wenn nicht gesetzt, wird `per_yield_correction` symmetrisch verwendet.
 * - Für N (Tab. 9a): Zuschlag/Abschlag zum N-Bedarfswert — oft asymmetrisch.
 * - Für P2O5/K2O/MgO/S (Tab. 1a): Immer symmetrisch (= Nährstoffgehalt kg/dt FM).
 */
```

- [ ] **Step 2: Lint prüfen**

Run: `npx vue-tsc --noEmit 2>&1 | head -30`
Expected: Keine neuen Fehler (optionales Feld bricht nichts)

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add per_yield_correction_below to CropNutrientDemand type

LfL Tab. 9a has asymmetric yield corrections for N (Zuschlag ≠ Abschlag).
New optional field allows different rates above/below reference yield."
```

---

### Task 2: Berechnungslogik — asymmetrische Ertragskorrektur

**Files:**
- Modify: `src/composables/useNutrientCalculation.ts:23-25`
- Test: `src/composables/useNutrientCalculation.test.ts`

- [ ] **Step 1: Failing Test für asymmetrische Korrektur schreiben**

In `src/composables/useNutrientCalculation.test.ts`, neuen `describe`-Block nach dem letzten Test hinzufügen:

```typescript
describe('asymmetric yield correction (LfL Tab. 9a)', () => {
  // Winterraps-ähnlich: Zuschlag 2.0, Abschlag 3.0
  const ASYM_DEMANDS: CropNutrientDemand[] = [
    {
      id: 'cnd-asym-n',
      crop_id: 'crop-test',
      nutrient_type_id: 'nt-n',
      demand_kg_ha: 200,
      ref_yield_dt_ha: 40,
      per_yield_correction: 2.0,
      per_yield_correction_below: 3.0,
      source: 'lfl',
      user_id: null,
      valid_from: '2025-01-01',
    },
    {
      id: 'cnd-asym-p',
      crop_id: 'crop-test',
      nutrient_type_id: 'nt-p2o5',
      demand_kg_ha: 48,
      ref_yield_dt_ha: 40,
      per_yield_correction: 1.2,
      source: 'lfl',
      user_id: null,
      valid_from: '2025-01-01',
    },
  ]

  it('uses per_yield_correction (Zuschlag) when yield is ABOVE reference', () => {
    const results = calculateNutrientDemand(ASYM_DEMANDS, NUTRIENT_TYPES, 45, 1)
    const n = results.find((r) => r.nutrient_code === 'N')!
    // 200 + (45-40) * 2.0 = 210
    expect(n.value_kg_ha).toBe(210)
  })

  it('uses per_yield_correction_below (Abschlag) when yield is BELOW reference', () => {
    const results = calculateNutrientDemand(ASYM_DEMANDS, NUTRIENT_TYPES, 35, 1)
    const n = results.find((r) => r.nutrient_code === 'N')!
    // 200 + (35-40) * 3.0 = 200 - 15 = 185
    expect(n.value_kg_ha).toBe(185)
  })

  it('uses per_yield_correction for both directions when _below is not set (P2O5)', () => {
    const results = calculateNutrientDemand(ASYM_DEMANDS, NUTRIENT_TYPES, 35, 1)
    const p = results.find((r) => r.nutrient_code === 'P2O5')!
    // 48 + (35-40) * 1.2 = 48 - 6 = 42
    expect(p.value_kg_ha).toBe(42)
  })

  it('uses per_yield_correction at exact reference yield (no correction)', () => {
    const results = calculateNutrientDemand(ASYM_DEMANDS, NUTRIENT_TYPES, 40, 1)
    const n = results.find((r) => r.nutrient_code === 'N')!
    expect(n.value_kg_ha).toBe(200)
  })

  it('reports correct yield_correction_kg_ha in breakdown (below)', () => {
    const results = calculateNutrientDemand(ASYM_DEMANDS, NUTRIENT_TYPES, 35, 1, [], 0)
    const n = results.find((r) => r.nutrient_code === 'N')!
    expect(n.breakdown!.yield_correction_kg_ha).toBe(-15) // (35-40)*3.0
  })
})
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run src/composables/useNutrientCalculation.test.ts 2>&1 | tail -20`
Expected: FAIL — "uses per_yield_correction_below when yield is BELOW reference" erwartet 185, bekommt 190 (weil noch symmetrisch 2.0 statt 3.0 verwendet wird)

- [ ] **Step 3: Berechnung in useNutrientCalculation.ts anpassen**

In `src/composables/useNutrientCalculation.ts`, Zeilen 23-25 ersetzen:

```typescript
        const yieldDiff = expectedYieldDtHa - demand.ref_yield_dt_ha
        const baseDemand = demand.demand_kg_ha
        const correctionRate =
          yieldDiff < 0 && demand.per_yield_correction_below != null
            ? demand.per_yield_correction_below
            : demand.per_yield_correction
        const yieldCorrection = yieldDiff * correctionRate
```

- [ ] **Step 4: Tests laufen lassen — alle müssen bestehen**

Run: `npx vitest run src/composables/useNutrientCalculation.test.ts 2>&1 | tail -20`
Expected: ALL PASS (alte Tests unverändert, neue Tests bestehen)

- [ ] **Step 5: Commit**

```bash
git add src/composables/useNutrientCalculation.ts src/composables/useNutrientCalculation.test.ts
git commit -m "feat: implement asymmetric yield correction (LfL Tab. 9a)

Use per_yield_correction_below for yields below reference when set.
Falls back to per_yield_correction (symmetric) when not set."
```

---

### Task 3: Crop-Konstanten korrigieren

**Files:**
- Modify: `src/constants/crops.ts`
- Modify: `src/constants/crops.test.ts`

- [ ] **Step 1: Tests für korrekte LfL-Werte aktualisieren**

In `src/constants/crops.test.ts`, die bestehenden Tests anpassen und neue ergänzen:

```typescript
describe('getCropById', () => {
  it('finds Winterweizen A/B', () => {
    const crop = getCropById('crop-winterweizen')
    expect(crop).toBeDefined()
    expect(crop!.name_de).toBe('Winterweizen (A, B)')
    expect(crop!.ref_yield_dt_ha).toBe(80)
  })

  it('finds Winterweizen E', () => {
    const crop = getCropById('crop-winterweizen-e')
    expect(crop).toBeDefined()
    expect(crop!.name_de).toBe('Winterweizen (E)')
    expect(crop!.ref_yield_dt_ha).toBe(80)
  })

  it('returns undefined for unknown id', () => {
    expect(getCropById('unknown')).toBeUndefined()
  })
})
```

Aktualisiere den Test für "at least 10 crops" auf ≥ 14 (war 13, +1 für WW E):

```typescript
it('contains at least 14 crops', () => {
  expect(CROPS.length).toBeGreaterThanOrEqual(14)
})
```

Aktualisiere die N-Demand-Tests:

```typescript
it('has correct N demand for Winterweizen A/B (LfL Tab. 9a: 230 kg/ha)', () => {
  const demands = getNutrientDemandsForCrop('crop-winterweizen')
  const nDemand = demands.find((d) => d.nutrient_type_id === 'nt-n')
  expect(nDemand!.demand_kg_ha).toBe(230)
  expect(nDemand!.per_yield_correction).toBe(1.0)
  expect(nDemand!.per_yield_correction_below).toBe(1.5)
})

it('has correct N demand for Winterweizen E (LfL Tab. 9a: 260 kg/ha)', () => {
  const demands = getNutrientDemandsForCrop('crop-winterweizen-e')
  const nDemand = demands.find((d) => d.nutrient_type_id === 'nt-n')
  expect(nDemand!.demand_kg_ha).toBe(260)
  expect(nDemand!.per_yield_correction).toBe(1.0)
  expect(nDemand!.per_yield_correction_below).toBe(1.5)
})

it('has correct N demand for Winterroggen (LfL Tab. 9a: 170 kg/ha, ref 70)', () => {
  const demands = getNutrientDemandsForCrop('crop-winterroggen')
  const nDemand = demands.find((d) => d.nutrient_type_id === 'nt-n')
  expect(nDemand!.demand_kg_ha).toBe(170)
  expect(nDemand!.ref_yield_dt_ha).toBe(70)
})

it('has correct N demand for Sommerbraugerste (LfL Tab. 9a: 120 kg/ha, ref 50)', () => {
  const demands = getNutrientDemandsForCrop('crop-sommergerste')
  const nDemand = demands.find((d) => d.nutrient_type_id === 'nt-n')
  expect(nDemand!.demand_kg_ha).toBe(120)
  expect(nDemand!.ref_yield_dt_ha).toBe(50)
})

it('has correct N demand for Kartoffeln (LfL Tab. 9a: 180 kg/ha, ref 450)', () => {
  const demands = getNutrientDemandsForCrop('crop-kartoffeln')
  const nDemand = demands.find((d) => d.nutrient_type_id === 'nt-n')
  expect(nDemand!.demand_kg_ha).toBe(180)
  expect(nDemand!.ref_yield_dt_ha).toBe(450)
})

it('has correct N demand for Winterraps (LfL Tab. 9a: Zuschlag 2.0, Abschlag 3.0)', () => {
  const demands = getNutrientDemandsForCrop('crop-winterraps')
  const nDemand = demands.find((d) => d.nutrient_type_id === 'nt-n')
  expect(nDemand!.per_yield_correction).toBe(2.0)
  expect(nDemand!.per_yield_correction_below).toBe(3.0)
})
```

Aktualisiere "every crop has exactly 5 nutrient demands" — bleibt gleich, aber Crop-Count steigt.

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `npx vitest run src/constants/crops.test.ts 2>&1 | tail -20`
Expected: FAIL (alte Daten stimmen noch nicht)

- [ ] **Step 3: CROPS Array in crops.ts korrigieren**

Änderungen in `src/constants/crops.ts`:

**3a. Winterweizen (E, A) → (A, B) umbenennen:**
```typescript
{
  id: 'crop-winterweizen',
  name_de: 'Winterweizen (A, B)',
  // ... rest bleibt gleich
},
```

**3b. Winterweizen (B, C) → (C) umbenennen:**
```typescript
{
  id: 'crop-winterweizen-bc',
  name_de: 'Winterweizen (C)',
  // ... rest bleibt gleich
},
```

**3c. Winterweizen (E) NEU einfügen (nach crop-winterweizen-bc):**
```typescript
{
  id: 'crop-winterweizen-e',
  name_de: 'Winterweizen (E)',
  category: 'Getreide',
  sow_month_from: 9,
  sow_month_to: 11,
  harvest_month_from: 7,
  harvest_month_to: 8,
  ref_yield_dt_ha: 80,
  nmin_depth_cm: 90,
},
```

**3d. Winterroggen ref_yield korrigieren:**
```typescript
{
  id: 'crop-winterroggen',
  name_de: 'Winterroggen',
  // ...
  ref_yield_dt_ha: 70, // war 60
  // ...
},
```

**3e. Sommergerste ref_yield korrigieren:**
```typescript
{
  id: 'crop-sommergerste',
  name_de: 'Sommergerste (Brau)',
  // ...
  ref_yield_dt_ha: 50, // war 55
  // ...
},
```

**3f. Kartoffeln ref_yield korrigieren:**
```typescript
{
  id: 'crop-kartoffeln',
  name_de: 'Kartoffeln',
  // ...
  ref_yield_dt_ha: 450, // war 400
  // ...
},
```

**3g. Körnermais nmin_depth_cm korrigieren:**
```typescript
{
  id: 'crop-koernermais',
  // ...
  nmin_depth_cm: 90, // war 60, LfL: "Berechnung Nmin bis 90 cm" = ja
},
```

**3h. Silomais nmin_depth_cm korrigieren:**
```typescript
{
  id: 'crop-silomais',
  // ...
  nmin_depth_cm: 90, // war 60, LfL: "Berechnung Nmin bis 90 cm" = ja
},
```

- [ ] **Step 4: CROP_NUTRIENT_DEMANDS korrigieren**

**4a. Winterweizen A/B — per_yield_correction_below hinzufügen (alle 5 N-Demands der Getreide):**

Für `cnd-ww-n` (WW A/B N):
```typescript
{
  id: 'cnd-ww-n',
  crop_id: 'crop-winterweizen',
  nutrient_type_id: 'nt-n',
  demand_kg_ha: 230,
  ref_yield_dt_ha: 80,
  per_yield_correction: 1.0,
  per_yield_correction_below: 1.5,
  source: 'lfl',
  user_id: null,
  valid_from: '2025-01-01',
},
```

**4b. Winterweizen C — per_yield_correction_below hinzufügen:**
```typescript
{
  id: 'cnd-wwbc-n',
  crop_id: 'crop-winterweizen-bc',
  nutrient_type_id: 'nt-n',
  demand_kg_ha: 210,
  ref_yield_dt_ha: 80,
  per_yield_correction: 1.0,
  per_yield_correction_below: 1.5,
  // ...
},
```

**4c. Winterweizen E — 5 neue Demands einfügen:**
```typescript
// --- Winterweizen E (ref: 80 dt/ha) ---
// Tab. 9a: N-Bedarf 260 kg/ha, Zuschlag 1.0, Abschlag 1.5
{
  id: 'cnd-wwe-n',
  crop_id: 'crop-winterweizen-e',
  nutrient_type_id: 'nt-n',
  demand_kg_ha: 260,
  ref_yield_dt_ha: 80,
  per_yield_correction: 1.0,
  per_yield_correction_below: 1.5,
  source: 'lfl',
  user_id: null,
  valid_from: '2025-01-01',
},
{
  id: 'cnd-wwe-p',
  crop_id: 'crop-winterweizen-e',
  nutrient_type_id: 'nt-p2o5',
  demand_kg_ha: 64,
  ref_yield_dt_ha: 80,
  per_yield_correction: 0.8,
  source: 'lfl',
  user_id: null,
  valid_from: '2025-01-01',
},
{
  id: 'cnd-wwe-k',
  crop_id: 'crop-winterweizen-e',
  nutrient_type_id: 'nt-k2o',
  demand_kg_ha: 48,
  ref_yield_dt_ha: 80,
  per_yield_correction: 0.6,
  source: 'lfl',
  user_id: null,
  valid_from: '2025-01-01',
},
{
  id: 'cnd-wwe-mg',
  crop_id: 'crop-winterweizen-e',
  nutrient_type_id: 'nt-mgo',
  demand_kg_ha: 12.8,
  ref_yield_dt_ha: 80,
  per_yield_correction: 0.16,
  source: 'lfl',
  user_id: null,
  valid_from: '2025-01-01',
},
{
  id: 'cnd-wwe-s',
  crop_id: 'crop-winterweizen-e',
  nutrient_type_id: 'nt-s',
  demand_kg_ha: 9.6,
  ref_yield_dt_ha: 80,
  per_yield_correction: 0.12,
  source: 'lfl',
  user_id: null,
  valid_from: '2025-01-01',
},
```

**4d. Wintergerste N — per_yield_correction_below:**
```typescript
{
  id: 'cnd-wg-n',
  // ...
  per_yield_correction: 1.0,
  per_yield_correction_below: 1.5,
  // ...
},
```

**4e. Winterroggen — ref_yield + demand korrigieren + per_yield_correction_below:**

N: demand 170 bleibt, ref 70 (war 60), per_yield_correction_below: 1.5
P2O5: 70 × 0.8 = 56 (war 48), ref 70
K2O: 70 × 0.6 = 42 (war 36), ref 70
MgO: 70 × 0.13 = 9.1 (war 7.8), ref 70
S: 70 × 0.1 = 7.0 (war 6.0), ref 70

```typescript
{ id: 'cnd-wr-n', crop_id: 'crop-winterroggen', nutrient_type_id: 'nt-n',
  demand_kg_ha: 170, ref_yield_dt_ha: 70, per_yield_correction: 1.0,
  per_yield_correction_below: 1.5, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
{ id: 'cnd-wr-p', crop_id: 'crop-winterroggen', nutrient_type_id: 'nt-p2o5',
  demand_kg_ha: 56, ref_yield_dt_ha: 70, per_yield_correction: 0.8,
  source: 'lfl', user_id: null, valid_from: '2025-01-01' },
{ id: 'cnd-wr-k', crop_id: 'crop-winterroggen', nutrient_type_id: 'nt-k2o',
  demand_kg_ha: 42, ref_yield_dt_ha: 70, per_yield_correction: 0.6,
  source: 'lfl', user_id: null, valid_from: '2025-01-01' },
{ id: 'cnd-wr-mg', crop_id: 'crop-winterroggen', nutrient_type_id: 'nt-mgo',
  demand_kg_ha: 9.1, ref_yield_dt_ha: 70, per_yield_correction: 0.13,
  source: 'lfl', user_id: null, valid_from: '2025-01-01' },
{ id: 'cnd-wr-s', crop_id: 'crop-winterroggen', nutrient_type_id: 'nt-s',
  demand_kg_ha: 7.0, ref_yield_dt_ha: 70, per_yield_correction: 0.1,
  source: 'lfl', user_id: null, valid_from: '2025-01-01' },
```

**4f. Wintertriticale N — per_yield_correction_below:**
```typescript
{ id: 'cnd-wt-n', /* ... */ per_yield_correction: 1.0, per_yield_correction_below: 1.5, /* ... */ },
```

**4g. Sommergerste Brau — N korrigieren + ref ändern:**

N: 120 (war 140), ref 50 (war 55), per_yield_correction_below: 1.5
P2O5: 50 × 0.8 = 40 (war 44), ref 50
K2O: 50 × 0.6 = 30 (war 33), ref 50
MgO: 50 × 0.14 = 7.0 (war 7.7), ref 50
S: 50 × 0.1 = 5.0 (war 5.5), ref 50

**4h. Hafer N — per_yield_correction_below:**
```typescript
{ id: 'cnd-ha-n', /* ... */ per_yield_correction: 1.0, per_yield_correction_below: 1.5, /* ... */ },
```

**4i. Körnermais N — per_yield_correction_below:**
```typescript
{ id: 'cnd-km-n', /* ... */ per_yield_correction: 1.0, per_yield_correction_below: 1.5, /* ... */ },
```

**4j. Kartoffeln — ref ändern + alle Demands neu berechnen:**

N: 180, ref 450 (war 400), per_yield_correction: 0.2, per_yield_correction_below: 0.2
P2O5: 450 × 0.15 = 67.5 (war 60), ref 450
K2O: 450 × 0.5 = 225 (war 200), ref 450
MgO: 450 × 0.06 = 27 (war 24), ref 450
S: 450 × 0.04 = 18 (war 16), ref 450

**4k. Zuckerrüben N — per_yield_correction_below:**
```typescript
{ id: 'cnd-zr-n', /* ... */ per_yield_correction: 0.1, per_yield_correction_below: 0.15, /* ... */ },
```

**4l. Winterraps N — per_yield_correction korrigieren:**
```typescript
{ id: 'cnd-rap-n', /* ... */ per_yield_correction: 2.0, per_yield_correction_below: 3.0, /* ... */ },
```

**4m. Sonnenblumen N — per_yield_correction korrigieren:**
```typescript
{ id: 'cnd-sb-n', /* ... */ per_yield_correction: 2.0, per_yield_correction_below: 3.0, /* ... */ },
```

**4n. Silomais N — per_yield_correction korrigieren:**
```typescript
{ id: 'cnd-sm-n', /* ... */ per_yield_correction: 0.2, per_yield_correction_below: 0.3, /* ... */ },
```

**4o. Kleegras N — bleibt 0/0 (Leguminose), kein per_yield_correction_below nötig.**

- [ ] **Step 5: Tests laufen lassen**

Run: `npx vitest run src/constants/crops.test.ts 2>&1 | tail -20`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/constants/crops.ts src/constants/crops.test.ts
git commit -m "fix: correct crop data against LfL Basisdaten 2025 Tab. 9a

- Add Winterweizen E (260 kg N/ha) as separate crop
- Rename WW groupings: (E,A)→(A,B), (B,C)→(C)
- Fix Winterroggen ref yield: 60→70 dt/ha
- Fix Sommerbraugerste: 140→120 kg N, 55→50 dt/ha
- Fix Kartoffeln ref yield: 400→450 dt/ha
- Fix Körnermais/Silomais nmin_depth: 60→90 cm
- Add per_yield_correction_below for all N demands
- Fix Winterraps/Sonnenblumen/Silomais yield correction rates"
```

---

### Task 4: Kartoffeln Vorfrucht-Korrektur fixen

**Files:**
- Modify: `src/constants/corrections.ts:70-75`

- [ ] **Step 1: Failing Test schreiben**

In einer neuen Datei `src/constants/corrections.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { DEFAULT_CORRECTIONS, DEFAULT_CORRECTION_VALUES, getCorrectionsByType } from './corrections'

describe('corrections constants (LfL Tab. 9f)', () => {
  it('Kartoffeln Vorfrucht has 0 kg N/ha (not -10)', () => {
    const kartoffelnCorr = DEFAULT_CORRECTIONS.find((c) => c.label_de === 'Kartoffeln')
    expect(kartoffelnCorr).toBeDefined()
    const nValue = DEFAULT_CORRECTION_VALUES.find(
      (cv) => cv.correction_id === kartoffelnCorr!.id && cv.nutrient_type_id === 'nt-n',
    )
    expect(nValue!.value_kg_ha).toBe(0)
  })

  it('Winterraps Vorfrucht has -10 kg N/ha', () => {
    const rapsCorr = DEFAULT_CORRECTIONS.find((c) => c.label_de === 'Winterraps')
    expect(rapsCorr).toBeDefined()
    const nValue = DEFAULT_CORRECTION_VALUES.find(
      (cv) => cv.correction_id === rapsCorr!.id && cv.nutrient_type_id === 'nt-n',
    )
    expect(nValue!.value_kg_ha).toBe(-10)
  })

  it('Humus > 4% has -20 kg N/ha', () => {
    const humusCorr = DEFAULT_CORRECTIONS.find((c) => c.label_de === '> 4%')
    expect(humusCorr).toBeDefined()
    const nValue = DEFAULT_CORRECTION_VALUES.find(
      (cv) => cv.correction_id === humusCorr!.id && cv.nutrient_type_id === 'nt-n',
    )
    expect(nValue!.value_kg_ha).toBe(-20)
  })

  it('getCorrectionsByType returns sorted vorfrucht corrections', () => {
    const vf = getCorrectionsByType('vorfrucht')
    expect(vf.length).toBeGreaterThanOrEqual(6)
    expect(vf[0].sort_order).toBeLessThanOrEqual(vf[1].sort_order)
  })
})
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run src/constants/corrections.test.ts 2>&1 | tail -20`
Expected: FAIL — Kartoffeln hat -10 statt 0

- [ ] **Step 3: Korrekturwert in corrections.ts fixen**

In `src/constants/corrections.ts`, den Eintrag für Kartoffeln ändern:

```typescript
{
  id: 'cv-vf-kartoffeln-n',
  correction_id: VORFRUCHT_KARTOFFELN,
  nutrient_type_id: NT_N,
  value_kg_ha: 0, // war -10, LfL 9f: Kartoffeln = Gruppe 0 kg
},
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/constants/corrections.test.ts 2>&1 | tail -20`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/constants/corrections.ts src/constants/corrections.test.ts
git commit -m "fix: Kartoffeln Vorfrucht correction 0 kg N/ha (LfL Tab. 9f)

Kartoffeln belongs to the 0 kg group (with Getreide, Mais, etc.),
not the -10 kg group. Was incorrectly set to -10."
```

---

### Task 5: DB-Migration für per_yield_correction_below

**Files:**
- Create: `supabase/migrations/007_asymmetric_yield_correction.sql`

- [ ] **Step 1: Migration erstellen**

```sql
-- Migration: Add per_yield_correction_below for asymmetric N yield corrections
-- LfL Tab. 9a: Zuschlag (above ref) and Abschlag (below ref) differ for N
-- When NULL, per_yield_correction is used symmetrically (P2O5/K2O/MgO/S)

ALTER TABLE crop_nutrient_demands
  ADD COLUMN IF NOT EXISTS per_yield_correction_below numeric DEFAULT NULL;

COMMENT ON COLUMN crop_nutrient_demands.per_yield_correction_below IS
  'Abschlag kg N/dt bei Minderertrag (LfL 9a). NULL = symmetrisch (per_yield_correction).';

-- Update LfL N demands with correct asymmetric values
-- Getreide: Zuschlag 1.0, Abschlag 1.5
UPDATE crop_nutrient_demands
SET per_yield_correction_below = 1.5
WHERE nutrient_type_id = (SELECT id FROM nutrient_types WHERE code = 'N')
  AND source = 'lfl'
  AND crop_id IN (
    SELECT id FROM crops WHERE category = 'Getreide'
  );

-- Winterraps: Zuschlag 2.0, Abschlag 3.0
UPDATE crop_nutrient_demands
SET per_yield_correction = 2.0, per_yield_correction_below = 3.0
WHERE nutrient_type_id = (SELECT id FROM nutrient_types WHERE code = 'N')
  AND source = 'lfl'
  AND crop_id = (SELECT id FROM crops WHERE name_de LIKE 'Winterraps%');

-- Sonnenblumen: Zuschlag 2.0, Abschlag 3.0
UPDATE crop_nutrient_demands
SET per_yield_correction = 2.0, per_yield_correction_below = 3.0
WHERE nutrient_type_id = (SELECT id FROM nutrient_types WHERE code = 'N')
  AND source = 'lfl'
  AND crop_id = (SELECT id FROM crops WHERE name_de LIKE 'Sonnenblumen%');

-- Silomais: Zuschlag 0.2, Abschlag 0.3
UPDATE crop_nutrient_demands
SET per_yield_correction = 0.2, per_yield_correction_below = 0.3
WHERE nutrient_type_id = (SELECT id FROM nutrient_types WHERE code = 'N')
  AND source = 'lfl'
  AND crop_id = (SELECT id FROM crops WHERE name_de LIKE 'Silomais%');

-- Zuckerrüben: Zuschlag 0.1, Abschlag 0.15
UPDATE crop_nutrient_demands
SET per_yield_correction_below = 0.15
WHERE nutrient_type_id = (SELECT id FROM nutrient_types WHERE code = 'N')
  AND source = 'lfl'
  AND crop_id = (SELECT id FROM crops WHERE name_de LIKE 'Zuckerrüben%');

-- Kartoffeln: Zuschlag 0.2, Abschlag 0.2 (symmetric but explicit)
UPDATE crop_nutrient_demands
SET per_yield_correction_below = 0.2
WHERE nutrient_type_id = (SELECT id FROM nutrient_types WHERE code = 'N')
  AND source = 'lfl'
  AND crop_id = (SELECT id FROM crops WHERE name_de LIKE 'Kartoffeln%');

-- Fix Winterroggen ref yield: 60 → 70
UPDATE crops SET ref_yield_dt_ha = 70 WHERE id = 'crop-winterroggen';
UPDATE crop_nutrient_demands SET ref_yield_dt_ha = 70 WHERE crop_id = 'crop-winterroggen';
-- Recalc P/K/Mg/S demands for new ref yield
UPDATE crop_nutrient_demands SET demand_kg_ha = 56 WHERE id = 'cnd-wr-p';
UPDATE crop_nutrient_demands SET demand_kg_ha = 42 WHERE id = 'cnd-wr-k';
UPDATE crop_nutrient_demands SET demand_kg_ha = 9.1 WHERE id = 'cnd-wr-mg';
UPDATE crop_nutrient_demands SET demand_kg_ha = 7.0 WHERE id = 'cnd-wr-s';

-- Fix Sommerbraugerste: N 140→120, ref 55→50
UPDATE crops SET ref_yield_dt_ha = 50 WHERE id = 'crop-sommergerste';
UPDATE crop_nutrient_demands SET demand_kg_ha = 120, ref_yield_dt_ha = 50 WHERE id = 'cnd-sg-n';
UPDATE crop_nutrient_demands SET demand_kg_ha = 40, ref_yield_dt_ha = 50 WHERE id = 'cnd-sg-p';
UPDATE crop_nutrient_demands SET demand_kg_ha = 30, ref_yield_dt_ha = 50 WHERE id = 'cnd-sg-k';
UPDATE crop_nutrient_demands SET demand_kg_ha = 7.0, ref_yield_dt_ha = 50 WHERE id = 'cnd-sg-mg';
UPDATE crop_nutrient_demands SET demand_kg_ha = 5.0, ref_yield_dt_ha = 50 WHERE id = 'cnd-sg-s';

-- Fix Kartoffeln ref yield: 400→450
UPDATE crops SET ref_yield_dt_ha = 450 WHERE id = 'crop-kartoffeln';
UPDATE crop_nutrient_demands SET ref_yield_dt_ha = 450 WHERE id = 'cnd-ka-n';
UPDATE crop_nutrient_demands SET demand_kg_ha = 67.5, ref_yield_dt_ha = 450 WHERE id = 'cnd-ka-p';
UPDATE crop_nutrient_demands SET demand_kg_ha = 225, ref_yield_dt_ha = 450 WHERE id = 'cnd-ka-k';
UPDATE crop_nutrient_demands SET demand_kg_ha = 27, ref_yield_dt_ha = 450 WHERE id = 'cnd-ka-mg';
UPDATE crop_nutrient_demands SET demand_kg_ha = 18, ref_yield_dt_ha = 450 WHERE id = 'cnd-ka-s';

-- Fix nmin_depth_cm
UPDATE crops SET nmin_depth_cm = 90 WHERE id IN ('crop-koernermais', 'crop-silomais');

-- Fix Kartoffeln Vorfrucht correction (LfL 9f: 0 kg, not -10)
UPDATE correction_values SET value_kg_ha = 0 WHERE id = 'cv-vf-kartoffeln-n';

-- Rename Winterweizen labels
UPDATE crops SET name_de = 'Winterweizen (A, B)' WHERE id = 'crop-winterweizen';
UPDATE crops SET name_de = 'Winterweizen (C)' WHERE id = 'crop-winterweizen-bc';

-- Add Winterweizen E
INSERT INTO crops (id, name_de, category, sow_month_from, sow_month_to,
  harvest_month_from, harvest_month_to, ref_yield_dt_ha, nmin_depth_cm)
VALUES ('crop-winterweizen-e', 'Winterweizen (E)', 'Getreide', 9, 11, 7, 8, 80, 90)
ON CONFLICT (id) DO UPDATE SET name_de = EXCLUDED.name_de;

INSERT INTO crop_nutrient_demands (id, crop_id, nutrient_type_id, demand_kg_ha,
  ref_yield_dt_ha, per_yield_correction, per_yield_correction_below, source, valid_from)
VALUES
  ('cnd-wwe-n', 'crop-winterweizen-e', 'nt-n', 260, 80, 1.0, 1.5, 'lfl', '2025-01-01'),
  ('cnd-wwe-p', 'crop-winterweizen-e', 'nt-p2o5', 64, 80, 0.8, NULL, 'lfl', '2025-01-01'),
  ('cnd-wwe-k', 'crop-winterweizen-e', 'nt-k2o', 48, 80, 0.6, NULL, 'lfl', '2025-01-01'),
  ('cnd-wwe-mg', 'crop-winterweizen-e', 'nt-mgo', 12.8, 80, 0.16, NULL, 'lfl', '2025-01-01'),
  ('cnd-wwe-s', 'crop-winterweizen-e', 'nt-s', 9.6, 80, 0.12, NULL, 'lfl', '2025-01-01')
ON CONFLICT (id) DO UPDATE SET
  demand_kg_ha = EXCLUDED.demand_kg_ha,
  per_yield_correction = EXCLUDED.per_yield_correction,
  per_yield_correction_below = EXCLUDED.per_yield_correction_below;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/007_asymmetric_yield_correction.sql
git commit -m "feat: DB migration for LfL data corrections + asymmetric yield correction"
```

---

### Task 6: Service + Admin-UI aktualisieren

**Files:**
- Modify: `src/services/nutrient.service.ts:73-75`
- Modify: `src/components/AdminNutrientForm.vue`

- [ ] **Step 1: Pick-Type in nutrient.service.ts erweitern**

In `src/services/nutrient.service.ts`, Zeile 73-75:

```typescript
export async function upsertUserNutrientDemand(
  demand: Pick<
    CropNutrientDemand,
    'crop_id' | 'nutrient_type_id' | 'demand_kg_ha' | 'ref_yield_dt_ha' | 'per_yield_correction' | 'per_yield_correction_below'
  >,
  userId: string,
): Promise<CropNutrientDemand> {
```

Und in der Insert-/Update-Logik das neue Feld mitgeben:

```typescript
  const row = {
    crop_id: demand.crop_id,
    nutrient_type_id: demand.nutrient_type_id,
    demand_kg_ha: demand.demand_kg_ha,
    ref_yield_dt_ha: demand.ref_yield_dt_ha,
    per_yield_correction: demand.per_yield_correction,
    per_yield_correction_below: demand.per_yield_correction_below ?? null,
    source: 'user' as const,
    user_id: userId,
    valid_from: new Date().toISOString(),
  }
```

- [ ] **Step 2: AdminNutrientForm — optionales Abschlag-Feld**

In `src/components/AdminNutrientForm.vue`, nach dem `correction` ref ein weiteres ref ergänzen:

```typescript
const correctionBelow = ref(props.demand?.per_yield_correction_below ?? null)
```

Im Template nach dem Zuschlag-Feld:

```html
<div>
  <label class="block text-sm font-medium text-gray-700">
    Abschlag je dt (Minderertrag)
  </label>
  <input
    v-model.number="correctionBelow"
    type="number"
    step="0.01"
    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
    data-testid="input-correction-below"
    placeholder="= Zuschlag (symmetrisch)"
  />
  <p class="text-xs text-gray-500 mt-1">Leer = symmetrisch zum Zuschlag</p>
</div>
```

Im `handleSave`, `per_yield_correction_below` mitgeben:

```typescript
per_yield_correction_below: correctionBelow.value || undefined,
```

- [ ] **Step 3: Type-Check + Lint**

Run: `npx vue-tsc --noEmit 2>&1 | head -20`
Expected: Keine Fehler

- [ ] **Step 4: Commit**

```bash
git add src/services/nutrient.service.ts src/components/AdminNutrientForm.vue
git commit -m "feat: support per_yield_correction_below in service + admin form"
```

---

### Task 7: Alle Tests laufen lassen + bestehende Tests anpassen

**Files:**
- Modify: `src/composables/useNutrientCalculation.test.ts` (bestehende Tests anpassen falls nötig)
- Modify: `src/components/AdminNutrientForm.test.ts` (falls betroffen)
- Modify: `src/views/NutrientValuesView.test.ts` (falls betroffen)

- [ ] **Step 1: Alle Unit-Tests laufen lassen**

Run: `npx vitest run 2>&1 | tail -30`

Erwartete Probleme:
- Tests die auf alte Crop-Namen prüfen (z.B. "Winterweizen (E, A)")
- Tests die auf alte Werte prüfen (z.B. Winterroggen ref 60)
- E2E-Tests die Crop-Namen referenzieren

- [ ] **Step 2: Gefundene Fehler fixen**

Alle Tests reparieren, die auf alte Werte referenzieren. Die genauen Dateien hängen vom Test-Output ab.

- [ ] **Step 3: Alle Tests nochmal laufen lassen**

Run: `npx vitest run 2>&1 | tail -10`
Expected: ALL PASS

- [ ] **Step 4: Lint laufen lassen**

Run: `npm run lint 2>&1 | tail -10`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: update all tests for LfL data corrections"
```

---

### Task 8: Seed-Daten aktualisieren

**Files:**
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Seed-Daten prüfen und anpassen**

Die `seed.sql` muss die neuen Crop-Daten, Demands und Correction-Werte widerspiegeln. Alle INSERT-Statements für `crops`, `crop_nutrient_demands` und `correction_values` an die korrigierten Werte anpassen:

- Winterweizen (A, B) statt (E, A)
- Winterweizen (C) statt (B, C)
- Winterweizen (E) neu
- Winterroggen ref 70
- Sommerbraugerste 120 kg N, ref 50
- Kartoffeln ref 450
- per_yield_correction_below Spalte bei N-Demands
- Kartoffeln Vorfrucht 0 statt -10

- [ ] **Step 2: Commit**

```bash
git add supabase/seed.sql
git commit -m "fix: update seed data for LfL corrections"
```
