# Stufe 2: Korrekturfaktoren — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the fertilizer recommendation with correction factors (Vorfrucht, Zwischenfrucht, Humus) per LfL Tab. 9f, with live-update UI on the recommendation page and admin CRUD.

**Architecture:** New normalized `corrections` + `correction_values` tables replace `n_corrections`. The calculation composable gets an optional `activeCorrections` parameter. RecommendationView switches from explicit button to auto-calculation with collapsible correction dropdowns. Admin gets a 4th tab for correction management.

**Tech Stack:** Vue 3, TypeScript, Supabase (PostgreSQL + RLS), Dexie.js v2 schema, Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-03-12-stufe2-korrekturen-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|---|---|
| `supabase/migrations/002_corrections_schema.sql` | DB migration: new tables, data migration, drop n_corrections |
| `src/constants/corrections.ts` | Seed/fallback data: DEFAULT_CORRECTIONS + DEFAULT_CORRECTION_VALUES |
| `src/services/correction.service.ts` | CRUD + 3-tier fallback read for corrections |
| `src/components/CorrectionPanel.vue` | Collapsible dropdown panel for correction selection |
| `src/components/CorrectionPanel.test.ts` | Unit tests for CorrectionPanel |
| `src/components/AdminCorrectionList.vue` | Grouped list of corrections in admin |
| `src/components/AdminCorrectionList.test.ts` | Unit tests for AdminCorrectionList |
| `src/components/AdminCorrectionForm.vue` | Form with dynamic nutrient-value rows |
| `src/components/AdminCorrectionForm.test.ts` | Unit tests for AdminCorrectionForm |
| `tests/e2e/korrekturen.spec.ts` | E2E tests for correction workflow |

### Modified Files
| File | Changes |
|---|---|
| `src/types/index.ts` | Add Correction, CorrectionValue, ActiveCorrection, CorrectionBreakdownItem; extend NutrientResult + FieldCropPlan; remove NCorrection |
| `src/db/dexie.ts` | Add version(2) with corrections/correctionValues stores, remove nCorrections |
| `src/composables/useNutrientCalculation.ts` | Add optional activeCorrections param, breakdown generation |
| `src/composables/useNutrientCalculation.test.ts` | Add 6 new test cases for corrections + breakdown |
| `src/services/sync.service.ts` | Update cacheStammdaten (corrections + correction_values), extend syncAll upsert |
| `src/services/field-crop-plan.service.ts` | Extend updatePlan to accept 3 correction FK fields |
| `src/views/RecommendationView.vue` | Add CorrectionPanel, auto-calculate on load + dropdown change, remove button |
| `src/views/AdminView.vue` | Add 4th tab "Korrekturen" with CRUD |
| `src/components/RecommendationCard.vue` | Add click-to-expand breakdown accordion per nutrient row |
| `src/components/RecommendationCard.test.ts` | Add breakdown display tests |

---

## Chunk 1: Foundation (Types, Constants, Migration, Data Layer)

### Task 1: TypeScript Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add new types and extend existing ones**

Open `src/types/index.ts` and make the following changes:

1. **Replace** the `NCorrection` interface (lines 47-52) with:

```typescript
export interface Correction {
  id: string
  type: 'vorfrucht' | 'zwischenfrucht' | 'humus'
  label_de: string
  sort_order: number
  created_at?: string
}

export interface CorrectionValue {
  id: string
  correction_id: string
  nutrient_type_id: string
  value_kg_ha: number
}

export interface ActiveCorrection {
  correction: Correction
  values: CorrectionValue[]
}
```

2. **Extend** `FieldCropPlan` (line 83-94) — replace the Stufe 2 comment with actual fields:

```typescript
export interface FieldCropPlan {
  id: string
  field_id: string
  crop_id: string
  season_year: number
  expected_yield_dt_ha: number
  vorfrucht_correction_id: string | null
  zwischenfrucht_correction_id: string | null
  humus_correction_id: string | null
  // Stufe 3: nmin_measured
  synced: boolean
  created_at: string
  updated_at: string
}
```

3. **Extend** `NutrientResult` (line 114-120) — add breakdown:

```typescript
export interface NutrientResult {
  nutrient_code: string
  nutrient_label: string
  value_kg_ha: number
  value_kg_total: number
  unit: string
  breakdown?: {
    base_demand_kg_ha: number
    yield_correction_kg_ha: number
    corrections_kg_ha: CorrectionBreakdownItem[]
  }
}

export interface CorrectionBreakdownItem {
  label: string
  value_kg_ha: number
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx vue-tsc --noEmit 2>&1 | head -30`

Expected: Errors related to `NCorrection` references in other files (dexie.ts, sync.service.ts). This is expected — we'll fix those in later tasks. The types themselves should be correct.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add Correction, CorrectionValue, ActiveCorrection types; extend FieldCropPlan and NutrientResult"
```

---

### Task 2: Constants / Seed Data

**Files:**
- Create: `src/constants/corrections.ts`

- [ ] **Step 1: Create corrections constants file**

Create `src/constants/corrections.ts` with the seed data from LfL Tab. 9f. Follow the pattern of `src/constants/nutrients.ts`.

```typescript
import type { Correction, CorrectionValue } from '@/types'

// Stable IDs for seed data (referenced by correction_values and seed.sql)
const VORFRUCHT_WINTERRAPS = 'corr-vf-winterraps'
const VORFRUCHT_KOERNERLEGUMINOSEN = 'corr-vf-koernerleguminosen'
const VORFRUCHT_KARTOFFELN = 'corr-vf-kartoffeln'
const VORFRUCHT_ZUCKERRUEBEN = 'corr-vf-zuckerrueben'
const VORFRUCHT_MAIS = 'corr-vf-mais'
const VORFRUCHT_GETREIDE = 'corr-vf-getreide'

const ZF_LEGUMINOSEN = 'corr-zf-leguminosen'
const ZF_NICHTLEG_OHNE = 'corr-zf-nichtleg-ohne'
const ZF_NICHTLEG_MIT = 'corr-zf-nichtleg-mit'

const HUMUS_UNTER_4 = 'corr-humus-unter4'
const HUMUS_UEBER_4 = 'corr-humus-ueber4'

// N nutrient type ID (from src/constants/nutrients.ts)
const NT_N = 'nt-n'

export const DEFAULT_CORRECTIONS: Correction[] = [
  // Vorfrucht (LfL Tab. 9f)
  { id: VORFRUCHT_WINTERRAPS, type: 'vorfrucht', label_de: 'Winterraps', sort_order: 1 },
  { id: VORFRUCHT_KOERNERLEGUMINOSEN, type: 'vorfrucht', label_de: 'Körnerleguminosen', sort_order: 2 },
  { id: VORFRUCHT_KARTOFFELN, type: 'vorfrucht', label_de: 'Kartoffeln', sort_order: 3 },
  { id: VORFRUCHT_ZUCKERRUEBEN, type: 'vorfrucht', label_de: 'Zuckerrüben', sort_order: 4 },
  { id: VORFRUCHT_MAIS, type: 'vorfrucht', label_de: 'Mais', sort_order: 5 },
  { id: VORFRUCHT_GETREIDE, type: 'vorfrucht', label_de: 'Getreide', sort_order: 6 },

  // Zwischenfrucht (LfL Tab. 9f)
  { id: ZF_LEGUMINOSEN, type: 'zwischenfrucht', label_de: 'Leguminosen', sort_order: 1 },
  { id: ZF_NICHTLEG_OHNE, type: 'zwischenfrucht', label_de: 'Nichtleguminosen ohne Abfuhr (Gründüngung)', sort_order: 2 },
  { id: ZF_NICHTLEG_MIT, type: 'zwischenfrucht', label_de: 'Nichtleguminosen mit Abfuhr', sort_order: 3 },

  // Humus (LfL Tab. 9f)
  { id: HUMUS_UNTER_4, type: 'humus', label_de: '< 4% (kein Abschlag)', sort_order: 1 },
  { id: HUMUS_UEBER_4, type: 'humus', label_de: '> 4%', sort_order: 2 },
]

export const DEFAULT_CORRECTION_VALUES: CorrectionValue[] = [
  // Vorfrucht — N-Abschläge
  { id: 'cv-vf-winterraps-n', correction_id: VORFRUCHT_WINTERRAPS, nutrient_type_id: NT_N, value_kg_ha: -10 },
  { id: 'cv-vf-koernerleg-n', correction_id: VORFRUCHT_KOERNERLEGUMINOSEN, nutrient_type_id: NT_N, value_kg_ha: -10 },
  { id: 'cv-vf-kartoffeln-n', correction_id: VORFRUCHT_KARTOFFELN, nutrient_type_id: NT_N, value_kg_ha: -10 },
  { id: 'cv-vf-zuckerrueben-n', correction_id: VORFRUCHT_ZUCKERRUEBEN, nutrient_type_id: NT_N, value_kg_ha: 0 },
  { id: 'cv-vf-mais-n', correction_id: VORFRUCHT_MAIS, nutrient_type_id: NT_N, value_kg_ha: 0 },
  { id: 'cv-vf-getreide-n', correction_id: VORFRUCHT_GETREIDE, nutrient_type_id: NT_N, value_kg_ha: 0 },

  // Zwischenfrucht — N-Abschläge
  { id: 'cv-zf-leguminosen-n', correction_id: ZF_LEGUMINOSEN, nutrient_type_id: NT_N, value_kg_ha: -10 },
  { id: 'cv-zf-nichtleg-ohne-n', correction_id: ZF_NICHTLEG_OHNE, nutrient_type_id: NT_N, value_kg_ha: -20 },
  { id: 'cv-zf-nichtleg-mit-n', correction_id: ZF_NICHTLEG_MIT, nutrient_type_id: NT_N, value_kg_ha: 0 },

  // Humus — N-Abschläge
  { id: 'cv-humus-unter4-n', correction_id: HUMUS_UNTER_4, nutrient_type_id: NT_N, value_kg_ha: 0 },
  { id: 'cv-humus-ueber4-n', correction_id: HUMUS_UEBER_4, nutrient_type_id: NT_N, value_kg_ha: -20 },
]

export function getCorrectionsByType(type: Correction['type']): Correction[] {
  return DEFAULT_CORRECTIONS.filter(c => c.type === type).sort((a, b) => a.sort_order - b.sort_order)
}

export function getCorrectionValuesForIds(correctionIds: string[]): CorrectionValue[] {
  return DEFAULT_CORRECTION_VALUES.filter(cv => correctionIds.includes(cv.correction_id))
}
```

- [ ] **Step 2: Commit**

```bash
git add src/constants/corrections.ts
git commit -m "feat(constants): add LfL Tab. 9f correction seed data"
```

---

### Task 3: Database Migration

**Files:**
- Create: `supabase/migrations/002_corrections_schema.sql`

- [ ] **Step 1: Write migration SQL**

Create `supabase/migrations/002_corrections_schema.sql`:

```sql
-- ============================================================
-- Stufe 2: Korrekturfaktoren (LfL Tab. 9f)
-- Replaces n_corrections with normalized corrections + correction_values
-- ============================================================

-- 1. corrections table
CREATE TABLE public.corrections (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type text NOT NULL CHECK (type IN ('vorfrucht', 'zwischenfrucht', 'humus')),
  label_de text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "corrections_read" ON public.corrections FOR SELECT USING (true);
CREATE POLICY "corrections_admin" ON public.corrections FOR ALL USING (public.is_admin());

-- 2. correction_values table
CREATE TABLE public.correction_values (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  correction_id text NOT NULL REFERENCES public.corrections(id) ON DELETE CASCADE,
  nutrient_type_id text NOT NULL REFERENCES public.nutrient_types(id) ON DELETE CASCADE,
  value_kg_ha numeric NOT NULL,
  UNIQUE (correction_id, nutrient_type_id)
);

ALTER TABLE public.correction_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "correction_values_read" ON public.correction_values FOR SELECT USING (true);
CREATE POLICY "correction_values_admin" ON public.correction_values FOR ALL USING (public.is_admin());

CREATE INDEX idx_correction_values_correction_id ON public.correction_values(correction_id);

-- 3. Migrate data from n_corrections → corrections (sort_order=0 as placeholder)
INSERT INTO public.corrections (id, type, label_de, sort_order)
SELECT id, type, label_de, 0
FROM public.n_corrections;

-- 3b. Set proper sort_order values for known seed data
-- (If custom corrections were added by admin, they keep sort_order=0 which is fine)
UPDATE public.corrections SET sort_order = row_number FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY type ORDER BY label_de) AS row_number
  FROM public.corrections
) sub WHERE corrections.id = sub.id;

-- 4. Migrate correction values (correction_kg_n → correction_values with N nutrient)
INSERT INTO public.correction_values (correction_id, nutrient_type_id, value_kg_ha)
SELECT nc.id, nt.id, nc.correction_kg_n
FROM public.n_corrections nc
CROSS JOIN public.nutrient_types nt
WHERE nt.code = 'N';

-- 5. Add 3 FK columns to field_crop_plans
ALTER TABLE public.field_crop_plans
  ADD COLUMN vorfrucht_correction_id text REFERENCES public.corrections(id),
  ADD COLUMN zwischenfrucht_correction_id text REFERENCES public.corrections(id),
  ADD COLUMN humus_correction_id text REFERENCES public.corrections(id);

-- 6. Drop old table
DROP TABLE public.n_corrections;
```

- [ ] **Step 2: Test migration locally**

Run: `cd /home/manuel/claude/duenger && npx supabase db reset`

Expected: Migration applies successfully, no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_corrections_schema.sql
git commit -m "feat(db): add corrections schema migration (002)"
```

---

### Task 4: Dexie Schema v2

**Files:**
- Modify: `src/db/dexie.ts`

- [ ] **Step 1: Update Dexie schema to version 2**

Replace the entire content of `src/db/dexie.ts`:

```typescript
import Dexie, { type Table } from 'dexie'
import type {
  NutrientType,
  Crop,
  CropNutrientDemand,
  Correction,
  CorrectionValue,
  FertilizerProduct,
  Field,
  FieldCropPlan,
  Recommendation,
  RecommendationValue,
} from '@/types'

export class DuengerDB extends Dexie {
  // Stammdaten (gecacht von Supabase)
  nutrientTypes!: Table<NutrientType, string>
  crops!: Table<Crop, string>
  cropNutrientDemands!: Table<CropNutrientDemand, string>
  corrections!: Table<Correction, string>
  correctionValues!: Table<CorrectionValue, string>
  fertilizerProducts!: Table<FertilizerProduct, string>

  // Landwirt-Daten (offline-fähig)
  fields!: Table<Field, string>
  fieldCropPlans!: Table<FieldCropPlan, string>
  recommendations!: Table<Recommendation, string>
  recommendationValues!: Table<RecommendationValue, string>

  constructor() {
    super('duengungsberater')

    this.version(1).stores({
      nutrientTypes: 'id, code',
      crops: 'id, category',
      cropNutrientDemands: 'id, crop_id, nutrient_type_id, [crop_id+nutrient_type_id]',
      nCorrections: 'id, type',
      fertilizerProducts: 'id, active',
      fields: 'id, user_id, synced',
      fieldCropPlans: 'id, field_id, synced',
      recommendations: 'id, field_crop_plan_id',
      recommendationValues: 'id, recommendation_id',
    })

    this.version(2).stores({
      nCorrections: null,
      corrections: 'id, type',
      correctionValues: 'id, correction_id',
    })
  }
}

export const db = new DuengerDB()
```

- [ ] **Step 2: Verify no TypeScript errors in dexie.ts**

Run: `npx vue-tsc --noEmit 2>&1 | grep dexie`

Expected: No errors in dexie.ts.

- [ ] **Step 3: Commit**

```bash
git add src/db/dexie.ts
git commit -m "feat(db): upgrade Dexie to v2 schema with corrections/correctionValues"
```

---

### Task 5: Sync Service Updates

**Files:**
- Modify: `src/services/sync.service.ts`

- [ ] **Step 1: Update cacheStammdaten and syncAll**

Replace the entire content of `src/services/sync.service.ts`:

```typescript
import { supabase } from './supabase'
import { db } from '@/db/dexie'

export async function syncAll(): Promise<{ synced: number; errors: number }> {
  if (!navigator.onLine) return { synced: 0, errors: 0 }

  let synced = 0
  let errors = 0

  // 1. Felder synchronisieren
  const unsyncedFields = await db.fields.filter((f) => !f.synced).toArray()
  for (const field of unsyncedFields) {
    try {
      const { data, error } = await supabase
        .from('fields')
        .upsert({
          id: field.id,
          name: field.name,
          size_ha: field.size_ha,
        })
        .select()
        .single()

      if (error) throw error
      await db.fields.update(field.id, { synced: true, ...data })
      synced++
    } catch {
      errors++
    }
  }

  // 2. Anbauplanungen synchronisieren (inkl. Korrektur-FKs)
  const unsyncedPlans = await db.fieldCropPlans.filter((p) => !p.synced).toArray()
  for (const plan of unsyncedPlans) {
    try {
      const { data, error } = await supabase
        .from('field_crop_plans')
        .upsert({
          id: plan.id,
          field_id: plan.field_id,
          crop_id: plan.crop_id,
          season_year: plan.season_year,
          expected_yield_dt_ha: plan.expected_yield_dt_ha,
          vorfrucht_correction_id: plan.vorfrucht_correction_id,
          zwischenfrucht_correction_id: plan.zwischenfrucht_correction_id,
          humus_correction_id: plan.humus_correction_id,
        })
        .select()
        .single()

      if (error) throw error
      await db.fieldCropPlans.update(plan.id, { synced: true, ...data })
      synced++
    } catch {
      errors++
    }
  }

  return { synced, errors }
}

export async function cacheStammdaten(): Promise<void> {
  if (!navigator.onLine) return

  const [
    { data: nutrients },
    { data: crops },
    { data: demands },
    { data: corrections },
    { data: correctionValues },
    { data: products },
  ] = await Promise.all([
    supabase.from('nutrient_types').select('*'),
    supabase.from('crops').select('*'),
    supabase.from('crop_nutrient_demands').select('*'),
    supabase.from('corrections').select('*'),
    supabase.from('correction_values').select('*'),
    supabase.from('fertilizer_products').select('*').eq('active', true),
  ])

  if (nutrients) await db.nutrientTypes.bulkPut(nutrients)
  if (crops) await db.crops.bulkPut(crops)
  if (demands) await db.cropNutrientDemands.bulkPut(demands)
  if (corrections) await db.corrections.bulkPut(corrections)
  if (correctionValues) await db.correctionValues.bulkPut(correctionValues)
  if (products) await db.fertilizerProducts.bulkPut(products)
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx vue-tsc --noEmit 2>&1 | grep sync`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/sync.service.ts
git commit -m "feat(sync): update cacheStammdaten and syncAll for corrections"
```

---

### Task 6: Field-Crop-Plan Service Extension

**Files:**
- Modify: `src/services/field-crop-plan.service.ts`

- [ ] **Step 1: Extend updatePlan to accept correction FK fields**

In `src/services/field-crop-plan.service.ts`, modify the `updatePlan` function signature (line 68-70):

Change:
```typescript
export async function updatePlan(
  id: string,
  updates: Partial<Pick<FieldCropPlan, 'crop_id' | 'season_year' | 'expected_yield_dt_ha'>>,
): Promise<FieldCropPlan> {
```

To:
```typescript
export async function updatePlan(
  id: string,
  updates: Partial<Pick<FieldCropPlan, 'crop_id' | 'season_year' | 'expected_yield_dt_ha' | 'vorfrucht_correction_id' | 'zwischenfrucht_correction_id' | 'humus_correction_id'>>,
): Promise<FieldCropPlan> {
```

Also update `createPlan` (line 28-29) to include default null values for new FK fields:

Change the `offlinePlan` object (line 31-37) to include:
```typescript
  const offlinePlan: FieldCropPlan = {
    ...plan,
    id: crypto.randomUUID(),
    vorfrucht_correction_id: null,
    zwischenfrucht_correction_id: null,
    humus_correction_id: null,
    synced: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx vue-tsc --noEmit 2>&1 | grep field-crop-plan`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/field-crop-plan.service.ts
git commit -m "feat(service): extend updatePlan with correction FK fields"
```

---

### Task 7: Correction Service

**Files:**
- Create: `src/services/correction.service.ts`

- [ ] **Step 1: Create correction service with 3-tier fallback + admin CRUD**

Create `src/services/correction.service.ts`:

```typescript
import { supabase } from './supabase'
import { db } from '@/db/dexie'
import { DEFAULT_CORRECTIONS, DEFAULT_CORRECTION_VALUES } from '@/constants/corrections'
import type { Correction, CorrectionValue } from '@/types'

// --- Read (3-Tier-Fallback: Supabase → Dexie → Constants) ---

export async function getCorrections(): Promise<Correction[]> {
  if (navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from('corrections')
        .select('*')
        .order('type')
        .order('sort_order')

      if (error) throw error
      await db.corrections.bulkPut(data)
      return data as Correction[]
    } catch {
      // fall through to Dexie
    }
  }

  const cached = await db.corrections.toArray()
  if (cached.length > 0) return cached

  return DEFAULT_CORRECTIONS
}

export async function getCorrectionValues(correctionIds: string[]): Promise<CorrectionValue[]> {
  if (correctionIds.length === 0) return []

  if (navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from('correction_values')
        .select('*')
        .in('correction_id', correctionIds)

      if (error) throw error
      return data as CorrectionValue[]
    } catch {
      // fall through to Dexie
    }
  }

  const cached = await db.correctionValues
    .where('correction_id')
    .anyOf(correctionIds)
    .toArray()
  if (cached.length > 0) return cached

  return DEFAULT_CORRECTION_VALUES.filter(cv => correctionIds.includes(cv.correction_id))
}

// --- Admin CRUD (nur Supabase, kein Offline-Support) ---

export async function createCorrection(
  correction: Omit<Correction, 'id'>,
  values: Omit<CorrectionValue, 'id' | 'correction_id'>[],
): Promise<Correction> {
  const { data, error } = await supabase
    .from('corrections')
    .insert({
      type: correction.type,
      label_de: correction.label_de,
      sort_order: correction.sort_order,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  const newCorrection = data as Correction

  if (values.length > 0) {
    const { error: valError } = await supabase
      .from('correction_values')
      .insert(
        values.map(v => ({
          correction_id: newCorrection.id,
          nutrient_type_id: v.nutrient_type_id,
          value_kg_ha: v.value_kg_ha,
        })),
      )
    if (valError) throw new Error(valError.message)
  }

  return newCorrection
}

export async function updateCorrection(
  id: string,
  correction: Partial<Pick<Correction, 'label_de' | 'type' | 'sort_order'>>,
  values: Omit<CorrectionValue, 'id' | 'correction_id'>[],
): Promise<void> {
  const { error } = await supabase
    .from('corrections')
    .update(correction)
    .eq('id', id)

  if (error) throw new Error(error.message)

  // Replace values: delete all, re-insert
  const { error: delError } = await supabase
    .from('correction_values')
    .delete()
    .eq('correction_id', id)

  if (delError) throw new Error(delError.message)

  if (values.length > 0) {
    const { error: insError } = await supabase
      .from('correction_values')
      .insert(
        values.map(v => ({
          correction_id: id,
          nutrient_type_id: v.nutrient_type_id,
          value_kg_ha: v.value_kg_ha,
        })),
      )
    if (insError) throw new Error(insError.message)
  }
}

export async function deleteCorrection(id: string): Promise<void> {
  const { error } = await supabase
    .from('corrections')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/correction.service.ts
git commit -m "feat(service): add correction.service.ts with 3-tier fallback + admin CRUD"
```

---

## Chunk 2: Calculation Logic + UI

### Task 8: Calculation Logic (TDD)

**Files:**
- Modify: `src/composables/useNutrientCalculation.test.ts`
- Modify: `src/composables/useNutrientCalculation.ts`

**Reference:** Spec section "Berechnungslogik" — `Math.max(0, demand + yieldCorrection + sumCorrections)`

- [ ] **Step 1: Write failing tests for corrections**

Add the following tests to `src/composables/useNutrientCalculation.test.ts`, inside the existing `describe('calculateNutrientDemand')` block, after the last existing test:

```typescript
    // --- Stufe 2: Korrekturfaktoren ---

    it('returns identical results without activeCorrections parameter (backward compat)', () => {
      const withoutParam = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 10)
      const withEmptyParam = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 10, [])
      expect(withoutParam).toEqual(withEmptyParam)
    })

    it('applies single N correction (Vorfrucht Winterraps: -10 kg N/ha)', () => {
      const corrections: ActiveCorrection[] = [{
        correction: { id: 'c1', type: 'vorfrucht', label_de: 'Winterraps', sort_order: 1 },
        values: [{ id: 'cv1', correction_id: 'c1', nutrient_type_id: 'nt-n', value_kg_ha: -10 }],
      }]
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 10, corrections)
      const n = results.find(r => r.nutrient_code === 'N')!
      expect(n.value_kg_ha).toBe(220) // 230 - 10
      expect(n.value_kg_total).toBe(2200)
    })

    it('applies cumulative corrections (-10 -20 -20 = -50 kg N/ha)', () => {
      const corrections: ActiveCorrection[] = [
        {
          correction: { id: 'c1', type: 'vorfrucht', label_de: 'Winterraps', sort_order: 1 },
          values: [{ id: 'cv1', correction_id: 'c1', nutrient_type_id: 'nt-n', value_kg_ha: -10 }],
        },
        {
          correction: { id: 'c2', type: 'zwischenfrucht', label_de: 'Nichtleg. ohne Abfuhr', sort_order: 1 },
          values: [{ id: 'cv2', correction_id: 'c2', nutrient_type_id: 'nt-n', value_kg_ha: -20 }],
        },
        {
          correction: { id: 'c3', type: 'humus', label_de: '> 4%', sort_order: 1 },
          values: [{ id: 'cv3', correction_id: 'c3', nutrient_type_id: 'nt-n', value_kg_ha: -20 }],
        },
      ]
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 10, corrections)
      const n = results.find(r => r.nutrient_code === 'N')!
      expect(n.value_kg_ha).toBe(180) // 230 - 50
    })

    it('clamps to zero when corrections make result negative', () => {
      const corrections: ActiveCorrection[] = [{
        correction: { id: 'c1', type: 'vorfrucht', label_de: 'Test', sort_order: 1 },
        values: [{ id: 'cv1', correction_id: 'c1', nutrient_type_id: 'nt-s', value_kg_ha: -100 }],
      }]
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 1, corrections)
      const s = results.find(r => r.nutrient_code === 'S')!
      // S raw = 9.6 - 100 = -90.4 → clamped to 0
      expect(s.value_kg_ha).toBe(0)
    })

    it('does not affect nutrients without correction values', () => {
      const corrections: ActiveCorrection[] = [{
        correction: { id: 'c1', type: 'vorfrucht', label_de: 'Winterraps', sort_order: 1 },
        values: [{ id: 'cv1', correction_id: 'c1', nutrient_type_id: 'nt-n', value_kg_ha: -10 }],
      }]
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 10, corrections)
      const p = results.find(r => r.nutrient_code === 'P2O5')!
      expect(p.value_kg_ha).toBe(64) // unchanged
    })

    it('includes breakdown when corrections are provided', () => {
      const corrections: ActiveCorrection[] = [{
        correction: { id: 'c1', type: 'vorfrucht', label_de: 'Winterraps', sort_order: 1 },
        values: [{ id: 'cv1', correction_id: 'c1', nutrient_type_id: 'nt-n', value_kg_ha: -10 }],
      }]
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 90, 10, corrections)
      const n = results.find(r => r.nutrient_code === 'N')!
      expect(n.breakdown).toBeDefined()
      expect(n.breakdown!.base_demand_kg_ha).toBe(230)
      expect(n.breakdown!.yield_correction_kg_ha).toBe(10) // (90-80)*1.0
      expect(n.breakdown!.corrections_kg_ha).toEqual([
        { label: 'Vorfrucht (Winterraps)', value_kg_ha: -10 },
      ])
      expect(n.value_kg_ha).toBe(230) // 230 + 10 - 10 = 230
    })
```

Also add the import at the top of the file (after the existing imports):
```typescript
import type { ActiveCorrection } from '@/types'
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/composables/useNutrientCalculation.test.ts`

Expected: 6 new tests FAIL (activeCorrections parameter not accepted yet).

- [ ] **Step 3: Implement calculation with corrections**

Replace the entire content of `src/composables/useNutrientCalculation.ts`:

```typescript
import type { CropNutrientDemand, NutrientType, NutrientResult, ActiveCorrection, CorrectionBreakdownItem } from '@/types'

export function useNutrientCalculation() {
  function calculateNutrientDemand(
    demands: CropNutrientDemand[],
    nutrientTypes: NutrientType[],
    expectedYieldDtHa: number,
    fieldSizeHa: number,
    activeCorrections?: ActiveCorrection[],
  ): NutrientResult[] {
    return demands
      .map((demand) => {
        const nutrient = nutrientTypes.find((nt) => nt.id === demand.nutrient_type_id)
        if (!nutrient) return null

        const yieldDiff = expectedYieldDtHa - demand.ref_yield_dt_ha
        const baseDemand = demand.demand_kg_ha
        const yieldCorrection = yieldDiff * demand.per_yield_correction

        // Sum correction values for this nutrient
        const correctionItems: CorrectionBreakdownItem[] = []
        let sumCorrections = 0

        if (activeCorrections && activeCorrections.length > 0) {
          for (const ac of activeCorrections) {
            const cv = ac.values.find(v => v.nutrient_type_id === demand.nutrient_type_id)
            if (cv) {
              const typeLabel = ac.correction.type === 'vorfrucht' ? 'Vorfrucht'
                : ac.correction.type === 'zwischenfrucht' ? 'Zwischenfrucht'
                : 'Humus'
              correctionItems.push({
                label: `${typeLabel} (${ac.correction.label_de})`,
                value_kg_ha: cv.value_kg_ha,
              })
              sumCorrections += cv.value_kg_ha
            }
          }
        }

        const valueKgHa = Math.max(0, baseDemand + yieldCorrection + sumCorrections)

        const result: NutrientResult = {
          nutrient_code: nutrient.code,
          nutrient_label: nutrient.label_de,
          value_kg_ha: Math.round(valueKgHa * 100) / 100,
          value_kg_total: Math.round(valueKgHa * fieldSizeHa * 100) / 100,
          unit: nutrient.unit,
        }

        if (activeCorrections && activeCorrections.length > 0) {
          result.breakdown = {
            base_demand_kg_ha: baseDemand,
            yield_correction_kg_ha: Math.round(yieldCorrection * 100) / 100,
            corrections_kg_ha: correctionItems,
          }
        }

        return result
      })
      .filter((r): r is NutrientResult => r !== null)
      .sort((a, b) => {
        const orderA = nutrientTypes.find((nt) => nt.code === a.nutrient_code)?.sort_order ?? 99
        const orderB = nutrientTypes.find((nt) => nt.code === b.nutrient_code)?.sort_order ?? 99
        return orderA - orderB
      })
  }

  return { calculateNutrientDemand }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/composables/useNutrientCalculation.test.ts`

Expected: All 15 tests PASS (9 existing + 6 new).

- [ ] **Step 5: Run full test suite to verify no regressions**

Run: `npm run test:run`

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/composables/useNutrientCalculation.ts src/composables/useNutrientCalculation.test.ts
git commit -m "feat(calc): add correction factors to nutrient calculation with breakdown"
```

---

### Task 9: RecommendationCard Breakdown

**Files:**
- Modify: `src/components/RecommendationCard.test.ts`
- Modify: `src/components/RecommendationCard.vue`

- [ ] **Step 1: Write failing tests for breakdown accordion**

Add the following tests to `src/components/RecommendationCard.test.ts`, inside the existing `describe('RecommendationCard')` block:

```typescript
  // --- Stufe 2: Breakdown Accordion ---

  const mockResultsWithBreakdown: NutrientResult[] = [
    {
      nutrient_code: 'N', nutrient_label: 'Stickstoff', value_kg_ha: 220, value_kg_total: 2200, unit: 'kg/ha',
      breakdown: {
        base_demand_kg_ha: 230,
        yield_correction_kg_ha: 0,
        corrections_kg_ha: [{ label: 'Vorfrucht (Winterraps)', value_kg_ha: -10 }],
      },
    },
    { nutrient_code: 'P2O5', nutrient_label: 'Phosphat', value_kg_ha: 64, value_kg_total: 640, unit: 'kg/ha' },
  ]

  it('does not show breakdown by default', () => {
    const wrapper = mount(RecommendationCard, { props: { results: mockResultsWithBreakdown } })
    expect(wrapper.find('[data-testid="nutrient-breakdown-N"]').exists()).toBe(false)
  })

  it('shows breakdown after clicking nutrient row', async () => {
    const wrapper = mount(RecommendationCard, { props: { results: mockResultsWithBreakdown } })
    await wrapper.find('[data-testid="nutrient-row-N"]').trigger('click')
    const breakdown = wrapper.find('[data-testid="nutrient-breakdown-N"]')
    expect(breakdown.exists()).toBe(true)
    expect(breakdown.text()).toContain('230')
    expect(breakdown.text()).toContain('Vorfrucht (Winterraps)')
    expect(breakdown.text()).toContain('-10')
  })

  it('closes breakdown when clicking same row again', async () => {
    const wrapper = mount(RecommendationCard, { props: { results: mockResultsWithBreakdown } })
    await wrapper.find('[data-testid="nutrient-row-N"]').trigger('click')
    expect(wrapper.find('[data-testid="nutrient-breakdown-N"]').exists()).toBe(true)
    await wrapper.find('[data-testid="nutrient-row-N"]').trigger('click')
    expect(wrapper.find('[data-testid="nutrient-breakdown-N"]').exists()).toBe(false)
  })

  it('closes other breakdown when opening a new one (accordion)', async () => {
    const wrapper = mount(RecommendationCard, { props: { results: mockResultsWithBreakdown } })
    await wrapper.find('[data-testid="nutrient-row-N"]').trigger('click')
    expect(wrapper.find('[data-testid="nutrient-breakdown-N"]').exists()).toBe(true)
    await wrapper.find('[data-testid="nutrient-row-P2O5"]').trigger('click')
    expect(wrapper.find('[data-testid="nutrient-breakdown-N"]').exists()).toBe(false)
  })

  it('does not show breakdown for nutrient without breakdown data', async () => {
    const wrapper = mount(RecommendationCard, { props: { results: mockResultsWithBreakdown } })
    await wrapper.find('[data-testid="nutrient-row-P2O5"]').trigger('click')
    // P2O5 has no breakdown, so clicking should not open anything
    expect(wrapper.find('[data-testid="nutrient-breakdown-P2O5"]').exists()).toBe(false)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/RecommendationCard.test.ts`

Expected: 5 new tests FAIL.

- [ ] **Step 3: Implement breakdown accordion in RecommendationCard**

Replace the entire content of `src/components/RecommendationCard.vue`:

```vue
<template>
  <div v-if="results.length > 0" data-testid="recommendation-card" class="rounded-xl border border-gray-200 bg-white p-4">
    <h3 class="mb-3 text-sm font-semibold text-gray-700">Nährstoffbedarf</h3>
    <div class="space-y-2">
      <div v-for="result in results" :key="result.nutrient_code">
        <div
          :data-testid="`nutrient-row-${result.nutrient_code}`"
          class="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
          :class="{ 'cursor-pointer hover:bg-gray-100': result.breakdown }"
          @click="toggleBreakdown(result)"
        >
          <div>
            <span class="font-medium">{{ result.nutrient_code }}</span>
            <span class="ml-1 text-xs text-gray-500">({{ result.nutrient_label }})</span>
          </div>
          <div class="text-right">
            <NumberDisplay :value="result.value_kg_ha" format="nutrient-per-ha" :code="result.nutrient_code" />
            <p class="text-xs text-gray-400">
              gesamt: <NumberDisplay :value="result.value_kg_total" format="nutrient-total" :code="result.nutrient_code" />
            </p>
          </div>
        </div>

        <!-- Breakdown accordion -->
        <div
          v-if="expandedCode === result.nutrient_code && result.breakdown"
          :data-testid="`nutrient-breakdown-${result.nutrient_code}`"
          class="ml-4 mt-1 rounded-lg bg-gray-100 px-3 py-2 text-sm"
        >
          <div class="flex justify-between py-0.5">
            <span class="text-gray-600">Grundbedarf</span>
            <span>{{ formatValue(result.breakdown.base_demand_kg_ha) }} {{ result.unit }}</span>
          </div>
          <div v-if="result.breakdown.yield_correction_kg_ha !== 0" class="flex justify-between py-0.5">
            <span class="text-gray-600">Ertragskorrektur</span>
            <span>{{ formatSigned(result.breakdown.yield_correction_kg_ha) }} {{ result.unit }}</span>
          </div>
          <div
            v-for="corr in result.breakdown.corrections_kg_ha"
            :key="corr.label"
            class="flex justify-between py-0.5"
          >
            <span class="text-gray-600">{{ corr.label }}</span>
            <span>{{ formatSigned(corr.value_kg_ha) }} {{ result.unit }}</span>
          </div>
          <div class="mt-1 flex justify-between border-t border-gray-300 pt-1 font-semibold">
            <span>Empfehlung</span>
            <span>{{ formatValue(result.value_kg_ha) }} {{ result.unit }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { NutrientResult } from '@/types'
import NumberDisplay from './NumberDisplay.vue'

defineProps<{
  results: NutrientResult[]
}>()

const expandedCode = ref<string | null>(null)

function toggleBreakdown(result: NutrientResult) {
  if (!result.breakdown) return
  expandedCode.value = expandedCode.value === result.nutrient_code ? null : result.nutrient_code
}

function formatValue(value: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(value)
}

function formatSigned(value: number): string {
  const prefix = value > 0 ? '+' : ''
  return prefix + new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(value)
}
</script>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/RecommendationCard.test.ts`

Expected: All 9 tests PASS (4 existing + 5 new).

- [ ] **Step 5: Commit**

```bash
git add src/components/RecommendationCard.vue src/components/RecommendationCard.test.ts
git commit -m "feat(ui): add breakdown accordion to RecommendationCard"
```

---

### Task 10: CorrectionPanel Component

**Files:**
- Create: `src/components/CorrectionPanel.test.ts`
- Create: `src/components/CorrectionPanel.vue`

- [ ] **Step 1: Write failing tests for CorrectionPanel**

Create `src/components/CorrectionPanel.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CorrectionPanel from './CorrectionPanel.vue'
import type { Correction } from '@/types'

const mockCorrections: Correction[] = [
  { id: 'c1', type: 'vorfrucht', label_de: 'Winterraps', sort_order: 1 },
  { id: 'c2', type: 'vorfrucht', label_de: 'Getreide', sort_order: 6 },
  { id: 'c3', type: 'zwischenfrucht', label_de: 'Leguminosen', sort_order: 1 },
  { id: 'c4', type: 'humus', label_de: '< 4% (kein Abschlag)', sort_order: 1 },
  { id: 'c5', type: 'humus', label_de: '> 4%', sort_order: 2 },
]

describe('CorrectionPanel', () => {
  it('renders collapsed by default', () => {
    const wrapper = mount(CorrectionPanel, {
      props: { corrections: mockCorrections, vorfruchtId: null, zwischenfruchtId: null, humusId: null },
    })
    expect(wrapper.find('[data-testid="correction-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="correction-vorfrucht-select"]').exists()).toBe(false)
  })

  it('expands when toggle button is clicked', async () => {
    const wrapper = mount(CorrectionPanel, {
      props: { corrections: mockCorrections, vorfruchtId: null, zwischenfruchtId: null, humusId: null },
    })
    await wrapper.find('[data-testid="correction-panel-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="correction-vorfrucht-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="correction-zwischenfrucht-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="correction-humus-select"]').exists()).toBe(true)
  })

  it('shows only vorfrucht options in vorfrucht dropdown', async () => {
    const wrapper = mount(CorrectionPanel, {
      props: { corrections: mockCorrections, vorfruchtId: null, zwischenfruchtId: null, humusId: null },
    })
    await wrapper.find('[data-testid="correction-panel-toggle"]').trigger('click')
    const select = wrapper.find('[data-testid="correction-vorfrucht-select"]')
    const options = select.findAll('option')
    // "— keine —" + Winterraps + Getreide = 3
    expect(options).toHaveLength(3)
    expect(options[0].text()).toBe('— keine —')
    expect(options[1].text()).toBe('Winterraps')
  })

  it('emits update:vorfruchtId when vorfrucht changes', async () => {
    const wrapper = mount(CorrectionPanel, {
      props: { corrections: mockCorrections, vorfruchtId: null, zwischenfruchtId: null, humusId: null },
    })
    await wrapper.find('[data-testid="correction-panel-toggle"]').trigger('click')
    await wrapper.find('[data-testid="correction-vorfrucht-select"]').setValue('c1')
    expect(wrapper.emitted('update:vorfruchtId')).toBeTruthy()
    expect(wrapper.emitted('update:vorfruchtId')![0]).toEqual(['c1'])
  })

  it('emits null when "keine" is selected', async () => {
    const wrapper = mount(CorrectionPanel, {
      props: { corrections: mockCorrections, vorfruchtId: 'c1', zwischenfruchtId: null, humusId: null },
    })
    await wrapper.find('[data-testid="correction-panel-toggle"]').trigger('click')
    await wrapper.find('[data-testid="correction-vorfrucht-select"]').setValue('')
    expect(wrapper.emitted('update:vorfruchtId')![0]).toEqual([null])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/CorrectionPanel.test.ts`

Expected: All 5 tests FAIL (component doesn't exist).

- [ ] **Step 3: Implement CorrectionPanel component**

Create `src/components/CorrectionPanel.vue`:

```vue
<template>
  <div data-testid="correction-panel" class="rounded-lg border border-gray-200 bg-white">
    <button
      data-testid="correction-panel-toggle"
      class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700"
      @click="expanded = !expanded"
    >
      <span>Korrekturfaktoren (optional)</span>
      <span class="text-gray-400">{{ expanded ? '▲' : '▼' }}</span>
    </button>

    <div v-if="expanded" class="space-y-3 px-4 pb-4">
      <!-- Vorfrucht -->
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-500">Vorfrucht</label>
        <select
          data-testid="correction-vorfrucht-select"
          :value="vorfruchtId ?? ''"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          @change="$emit('update:vorfruchtId', ($event.target as HTMLSelectElement).value || null)"
        >
          <option value="">— keine —</option>
          <option v-for="c in vorfruchtOptions" :key="c.id" :value="c.id">{{ c.label_de }}</option>
        </select>
      </div>

      <!-- Zwischenfrucht -->
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-500">Zwischenfrucht</label>
        <select
          data-testid="correction-zwischenfrucht-select"
          :value="zwischenfruchtId ?? ''"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          @change="$emit('update:zwischenfruchtId', ($event.target as HTMLSelectElement).value || null)"
        >
          <option value="">— keine —</option>
          <option v-for="c in zwischenfruchtOptions" :key="c.id" :value="c.id">{{ c.label_de }}</option>
        </select>
      </div>

      <!-- Humus -->
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-500">Humus</label>
        <select
          data-testid="correction-humus-select"
          :value="humusId ?? ''"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          @change="$emit('update:humusId', ($event.target as HTMLSelectElement).value || null)"
        >
          <option value="">— keine —</option>
          <option v-for="c in humusOptions" :key="c.id" :value="c.id">{{ c.label_de }}</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Correction } from '@/types'

const props = defineProps<{
  corrections: Correction[]
  vorfruchtId: string | null
  zwischenfruchtId: string | null
  humusId: string | null
}>()

defineEmits<{
  'update:vorfruchtId': [id: string | null]
  'update:zwischenfruchtId': [id: string | null]
  'update:humusId': [id: string | null]
}>()

const expanded = ref(false)

const vorfruchtOptions = computed(() =>
  props.corrections.filter(c => c.type === 'vorfrucht').sort((a, b) => a.sort_order - b.sort_order)
)
const zwischenfruchtOptions = computed(() =>
  props.corrections.filter(c => c.type === 'zwischenfrucht').sort((a, b) => a.sort_order - b.sort_order)
)
const humusOptions = computed(() =>
  props.corrections.filter(c => c.type === 'humus').sort((a, b) => a.sort_order - b.sort_order)
)
</script>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/CorrectionPanel.test.ts`

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/CorrectionPanel.vue src/components/CorrectionPanel.test.ts
git commit -m "feat(ui): add CorrectionPanel component with dropdown selection"
```

---

### Task 11: RecommendationView Refactor (Auto-Calc + Corrections)

**Files:**
- Modify: `src/views/RecommendationView.vue`

- [ ] **Step 1: Rewrite RecommendationView with auto-calculation and correction panel**

Replace the entire content of `src/views/RecommendationView.vue`:

```vue
<template>
  <AppLayout title="Düngeempfehlung" :show-back="true">
    <div class="space-y-4">
      <div v-if="plan && crop" data-testid="empfehlung-context" class="rounded-lg bg-green-50 px-4 py-3">
        <p class="font-medium">{{ crop.name_de }}</p>
        <p class="text-sm text-gray-600">
          Saison {{ plan.season_year }} · <NumberDisplay :value="plan.expected_yield_dt_ha" format="yield" />
          · Feld: {{ fieldName }} (<NumberDisplay :value="fieldSizeHa" format="area" />)
        </p>
      </div>

      <p
        v-if="errorMessage"
        data-testid="empfehlung-error"
        class="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600"
      >
        {{ errorMessage }}
      </p>

      <CorrectionPanel
        v-if="corrections.length > 0"
        :corrections="corrections"
        :vorfrucht-id="vorfruchtId"
        :zwischenfrucht-id="zwischenfruchtId"
        :humus-id="humusId"
        @update:vorfrucht-id="onCorrectionChange('vorfrucht_correction_id', $event)"
        @update:zwischenfrucht-id="onCorrectionChange('zwischenfrucht_correction_id', $event)"
        @update:humus-id="onCorrectionChange('humus_correction_id', $event)"
      />

      <RecommendationCard :results="nutrientResults" />
      <ProductList :matches="productMatches" />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { getPlansForField } from '@/services/field-crop-plan.service'
import { updatePlan } from '@/services/field-crop-plan.service'
import { getCrops, getNutrientDemands } from '@/services/crop.service'
import { getNutrientTypes } from '@/services/nutrient.service'
import { getProducts } from '@/services/product.service'
import { getFields } from '@/services/field.service'
import { getCorrections, getCorrectionValues } from '@/services/correction.service'
import { saveRecommendation } from '@/services/recommendation.service'
import { useNutrientCalculation } from '@/composables/useNutrientCalculation'
import { useRecommendation } from '@/composables/useRecommendation'
import type { FieldCropPlan, Crop, Correction, NutrientResult, ProductMatch, ActiveCorrection } from '@/types'
import AppLayout from '@/components/AppLayout.vue'
import NumberDisplay from '@/components/NumberDisplay.vue'
import CorrectionPanel from '@/components/CorrectionPanel.vue'
import RecommendationCard from '@/components/RecommendationCard.vue'
import ProductList from '@/components/ProductList.vue'

const props = defineProps<{
  fieldId: string
  planId: string
}>()

const auth = useAuthStore()
const { calculateNutrientDemand } = useNutrientCalculation()
const { matchProducts } = useRecommendation()

const plan = ref<FieldCropPlan | null>(null)
const crop = ref<Crop | null>(null)
const fieldName = ref('')
const fieldSizeHa = ref(0)
const corrections = ref<Correction[]>([])
const nutrientResults = ref<NutrientResult[]>([])
const productMatches = ref<ProductMatch[]>([])
const errorMessage = ref('')

const vorfruchtId = computed(() => plan.value?.vorfrucht_correction_id ?? null)
const zwischenfruchtId = computed(() => plan.value?.zwischenfrucht_correction_id ?? null)
const humusId = computed(() => plan.value?.humus_correction_id ?? null)

async function loadData() {
  try {
    const plans = await getPlansForField(props.fieldId)
    plan.value = plans.find((p) => p.id === props.planId) ?? null

    if (!plan.value) {
      errorMessage.value = 'Planung nicht gefunden.'
      return
    }

    const crops = await getCrops()
    crop.value = crops.find((c) => c.id === plan.value!.crop_id) ?? null

    if (auth.userId) {
      const fields = await getFields(auth.userId)
      const field = fields.find((f) => f.id === props.fieldId)
      fieldName.value = field?.name ?? ''
      fieldSizeHa.value = field?.size_ha ?? 0
    }

    corrections.value = await getCorrections()

    // Auto-calculate on load
    await calculate()
  } catch (e) {
    console.error('Fehler beim Laden:', e)
    errorMessage.value = 'Daten konnten nicht geladen werden.'
  }
}

async function onCorrectionChange(field: 'vorfrucht_correction_id' | 'zwischenfrucht_correction_id' | 'humus_correction_id', value: string | null) {
  if (!plan.value) return

  try {
    plan.value = await updatePlan(plan.value.id, { [field]: value })
    await calculate()
  } catch (e) {
    console.error('Fehler beim Speichern:', e)
    errorMessage.value = 'Korrektur konnte nicht gespeichert werden.'
  }
}

async function calculate() {
  if (!plan.value || !crop.value) return
  errorMessage.value = ''

  try {
    const nutrientTypes = await getNutrientTypes()
    const demands = await getNutrientDemands(plan.value.crop_id)
    const products = await getProducts()

    // Build active corrections
    const correctionIds = [
      plan.value.vorfrucht_correction_id,
      plan.value.zwischenfrucht_correction_id,
      plan.value.humus_correction_id,
    ].filter((id): id is string => id !== null)

    let activeCorr: ActiveCorrection[] = []
    if (correctionIds.length > 0) {
      const values = await getCorrectionValues(correctionIds)
      activeCorr = correctionIds.map(id => ({
        correction: corrections.value.find(c => c.id === id)!,
        values: values.filter(v => v.correction_id === id),
      })).filter(ac => ac.correction)
    }

    nutrientResults.value = calculateNutrientDemand(
      demands,
      nutrientTypes,
      plan.value.expected_yield_dt_ha,
      fieldSizeHa.value,
      activeCorr.length > 0 ? activeCorr : undefined,
    )

    productMatches.value = matchProducts(nutrientResults.value, products)

    // Save result
    const valuesToSave = nutrientResults.value.map((r) => {
      const ntId = nutrientTypes.find((nt) => nt.code === r.nutrient_code)?.id ?? ''
      return {
        nutrient_type_id: ntId,
        value_kg_ha: r.value_kg_ha,
        value_kg_total: r.value_kg_total,
        source_used: 'lfl' as const,
      }
    })

    await saveRecommendation(props.planId, valuesToSave, !navigator.onLine)
  } catch (e) {
    console.error('Fehler bei Berechnung:', e)
    errorMessage.value = 'Berechnung fehlgeschlagen. Bitte erneut versuchen.'
  }
}

onMounted(loadData)
</script>
```

- [ ] **Step 2: Run full test suite**

Run: `npm run test:run`

Expected: All unit tests pass. (Note: some existing RecommendationView-related E2E tests might need updating in a later task due to the removed button.)

- [ ] **Step 3: Commit**

```bash
git add src/views/RecommendationView.vue
git commit -m "feat(ui): RecommendationView with auto-calc, corrections, and removed Berechnen button"
```

---

## Chunk 3: Admin + E2E

### Task 12: AdminCorrectionList Component

**Files:**
- Create: `src/components/AdminCorrectionList.test.ts`
- Create: `src/components/AdminCorrectionList.vue`

- [ ] **Step 1: Write failing tests**

Create `src/components/AdminCorrectionList.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AdminCorrectionList from './AdminCorrectionList.vue'
import type { Correction, CorrectionValue, NutrientType } from '@/types'

const mockNutrientTypes: NutrientType[] = [
  { id: 'nt-n', code: 'N', label_de: 'Stickstoff', unit: 'kg/ha', sort_order: 1, is_system: true },
]

const mockCorrections: Correction[] = [
  { id: 'c1', type: 'vorfrucht', label_de: 'Winterraps', sort_order: 1 },
  { id: 'c2', type: 'zwischenfrucht', label_de: 'Leguminosen', sort_order: 1 },
  { id: 'c3', type: 'humus', label_de: '> 4%', sort_order: 2 },
]

const mockValues: CorrectionValue[] = [
  { id: 'cv1', correction_id: 'c1', nutrient_type_id: 'nt-n', value_kg_ha: -10 },
  { id: 'cv2', correction_id: 'c2', nutrient_type_id: 'nt-n', value_kg_ha: -10 },
  { id: 'cv3', correction_id: 'c3', nutrient_type_id: 'nt-n', value_kg_ha: -20 },
]

const defaultProps = { corrections: mockCorrections, correctionValues: mockValues, nutrientTypes: mockNutrientTypes }

describe('AdminCorrectionList', () => {
  it('renders all corrections grouped by type', () => {
    const wrapper = mount(AdminCorrectionList, { props: defaultProps })
    expect(wrapper.text()).toContain('Vorfrucht')
    expect(wrapper.text()).toContain('Zwischenfrucht')
    expect(wrapper.text()).toContain('Humus')
  })

  it('shows correction label and N value preview with nutrient code', () => {
    const wrapper = mount(AdminCorrectionList, { props: defaultProps })
    expect(wrapper.find('[data-testid="admin-correction-item-c1"]').text()).toContain('Winterraps')
    expect(wrapper.find('[data-testid="admin-correction-item-c1"]').text()).toContain('N: -10')
  })

  it('emits select with correction id on click', async () => {
    const wrapper = mount(AdminCorrectionList, { props: defaultProps })
    await wrapper.find('[data-testid="admin-correction-item-c1"]').trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0]).toEqual(['c1'])
  })

  it('renders empty state when no corrections', () => {
    const wrapper = mount(AdminCorrectionList, {
      props: { corrections: [], correctionValues: [], nutrientTypes: mockNutrientTypes },
    })
    expect(wrapper.text()).toContain('Keine Korrekturen')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/AdminCorrectionList.test.ts`

Expected: All 4 tests FAIL.

- [ ] **Step 3: Implement AdminCorrectionList**

Create `src/components/AdminCorrectionList.vue`:

```vue
<template>
  <div>
    <div v-if="corrections.length === 0" class="py-4 text-center text-sm text-gray-400">
      Keine Korrekturen vorhanden
    </div>

    <template v-for="group in groups" :key="group.type">
      <h4 class="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{{ group.label }}</h4>
      <div class="space-y-1">
        <button
          v-for="c in group.items"
          :key="c.id"
          :data-testid="`admin-correction-item-${c.id}`"
          class="flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-left text-sm hover:bg-gray-100"
          @click="$emit('select', c.id)"
        >
          <span class="font-medium">{{ c.label_de }}</span>
          <span class="text-xs text-gray-500">{{ valuePreview(c.id) }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Correction, CorrectionValue, NutrientType } from '@/types'

const props = defineProps<{
  corrections: Correction[]
  correctionValues: CorrectionValue[]
  nutrientTypes: NutrientType[]
}>()

defineEmits<{
  select: [id: string]
}>()

const TYPE_LABELS: Record<string, string> = {
  vorfrucht: 'Vorfrucht',
  zwischenfrucht: 'Zwischenfrucht',
  humus: 'Humus',
}

const groups = computed(() => {
  const types = ['vorfrucht', 'zwischenfrucht', 'humus'] as const
  return types
    .map(type => ({
      type,
      label: TYPE_LABELS[type],
      items: props.corrections
        .filter(c => c.type === type)
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
    .filter(g => g.items.length > 0)
})

function valuePreview(correctionId: string): string {
  const vals = props.correctionValues.filter(v => v.correction_id === correctionId)
  if (vals.length === 0) return ''
  return vals.map(v => {
    const nt = props.nutrientTypes.find(n => n.id === v.nutrient_type_id)
    const code = nt?.code ?? '?'
    return `${code}: ${v.value_kg_ha > 0 ? '+' : ''}${v.value_kg_ha} kg/ha`
  }).join(', ')
}
</script>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/AdminCorrectionList.test.ts`

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminCorrectionList.vue src/components/AdminCorrectionList.test.ts
git commit -m "feat(admin): add AdminCorrectionList component"
```

---

### Task 13: AdminCorrectionForm Component

**Files:**
- Create: `src/components/AdminCorrectionForm.test.ts`
- Create: `src/components/AdminCorrectionForm.vue`

- [ ] **Step 1: Write failing tests**

Create `src/components/AdminCorrectionForm.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AdminCorrectionForm from './AdminCorrectionForm.vue'
import type { Correction, CorrectionValue, NutrientType } from '@/types'

const mockNutrientTypes: NutrientType[] = [
  { id: 'nt-n', code: 'N', label_de: 'Stickstoff', unit: 'kg/ha', sort_order: 1, is_system: true },
  { id: 'nt-p2o5', code: 'P2O5', label_de: 'Phosphat', unit: 'kg/ha', sort_order: 2, is_system: true },
]

const existingCorrection: Correction = { id: 'c1', type: 'vorfrucht', label_de: 'Winterraps', sort_order: 1 }
const existingValues: CorrectionValue[] = [
  { id: 'cv1', correction_id: 'c1', nutrient_type_id: 'nt-n', value_kg_ha: -10 },
]

describe('AdminCorrectionForm', () => {
  it('renders empty form for new correction', () => {
    const wrapper = mount(AdminCorrectionForm, {
      props: { nutrientTypes: mockNutrientTypes },
    })
    expect(wrapper.find('[data-testid="admin-correction-label-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-correction-type-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-correction-speichern-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-correction-loeschen-button"]').exists()).toBe(false)
  })

  it('populates form when editing existing correction', () => {
    const wrapper = mount(AdminCorrectionForm, {
      props: { nutrientTypes: mockNutrientTypes, correction: existingCorrection, correctionValues: existingValues },
    })
    const labelInput = wrapper.find('[data-testid="admin-correction-label-input"]').element as HTMLInputElement
    expect(labelInput.value).toBe('Winterraps')
    expect(wrapper.find('[data-testid="admin-correction-loeschen-button"]').exists()).toBe(true)
  })

  it('can add nutrient value row', async () => {
    const wrapper = mount(AdminCorrectionForm, {
      props: { nutrientTypes: mockNutrientTypes },
    })
    await wrapper.find('[data-testid="admin-correction-add-nutrient-button"]').trigger('click')
    expect(wrapper.find('[data-testid="admin-correction-nutrient-row-0"]').exists()).toBe(true)
  })

  it('emits save with correction and values data', async () => {
    const wrapper = mount(AdminCorrectionForm, {
      props: { nutrientTypes: mockNutrientTypes },
    })
    await wrapper.find('[data-testid="admin-correction-label-input"]').setValue('Test')
    await wrapper.find('[data-testid="admin-correction-type-select"]').setValue('vorfrucht')
    await wrapper.find('[data-testid="admin-correction-add-nutrient-button"]').trigger('click')
    // Set nutrient and value in the new row
    const row = wrapper.find('[data-testid="admin-correction-nutrient-row-0"]')
    await row.find('select').setValue('nt-n')
    await row.find('input[type="number"]').setValue('-10')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('save')).toBeTruthy()
    const saveData = wrapper.emitted('save')![0][0] as { correction: Omit<Correction, 'id'>; values: { nutrient_type_id: string; value_kg_ha: number }[] }
    expect(saveData.correction.label_de).toBe('Test')
    expect(saveData.correction.type).toBe('vorfrucht')
    expect(saveData.values).toHaveLength(1)
    expect(saveData.values[0].nutrient_type_id).toBe('nt-n')
    expect(saveData.values[0].value_kg_ha).toBe(-10)
  })

  it('emits delete after confirmation for existing correction', async () => {
    const wrapper = mount(AdminCorrectionForm, {
      props: { nutrientTypes: mockNutrientTypes, correction: existingCorrection, correctionValues: existingValues },
    })
    await wrapper.find('[data-testid="admin-correction-loeschen-button"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeUndefined()
    await wrapper.find('[data-testid="admin-correction-loeschen-confirm-button"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/AdminCorrectionForm.test.ts`

Expected: All 5 tests FAIL.

- [ ] **Step 3: Implement AdminCorrectionForm**

Create `src/components/AdminCorrectionForm.vue`:

```vue
<template>
  <form class="space-y-4" @submit.prevent="onSave">
    <div>
      <label class="mb-1 block text-sm font-medium text-gray-700">Label</label>
      <input
        v-model="labelDe"
        data-testid="admin-correction-label-input"
        type="text"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label class="mb-1 block text-sm font-medium text-gray-700">Typ</label>
      <select
        v-model="type"
        data-testid="admin-correction-type-select"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="vorfrucht">Vorfrucht</option>
        <option value="zwischenfrucht">Zwischenfrucht</option>
        <option value="humus">Humus</option>
      </select>
    </div>

    <div>
      <label class="mb-1 block text-sm font-medium text-gray-700">Sortierung</label>
      <input
        v-model.number="sortOrder"
        type="number"
        min="0"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
    </div>

    <!-- Dynamic nutrient value rows -->
    <div>
      <label class="mb-1 block text-sm font-medium text-gray-700">Nährstoff-Abschläge</label>
      <div class="space-y-2">
        <div
          v-for="(row, index) in nutrientRows"
          :key="index"
          :data-testid="`admin-correction-nutrient-row-${index}`"
          class="flex items-center gap-2"
        >
          <select
            v-model="row.nutrient_type_id"
            required
            class="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="" disabled>Nährstoff…</option>
            <option v-for="nt in nutrientTypes" :key="nt.id" :value="nt.id">{{ nt.code }}</option>
          </select>
          <input
            v-model.number="row.value_kg_ha"
            type="number"
            step="any"
            required
            placeholder="kg/ha"
            class="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            class="rounded px-2 py-1 text-red-500 hover:bg-red-50"
            @click="nutrientRows.splice(index, 1)"
          >
            ✕
          </button>
        </div>
      </div>
      <button
        type="button"
        data-testid="admin-correction-add-nutrient-button"
        class="mt-2 text-sm text-green-700 hover:text-green-900"
        @click="nutrientRows.push({ nutrient_type_id: '', value_kg_ha: 0 })"
      >
        + Nährstoff hinzufügen
      </button>
    </div>

    <button
      data-testid="admin-correction-speichern-button"
      type="submit"
      class="w-full rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
    >
      Speichern
    </button>

    <!-- Delete (only for existing) -->
    <template v-if="correction">
      <button
        v-if="!confirmDelete"
        data-testid="admin-correction-loeschen-button"
        type="button"
        class="w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        @click="confirmDelete = true"
      >
        Löschen
      </button>
      <button
        v-else
        data-testid="admin-correction-loeschen-confirm-button"
        type="button"
        class="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        @click="$emit('delete')"
      >
        Wirklich löschen?
      </button>
    </template>
  </form>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Correction, CorrectionValue, NutrientType } from '@/types'

const props = defineProps<{
  nutrientTypes: NutrientType[]
  correction?: Correction
  correctionValues?: CorrectionValue[]
}>()

const emit = defineEmits<{
  save: [data: { correction: Omit<Correction, 'id'>; values: { nutrient_type_id: string; value_kg_ha: number }[] }]
  delete: []
}>()

const labelDe = ref('')
const type = ref<Correction['type']>('vorfrucht')
const sortOrder = ref(0)
const nutrientRows = ref<{ nutrient_type_id: string; value_kg_ha: number }[]>([])
const confirmDelete = ref(false)

onMounted(() => {
  if (props.correction) {
    labelDe.value = props.correction.label_de
    type.value = props.correction.type
    sortOrder.value = props.correction.sort_order
  }
  if (props.correctionValues) {
    nutrientRows.value = props.correctionValues.map(v => ({
      nutrient_type_id: v.nutrient_type_id,
      value_kg_ha: v.value_kg_ha,
    }))
  }
})

function onSave() {
  emit('save', {
    correction: {
      type: type.value,
      label_de: labelDe.value,
      sort_order: sortOrder.value,
    },
    values: nutrientRows.value.filter(r => r.nutrient_type_id),
  })
}
</script>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/AdminCorrectionForm.test.ts`

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminCorrectionForm.vue src/components/AdminCorrectionForm.test.ts
git commit -m "feat(admin): add AdminCorrectionForm component with dynamic nutrient rows"
```

---

### Task 14: AdminView — 4th Tab "Korrekturen"

**Files:**
- Modify: `src/views/AdminView.vue`

- [ ] **Step 1: Add corrections tab to AdminView**

Modify `src/views/AdminView.vue`:

1. Add `'corrections'` to the `activeTab` type (line 149):
```typescript
const activeTab = ref<'crops' | 'nutrients' | 'products' | 'corrections'>('crops')
```

2. Add the 4th tab button after the "Produkte" button (after line 41, before the closing `</div>` of admin-tabs):
```html
        <button
          data-testid="admin-tab-corrections"
          :class="[
            'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
            activeTab === 'corrections'
              ? 'bg-white text-green-800 shadow'
              : 'text-gray-600 hover:text-gray-800',
          ]"
          @click="activeTab = 'corrections'"
        >
          Korrekturen
        </button>
```

3. Add the corrections template section (after the products template, before `</div>` closing `space-y-4`):
```html
      <!-- Korrekturen tab -->
      <template v-if="activeTab === 'corrections'">
        <button
          data-testid="admin-correction-anlegen-button"
          class="w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 hover:border-green-500 hover:text-green-700"
          @click="openNewCorrection"
        >
          + Korrektur anlegen
        </button>
        <AdminCorrectionList
          :corrections="correctionsList"
          :correction-values="allCorrectionValues"
          :nutrient-types="nutrientTypes"
          @select="openEditCorrection"
        />
      </template>
```

4. Add the correction DrawerModal (after the product DrawerModal):
```html
    <!-- Correction Drawer -->
    <DrawerModal
      :open="correctionDrawerOpen"
      :title="editingCorrectionId ? 'Korrektur bearbeiten' : 'Neue Korrektur'"
      @close="closeCorrectionDrawer"
    >
      <AdminCorrectionForm
        :nutrient-types="nutrientTypes"
        :correction="editingCorrection"
        :correction-values="editingCorrectionValues"
        @save="saveCorrection"
        @delete="deleteCorrectionItem"
      />
    </DrawerModal>
```

5. Add imports in `<script setup>`:
```typescript
import AdminCorrectionList from '@/components/AdminCorrectionList.vue'
import AdminCorrectionForm from '@/components/AdminCorrectionForm.vue'
import {
  getCorrections,
  getCorrectionValues,
  createCorrection,
  updateCorrection,
  deleteCorrection,
} from '@/services/correction.service'
import type { Correction, CorrectionValue, ... } from '@/types'
```

6. Add correction state refs:
```typescript
const correctionsList = ref<Correction[]>([])
const allCorrectionValues = ref<CorrectionValue[]>([])

const correctionDrawerOpen = ref(false)
const editingCorrectionId = ref<string | null>(null)
const editingCorrection = computed(() =>
  editingCorrectionId.value ? correctionsList.value.find(c => c.id === editingCorrectionId.value) : undefined,
)
const editingCorrectionValues = computed(() =>
  editingCorrectionId.value ? allCorrectionValues.value.filter(v => v.correction_id === editingCorrectionId.value) : undefined,
)
```

7. Add `getCorrections()` to `loadAll()`:
```typescript
async function loadAll() {
  try {
    const [cropsData, typesData, demandsData, productsData, correctionsData] = await Promise.all([
      getCrops(),
      getNutrientTypes(),
      getAllNutrientDemands(),
      getAllProducts(),
      getCorrections(),
    ])
    crops.value = cropsData
    nutrientTypes.value = typesData
    demands.value = demandsData
    products.value = productsData
    correctionsList.value = correctionsData

    // Load all correction values for preview
    const allIds = correctionsData.map(c => c.id)
    if (allIds.length > 0) {
      allCorrectionValues.value = await getCorrectionValues(allIds)
    }

    errorMessage.value = ''
  } catch {
    errorMessage.value = 'Admin-Daten konnten nicht geladen werden'
  }
}
```

8. Add correction CRUD functions:
```typescript
function openNewCorrection() {
  editingCorrectionId.value = null
  correctionDrawerOpen.value = true
}
function openEditCorrection(correctionId: string) {
  editingCorrectionId.value = correctionId
  correctionDrawerOpen.value = true
}
function closeCorrectionDrawer() {
  correctionDrawerOpen.value = false
  editingCorrectionId.value = null
}
async function saveCorrection(data: { correction: Omit<Correction, 'id'>; values: { nutrient_type_id: string; value_kg_ha: number }[] }) {
  try {
    if (editingCorrectionId.value) {
      await updateCorrection(editingCorrectionId.value, data.correction, data.values)
    } else {
      await createCorrection(data.correction, data.values)
    }
    closeCorrectionDrawer()
    await loadAll()
  } catch {
    errorMessage.value = 'Korrektur konnte nicht gespeichert werden'
  }
}
async function deleteCorrectionItem() {
  if (!editingCorrectionId.value) return
  try {
    await deleteCorrection(editingCorrectionId.value)
    closeCorrectionDrawer()
    await loadAll()
  } catch {
    errorMessage.value = 'Korrektur konnte nicht gelöscht werden'
  }
}
```

- [ ] **Step 2: Run full test suite**

Run: `npm run test:run`

Expected: All tests pass.

- [ ] **Step 3: Verify build**

Run: `npm run build`

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/views/AdminView.vue
git commit -m "feat(admin): add Korrekturen tab with CRUD to AdminView"
```

---

### Task 15: Update Seed Data

**Files:**
- Create or Modify: `supabase/seed.sql`

- [ ] **Step 1: Create seed.sql with correction data**

Create `supabase/seed.sql` with seed data for corrections. The migration already migrates existing n_corrections data, but after `db reset` we need fresh seed data. Check if seed.sql already exists and append/replace the corrections section. Use the stable IDs from `src/constants/corrections.ts`.

```sql
-- ============================================================
-- Seed data for Düngungsberater
-- Run after migrations with: npx supabase db reset
-- ============================================================

-- Note: Nutrient types, crops, crop_nutrient_demands, and fertilizer_products
-- are seeded by the app's constants files on first load via cacheStammdaten().

-- Corrections (LfL Tab. 9f) — use stable IDs matching src/constants/corrections.ts
INSERT INTO public.corrections (id, type, label_de, sort_order) VALUES
  ('corr-vf-winterraps', 'vorfrucht', 'Winterraps', 1),
  ('corr-vf-koernerleguminosen', 'vorfrucht', 'Körnerleguminosen', 2),
  ('corr-vf-kartoffeln', 'vorfrucht', 'Kartoffeln', 3),
  ('corr-vf-zuckerrueben', 'vorfrucht', 'Zuckerrüben', 4),
  ('corr-vf-mais', 'vorfrucht', 'Mais', 5),
  ('corr-vf-getreide', 'vorfrucht', 'Getreide', 6),
  ('corr-zf-leguminosen', 'zwischenfrucht', 'Leguminosen', 1),
  ('corr-zf-nichtleg-ohne', 'zwischenfrucht', 'Nichtleguminosen ohne Abfuhr (Gründüngung)', 2),
  ('corr-zf-nichtleg-mit', 'zwischenfrucht', 'Nichtleguminosen mit Abfuhr', 3),
  ('corr-humus-unter4', 'humus', '< 4% (kein Abschlag)', 1),
  ('corr-humus-ueber4', 'humus', '> 4%', 2)
ON CONFLICT (id) DO NOTHING;

-- Correction values (N-Abschläge)
INSERT INTO public.correction_values (id, correction_id, nutrient_type_id, value_kg_ha) VALUES
  ('cv-vf-winterraps-n', 'corr-vf-winterraps', 'nt-n', -10),
  ('cv-vf-koernerleg-n', 'corr-vf-koernerleguminosen', 'nt-n', -10),
  ('cv-vf-kartoffeln-n', 'corr-vf-kartoffeln', 'nt-n', -10),
  ('cv-vf-zuckerrueben-n', 'corr-vf-zuckerrueben', 'nt-n', 0),
  ('cv-vf-mais-n', 'corr-vf-mais', 'nt-n', 0),
  ('cv-vf-getreide-n', 'corr-vf-getreide', 'nt-n', 0),
  ('cv-zf-leguminosen-n', 'corr-zf-leguminosen', 'nt-n', -10),
  ('cv-zf-nichtleg-ohne-n', 'corr-zf-nichtleg-ohne', 'nt-n', -20),
  ('cv-zf-nichtleg-mit-n', 'corr-zf-nichtleg-mit', 'nt-n', 0),
  ('cv-humus-unter4-n', 'corr-humus-unter4', 'nt-n', 0),
  ('cv-humus-ueber4-n', 'corr-humus-ueber4', 'nt-n', -20)
ON CONFLICT (id) DO NOTHING;
```

**Note:** The `ON CONFLICT DO NOTHING` handles the case where the migration already inserted data from `n_corrections`. The `nutrient_type_id = 'nt-n'` references the N nutrient type from the app's constants. This requires the nutrient_types to be seeded first — the app does this via `cacheStammdaten()` on first load. For a fresh `db reset`, the seed.sql runs after migrations but the nutrient_types table may be empty. The seed data references these IDs, so they need to exist. Add the nutrient_types seed at the top:

```sql
-- Nutrient types (required by correction_values FK)
INSERT INTO public.nutrient_types (id, code, label_de, unit, sort_order, is_system) VALUES
  ('nt-n', 'N', 'Stickstoff', 'kg/ha', 1, true),
  ('nt-p2o5', 'P2O5', 'Phosphat', 'kg/ha', 2, true),
  ('nt-k2o', 'K2O', 'Kalium', 'kg/ha', 3, true),
  ('nt-mgo', 'MgO', 'Magnesium', 'kg/ha', 4, true),
  ('nt-s', 'S', 'Schwefel', 'kg/ha', 5, true)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 2: Test with db reset**

Run: `cd /home/manuel/claude/duenger && npx supabase db reset`

Expected: Migrations + seed data apply successfully.

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat(db): add seed.sql with correction and nutrient type data"
```

---

### Task 16: E2E Tests

**Files:**
- Create: `tests/e2e/korrekturen.spec.ts`
- Modify: `tests/e2e/empfehlung.spec.ts` (if exists — update for removed button)

- [ ] **Step 1: Write E2E tests for correction workflow**

Create `tests/e2e/korrekturen.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

// Helper: Login as regular user
async function loginAsUser(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.fill('[data-testid="login-email"]', 'test@example.com')
  await page.fill('[data-testid="login-password"]', 'password123')
  await page.click('[data-testid="login-submit"]')
  await page.waitForURL(/\/felder/)
}

// Helper: Login as admin
async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.fill('[data-testid="login-email"]', 'admin@example.com')
  await page.fill('[data-testid="login-password"]', 'password123')
  await page.click('[data-testid="login-submit"]')
  await page.waitForURL(/\/felder/)
}

test.describe('Korrekturfaktoren', () => {
  test('correction panel is collapsed by default on recommendation page', async ({ page }) => {
    await loginAsUser(page)
    // Navigate to a recommendation page (assumes test data exists)
    // This test validates the panel structure
    await page.goto('/felder')
    // Create field + plan to get to recommendation
    await page.click('[data-testid="feld-anlegen-button"]')
    await page.fill('[data-testid="feld-name-input"]', 'Testfeld Korrektur')
    await page.fill('[data-testid="feld-groesse-input"]', '10')
    await page.click('[data-testid="feld-speichern-button"]')
    await page.waitForTimeout(500)

    // Navigate to Anbauplanung
    const fieldItem = page.locator('[data-testid^="feld-item-"]').first()
    await fieldItem.click()

    // Create plan
    await page.click('[data-testid="plan-anlegen-button"]')
    await page.locator('[data-testid="plan-kultur-select"]').selectOption({ index: 1 })
    await page.fill('[data-testid="plan-ertrag-input"]', '80')
    await page.click('[data-testid="plan-speichern-button"]')
    await page.waitForTimeout(500)

    // Navigate to recommendation
    const planItem = page.locator('[data-testid^="plan-item-"]').first()
    await planItem.locator('[data-testid^="plan-empfehlung-"]').click()

    // Verify correction panel exists but is collapsed
    await expect(page.locator('[data-testid="correction-panel"]')).toBeVisible()
    await expect(page.locator('[data-testid="correction-vorfrucht-select"]')).not.toBeVisible()

    // Verify auto-calculation happened (no button needed — button removed from DOM entirely)
    await expect(page.locator('[data-testid="empfehlung-berechnen-button"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="recommendation-card"]')).toBeVisible()
  })

  test('expanding panel shows 3 dropdowns and selecting correction updates results', async ({ page }) => {
    await loginAsUser(page)
    await page.goto('/felder')

    // Reuse existing field/plan or create new
    await page.click('[data-testid="feld-anlegen-button"]')
    await page.fill('[data-testid="feld-name-input"]', 'Testfeld Live')
    await page.fill('[data-testid="feld-groesse-input"]', '5')
    await page.click('[data-testid="feld-speichern-button"]')
    await page.waitForTimeout(500)

    const fieldItem = page.locator('[data-testid^="feld-item-"]').first()
    await fieldItem.click()

    await page.click('[data-testid="plan-anlegen-button"]')
    await page.locator('[data-testid="plan-kultur-select"]').selectOption({ index: 1 })
    await page.fill('[data-testid="plan-ertrag-input"]', '80')
    await page.click('[data-testid="plan-speichern-button"]')
    await page.waitForTimeout(500)

    const planItem = page.locator('[data-testid^="plan-item-"]').first()
    await planItem.locator('[data-testid^="plan-empfehlung-"]').click()
    await page.waitForTimeout(500)

    // Get initial N value
    const nRowBefore = page.locator('[data-testid="nutrient-row-N"]')
    const textBefore = await nRowBefore.textContent()

    // Expand correction panel
    await page.click('[data-testid="correction-panel-toggle"]')
    await expect(page.locator('[data-testid="correction-vorfrucht-select"]')).toBeVisible()
    await expect(page.locator('[data-testid="correction-zwischenfrucht-select"]')).toBeVisible()
    await expect(page.locator('[data-testid="correction-humus-select"]')).toBeVisible()

    // Select Winterraps (-10 kg N/ha)
    await page.locator('[data-testid="correction-vorfrucht-select"]').selectOption({ label: 'Winterraps' })
    await page.waitForTimeout(500)

    // N value should have decreased
    const nRowAfter = page.locator('[data-testid="nutrient-row-N"]')
    const textAfter = await nRowAfter.textContent()
    expect(textAfter).not.toBe(textBefore)
  })

  test('selected corrections persist after navigating away and back', async ({ page }) => {
    await loginAsUser(page)
    await page.goto('/felder')

    await page.click('[data-testid="feld-anlegen-button"]')
    await page.fill('[data-testid="feld-name-input"]', 'Testfeld Persist')
    await page.fill('[data-testid="feld-groesse-input"]', '5')
    await page.click('[data-testid="feld-speichern-button"]')
    await page.waitForTimeout(500)

    const fieldItem = page.locator('[data-testid^="feld-item-"]').first()
    await fieldItem.click()

    await page.click('[data-testid="plan-anlegen-button"]')
    await page.locator('[data-testid="plan-kultur-select"]').selectOption({ index: 1 })
    await page.fill('[data-testid="plan-ertrag-input"]', '80')
    await page.click('[data-testid="plan-speichern-button"]')
    await page.waitForTimeout(500)

    const planItem = page.locator('[data-testid^="plan-item-"]').first()
    await planItem.locator('[data-testid^="plan-empfehlung-"]').click()
    await page.waitForTimeout(500)

    // Expand and select a correction
    await page.click('[data-testid="correction-panel-toggle"]')
    await page.locator('[data-testid="correction-vorfrucht-select"]').selectOption({ label: 'Winterraps' })
    await page.waitForTimeout(500)

    // Navigate away (back to planning)
    await page.goBack()
    await page.waitForTimeout(500)

    // Navigate back to recommendation
    const planItem2 = page.locator('[data-testid^="plan-item-"]').first()
    await planItem2.locator('[data-testid^="plan-empfehlung-"]').click()
    await page.waitForTimeout(500)

    // Expand panel — Winterraps should still be selected
    await page.click('[data-testid="correction-panel-toggle"]')
    const vorfruchtSelect = page.locator('[data-testid="correction-vorfrucht-select"]')
    await expect(vorfruchtSelect).toHaveValue(/corr-vf-winterraps/)
  })
})

test.describe('Admin Korrekturen', () => {
  test('corrections tab shows grouped list', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin')

    await page.click('[data-testid="admin-tab-corrections"]')
    await page.waitForTimeout(500)

    // Verify corrections are listed
    await expect(page.locator('[data-testid^="admin-correction-item-"]').first()).toBeVisible()
  })

  test('can create a new correction', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin')
    await page.click('[data-testid="admin-tab-corrections"]')
    await page.waitForTimeout(500)

    await page.click('[data-testid="admin-correction-anlegen-button"]')
    await page.fill('[data-testid="admin-correction-label-input"]', 'E2E Testkorrektur')
    await page.locator('[data-testid="admin-correction-type-select"]').selectOption('vorfrucht')
    await page.click('[data-testid="admin-correction-add-nutrient-button"]')
    const row = page.locator('[data-testid="admin-correction-nutrient-row-0"]')
    await row.locator('select').selectOption({ index: 1 })
    await row.locator('input[type="number"]').fill('-5')
    await page.click('[data-testid="admin-correction-speichern-button"]')
    await page.waitForTimeout(500)

    await expect(page.getByText('E2E Testkorrektur')).toBeVisible()
  })

  test('can edit an existing correction', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin')
    await page.click('[data-testid="admin-tab-corrections"]')
    await page.waitForTimeout(500)

    // Click first correction to edit
    await page.locator('[data-testid^="admin-correction-item-"]').first().click()
    const labelInput = page.locator('[data-testid="admin-correction-label-input"]')
    await expect(labelInput).toBeVisible()

    // Change label
    await labelInput.clear()
    await labelInput.fill('Bearbeitete Korrektur')
    await page.click('[data-testid="admin-correction-speichern-button"]')
    await page.waitForTimeout(500)

    await expect(page.getByText('Bearbeitete Korrektur')).toBeVisible()
  })

  test('can delete a correction with confirmation', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin')
    await page.click('[data-testid="admin-tab-corrections"]')
    await page.waitForTimeout(500)

    // Create one to delete
    await page.click('[data-testid="admin-correction-anlegen-button"]')
    await page.fill('[data-testid="admin-correction-label-input"]', 'Zum Löschen')
    await page.locator('[data-testid="admin-correction-type-select"]').selectOption('humus')
    await page.click('[data-testid="admin-correction-speichern-button"]')
    await page.waitForTimeout(500)

    // Click it to open drawer
    await page.getByText('Zum Löschen').click()
    await page.click('[data-testid="admin-correction-loeschen-button"]')
    await page.click('[data-testid="admin-correction-loeschen-confirm-button"]')
    await page.waitForTimeout(500)

    // Should be gone
    await expect(page.getByText('Zum Löschen')).toHaveCount(0)
  })
})
```

- [ ] **Step 2: Update existing empfehlung E2E test — remove Berechnen button reference**

In `tests/e2e/empfehlung.spec.ts`, the test "can recalculate recommendation" (line 17-21) clicks `empfehlung-berechnen-button` which no longer exists. Replace that test:

```typescript
  test('auto-calculates recommendation on load (no button needed)', async ({ page }) => {
    await page.goto('/felder/test-field-id/planung/test-plan-id/empfehlung')
    // Button should not exist in the DOM at all
    await expect(page.getByTestId('empfehlung-berechnen-button')).toHaveCount(0)
    // Results should appear automatically
    await expect(page.getByTestId('recommendation-card')).toBeVisible()
  })
```

- [ ] **Step 3: Run E2E tests**

Run: `npm run test:e2e`

Expected: E2E tests pass (requires Supabase running locally with seeded data).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/korrekturen.spec.ts tests/e2e/empfehlung.spec.ts
git commit -m "test(e2e): add correction workflow E2E tests, update empfehlung for auto-calc"
```

---

### Task 17: Final Verification & ARC42 Update

**Files:**
- Modify: `docs/arc42/` (building blocks, concepts)

- [ ] **Step 1: Run full test suite**

Run: `npm run test:run && npm run lint && npm run build`

Expected: All tests pass, no lint errors, build succeeds.

- [ ] **Step 2: Update ARC42 building blocks**

Update `docs/arc42/05-building-blocks.md` to add the correction service and components to the building block view.

- [ ] **Step 3: Run E2E tests**

Run: `npm run test:e2e`

Expected: All E2E tests pass.

- [ ] **Step 4: Final commit**

```bash
git add docs/arc42/
git commit -m "docs: update ARC42 for Stufe 2 corrections"
```
