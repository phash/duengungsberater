# Düngungsberater MVP — Implementierungsplan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA für Landwirte, die auf Basis von Feldgröße und Kulturwahl den Nährstoffbedarf (N, P2O5, K2O, MgO, S) nach LfL-Basisdaten berechnet und Düngerprodukte mit Affiliate-Links empfiehlt.

**Architecture:** Vue 3 SPA mit Supabase-Backend (Auth + PostgreSQL + RLS). Berechnungslogik lebt ausschließlich in einem Composable (`useNutrientCalculation`), Services kapseln alle Supabase-Aufrufe, Dexie.js cached Stammdaten für Offline-Betrieb. Admin-Bereich ist rollenbasiert und nur online verfügbar.

**Tech Stack:** Vue 3, Vite, TypeScript, Tailwind CSS, Pinia, Vue Router, Supabase (Auth + DB), Dexie.js, vite-plugin-pwa, Vitest, Playwright

**MVP-Scope (Stufe 1):** Kultur + Feldgröße → Standardempfehlung. Keine Vorfrucht-/Zwischenfrucht-/Humus-/Nmin-Korrekturen — das Datenmodell legt diese aber bereits an.

**Spec:** `docs/superpowers/specs/2026-03-11-duenger-design.md`
**Richtlinien:** `docs/guidelines/programming-guidelines.md`

**Spec-Erweiterungen (im Rahmen der Implementierung):**
- `fertilizer_products` erhält zusätzlich `mgo_pct` und `s_pct` — nötig für korrekte Produktempfehlung bei MgO/S-Nährstoffen
- `fields` und `field_crop_plans` erhalten `synced`, `created_at`, `updated_at` — nötig für Offline-Sync
- Diese Erweiterungen werden als erstes in der Spec aktualisiert (Task 0)

---

## Dateistruktur

```
src/
  main.ts                          # App-Einstiegspunkt (Vue + Router + Pinia + CSS)
  App.vue                          # Root-Komponente mit RouterView + Layout
  router/
    index.ts                       # Vue Router Konfiguration, Route Guards (Auth)
  types/
    index.ts                       # Alle TypeScript-Typen (DB-Modell, UI-Modell)
  constants/
    nutrients.ts                   # Nährstofftyp-Definitionen (N, P2O5, K2O, MgO, S)
    nutrients.test.ts              # Tests für Nährstoff-Helper
    crops.ts                       # LfL-Kulturdaten (Tab. 9a + 1a) als Seed-Konstanten
    crops.test.ts                  # Tests für Kultur-Helper + Daten-Stichproben
    fertilizer-products.ts         # Initiale Düngerprodukte mit Affiliate-Links
  services/
    supabase.ts                    # Supabase-Client initialisieren
    auth.service.ts                # Login, Register, Logout, onAuthStateChange
    field.service.ts               # CRUD fields
    crop.service.ts                # Kulturen lesen (+ Admin-CRUD)
    nutrient.service.ts            # Nährstoffwerte lesen (+ Admin-CRUD)
    recommendation.service.ts      # Empfehlungen speichern/laden
    product.service.ts             # Düngerprodukte lesen (+ Admin-CRUD)
    field-crop-plan.service.ts     # Anbauplanung CRUD (+ Offline-Puffer)
    sync.service.ts                # Offline → Supabase Sync
  composables/
    useNutrientCalculation.ts      # Kernlogik: Nährstoffbedarf berechnen
    useNutrientCalculation.test.ts # Unit-Tests dazu
    useRecommendation.ts           # Orchestriert Berechnung → Produkt-Matching
    useRecommendation.test.ts      # Unit-Tests dazu
    useOfflineCache.ts             # Dexie-basierter Cache (Stammdaten + Pläne)
    useNumberFormat.ts             # Deutsches Zahlenformat (Komma, Einheiten)
    useNumberFormat.test.ts        # Unit-Tests dazu
  stores/
    auth.store.ts                  # Pinia: Auth-State (user, isAuthenticated, isAdmin)
    offline.store.ts               # Pinia: Offline-Status, Sync-Queue-Zähler
  db/
    dexie.ts                       # Dexie-DB-Schema (IndexedDB)
  components/
    AppLayout.vue                  # Shell: Header + BottomNav + main slot
    BottomNav.vue                  # Mobile Navigation (Felder, Profil, [Admin])
    FieldList.vue                  # Feldliste mit Status-Badges
    FieldForm.vue                  # Feld anlegen/bearbeiten (Drawer/Modal)
    CropPlanList.vue               # Anbauplanungen pro Feld
    CropPlanForm.vue               # Anbauplanung anlegen/bearbeiten (Drawer/Modal)
    RecommendationCard.vue         # Nährstoffempfehlung-Anzeige (N/P/K/MgO/S)
    ProductList.vue                # Produktempfehlungen mit Affiliate-Links
    StatusBadge.vue                # Wiederverwendbarer Status-Badge (grün/gelb/grau)
    DrawerModal.vue                # Wiederverwendbare Drawer/Modal-Hülle
    NumberDisplay.vue              # Formatierte Zahlenausgabe (deutsches Format + Einheit)
    AdminCropList.vue              # Admin: Kulturliste
    AdminCropForm.vue              # Admin: Kultur anlegen/bearbeiten
    AdminNutrientList.vue          # Admin: Nährstoffwerte-Liste
    AdminNutrientForm.vue          # Admin: Nährstoffwert anlegen/bearbeiten
    AdminProductList.vue           # Admin: Produktliste
    AdminProductForm.vue           # Admin: Produkt anlegen/bearbeiten
  views/
    LoginView.vue                  # Login + Registrierung
    FieldsView.vue                 # Felder-Übersicht
    CropPlanView.vue               # Anbauplanung für ein Feld
    RecommendationView.vue         # Düngeempfehlung für einen Plan
    ProfileView.vue                # Profil (eigene Nährstoffwerte)
    AdminView.vue                  # Admin-Dashboard mit Tabs

tests/
  e2e/
    auth.spec.ts                   # E2E: Login/Register/Logout
    felder.spec.ts                 # E2E: Felder CRUD
    anbauplanung.spec.ts           # E2E: Anbauplanung
    empfehlung.spec.ts             # E2E: Berechnung + Empfehlung
    admin.spec.ts                  # E2E: Admin-CRUD

docs/
  arc42/
    01-introduction.md
    03-context.md
    05-building-blocks.md
    06-runtime.md
    08-concepts.md
    09-decisions/
      ADR-001-supabase-backend.md
      ADR-002-dexie-offline-cache.md
      ADR-003-single-calculation-composable.md
```

---

## Chunk 1: Projekt-Setup, TypeScript-Typen, LfL-Konstanten

Dieses Chunk richtet das Projekt ein, definiert alle TypeScript-Typen und legt die LfL-Referenzdaten als Konstanten an. Am Ende gibt es ein lauffähiges Vite-Projekt mit grünen Tests.

### Task 0: Spec-Erweiterungen dokumentieren

**Files:**
- Modify: `docs/superpowers/specs/2026-03-11-duenger-design.md`

- [ ] **Step 1: Spec aktualisieren**

Folgende Ergänzungen im Datenmodell-Abschnitt der Spec vornehmen:

1. `fertilizer_products`: nach `k2o_pct` ergänzen: `mgo_pct, s_pct` — nötig damit die Produktempfehlung auch MgO- und S-haltige Dünger korrekt zuordnen kann (z.B. Kieserit 25% MgO + 20% S, Kornkali 40% K2O + 6% MgO + 4% S)
2. `fields`: nach `size_ha` ergänzen: `synced (bool), created_at, updated_at` — nötig für Offline-Sync-Strategie
3. `field_crop_plans`: analog `synced, created_at, updated_at` ergänzen

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-03-11-duenger-design.md
git commit -m "docs: extend spec with mgo_pct/s_pct on products and sync fields"
```

---

### Task 1: Vite + Vue 3 Projekt scaffolden

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `src/main.ts`, `src/App.vue`, `src/assets/main.css`, `env.d.ts`, `.env.example`, `src/router/index.ts`, `eslint.config.js`, `.prettierrc`, `playwright.config.ts`

- [ ] **Step 1: Projekt erzeugen**

```bash
npm create vite@latest . -- --template vue-ts
```

Falls das Verzeichnis nicht leer ist, aus einem temp-Verzeichnis erzeugen und Dateien kopieren.

- [ ] **Step 2: .gitignore prüfen und erweitern**

Sicherstellen, dass `.gitignore` mindestens enthält:
```
node_modules
dist
.env
.env.local
*.local
```

- [ ] **Step 3: Abhängigkeiten installieren**

```bash
npm install vue-router@4 pinia @supabase/supabase-js dexie tailwindcss @tailwindcss/vite vite-plugin-pwa
npm install -D vitest @vue/test-utils jsdom @playwright/test eslint @eslint/js typescript-eslint prettier eslint-config-prettier
```

- [ ] **Step 4: .env.example anlegen**

`.env.example`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 5: Vite-Config anpassen**

`vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 6: Tailwind einrichten**

`src/assets/main.css`:
```css
@import "tailwindcss";
```

- [ ] **Step 7: ESLint + Prettier konfigurieren**

`eslint.config.js`:
```javascript
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
)
```

`.prettierrc`:
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

- [ ] **Step 8: Minimaler Router anlegen**

`src/router/index.ts`:
```typescript
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/felder',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
```

- [ ] **Step 9: main.ts mit Router + Pinia + CSS**

`src/main.ts`:
```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```

- [ ] **Step 10: App.vue mit RouterView**

`src/App.vue`:
```vue
<template>
  <RouterView />
</template>

<script setup lang="ts">
</script>
```

- [ ] **Step 11: Playwright konfigurieren**

`playwright.config.ts`:
```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'de-DE',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
  },
})
```

- [ ] **Step 12: npm-Scripts in package.json ergänzen**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write src/"
  }
}
```

- [ ] **Step 13: Smoke-Test — Dev-Server startet**

```bash
npm run dev
```

Expected: Vite-Dev-Server startet auf `localhost:5173`, Vue-App rendert ohne Fehler.

- [ ] **Step 14: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json index.html env.d.ts .env.example .gitignore eslint.config.js .prettierrc playwright.config.ts src/main.ts src/App.vue src/assets/main.css src/router/index.ts
git commit -m "chore: scaffold Vite + Vue 3 + TypeScript project with Tailwind, Pinia, Router, Vitest, Playwright"
```

---

### Task 2: TypeScript-Typen definieren

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Alle Typen aus dem Datenmodell der Spec anlegen**

`src/types/index.ts`:
```typescript
// --- Stammdaten (Admin-pflegbar) ---

export interface NutrientType {
  id: string
  code: string        // 'N' | 'P2O5' | 'K2O' | 'MgO' | 'S' | ...
  label_de: string    // 'Stickstoff' | 'Phosphat' | ...
  unit: string        // 'kg/ha'
  sort_order: number
  is_system: boolean  // true = LfL-Standard, false = user-angelegt
}

export interface Crop {
  id: string
  name_de: string
  category: string         // 'Getreide' | 'Hackfrüchte' | 'Futterpflanzen' | ...
  sow_month_from: number   // 1-12
  sow_month_to: number
  harvest_month_from: number
  harvest_month_to: number
  ref_yield_dt_ha: number  // Referenzertrag dt/ha
  nmin_depth_cm: number    // 0, 60, oder 90
}

/**
 * Nährstoffbedarf pro Kultur.
 *
 * `per_yield_correction`: Korrekturwert in kg pro dt Ertragsabweichung vom Referenzertrag.
 * - Für N (Tab. 9a): Zuschlag/Abschlag zum N-Bedarfswert pro dt Mehrertrag/Minderertrag.
 * - Für P2O5/K2O/MgO/S (Tab. 1a): Nährstoffgehalt in kg/dt Frischmasse.
 *   `demand_kg_ha = gehalt_kg_dt × ref_yield_dt_ha`, Ertragskorrektur = `gehalt_kg_dt × yield_diff`.
 *
 * Die Berechnungsformel ist für alle Nährstoffe identisch:
 *   empfehlung = demand_kg_ha + (expected_yield - ref_yield) × per_yield_correction
 */
export interface CropNutrientDemand {
  id: string
  crop_id: string
  nutrient_type_id: string
  demand_kg_ha: number
  ref_yield_dt_ha: number
  per_yield_correction: number
  source: 'lfl' | 'user' | string
  user_id: string | null         // null = globaler LfL-Wert
  valid_from: string             // ISO-Datum
}

export interface NCorrection {
  id: string
  type: 'vorfrucht' | 'zwischenfrucht' | 'humus'
  label_de: string
  correction_kg_n: number  // negativ = Abschlag, positiv = Zuschlag
}

// Spec-Erweiterung: mgo_pct und s_pct hinzugefügt (→ Spec Task 0)
export interface FertilizerProduct {
  id: string
  name: string
  n_pct: number
  p2o5_pct: number
  k2o_pct: number
  mgo_pct: number
  s_pct: number
  form: 'mineral' | 'organic'
  affiliate_url: string
  shop_name: string
  active: boolean
}

// --- Landwirt-Daten ---
// Spec-Erweiterung: synced, created_at, updated_at hinzugefügt (→ Spec Task 0)

export interface Field {
  id: string
  user_id: string
  name: string
  size_ha: number
  // Stufe 3: soil_type, nmin_0_30, nmin_30_60, nmin_60_90
  synced: boolean
  created_at: string
  updated_at: string
}

export interface FieldCropPlan {
  id: string
  field_id: string
  crop_id: string
  season_year: number
  expected_yield_dt_ha: number
  // Stufe 2: vorfrucht_correction_id, zwischenfrucht_correction_id, humus_over_4pct
  // Stufe 3: nmin_measured
  synced: boolean
  created_at: string
  updated_at: string
}

export interface Recommendation {
  id: string
  field_crop_plan_id: string
  calculated_at: string
  calculated_offline: boolean
}

export interface RecommendationValue {
  id: string
  recommendation_id: string
  nutrient_type_id: string
  value_kg_ha: number
  value_kg_total: number
  source_used: 'lfl' | 'user'
}

// --- UI-spezifische Typen ---

export interface NutrientResult {
  nutrient_code: string
  nutrient_label: string
  value_kg_ha: number
  value_kg_total: number
  unit: string
}

export interface ProductMatch {
  product: FertilizerProduct
  amount_kg_ha: number
  amount_kg_total: number
}
```

- [ ] **Step 2: TypeCheck verifizieren**

```bash
npx vue-tsc --noEmit
```

Expected: Keine Fehler. Falls Fehler auftreten, Typen korrigieren.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript type definitions for all domain entities"
```

---

### Task 3: Zahlenformatierung — Composable mit TDD

**Files:**
- Create: `src/composables/useNumberFormat.test.ts`
- Create: `src/composables/useNumberFormat.ts`

- [ ] **Step 1: Failing Tests schreiben**

`src/composables/useNumberFormat.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { useNumberFormat } from './useNumberFormat'

describe('useNumberFormat', () => {
  const { formatNumber, formatArea, formatNutrientPerHa, formatNutrientTotal, formatYield } = useNumberFormat()

  describe('formatNumber', () => {
    it('formats integer without decimals', () => {
      expect(formatNumber(220)).toBe('220')
    })

    it('formats decimal with German comma', () => {
      expect(formatNumber(12.5)).toBe('12,5')
    })

    it('formats with specified decimal places', () => {
      expect(formatNumber(12.5, 2)).toBe('12,50')
    })

    it('formats thousands with German dot separator', () => {
      expect(formatNumber(2750)).toBe('2.750')
    })
  })

  describe('formatArea', () => {
    it('formats area with unit', () => {
      expect(formatArea(12.5)).toBe('12,50 ha')
    })
  })

  describe('formatNutrientPerHa', () => {
    it('formats nutrient per ha with code', () => {
      expect(formatNutrientPerHa(220, 'N')).toBe('220 kg N/ha')
    })
  })

  describe('formatNutrientTotal', () => {
    it('formats total nutrient with code', () => {
      expect(formatNutrientTotal(2750, 'N')).toBe('2.750 kg N')
    })
  })

  describe('formatYield', () => {
    it('formats yield', () => {
      expect(formatYield(80)).toBe('80 dt/ha')
    })
  })
})
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

```bash
npx vitest run src/composables/useNumberFormat.test.ts
```

Expected: FAIL — `useNumberFormat` existiert nicht.

- [ ] **Step 3: Minimale Implementierung**

`src/composables/useNumberFormat.ts`:
```typescript
export function useNumberFormat() {
  const locale = 'de-DE'

  function formatNumber(value: number, decimals?: number): string {
    const options: Intl.NumberFormatOptions = {}
    if (decimals !== undefined) {
      options.minimumFractionDigits = decimals
      options.maximumFractionDigits = decimals
    }
    return new Intl.NumberFormat(locale, options).format(value)
  }

  function formatArea(ha: number): string {
    return `${formatNumber(ha, 2)} ha`
  }

  function formatNutrientPerHa(kgHa: number, code: string): string {
    return `${formatNumber(kgHa)} kg ${code}/ha`
  }

  function formatNutrientTotal(kg: number, code: string): string {
    return `${formatNumber(kg)} kg ${code}`
  }

  function formatYield(dtHa: number): string {
    return `${formatNumber(dtHa)} dt/ha`
  }

  return { formatNumber, formatArea, formatNutrientPerHa, formatNutrientTotal, formatYield }
}
```

- [ ] **Step 4: Test ausführen — muss grün sein**

```bash
npx vitest run src/composables/useNumberFormat.test.ts
```

Expected: PASS (alle 6 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/composables/useNumberFormat.ts src/composables/useNumberFormat.test.ts
git commit -m "feat: add useNumberFormat composable with German number formatting (TDD)"
```

---

### Task 4: LfL-Nährstofftypen als Konstante mit TDD

**Files:**
- Create: `src/constants/nutrients.test.ts`
- Create: `src/constants/nutrients.ts`

- [ ] **Step 1: Failing Tests schreiben**

`src/constants/nutrients.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { NUTRIENT_TYPES, getNutrientByCode } from './nutrients'

describe('nutrients constants', () => {
  it('contains 5 system nutrient types', () => {
    expect(NUTRIENT_TYPES).toHaveLength(5)
    expect(NUTRIENT_TYPES.every(n => n.is_system)).toBe(true)
  })

  it('has correct codes in sort order', () => {
    const codes = NUTRIENT_TYPES.map(n => n.code)
    expect(codes).toEqual(['N', 'P2O5', 'K2O', 'MgO', 'S'])
  })

  describe('getNutrientByCode', () => {
    it('finds N', () => {
      const n = getNutrientByCode('N')
      expect(n).toBeDefined()
      expect(n!.label_de).toBe('Stickstoff')
    })

    it('finds P2O5', () => {
      const p = getNutrientByCode('P2O5')
      expect(p).toBeDefined()
      expect(p!.label_de).toBe('Phosphat')
    })

    it('returns undefined for unknown code', () => {
      expect(getNutrientByCode('XYZ')).toBeUndefined()
    })
  })
})
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

```bash
npx vitest run src/constants/nutrients.test.ts
```

Expected: FAIL — Module nicht gefunden.

- [ ] **Step 3: Implementierung**

`src/constants/nutrients.ts`:
```typescript
import type { NutrientType } from '@/types'

export const NUTRIENT_TYPES: NutrientType[] = [
  { id: 'nt-n',    code: 'N',    label_de: 'Stickstoff',     unit: 'kg/ha', sort_order: 1, is_system: true },
  { id: 'nt-p2o5', code: 'P2O5', label_de: 'Phosphat',       unit: 'kg/ha', sort_order: 2, is_system: true },
  { id: 'nt-k2o',  code: 'K2O',  label_de: 'Kalium',         unit: 'kg/ha', sort_order: 3, is_system: true },
  { id: 'nt-mgo',  code: 'MgO',  label_de: 'Magnesium',      unit: 'kg/ha', sort_order: 4, is_system: true },
  { id: 'nt-s',    code: 'S',    label_de: 'Schwefel',        unit: 'kg/ha', sort_order: 5, is_system: true },
]

export function getNutrientByCode(code: string): NutrientType | undefined {
  return NUTRIENT_TYPES.find(n => n.code === code)
}
```

- [ ] **Step 4: Test ausführen — muss grün sein**

```bash
npx vitest run src/constants/nutrients.test.ts
```

Expected: PASS (alle 4 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/constants/nutrients.ts src/constants/nutrients.test.ts
git commit -m "feat: add nutrient type constants with helper (TDD)"
```

---

### Task 5: LfL-Kulturdaten als Seed-Konstanten (Tab. 9a + 1a) mit TDD

**Files:**
- Create: `src/constants/crops.test.ts`
- Create: `src/constants/crops.ts`

Die Kulturdaten kommen aus den LfL-Tabellen 9a (N-Bedarfswerte) und 1a (Nährstoffgehalte). Für den MVP werden die wichtigsten Hauptfrüchte angelegt. Die Daten werden später in Supabase migriert — die Konstanten dienen als Seed und Offline-Fallback.

**Hinweis zu den LfL-Quellwerten:**
- Winterweizen E/A zusammengefasst (E-Weizen hat in Tab. 9a N-Bedarf 230, A-Weizen ebenfalls 230 bei 80 dt/ha Referenzertrag)
- Winterweizen B/C zusammengefasst (N-Bedarf 210 bei 80 dt/ha)
- P2O5/K2O/MgO/S: Werte aus Tab. 1a (Nährstoffgehalte in kg/dt FM), multipliziert mit Referenzertrag für `demand_kg_ha`

- [ ] **Step 1: Failing Tests schreiben**

`src/constants/crops.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { CROPS, CROP_NUTRIENT_DEMANDS, getCropById, getCropsByCategory, getNutrientDemandsForCrop } from './crops'

describe('crops constants', () => {
  it('contains at least 10 crops', () => {
    expect(CROPS.length).toBeGreaterThanOrEqual(10)
  })

  it('all crops have required fields', () => {
    for (const crop of CROPS) {
      expect(crop.id).toBeTruthy()
      expect(crop.name_de).toBeTruthy()
      expect(crop.category).toBeTruthy()
      expect(crop.ref_yield_dt_ha).toBeGreaterThan(0)
    }
  })

  describe('getCropById', () => {
    it('finds Winterweizen', () => {
      const crop = getCropById('crop-winterweizen')
      expect(crop).toBeDefined()
      expect(crop!.name_de).toBe('Winterweizen (E, A)')
      expect(crop!.ref_yield_dt_ha).toBe(80)
    })

    it('returns undefined for unknown id', () => {
      expect(getCropById('unknown')).toBeUndefined()
    })
  })

  describe('getCropsByCategory', () => {
    it('filters Getreide', () => {
      const getreide = getCropsByCategory('Getreide')
      expect(getreide.length).toBeGreaterThanOrEqual(5)
      expect(getreide.every(c => c.category === 'Getreide')).toBe(true)
    })

    it('returns empty for unknown category', () => {
      expect(getCropsByCategory('Blumen')).toHaveLength(0)
    })
  })

  describe('getNutrientDemandsForCrop', () => {
    it('returns 5 nutrient demands for Winterweizen (N, P2O5, K2O, MgO, S)', () => {
      const demands = getNutrientDemandsForCrop('crop-winterweizen')
      expect(demands).toHaveLength(5)
    })

    it('has correct N demand for Winterweizen E/A (LfL Tab. 9a: 230 kg/ha)', () => {
      const demands = getNutrientDemandsForCrop('crop-winterweizen')
      const nDemand = demands.find(d => d.nutrient_type_id === 'nt-n')
      expect(nDemand).toBeDefined()
      expect(nDemand!.demand_kg_ha).toBe(230)
      expect(nDemand!.per_yield_correction).toBe(1.0)
    })

    it('has correct N demand for Wintergerste (LfL Tab. 9a: 180 kg/ha)', () => {
      const demands = getNutrientDemandsForCrop('crop-wintergerste')
      const nDemand = demands.find(d => d.nutrient_type_id === 'nt-n')
      expect(nDemand).toBeDefined()
      expect(nDemand!.demand_kg_ha).toBe(180)
    })

    it('returns empty for unknown crop', () => {
      expect(getNutrientDemandsForCrop('unknown')).toHaveLength(0)
    })
  })
})

describe('CROP_NUTRIENT_DEMANDS data integrity', () => {
  it('every demand references an existing crop', () => {
    const cropIds = new Set(CROPS.map(c => c.id))
    for (const demand of CROP_NUTRIENT_DEMANDS) {
      expect(cropIds.has(demand.crop_id), `demand ${demand.id} references unknown crop ${demand.crop_id}`).toBe(true)
    }
  })

  it('every demand has source lfl', () => {
    for (const demand of CROP_NUTRIENT_DEMANDS) {
      expect(demand.source).toBe('lfl')
    }
  })

  it('every crop has exactly 5 nutrient demands', () => {
    for (const crop of CROPS) {
      const demands = CROP_NUTRIENT_DEMANDS.filter(d => d.crop_id === crop.id)
      expect(demands, `crop ${crop.name_de} should have 5 demands`).toHaveLength(5)
    }
  })
})
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

```bash
npx vitest run src/constants/crops.test.ts
```

Expected: FAIL — Module nicht gefunden.

- [ ] **Step 3: Implementierung**

`src/constants/crops.ts`:
```typescript
import type { Crop, CropNutrientDemand } from '@/types'

// Quelle: LfL Basisdaten 2025, Tabelle 9a (N-Bedarfswerte) + Tabelle 1a (Nährstoffgehalte)
// Hinweis: Winterweizen E und A haben in Tab. 9a identische Bedarfswerte bei ref 80 dt/ha

export const CROPS: Crop[] = [
  // --- Getreide ---
  {
    id: 'crop-winterweizen',
    name_de: 'Winterweizen (E, A)',
    category: 'Getreide',
    sow_month_from: 9, sow_month_to: 11,
    harvest_month_from: 7, harvest_month_to: 8,
    ref_yield_dt_ha: 80,
    nmin_depth_cm: 90,
  },
  {
    id: 'crop-winterweizen-bc',
    name_de: 'Winterweizen (B, C)',
    category: 'Getreide',
    sow_month_from: 9, sow_month_to: 11,
    harvest_month_from: 7, harvest_month_to: 8,
    ref_yield_dt_ha: 80,
    nmin_depth_cm: 90,
  },
  {
    id: 'crop-wintergerste',
    name_de: 'Wintergerste',
    category: 'Getreide',
    sow_month_from: 9, sow_month_to: 10,
    harvest_month_from: 6, harvest_month_to: 7,
    ref_yield_dt_ha: 70,
    nmin_depth_cm: 90,
  },
  {
    id: 'crop-winterroggen',
    name_de: 'Winterroggen',
    category: 'Getreide',
    sow_month_from: 9, sow_month_to: 10,
    harvest_month_from: 7, harvest_month_to: 8,
    ref_yield_dt_ha: 60,
    nmin_depth_cm: 90,
  },
  {
    id: 'crop-wintertriticale',
    name_de: 'Wintertriticale',
    category: 'Getreide',
    sow_month_from: 9, sow_month_to: 10,
    harvest_month_from: 7, harvest_month_to: 8,
    ref_yield_dt_ha: 70,
    nmin_depth_cm: 90,
  },
  {
    id: 'crop-sommergerste',
    name_de: 'Sommergerste (Brau)',
    category: 'Getreide',
    sow_month_from: 3, sow_month_to: 4,
    harvest_month_from: 7, harvest_month_to: 8,
    ref_yield_dt_ha: 55,
    nmin_depth_cm: 60,
  },
  {
    id: 'crop-hafer',
    name_de: 'Hafer',
    category: 'Getreide',
    sow_month_from: 3, sow_month_to: 4,
    harvest_month_from: 7, harvest_month_to: 8,
    ref_yield_dt_ha: 55,
    nmin_depth_cm: 60,
  },
  {
    id: 'crop-koernermais',
    name_de: 'Körnermais',
    category: 'Getreide',
    sow_month_from: 4, sow_month_to: 5,
    harvest_month_from: 9, harvest_month_to: 10,
    ref_yield_dt_ha: 90,
    nmin_depth_cm: 60,
  },
  // --- Hackfrüchte ---
  {
    id: 'crop-kartoffeln',
    name_de: 'Kartoffeln',
    category: 'Hackfrüchte',
    sow_month_from: 3, sow_month_to: 5,
    harvest_month_from: 8, harvest_month_to: 10,
    ref_yield_dt_ha: 400,
    nmin_depth_cm: 60,
  },
  {
    id: 'crop-zuckerrueben',
    name_de: 'Zuckerrüben',
    category: 'Hackfrüchte',
    sow_month_from: 3, sow_month_to: 4,
    harvest_month_from: 9, harvest_month_to: 11,
    ref_yield_dt_ha: 650,
    nmin_depth_cm: 90,
  },
  // --- Ölfrüchte ---
  {
    id: 'crop-winterraps',
    name_de: 'Winterraps',
    category: 'Ölfrüchte',
    sow_month_from: 8, sow_month_to: 9,
    harvest_month_from: 7, harvest_month_to: 8,
    ref_yield_dt_ha: 40,
    nmin_depth_cm: 90,
  },
  {
    id: 'crop-sonnenblumen',
    name_de: 'Sonnenblumen',
    category: 'Ölfrüchte',
    sow_month_from: 4, sow_month_to: 5,
    harvest_month_from: 9, harvest_month_to: 10,
    ref_yield_dt_ha: 30,
    nmin_depth_cm: 60,
  },
  // --- Futterpflanzen ---
  {
    id: 'crop-silomais',
    name_de: 'Silomais',
    category: 'Futterpflanzen',
    sow_month_from: 4, sow_month_to: 5,
    harvest_month_from: 9, harvest_month_to: 10,
    ref_yield_dt_ha: 450,
    nmin_depth_cm: 60,
  },
  {
    id: 'crop-kleegras',
    name_de: 'Kleegras (3 Schnitte)',
    category: 'Futterpflanzen',
    sow_month_from: 3, sow_month_to: 4,
    harvest_month_from: 5, harvest_month_to: 10,
    ref_yield_dt_ha: 100,
    nmin_depth_cm: 0,
  },
]

// Quelle: LfL Basisdaten 2025
// N-Werte aus Tab. 9a (Bedarfswerte), P2O5/K2O/MgO/S aus Tab. 1a (Nährstoffgehalte in kg/dt FM)
// per_yield_correction: für alle Nährstoffe = kg pro dt Ertragsabweichung (→ siehe CropNutrientDemand Doku)

export const CROP_NUTRIENT_DEMANDS: CropNutrientDemand[] = [
  // --- Winterweizen E/A (ref: 80 dt/ha) ---
  // Tab. 9a: N-Bedarf 230 kg/ha, Korrektur 1,0 kg/dt
  { id: 'cnd-ww-n',    crop_id: 'crop-winterweizen', nutrient_type_id: 'nt-n',    demand_kg_ha: 230, ref_yield_dt_ha: 80, per_yield_correction: 1.0, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  // Tab. 1a: P2O5 0,80 kg/dt → 80×0,80 = 64
  { id: 'cnd-ww-p',    crop_id: 'crop-winterweizen', nutrient_type_id: 'nt-p2o5', demand_kg_ha: 64,  ref_yield_dt_ha: 80, per_yield_correction: 0.80, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  // Tab. 1a: K2O 0,60 kg/dt → 80×0,60 = 48 (Korn, ohne Stroh)
  { id: 'cnd-ww-k',    crop_id: 'crop-winterweizen', nutrient_type_id: 'nt-k2o',  demand_kg_ha: 48,  ref_yield_dt_ha: 80, per_yield_correction: 0.60, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  // Tab. 1a: MgO 0,16 kg/dt → 80×0,16 = 12,8
  { id: 'cnd-ww-mg',   crop_id: 'crop-winterweizen', nutrient_type_id: 'nt-mgo',  demand_kg_ha: 12.8, ref_yield_dt_ha: 80, per_yield_correction: 0.16, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  // Tab. 1a: S 0,12 kg/dt → 80×0,12 = 9,6
  { id: 'cnd-ww-s',    crop_id: 'crop-winterweizen', nutrient_type_id: 'nt-s',    demand_kg_ha: 9.6, ref_yield_dt_ha: 80, per_yield_correction: 0.12, source: 'lfl', user_id: null, valid_from: '2025-01-01' },

  // --- Winterweizen B/C (ref: 80 dt/ha) ---
  // Tab. 9a: N-Bedarf 210 kg/ha, Korrektur 1,0 kg/dt
  { id: 'cnd-wwbc-n',  crop_id: 'crop-winterweizen-bc', nutrient_type_id: 'nt-n',    demand_kg_ha: 210, ref_yield_dt_ha: 80, per_yield_correction: 1.0, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-wwbc-p',  crop_id: 'crop-winterweizen-bc', nutrient_type_id: 'nt-p2o5', demand_kg_ha: 64,  ref_yield_dt_ha: 80, per_yield_correction: 0.80, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-wwbc-k',  crop_id: 'crop-winterweizen-bc', nutrient_type_id: 'nt-k2o',  demand_kg_ha: 48,  ref_yield_dt_ha: 80, per_yield_correction: 0.60, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-wwbc-mg', crop_id: 'crop-winterweizen-bc', nutrient_type_id: 'nt-mgo',  demand_kg_ha: 12.8, ref_yield_dt_ha: 80, per_yield_correction: 0.16, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-wwbc-s',  crop_id: 'crop-winterweizen-bc', nutrient_type_id: 'nt-s',    demand_kg_ha: 9.6, ref_yield_dt_ha: 80, per_yield_correction: 0.12, source: 'lfl', user_id: null, valid_from: '2025-01-01' },

  // --- Wintergerste (ref: 70 dt/ha) ---
  // Tab. 9a: N-Bedarf 180 kg/ha, Korrektur 1,0 kg/dt
  { id: 'cnd-wg-n',    crop_id: 'crop-wintergerste', nutrient_type_id: 'nt-n',    demand_kg_ha: 180, ref_yield_dt_ha: 70, per_yield_correction: 1.0, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-wg-p',    crop_id: 'crop-wintergerste', nutrient_type_id: 'nt-p2o5', demand_kg_ha: 56,  ref_yield_dt_ha: 70, per_yield_correction: 0.80, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-wg-k',    crop_id: 'crop-wintergerste', nutrient_type_id: 'nt-k2o',  demand_kg_ha: 42,  ref_yield_dt_ha: 70, per_yield_correction: 0.60, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-wg-mg',   crop_id: 'crop-wintergerste', nutrient_type_id: 'nt-mgo',  demand_kg_ha: 10.5, ref_yield_dt_ha: 70, per_yield_correction: 0.15, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-wg-s',    crop_id: 'crop-wintergerste', nutrient_type_id: 'nt-s',    demand_kg_ha: 7.0, ref_yield_dt_ha: 70, per_yield_correction: 0.10, source: 'lfl', user_id: null, valid_from: '2025-01-01' },

  // --- Winterroggen (ref: 60 dt/ha) ---
  { id: 'cnd-wr-n',    crop_id: 'crop-winterroggen', nutrient_type_id: 'nt-n',    demand_kg_ha: 170, ref_yield_dt_ha: 60, per_yield_correction: 1.0, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-wr-p',    crop_id: 'crop-winterroggen', nutrient_type_id: 'nt-p2o5', demand_kg_ha: 48,  ref_yield_dt_ha: 60, per_yield_correction: 0.80, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-wr-k',    crop_id: 'crop-winterroggen', nutrient_type_id: 'nt-k2o',  demand_kg_ha: 36,  ref_yield_dt_ha: 60, per_yield_correction: 0.60, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-wr-mg',   crop_id: 'crop-winterroggen', nutrient_type_id: 'nt-mgo',  demand_kg_ha: 7.8, ref_yield_dt_ha: 60, per_yield_correction: 0.13, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-wr-s',    crop_id: 'crop-winterroggen', nutrient_type_id: 'nt-s',    demand_kg_ha: 6.0, ref_yield_dt_ha: 60, per_yield_correction: 0.10, source: 'lfl', user_id: null, valid_from: '2025-01-01' },

  // --- Wintertriticale (ref: 70 dt/ha) ---
  { id: 'cnd-wt-n',    crop_id: 'crop-wintertriticale', nutrient_type_id: 'nt-n',    demand_kg_ha: 190, ref_yield_dt_ha: 70, per_yield_correction: 1.0, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-wt-p',    crop_id: 'crop-wintertriticale', nutrient_type_id: 'nt-p2o5', demand_kg_ha: 56,  ref_yield_dt_ha: 70, per_yield_correction: 0.80, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-wt-k',    crop_id: 'crop-wintertriticale', nutrient_type_id: 'nt-k2o',  demand_kg_ha: 42,  ref_yield_dt_ha: 70, per_yield_correction: 0.60, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-wt-mg',   crop_id: 'crop-wintertriticale', nutrient_type_id: 'nt-mgo',  demand_kg_ha: 9.1, ref_yield_dt_ha: 70, per_yield_correction: 0.13, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-wt-s',    crop_id: 'crop-wintertriticale', nutrient_type_id: 'nt-s',    demand_kg_ha: 7.0, ref_yield_dt_ha: 70, per_yield_correction: 0.10, source: 'lfl', user_id: null, valid_from: '2025-01-01' },

  // --- Sommergerste Brau (ref: 55 dt/ha) ---
  { id: 'cnd-sg-n',    crop_id: 'crop-sommergerste', nutrient_type_id: 'nt-n',    demand_kg_ha: 140, ref_yield_dt_ha: 55, per_yield_correction: 1.0, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-sg-p',    crop_id: 'crop-sommergerste', nutrient_type_id: 'nt-p2o5', demand_kg_ha: 44,  ref_yield_dt_ha: 55, per_yield_correction: 0.80, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-sg-k',    crop_id: 'crop-sommergerste', nutrient_type_id: 'nt-k2o',  demand_kg_ha: 33,  ref_yield_dt_ha: 55, per_yield_correction: 0.60, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-sg-mg',   crop_id: 'crop-sommergerste', nutrient_type_id: 'nt-mgo',  demand_kg_ha: 7.7, ref_yield_dt_ha: 55, per_yield_correction: 0.14, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-sg-s',    crop_id: 'crop-sommergerste', nutrient_type_id: 'nt-s',    demand_kg_ha: 5.5, ref_yield_dt_ha: 55, per_yield_correction: 0.10, source: 'lfl', user_id: null, valid_from: '2025-01-01' },

  // --- Hafer (ref: 55 dt/ha) ---
  { id: 'cnd-ha-n',    crop_id: 'crop-hafer', nutrient_type_id: 'nt-n',    demand_kg_ha: 130, ref_yield_dt_ha: 55, per_yield_correction: 1.0, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-ha-p',    crop_id: 'crop-hafer', nutrient_type_id: 'nt-p2o5', demand_kg_ha: 44,  ref_yield_dt_ha: 55, per_yield_correction: 0.80, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-ha-k',    crop_id: 'crop-hafer', nutrient_type_id: 'nt-k2o',  demand_kg_ha: 33,  ref_yield_dt_ha: 55, per_yield_correction: 0.60, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-ha-mg',   crop_id: 'crop-hafer', nutrient_type_id: 'nt-mgo',  demand_kg_ha: 7.7, ref_yield_dt_ha: 55, per_yield_correction: 0.14, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-ha-s',    crop_id: 'crop-hafer', nutrient_type_id: 'nt-s',    demand_kg_ha: 5.5, ref_yield_dt_ha: 55, per_yield_correction: 0.10, source: 'lfl', user_id: null, valid_from: '2025-01-01' },

  // --- Körnermais (ref: 90 dt/ha) ---
  { id: 'cnd-km-n',    crop_id: 'crop-koernermais', nutrient_type_id: 'nt-n',    demand_kg_ha: 200, ref_yield_dt_ha: 90, per_yield_correction: 1.0, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-km-p',    crop_id: 'crop-koernermais', nutrient_type_id: 'nt-p2o5', demand_kg_ha: 72,  ref_yield_dt_ha: 90, per_yield_correction: 0.80, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-km-k',    crop_id: 'crop-koernermais', nutrient_type_id: 'nt-k2o',  demand_kg_ha: 54,  ref_yield_dt_ha: 90, per_yield_correction: 0.60, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-km-mg',   crop_id: 'crop-koernermais', nutrient_type_id: 'nt-mgo',  demand_kg_ha: 16.2, ref_yield_dt_ha: 90, per_yield_correction: 0.18, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-km-s',    crop_id: 'crop-koernermais', nutrient_type_id: 'nt-s',    demand_kg_ha: 9.0, ref_yield_dt_ha: 90, per_yield_correction: 0.10, source: 'lfl', user_id: null, valid_from: '2025-01-01' },

  // --- Kartoffeln (ref: 400 dt/ha) ---
  { id: 'cnd-ka-n',    crop_id: 'crop-kartoffeln', nutrient_type_id: 'nt-n',    demand_kg_ha: 180, ref_yield_dt_ha: 400, per_yield_correction: 0.2, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-ka-p',    crop_id: 'crop-kartoffeln', nutrient_type_id: 'nt-p2o5', demand_kg_ha: 60,  ref_yield_dt_ha: 400, per_yield_correction: 0.15, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-ka-k',    crop_id: 'crop-kartoffeln', nutrient_type_id: 'nt-k2o',  demand_kg_ha: 200, ref_yield_dt_ha: 400, per_yield_correction: 0.50, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-ka-mg',   crop_id: 'crop-kartoffeln', nutrient_type_id: 'nt-mgo',  demand_kg_ha: 24,  ref_yield_dt_ha: 400, per_yield_correction: 0.06, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-ka-s',    crop_id: 'crop-kartoffeln', nutrient_type_id: 'nt-s',    demand_kg_ha: 16,  ref_yield_dt_ha: 400, per_yield_correction: 0.04, source: 'lfl', user_id: null, valid_from: '2025-01-01' },

  // --- Zuckerrüben (ref: 650 dt/ha) ---
  { id: 'cnd-zr-n',    crop_id: 'crop-zuckerrueben', nutrient_type_id: 'nt-n',    demand_kg_ha: 170, ref_yield_dt_ha: 650, per_yield_correction: 0.1, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-zr-p',    crop_id: 'crop-zuckerrueben', nutrient_type_id: 'nt-p2o5', demand_kg_ha: 78,  ref_yield_dt_ha: 650, per_yield_correction: 0.12, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-zr-k',    crop_id: 'crop-zuckerrueben', nutrient_type_id: 'nt-k2o',  demand_kg_ha: 260, ref_yield_dt_ha: 650, per_yield_correction: 0.40, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-zr-mg',   crop_id: 'crop-zuckerrueben', nutrient_type_id: 'nt-mgo',  demand_kg_ha: 39,  ref_yield_dt_ha: 650, per_yield_correction: 0.06, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-zr-s',    crop_id: 'crop-zuckerrueben', nutrient_type_id: 'nt-s',    demand_kg_ha: 19.5, ref_yield_dt_ha: 650, per_yield_correction: 0.03, source: 'lfl', user_id: null, valid_from: '2025-01-01' },

  // --- Winterraps (ref: 40 dt/ha) ---
  { id: 'cnd-rap-n',   crop_id: 'crop-winterraps', nutrient_type_id: 'nt-n',    demand_kg_ha: 200, ref_yield_dt_ha: 40, per_yield_correction: 1.5, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-rap-p',   crop_id: 'crop-winterraps', nutrient_type_id: 'nt-p2o5', demand_kg_ha: 48,  ref_yield_dt_ha: 40, per_yield_correction: 1.20, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-rap-k',   crop_id: 'crop-winterraps', nutrient_type_id: 'nt-k2o',  demand_kg_ha: 40,  ref_yield_dt_ha: 40, per_yield_correction: 1.00, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-rap-mg',  crop_id: 'crop-winterraps', nutrient_type_id: 'nt-mgo',  demand_kg_ha: 8.0, ref_yield_dt_ha: 40, per_yield_correction: 0.20, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-rap-s',   crop_id: 'crop-winterraps', nutrient_type_id: 'nt-s',    demand_kg_ha: 16,  ref_yield_dt_ha: 40, per_yield_correction: 0.40, source: 'lfl', user_id: null, valid_from: '2025-01-01' },

  // --- Sonnenblumen (ref: 30 dt/ha) ---
  { id: 'cnd-sb-n',    crop_id: 'crop-sonnenblumen', nutrient_type_id: 'nt-n',    demand_kg_ha: 120, ref_yield_dt_ha: 30, per_yield_correction: 1.5, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-sb-p',    crop_id: 'crop-sonnenblumen', nutrient_type_id: 'nt-p2o5', demand_kg_ha: 36,  ref_yield_dt_ha: 30, per_yield_correction: 1.20, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-sb-k',    crop_id: 'crop-sonnenblumen', nutrient_type_id: 'nt-k2o',  demand_kg_ha: 90,  ref_yield_dt_ha: 30, per_yield_correction: 3.00, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-sb-mg',   crop_id: 'crop-sonnenblumen', nutrient_type_id: 'nt-mgo',  demand_kg_ha: 9.0, ref_yield_dt_ha: 30, per_yield_correction: 0.30, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-sb-s',    crop_id: 'crop-sonnenblumen', nutrient_type_id: 'nt-s',    demand_kg_ha: 6.0, ref_yield_dt_ha: 30, per_yield_correction: 0.20, source: 'lfl', user_id: null, valid_from: '2025-01-01' },

  // --- Silomais (ref: 450 dt/ha) ---
  { id: 'cnd-sm-n',    crop_id: 'crop-silomais', nutrient_type_id: 'nt-n',    demand_kg_ha: 200, ref_yield_dt_ha: 450, per_yield_correction: 0.3, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-sm-p',    crop_id: 'crop-silomais', nutrient_type_id: 'nt-p2o5', demand_kg_ha: 81,  ref_yield_dt_ha: 450, per_yield_correction: 0.18, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-sm-k',    crop_id: 'crop-silomais', nutrient_type_id: 'nt-k2o',  demand_kg_ha: 225, ref_yield_dt_ha: 450, per_yield_correction: 0.50, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-sm-mg',   crop_id: 'crop-silomais', nutrient_type_id: 'nt-mgo',  demand_kg_ha: 31.5, ref_yield_dt_ha: 450, per_yield_correction: 0.07, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-sm-s',    crop_id: 'crop-silomais', nutrient_type_id: 'nt-s',    demand_kg_ha: 18,  ref_yield_dt_ha: 450, per_yield_correction: 0.04, source: 'lfl', user_id: null, valid_from: '2025-01-01' },

  // --- Kleegras 3 Schnitte (ref: 100 dt/ha TM) ---
  // N-Bedarf = 0 (Leguminose, N-Fixierung)
  { id: 'cnd-kg-n',    crop_id: 'crop-kleegras', nutrient_type_id: 'nt-n',    demand_kg_ha: 0,   ref_yield_dt_ha: 100, per_yield_correction: 0, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-kg-p',    crop_id: 'crop-kleegras', nutrient_type_id: 'nt-p2o5', demand_kg_ha: 70,  ref_yield_dt_ha: 100, per_yield_correction: 0.70, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-kg-k',    crop_id: 'crop-kleegras', nutrient_type_id: 'nt-k2o',  demand_kg_ha: 250, ref_yield_dt_ha: 100, per_yield_correction: 2.50, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-kg-mg',   crop_id: 'crop-kleegras', nutrient_type_id: 'nt-mgo',  demand_kg_ha: 20,  ref_yield_dt_ha: 100, per_yield_correction: 0.20, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-kg-s',    crop_id: 'crop-kleegras', nutrient_type_id: 'nt-s',    demand_kg_ha: 8,   ref_yield_dt_ha: 100, per_yield_correction: 0.08, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
]

export function getCropById(id: string): Crop | undefined {
  return CROPS.find(c => c.id === id)
}

export function getCropsByCategory(category: string): Crop[] {
  return CROPS.filter(c => c.category === category)
}

export function getNutrientDemandsForCrop(cropId: string): CropNutrientDemand[] {
  return CROP_NUTRIENT_DEMANDS.filter(d => d.crop_id === cropId)
}
```

- [ ] **Step 4: Test ausführen — muss grün sein**

```bash
npx vitest run src/constants/crops.test.ts
```

Expected: PASS (alle Tests)

- [ ] **Step 5: Commit**

```bash
git add src/constants/crops.ts src/constants/crops.test.ts
git commit -m "feat: add LfL crop data and nutrient demands (Tab. 9a + 1a) with tests (TDD)"
```

---

### Task 6: Initiale Düngerprodukte mit Affiliate-Links

**Files:**
- Create: `src/constants/fertilizer-products.ts`

- [ ] **Step 1: Beispielprodukte anlegen**

`src/constants/fertilizer-products.ts`:
```typescript
import type { FertilizerProduct } from '@/types'

// Initiale Düngerprodukte — werden später in Supabase Admin-pflegbar
// Affiliate-Links: Dünger-Shop.de via adseed GmbH (15% Commission, 90 Tage Cookie)

export const FERTILIZER_PRODUCTS: FertilizerProduct[] = [
  {
    id: 'fp-kas',
    name: 'Kalkammonsalpeter (KAS) 27% N',
    n_pct: 27, p2o5_pct: 0, k2o_pct: 0, mgo_pct: 4, s_pct: 0,
    form: 'mineral',
    affiliate_url: '',  // TODO: Affiliate-Link nach Freischaltung eintragen
    shop_name: 'Dünger-Shop.de',
    active: true,
  },
  {
    id: 'fp-harnstoff',
    name: 'Harnstoff 46% N',
    n_pct: 46, p2o5_pct: 0, k2o_pct: 0, mgo_pct: 0, s_pct: 0,
    form: 'mineral',
    affiliate_url: '',
    shop_name: 'Dünger-Shop.de',
    active: true,
  },
  {
    id: 'fp-dap',
    name: 'DAP 18/46',
    n_pct: 18, p2o5_pct: 46, k2o_pct: 0, mgo_pct: 0, s_pct: 0,
    form: 'mineral',
    affiliate_url: '',
    shop_name: 'Dünger-Shop.de',
    active: true,
  },
  {
    id: 'fp-triplephosphat',
    name: 'Triple-Superphosphat 46% P2O5',
    n_pct: 0, p2o5_pct: 46, k2o_pct: 0, mgo_pct: 0, s_pct: 0,
    form: 'mineral',
    affiliate_url: '',
    shop_name: 'Dünger-Shop.de',
    active: true,
  },
  {
    id: 'fp-kornkali',
    name: 'Kornkali 40% K2O + 6% MgO',
    n_pct: 0, p2o5_pct: 0, k2o_pct: 40, mgo_pct: 6, s_pct: 4,
    form: 'mineral',
    affiliate_url: '',
    shop_name: 'Dünger-Shop.de',
    active: true,
  },
  {
    id: 'fp-npk-15-15-15',
    name: 'NPK 15-15-15',
    n_pct: 15, p2o5_pct: 15, k2o_pct: 15, mgo_pct: 2, s_pct: 8,
    form: 'mineral',
    affiliate_url: '',
    shop_name: 'Dünger-Shop.de',
    active: true,
  },
  {
    id: 'fp-ass',
    name: 'Ammonsulfatsalpeter (ASS) 26% N + 13% S',
    n_pct: 26, p2o5_pct: 0, k2o_pct: 0, mgo_pct: 0, s_pct: 13,
    form: 'mineral',
    affiliate_url: '',
    shop_name: 'Dünger-Shop.de',
    active: true,
  },
  {
    id: 'fp-kieserit',
    name: 'Kieserit 25% MgO + 20% S',
    n_pct: 0, p2o5_pct: 0, k2o_pct: 0, mgo_pct: 25, s_pct: 20,
    form: 'mineral',
    affiliate_url: '',
    shop_name: 'Dünger-Shop.de',
    active: true,
  },
]
```

- [ ] **Step 2: Commit**

```bash
git add src/constants/fertilizer-products.ts
git commit -m "feat: add initial fertilizer products with affiliate placeholders"
```

---

### Task 7: ARC42 Grundstruktur anlegen

**Files:**
- Create: `docs/arc42/01-introduction.md`, `docs/arc42/03-context.md`, `docs/arc42/05-building-blocks.md`, `docs/arc42/06-runtime.md`, `docs/arc42/08-concepts.md`, `docs/arc42/09-decisions/ADR-001-supabase-backend.md`, `docs/arc42/09-decisions/ADR-002-dexie-offline-cache.md`, `docs/arc42/09-decisions/ADR-003-single-calculation-composable.md`

- [ ] **Step 1: 01-introduction.md**

`docs/arc42/01-introduction.md`:
```markdown
# 1. Einführung und Ziele

## Aufgabenstellung
Interaktive PWA für professionelle Landwirte zur Düngeplanung auf Basis der LfL-Basisdaten Bayern.

## Qualitätsziele
| Priorität | Qualitätsziel | Beschreibung |
|---|---|---|
| 1 | Offline-Fähigkeit | Berechnungen funktionieren ohne Internetverbindung |
| 2 | Korrektheit | Nährstoffberechnung exakt nach LfL-Basisdaten |
| 3 | Einfache Bedienung | Landwirt erreicht Empfehlung in max. 4 Klicks |

## Stakeholder
| Rolle | Erwartung |
|---|---|
| Landwirt | Schnelle, korrekte Düngeempfehlung, offline nutzbar |
| Admin | Stammdaten (Kulturen, Nährstoffe, Produkte) pflegen |
| Betreiber | Affiliate-Einnahmen durch Produktempfehlungen |
```

- [ ] **Step 2: 03-context.md**

`docs/arc42/03-context.md`:
```markdown
# 3. Kontextabgrenzung

## Fachlicher Kontext

Landwirt ──→ [Düngungsberater PWA] ──→ Düngeempfehlung

Externe Systeme:
- Supabase (Auth, DB) — Backend für Persistenz und Authentifizierung
- Dünger-Shop.de (Affiliate) — Produktempfehlungen mit Affiliate-Links
- myAGRAR (Affiliate, geplant) — Zweiter Affiliate-Partner

## Technischer Kontext

| Schnittstelle | Technologie | Beschreibung |
|---|---|---|
| Supabase Auth | REST/JWT | Login, Registrierung |
| Supabase DB | REST (PostgREST) | CRUD für alle Entitäten |
| IndexedDB | Dexie.js | Offline-Cache für Stamm- und Plandaten |
| Affiliate-Links | HTTP-Redirect | Dünger-Shop.de, myAGRAR |
```

- [ ] **Step 3: 05-building-blocks.md**

`docs/arc42/05-building-blocks.md`:
```markdown
# 5. Bausteinsicht

## Ebene 1: Gesamtsystem

| Baustein | Verantwortung |
|---|---|
| Views (Route-Level) | Koordination von Composables und Components pro Screen |
| Components | Rein visuelle Darstellung, empfangen Props, emittieren Events |
| Composables | Business-Logik (Berechnung, Formatierung, Offline-Cache) |
| Services | Alle Supabase-API-Aufrufe, kein direkter DB-Zugriff außerhalb |
| Stores (Pinia) | Globaler State: Auth, Offline-Status |
| Constants | LfL-Referenzdaten, App-Konstanten |
| DB (Dexie) | IndexedDB-Schema für Offline-Cache |

## Ebene 2: Berechnungslogik

`useNutrientCalculation` ist das zentrale Composable — es berechnet den Nährstoffbedarf für alle Nährstoffe nach einer einheitlichen Formel. Wird identisch für Online- und Offline-Betrieb verwendet.

`useRecommendation` orchestriert: Berechnung → Produkt-Matching → Mengenberechnung pro Produkt.
```

- [ ] **Step 4: 06-runtime.md**

`docs/arc42/06-runtime.md`:
```markdown
# 6. Laufzeitsicht

## Szenario 1: Landwirt berechnet Empfehlung (online)

1. Landwirt wählt Feld → Anbauplanung → Kultur + Ertrag
2. `useNutrientCalculation` berechnet Bedarf aus gecachten Stammdaten
3. `useRecommendation` matched Produkte und berechnet Mengen
4. Ergebnis wird angezeigt und via `recommendation.service` in Supabase gespeichert

## Szenario 2: Offline-Berechnung

1. Gleicher Flow wie online, aber Stammdaten kommen aus Dexie (IndexedDB)
2. Ergebnis wird in Dexie mit `synced: false` gespeichert
3. Beim nächsten `online`-Event: `sync.service` sendet gepufferte Daten an Supabase

## Szenario 3: Login und Daten-Cache

1. User loggt sich ein (Supabase Auth)
2. App lädt Stammdaten (Kulturen, Nährstoffe, Produkte) von Supabase
3. Stammdaten werden in Dexie gecacht
4. Ab jetzt sind Berechnungen auch offline möglich
```

- [ ] **Step 5: 08-concepts.md**

`docs/arc42/08-concepts.md`:
```markdown
# 8. Querschnittliche Konzepte

## Offline-Strategie

- Stammdaten (Kulturen, Nährstoffe, Produkte) werden beim Login in IndexedDB (Dexie.js) gecacht
- Offline erstellte Pläne und Berechnungen werden mit `synced: false` gepuffert
- Sync beim App-Start und bei Verbindungswiederherstellung (`online`-Event)
- Service Worker (vite-plugin-pwa) cached App-Shell und Assets

## Berechnungslogik

Einheitliche Formel für alle Nährstoffe:
```
empfehlung = demand_kg_ha + (expected_yield - ref_yield) × per_yield_correction
```

Für N: demand_kg_ha = Bedarfswert aus Tab. 9a
Für P2O5/K2O/MgO/S: demand_kg_ha = Nährstoffgehalt (Tab. 1a) × Referenzertrag

## Zahlenformate

Alle Zahlen im deutschen Format (Komma als Dezimaltrennzeichen, Punkt als Tausendertrennzeichen). Einheiten werden immer angezeigt.

## Auth-Konzept

Supabase Auth mit Row Level Security (RLS). Landwirte sehen nur eigene Daten. Admin-Rolle für Stammdatenpflege.
```

- [ ] **Step 6: ADR-001-supabase-backend.md**

`docs/arc42/09-decisions/ADR-001-supabase-backend.md`:
```markdown
# ADR-001: Supabase als Backend

**Status:** Accepted
**Datum:** 2026-03-11

**Kontext:** Die App braucht Auth, eine relationale DB und eine REST-API. Ein eigener Backend-Server würde Hosting-Kosten und Wartungsaufwand verursachen.

**Entscheidung:** Supabase wird als Backend-as-a-Service eingesetzt (Auth + PostgreSQL + PostgREST + Row Level Security).

**Konsequenzen:**
- Kein eigener Server nötig → geringere Betriebskosten
- RLS erzwingt Datensicherheit auf DB-Ebene
- Vendor Lock-in auf Supabase (mitigiert durch PostgreSQL-Standard und Open-Source-Natur)
- Alle DB-Aufrufe laufen über `src/services/` — kein direkter Supabase-Zugriff in Komponenten
```

- [ ] **Step 7: ADR-002-dexie-offline-cache.md**

`docs/arc42/09-decisions/ADR-002-dexie-offline-cache.md`:
```markdown
# ADR-002: Dexie.js für IndexedDB-Offline-Cache

**Status:** Accepted
**Datum:** 2026-03-11

**Kontext:** PWA muss Berechnungen offline ermöglichen. Stammdaten und Pläne müssen lokal gespeichert werden. localStorage ist auf 5-10 MB begrenzt und hat keine Abfrage-Möglichkeiten.

**Entscheidung:** Dexie.js als IndexedDB-Wrapper für den Offline-Cache.

**Konsequenzen:**
- Kein Storage-Limit-Problem (IndexedDB hat deutlich mehr Platz)
- Abfragen möglich (z.B. alle Demands für eine Kultur)
- Dexie abstrahiert die komplexe IndexedDB-API
- Schema-Migrationen über Dexie-Versioning
```

- [ ] **Step 8: ADR-003-single-calculation-composable.md**

`docs/arc42/09-decisions/ADR-003-single-calculation-composable.md`:
```markdown
# ADR-003: Einzelnes Composable für Berechnungslogik

**Status:** Accepted
**Datum:** 2026-03-11

**Kontext:** Die Nährstoffberechnung könnte in mehrere Composables aufgeteilt werden (je Nährstoff) oder in einem zentralen Composable gebündelt werden.

**Entscheidung:** `useNutrientCalculation` ist das einzige Composable für alle Nährstoffberechnungen. Die Formel ist für alle Nährstoffe identisch, nur die Eingabewerte unterscheiden sich.

**Konsequenzen:**
- Eine Stelle für die Berechnungslogik → leichter zu testen und zu warten
- Keine Duplikation der Berechnungsformel
- Dieselbe Logik wird für Online und Offline verwendet
- Bei Erweiterung (Stufe 2/3: Korrekturfaktoren, Nmin) wird nur dieses Composable erweitert
```

- [ ] **Step 9: Commit**

```bash
git add docs/arc42/
git commit -m "docs: add ARC42 architecture documentation (introduction, context, building blocks, runtime, concepts, ADRs 001-003)"
```

---

## Chunk 2: Supabase-Schema, Services, Dexie-Offline-Cache

Dieses Chunk richtet das Backend ein (Supabase-Schema mit RLS), erstellt alle Service-Module für Datenzugriff, den Dexie-Offline-Cache und die Sync-Logik. Am Ende können Daten über Services gelesen/geschrieben werden, und Stammdaten sind offline verfügbar.

### Task 8: Supabase-Client initialisieren

**Files:**
- Create: `src/services/supabase.ts`

- [ ] **Step 1: Supabase-Client anlegen**

`src/services/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Copy .env.example to .env and fill in your values.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 2: Commit**

```bash
git add src/services/supabase.ts
git commit -m "feat: add Supabase client initialization"
```

---

### Task 9: Supabase-Datenbankschema (SQL-Migration)

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

Dieses SQL wird im Supabase Dashboard unter SQL Editor ausgeführt oder über die Supabase CLI migriert. Es legt alle Tabellen mit RLS-Policies an.

- [ ] **Step 1: SQL-Migration schreiben**

`supabase/migrations/001_initial_schema.sql`:
```sql
-- ============================================================
-- Düngungsberater MVP — Initiales Datenbankschema
-- ============================================================

-- Admin-Rolle für Stammdatenpflege
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT coalesce(
    (current_setting('request.jwt.claims', true)::json->>'role') = 'admin',
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- Stammdaten (Admin-pflegbar)
-- ============================================================

CREATE TABLE public.nutrient_types (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code text NOT NULL UNIQUE,
  label_de text NOT NULL,
  unit text NOT NULL DEFAULT 'kg/ha',
  sort_order integer NOT NULL DEFAULT 0,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nutrient_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nutrient_types_read" ON public.nutrient_types FOR SELECT USING (true);
CREATE POLICY "nutrient_types_admin" ON public.nutrient_types FOR ALL USING (public.is_admin());

CREATE TABLE public.crops (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name_de text NOT NULL,
  category text NOT NULL,
  sow_month_from integer NOT NULL CHECK (sow_month_from BETWEEN 1 AND 12),
  sow_month_to integer NOT NULL CHECK (sow_month_to BETWEEN 1 AND 12),
  harvest_month_from integer NOT NULL CHECK (harvest_month_from BETWEEN 1 AND 12),
  harvest_month_to integer NOT NULL CHECK (harvest_month_to BETWEEN 1 AND 12),
  ref_yield_dt_ha numeric NOT NULL CHECK (ref_yield_dt_ha > 0),
  nmin_depth_cm integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crops_read" ON public.crops FOR SELECT USING (true);
CREATE POLICY "crops_admin" ON public.crops FOR ALL USING (public.is_admin());

CREATE TABLE public.crop_nutrient_demands (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  crop_id text NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
  nutrient_type_id text NOT NULL REFERENCES public.nutrient_types(id) ON DELETE CASCADE,
  demand_kg_ha numeric NOT NULL,
  ref_yield_dt_ha numeric NOT NULL,
  per_yield_correction numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'lfl',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (crop_id, nutrient_type_id, source, user_id)
);

ALTER TABLE public.crop_nutrient_demands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cnd_read" ON public.crop_nutrient_demands FOR SELECT USING (true);
CREATE POLICY "cnd_admin" ON public.crop_nutrient_demands FOR ALL USING (public.is_admin());
CREATE POLICY "cnd_user_own" ON public.crop_nutrient_demands
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND source = 'user');

CREATE TABLE public.n_corrections (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type text NOT NULL CHECK (type IN ('vorfrucht', 'zwischenfrucht', 'humus')),
  label_de text NOT NULL,
  correction_kg_n numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.n_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "n_corrections_read" ON public.n_corrections FOR SELECT USING (true);
CREATE POLICY "n_corrections_admin" ON public.n_corrections FOR ALL USING (public.is_admin());

CREATE TABLE public.fertilizer_products (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  n_pct numeric NOT NULL DEFAULT 0,
  p2o5_pct numeric NOT NULL DEFAULT 0,
  k2o_pct numeric NOT NULL DEFAULT 0,
  mgo_pct numeric NOT NULL DEFAULT 0,
  s_pct numeric NOT NULL DEFAULT 0,
  form text NOT NULL DEFAULT 'mineral' CHECK (form IN ('mineral', 'organic')),
  affiliate_url text NOT NULL DEFAULT '',
  shop_name text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fertilizer_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_read" ON public.fertilizer_products FOR SELECT USING (active = true);
CREATE POLICY "products_admin" ON public.fertilizer_products FOR ALL USING (public.is_admin());

-- Many-to-many: Produkte ↔ Kulturen (Spec: "many-to-many zu crops")
CREATE TABLE public.crop_fertilizer_products (
  crop_id text NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.fertilizer_products(id) ON DELETE CASCADE,
  PRIMARY KEY (crop_id, product_id)
);

ALTER TABLE public.crop_fertilizer_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cfp_read" ON public.crop_fertilizer_products FOR SELECT USING (true);
CREATE POLICY "cfp_admin" ON public.crop_fertilizer_products FOR ALL USING (public.is_admin());

-- ============================================================
-- Landwirt-Daten (RLS: nur eigene Daten)
-- ============================================================

CREATE TABLE public.fields (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  size_ha numeric NOT NULL CHECK (size_ha > 0),
  synced boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fields_own" ON public.fields
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.field_crop_plans (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  field_id text NOT NULL REFERENCES public.fields(id) ON DELETE CASCADE,
  crop_id text NOT NULL REFERENCES public.crops(id),
  season_year integer NOT NULL CHECK (season_year >= 2020 AND season_year <= 2100),
  expected_yield_dt_ha numeric NOT NULL CHECK (expected_yield_dt_ha > 0),
  synced boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.field_crop_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_own" ON public.field_crop_plans
  FOR ALL USING (
    field_id IN (SELECT id FROM public.fields WHERE user_id = auth.uid())
  )
  WITH CHECK (
    field_id IN (SELECT id FROM public.fields WHERE user_id = auth.uid())
  );

CREATE TABLE public.recommendations (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  field_crop_plan_id text NOT NULL REFERENCES public.field_crop_plans(id) ON DELETE CASCADE,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  calculated_offline boolean NOT NULL DEFAULT false
);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recommendations_own" ON public.recommendations
  FOR ALL USING (
    field_crop_plan_id IN (
      SELECT fcp.id FROM public.field_crop_plans fcp
      JOIN public.fields f ON f.id = fcp.field_id
      WHERE f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    field_crop_plan_id IN (
      SELECT fcp.id FROM public.field_crop_plans fcp
      JOIN public.fields f ON f.id = fcp.field_id
      WHERE f.user_id = auth.uid()
    )
  );

CREATE TABLE public.recommendation_values (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  recommendation_id text NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  nutrient_type_id text NOT NULL REFERENCES public.nutrient_types(id),
  value_kg_ha numeric NOT NULL,
  value_kg_total numeric NOT NULL,
  source_used text NOT NULL DEFAULT 'lfl' CHECK (source_used IN ('lfl', 'user'))
);

ALTER TABLE public.recommendation_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rec_values_own" ON public.recommendation_values
  FOR ALL USING (
    recommendation_id IN (
      SELECT r.id FROM public.recommendations r
      JOIN public.field_crop_plans fcp ON fcp.id = r.field_crop_plan_id
      JOIN public.fields f ON f.id = fcp.field_id
      WHERE f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    recommendation_id IN (
      SELECT r.id FROM public.recommendations r
      JOIN public.field_crop_plans fcp ON fcp.id = r.field_crop_plan_id
      JOIN public.fields f ON f.id = fcp.field_id
      WHERE f.user_id = auth.uid()
    )
  );

-- ============================================================
-- updated_at Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fields_updated_at
  BEFORE UPDATE ON public.fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER field_crop_plans_updated_at
  BEFORE UPDATE ON public.field_crop_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 2: Schema im Supabase Dashboard ausführen**

Im Supabase SQL Editor das gesamte SQL ausführen. Verifizieren:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
```

Expected: 10 Tabellen (crop_fertilizer_products, crop_nutrient_demands, crops, fertilizer_products, field_crop_plans, fields, n_corrections, nutrient_types, recommendation_values, recommendations).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "feat: add Supabase database schema with RLS policies"
```

---

### Task 10: Dexie-Offline-Cache (IndexedDB)

**Files:**
- Create: `src/db/dexie.ts`

- [ ] **Step 1: Dexie-Datenbank definieren**

`src/db/dexie.ts`:
```typescript
import Dexie, { type Table } from 'dexie'
import type {
  NutrientType,
  Crop,
  CropNutrientDemand,
  NCorrection,
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
  nCorrections!: Table<NCorrection, string>
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
  }
}

export const db = new DuengerDB()
```

- [ ] **Step 2: Commit**

```bash
git add src/db/dexie.ts
git commit -m "feat: add Dexie IndexedDB schema for offline cache"
```

---

### Task 11: Auth-Service

**Files:**
- Create: `src/services/auth.service.ts`

- [ ] **Step 1: Auth-Service implementieren**

`src/services/auth.service.ts`:
```typescript
import { supabase } from './supabase'

export interface AuthResult {
  success: boolean
  error?: string
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

export function onAuthStateChange(callback: (userId: string | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user?.id ?? null)
  })
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export async function getCurrentUserEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.email ?? null
}

export async function isAdmin(): Promise<boolean> {
  const { data } = await supabase.auth.getUser()
  return data.user?.app_metadata?.role === 'admin'
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/auth.service.ts
git commit -m "feat: add auth service (sign up, sign in, sign out, admin check)"
```

---

### Task 12: Auth-Store (Pinia)

**Files:**
- Create: `src/stores/auth.store.ts`

- [ ] **Step 1: Auth-Store implementieren**

`src/stores/auth.store.ts`:
```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authService from '@/services/auth.service'

export const useAuthStore = defineStore('auth', () => {
  const userId = ref<string | null>(null)
  const userEmail = ref<string | null>(null)
  const isAdminUser = ref(false)
  const loading = ref(true)

  const isAuthenticated = computed(() => userId.value !== null)

  async function init() {
    loading.value = true
    userId.value = await authService.getCurrentUserId()
    if (userId.value) {
      userEmail.value = await authService.getCurrentUserEmail()
      isAdminUser.value = await authService.isAdmin()
    }
    loading.value = false

    authService.onAuthStateChange(async (id) => {
      userId.value = id
      if (id) {
        userEmail.value = await authService.getCurrentUserEmail()
        isAdminUser.value = await authService.isAdmin()
      } else {
        userEmail.value = null
        isAdminUser.value = false
      }
    })
  }

  async function login(email: string, password: string) {
    return authService.signIn(email, password)
  }

  async function register(email: string, password: string) {
    return authService.signUp(email, password)
  }

  async function logout() {
    await authService.signOut()
    userId.value = null
    userEmail.value = null
    isAdminUser.value = false
  }

  return { userId, userEmail, isAuthenticated, isAdminUser, loading, init, login, register, logout }
})
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/auth.store.ts
git commit -m "feat: add Pinia auth store with login, register, logout"
```

---

### Task 13: Offline-Store (Pinia)

**Files:**
- Create: `src/stores/offline.store.ts`

- [ ] **Step 1: Offline-Store implementieren**

`src/stores/offline.store.ts`:
```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '@/db/dexie'

export const useOfflineStore = defineStore('offline', () => {
  const isOnline = ref(navigator.onLine)
  const syncPending = ref(0)

  const hasPendingSync = computed(() => syncPending.value > 0)

  function init() {
    window.addEventListener('online', () => { isOnline.value = true })
    window.addEventListener('offline', () => { isOnline.value = false })
    refreshSyncCount()
  }

  async function refreshSyncCount() {
    const unsyncedFields = await db.fields.where('synced').equals(false).count()
    const unsyncedPlans = await db.fieldCropPlans.where('synced').equals(false).count()
    syncPending.value = unsyncedFields + unsyncedPlans
  }

  return { isOnline, syncPending, hasPendingSync, init, refreshSyncCount }
})
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/offline.store.ts
git commit -m "feat: add Pinia offline store with sync counter"
```

---

### Task 14: Field-Service (CRUD)

**Files:**
- Create: `src/services/field.service.ts`

- [ ] **Step 1: Field-Service implementieren**

`src/services/field.service.ts`:
```typescript
import { supabase } from './supabase'
import { db } from '@/db/dexie'
import type { Field } from '@/types'

export async function getFields(userId: string): Promise<Field[]> {
  if (!navigator.onLine) {
    return db.fields.where('user_id').equals(userId).toArray()
  }

  try {
    const { data, error } = await supabase
      .from('fields')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const fields = data as Field[]
    await db.fields.bulkPut(fields)
    return fields
  } catch {
    // Netzwerkfehler → Offline-Pfad
    return db.fields.where('user_id').equals(userId).toArray()
  }
}

export async function createField(
  field: Pick<Field, 'name' | 'size_ha' | 'user_id'>,
): Promise<Field> {
  const offlineField: Field = {
    ...field,
    id: crypto.randomUUID(),
    synced: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (!navigator.onLine) {
    await db.fields.add(offlineField)
    return offlineField
  }

  try {
    const { data, error } = await supabase
      .from('fields')
      .insert({ name: field.name, size_ha: field.size_ha })
      .select()
      .single()

    if (error) throw error

    const newField = { ...data, synced: true } as Field
    await db.fields.put(newField)
    return newField
  } catch {
    // Netzwerkfehler → Offline-Pfad (Richtlinie: nie als Fehlerdialog)
    await db.fields.add(offlineField)
    return offlineField
  }
}

export async function updateField(id: string, updates: Partial<Pick<Field, 'name' | 'size_ha'>>): Promise<Field> {
  if (!navigator.onLine) {
    await db.fields.update(id, { ...updates, synced: false, updated_at: new Date().toISOString() })
    return (await db.fields.get(id))!
  }

  const { data, error } = await supabase
    .from('fields')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  const updated = { ...data, synced: true } as Field
  await db.fields.put(updated)
  return updated
}

export async function deleteField(id: string): Promise<void> {
  if (navigator.onLine) {
    const { error } = await supabase.from('fields').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }
  await db.fields.delete(id)
  await db.fieldCropPlans.where('field_id').equals(id).delete()
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/field.service.ts
git commit -m "feat: add field service with online/offline CRUD"
```

---

### Task 15: Crop-Service (Read + Admin-CRUD)

**Files:**
- Create: `src/services/crop.service.ts`

- [ ] **Step 1: Crop-Service implementieren**

`src/services/crop.service.ts`:
```typescript
import { supabase } from './supabase'
import { db } from '@/db/dexie'
import { CROPS, CROP_NUTRIENT_DEMANDS } from '@/constants/crops'
import type { Crop, CropNutrientDemand } from '@/types'

export async function getCrops(): Promise<Crop[]> {
  const offlineFallback = async () => {
    const cached = await db.crops.toArray()
    return cached.length > 0 ? cached : CROPS
  }

  if (!navigator.onLine) return offlineFallback()

  try {
    const { data, error } = await supabase
      .from('crops')
      .select('*')
      .order('category', { ascending: true })
      .order('name_de', { ascending: true })

    if (error) throw error

    const crops = data as Crop[]
    await db.crops.bulkPut(crops)
    return crops
  } catch {
    return offlineFallback()
  }
}

export async function getNutrientDemands(cropId: string): Promise<CropNutrientDemand[]> {
  const offlineFallback = async () => {
    const cached = await db.cropNutrientDemands.where('crop_id').equals(cropId).toArray()
    return cached.length > 0 ? cached : CROP_NUTRIENT_DEMANDS.filter(d => d.crop_id === cropId)
  }

  if (!navigator.onLine) return offlineFallback()

  try {
    const { data, error } = await supabase
      .from('crop_nutrient_demands')
      .select('*')
      .eq('crop_id', cropId)

    if (error) throw error

    const demands = data as CropNutrientDemand[]
    await db.cropNutrientDemands.bulkPut(demands)
    return demands
  } catch {
    return offlineFallback()
  }
}

// --- Admin-CRUD ---

export async function createCrop(crop: Omit<Crop, 'id'>): Promise<Crop> {
  const { data, error } = await supabase.from('crops').insert(crop).select().single()
  if (error) throw new Error(error.message)
  return data as Crop
}

export async function updateCrop(id: string, updates: Partial<Crop>): Promise<Crop> {
  const { data, error } = await supabase.from('crops').update(updates).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as Crop
}

export async function deleteCrop(id: string): Promise<void> {
  const { error } = await supabase.from('crops').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/crop.service.ts
git commit -m "feat: add crop service with offline fallback to constants"
```

---

### Task 16: Nutrient-Service

**Files:**
- Create: `src/services/nutrient.service.ts`

- [ ] **Step 1: Nutrient-Service implementieren**

`src/services/nutrient.service.ts`:
```typescript
import { supabase } from './supabase'
import { db } from '@/db/dexie'
import { NUTRIENT_TYPES } from '@/constants/nutrients'
import type { NutrientType, CropNutrientDemand } from '@/types'

export async function getNutrientTypes(): Promise<NutrientType[]> {
  const offlineFallback = async () => {
    const cached = await db.nutrientTypes.toArray()
    return cached.length > 0 ? cached : NUTRIENT_TYPES
  }

  if (!navigator.onLine) return offlineFallback()

  try {
    const { data, error } = await supabase
      .from('nutrient_types')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw error

    const types = data as NutrientType[]
    await db.nutrientTypes.bulkPut(types)
    return types
  } catch {
    return offlineFallback()
  }
}

// Admin: Nährstoffwerte (CropNutrientDemand) pflegen

export async function createNutrientDemand(
  demand: Omit<CropNutrientDemand, 'id'>,
): Promise<CropNutrientDemand> {
  const { data, error } = await supabase
    .from('crop_nutrient_demands')
    .insert(demand)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as CropNutrientDemand
}

export async function updateNutrientDemand(
  id: string,
  updates: Partial<CropNutrientDemand>,
): Promise<CropNutrientDemand> {
  const { data, error } = await supabase
    .from('crop_nutrient_demands')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as CropNutrientDemand
}

export async function deleteNutrientDemand(id: string): Promise<void> {
  const { error } = await supabase.from('crop_nutrient_demands').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getAllNutrientDemands(): Promise<CropNutrientDemand[]> {
  const { data, error } = await supabase
    .from('crop_nutrient_demands')
    .select('*')
    .order('crop_id')
  if (error) throw new Error(error.message)
  return data as CropNutrientDemand[]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/nutrient.service.ts
git commit -m "feat: add nutrient service with offline fallback"
```

---

### Task 17: Product-Service

**Files:**
- Create: `src/services/product.service.ts`

- [ ] **Step 1: Product-Service implementieren**

`src/services/product.service.ts`:
```typescript
import { supabase } from './supabase'
import { db } from '@/db/dexie'
import { FERTILIZER_PRODUCTS } from '@/constants/fertilizer-products'
import type { FertilizerProduct } from '@/types'

export async function getProducts(): Promise<FertilizerProduct[]> {
  const offlineFallback = async () => {
    const cached = await db.fertilizerProducts.toArray()
    return cached.length > 0 ? cached : FERTILIZER_PRODUCTS
  }

  if (!navigator.onLine) return offlineFallback()

  try {
    const { data, error } = await supabase
      .from('fertilizer_products')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true })

    if (error) throw error

    const products = data as FertilizerProduct[]
    await db.fertilizerProducts.bulkPut(products)
    return products
  } catch {
    return offlineFallback()
  }
}

// --- Admin-CRUD ---

export async function getAllProducts(): Promise<FertilizerProduct[]> {
  const { data, error } = await supabase
    .from('fertilizer_products')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return data as FertilizerProduct[]
}

export async function createProduct(
  product: Omit<FertilizerProduct, 'id'>,
): Promise<FertilizerProduct> {
  const { data, error } = await supabase
    .from('fertilizer_products')
    .insert(product)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as FertilizerProduct
}

export async function updateProduct(
  id: string,
  updates: Partial<FertilizerProduct>,
): Promise<FertilizerProduct> {
  const { data, error } = await supabase
    .from('fertilizer_products')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as FertilizerProduct
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('fertilizer_products').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/product.service.ts
git commit -m "feat: add product service with offline fallback to constants"
```

---

### Task 18: Recommendation-Service

**Files:**
- Create: `src/services/recommendation.service.ts`

- [ ] **Step 1: Recommendation-Service implementieren**

`src/services/recommendation.service.ts`:
```typescript
import { supabase } from './supabase'
import { db } from '@/db/dexie'
import type { Recommendation, RecommendationValue } from '@/types'

export async function saveRecommendation(
  fieldCropPlanId: string,
  values: Omit<RecommendationValue, 'id' | 'recommendation_id'>[],
  offline: boolean,
): Promise<Recommendation> {
  const recommendation: Recommendation = {
    id: crypto.randomUUID(),
    field_crop_plan_id: fieldCropPlanId,
    calculated_at: new Date().toISOString(),
    calculated_offline: offline,
  }

  if (!navigator.onLine || offline) {
    await db.recommendations.put(recommendation)
    const recValues = values.map((v) => ({
      ...v,
      id: crypto.randomUUID(),
      recommendation_id: recommendation.id,
    }))
    await db.recommendationValues.bulkPut(recValues)
    return recommendation
  }

  const { data: recData, error: recError } = await supabase
    .from('recommendations')
    .insert({
      field_crop_plan_id: fieldCropPlanId,
      calculated_offline: false,
    })
    .select()
    .single()

  if (recError) throw new Error(recError.message)

  const savedRec = recData as Recommendation
  const recValues = values.map((v) => ({
    ...v,
    recommendation_id: savedRec.id,
  }))

  const { error: valError } = await supabase
    .from('recommendation_values')
    .insert(recValues)

  if (valError) throw new Error(valError.message)

  await db.recommendations.put(savedRec)
  return savedRec
}

export async function getRecommendation(
  fieldCropPlanId: string,
): Promise<{ recommendation: Recommendation; values: RecommendationValue[] } | null> {
  // Zuerst lokal schauen
  const local = await db.recommendations
    .where('field_crop_plan_id')
    .equals(fieldCropPlanId)
    .last()

  if (local) {
    const values = await db.recommendationValues
      .where('recommendation_id')
      .equals(local.id)
      .toArray()
    return { recommendation: local, values }
  }

  if (!navigator.onLine) return null

  const { data, error } = await supabase
    .from('recommendations')
    .select('*, recommendation_values(*)')
    .eq('field_crop_plan_id', fieldCropPlanId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null

  const rec = data as Recommendation & { recommendation_values: RecommendationValue[] }
  await db.recommendations.put({
    id: rec.id,
    field_crop_plan_id: rec.field_crop_plan_id,
    calculated_at: rec.calculated_at,
    calculated_offline: rec.calculated_offline,
  })
  await db.recommendationValues.bulkPut(rec.recommendation_values)

  return { recommendation: rec, values: rec.recommendation_values }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/recommendation.service.ts
git commit -m "feat: add recommendation service with offline persistence"
```

---

### Task 19: Sync-Service (Offline → Supabase)

**Files:**
- Create: `src/services/sync.service.ts`

- [ ] **Step 1: Sync-Service implementieren**

`src/services/sync.service.ts`:
```typescript
import { supabase } from './supabase'
import { db } from '@/db/dexie'

export async function syncAll(): Promise<{ synced: number; errors: number }> {
  if (!navigator.onLine) return { synced: 0, errors: 0 }

  let synced = 0
  let errors = 0

  // 1. Felder synchronisieren
  const unsyncedFields = await db.fields.where('synced').equals(false).toArray()
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

  // 2. Anbauplanungen synchronisieren
  const unsyncedPlans = await db.fieldCropPlans.where('synced').equals(false).toArray()
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
    { data: products },
  ] = await Promise.all([
    supabase.from('nutrient_types').select('*'),
    supabase.from('crops').select('*'),
    supabase.from('crop_nutrient_demands').select('*'),
    supabase.from('n_corrections').select('*'),
    supabase.from('fertilizer_products').select('*').eq('active', true),
  ])

  if (nutrients) await db.nutrientTypes.bulkPut(nutrients)
  if (crops) await db.crops.bulkPut(crops)
  if (demands) await db.cropNutrientDemands.bulkPut(demands)
  if (corrections) await db.nCorrections.bulkPut(corrections)
  if (products) await db.fertilizerProducts.bulkPut(products)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/sync.service.ts
git commit -m "feat: add sync service for offline-to-Supabase synchronization"
```

---

### Task 20: useOfflineCache Composable

**Files:**
- Create: `src/composables/useOfflineCache.ts`

Dieses Composable wird von Views beim App-Start aufgerufen, um Stammdaten zu cachen und Offline-Daten zu synchronisieren.

- [ ] **Step 1: Composable implementieren**

`src/composables/useOfflineCache.ts`:
```typescript
import { ref } from 'vue'
import { cacheStammdaten, syncAll } from '@/services/sync.service'
import { useOfflineStore } from '@/stores/offline.store'

export function useOfflineCache() {
  const syncing = ref(false)
  const caching = ref(false)

  async function initCache() {
    caching.value = true
    try {
      await cacheStammdaten()
    } finally {
      caching.value = false
    }
  }

  async function syncOfflineData() {
    const offlineStore = useOfflineStore()
    syncing.value = true
    try {
      const result = await syncAll()
      await offlineStore.refreshSyncCount()
      return result
    } finally {
      syncing.value = false
    }
  }

  function setupAutoSync() {
    window.addEventListener('online', () => {
      syncOfflineData()
    })
  }

  return { syncing, caching, initCache, syncOfflineData, setupAutoSync }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/composables/useOfflineCache.ts
git commit -m "feat: add useOfflineCache composable for cache init and auto-sync"
```

---

### Task 21: FieldCropPlan-Service

**Files:**
- Create: `src/services/field-crop-plan.service.ts`

- [ ] **Step 1: FieldCropPlan-Service implementieren**

`src/services/field-crop-plan.service.ts`:
```typescript
import { supabase } from './supabase'
import { db } from '@/db/dexie'
import type { FieldCropPlan } from '@/types'

export async function getPlansForField(fieldId: string): Promise<FieldCropPlan[]> {
  const offlineFallback = () =>
    db.fieldCropPlans.where('field_id').equals(fieldId).toArray()

  if (!navigator.onLine) return offlineFallback()

  try {
    const { data, error } = await supabase
      .from('field_crop_plans')
      .select('*')
      .eq('field_id', fieldId)
      .order('season_year', { ascending: false })

    if (error) throw error

    const plans = data as FieldCropPlan[]
    await db.fieldCropPlans.bulkPut(plans)
    return plans
  } catch {
    return offlineFallback()
  }
}

export async function createPlan(
  plan: Pick<FieldCropPlan, 'field_id' | 'crop_id' | 'season_year' | 'expected_yield_dt_ha'>,
): Promise<FieldCropPlan> {
  const offlinePlan: FieldCropPlan = {
    ...plan,
    id: crypto.randomUUID(),
    synced: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (!navigator.onLine) {
    await db.fieldCropPlans.add(offlinePlan)
    return offlinePlan
  }

  try {
    const { data, error } = await supabase
      .from('field_crop_plans')
      .insert({
        field_id: plan.field_id,
        crop_id: plan.crop_id,
        season_year: plan.season_year,
        expected_yield_dt_ha: plan.expected_yield_dt_ha,
      })
      .select()
      .single()

    if (error) throw error

    const newPlan = { ...data, synced: true } as FieldCropPlan
    await db.fieldCropPlans.put(newPlan)
    return newPlan
  } catch {
    // Netzwerkfehler → Offline-Pfad
    await db.fieldCropPlans.add(offlinePlan)
    return offlinePlan
  }
}

export async function updatePlan(
  id: string,
  updates: Partial<Pick<FieldCropPlan, 'crop_id' | 'season_year' | 'expected_yield_dt_ha'>>,
): Promise<FieldCropPlan> {
  if (!navigator.onLine) {
    await db.fieldCropPlans.update(id, {
      ...updates,
      synced: false,
      updated_at: new Date().toISOString(),
    })
    return (await db.fieldCropPlans.get(id))!
  }

  const { data, error } = await supabase
    .from('field_crop_plans')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  const updated = { ...data, synced: true } as FieldCropPlan
  await db.fieldCropPlans.put(updated)
  return updated
}

export async function deletePlan(id: string): Promise<void> {
  if (navigator.onLine) {
    const { error } = await supabase.from('field_crop_plans').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }
  await db.fieldCropPlans.delete(id)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/field-crop-plan.service.ts
git commit -m "feat: add field crop plan service with online/offline CRUD"
```

---

### Task 22: ARC42 aktualisieren — Bausteinsicht Services

**Files:**
- Modify: `docs/arc42/05-building-blocks.md`

- [ ] **Step 1: Service-Layer dokumentieren**

In `docs/arc42/05-building-blocks.md` unter Ebene 2 ergänzen:

```markdown
## Ebene 2: Service-Layer

| Service | Verantwortung | Offline-Verhalten |
|---|---|---|
| `auth.service` | Supabase Auth (Login, Register, Logout) | Nicht offline-fähig |
| `field.service` | CRUD Felder | Liest/schreibt Dexie, synced online |
| `field-crop-plan.service` | CRUD Anbauplanungen | Liest/schreibt Dexie, synced online |
| `crop.service` | Kulturen lesen + Admin-CRUD | Offline: Dexie → Constants Fallback |
| `nutrient.service` | Nährstofftypen + Demands | Offline: Dexie → Constants Fallback |
| `product.service` | Düngerprodukte + Admin-CRUD | Offline: Dexie → Constants Fallback |
| `recommendation.service` | Empfehlungen speichern/laden | Offline: Dexie mit `calculated_offline` |
| `sync.service` | Offline → Supabase Sync | Nur online aktiv |

Alle Services lesen/schreiben parallel in Supabase und Dexie (IndexedDB). Bei Offline-Betrieb wird ausschließlich Dexie verwendet. Stammdaten-Services fallen auf die `src/constants/` Seed-Daten zurück, wenn Dexie leer ist.
```

- [ ] **Step 2: Commit**

```bash
git add docs/arc42/05-building-blocks.md
git commit -m "docs: update ARC42 building blocks with service layer documentation"
```

---

## Chunk 3: Auth-UI, Router, Navigation, Shared Components

Dieses Chunk baut die App-Shell: Vue Router mit Auth-Guard, Login/Registrierung, Layout mit Bottom-Navigation, und wiederverwendbare UI-Basiskomponenten (StatusBadge, DrawerModal, NumberDisplay). Nach diesem Chunk ist die App navigierbar und hinter einem Auth-Gate geschützt.

**Voraussetzungen:** Chunk 1 (Projekt-Setup, Typen, Constants) + Chunk 2 (Services, Stores, Dexie)

---

### Task 23: Vue Router — Alle Routen mit Auth-Guard

**Files:**
- Modify: `src/router/index.ts`

- [ ] **Step 1: Router mit allen Routen und Auth-Guard implementieren**

`src/router/index.ts`:
```typescript
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    redirect: '/felder',
  },
  {
    path: '/felder',
    name: 'felder',
    component: () => import('@/views/FieldsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/felder/:fieldId/planung',
    name: 'anbauplanung',
    component: () => import('@/views/CropPlanView.vue'),
    meta: { requiresAuth: true },
    props: true,
  },
  {
    path: '/felder/:fieldId/planung/:planId/empfehlung',
    name: 'empfehlung',
    component: () => import('@/views/RecommendationView.vue'),
    meta: { requiresAuth: true },
    props: true,
  },
  {
    path: '/profil',
    name: 'profil',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const { useAuthStore } = await import('@/stores/auth.store')
  const auth = useAuthStore()

  if (auth.loading) {
    // Wait for auth init to finish
    await new Promise<void>((resolve) => {
      const unwatch = auth.$subscribe(() => {
        if (!auth.loading) {
          unwatch()
          resolve()
        }
      })
    })
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.requiresAdmin && !auth.isAdminUser) {
    return { name: 'felder' }
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'felder' }
  }
})

export default router
```

- [ ] **Step 2: App.vue aktualisieren — Auth-Init beim Start**

`src/App.vue`:
```vue
<template>
  <div v-if="auth.loading" class="flex items-center justify-center min-h-screen">
    <p class="text-gray-500">Laden…</p>
  </div>
  <RouterView v-else />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()

onMounted(() => {
  auth.init()
})
</script>
```

- [ ] **Step 3: Commit**

```bash
git add src/router/index.ts src/App.vue
git commit -m "feat: add Vue Router with auth guard and all MVP routes"
```

---

### Task 24: @vue/test-utils als Dependency hinzufügen

**Files:**
- Modify: `package.json`

Dieses Paket wird für alle Komponenten-Tests (Tasks 25–28) benötigt. Muss vor den Tests installiert sein.

- [ ] **Step 1: @vue/test-utils installieren**

```bash
npm install -D @vue/test-utils
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @vue/test-utils for component testing"
```

---

### Task 25: StatusBadge — Wiederverwendbare Komponente (TDD)

**Files:**
- Create: `src/components/StatusBadge.test.ts`
- Create: `src/components/StatusBadge.vue`

- [ ] **Step 1: Failing Tests schreiben**

`src/components/StatusBadge.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusBadge from './StatusBadge.vue'

describe('StatusBadge', () => {
  it('renders green badge for status "done"', () => {
    const wrapper = mount(StatusBadge, { props: { status: 'done' } })
    const badge = wrapper.find('[data-testid="status-badge"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('✓')
    expect(badge.classes()).toContain('bg-green-100')
  })

  it('renders yellow badge for status "action"', () => {
    const wrapper = mount(StatusBadge, { props: { status: 'action' } })
    const badge = wrapper.find('[data-testid="status-badge"]')
    expect(badge.text()).toContain('⚠')
    expect(badge.classes()).toContain('bg-yellow-100')
  })

  it('renders gray badge for status "empty"', () => {
    const wrapper = mount(StatusBadge, { props: { status: 'empty' } })
    const badge = wrapper.find('[data-testid="status-badge"]')
    expect(badge.text()).toContain('—')
    expect(badge.classes()).toContain('bg-gray-100')
  })

  it('shows optional label text', () => {
    const wrapper = mount(StatusBadge, { props: { status: 'done', label: 'Erledigt' } })
    expect(wrapper.text()).toContain('Erledigt')
  })
})
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

```bash
npx vitest run src/components/StatusBadge.test.ts
```

Expected: FAIL — `StatusBadge.vue` existiert nicht.

- [ ] **Step 3: Implementierung**

`src/components/StatusBadge.vue`:
```vue
<template>
  <span
    data-testid="status-badge"
    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
    :class="badgeClasses"
  >
    {{ icon }}
    <span v-if="label">{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: 'done' | 'action' | 'empty'
  label?: string
}>()

const icon = computed(() => {
  switch (props.status) {
    case 'done': return '✓'
    case 'action': return '⚠'
    case 'empty': return '—'
  }
})

const badgeClasses = computed(() => {
  switch (props.status) {
    case 'done': return 'bg-green-100 text-green-800'
    case 'action': return 'bg-yellow-100 text-yellow-800'
    case 'empty': return 'bg-gray-100 text-gray-600'
  }
})
</script>
```

- [ ] **Step 4: Test ausführen — muss grün sein**

```bash
npx vitest run src/components/StatusBadge.test.ts
```

Expected: PASS (alle 4 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/StatusBadge.vue src/components/StatusBadge.test.ts
git commit -m "feat: add StatusBadge component (green/yellow/gray) with TDD"
```

---

### Task 26: DrawerModal — Wiederverwendbare Hülle (TDD)

**Files:**
- Create: `src/components/DrawerModal.test.ts`
- Create: `src/components/DrawerModal.vue`

- [ ] **Step 1: Failing Tests schreiben**

`src/components/DrawerModal.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DrawerModal from './DrawerModal.vue'

// Teleport muss gestubbt werden, sonst landet der Content außerhalb des Wrappers
const mountOptions = (props: Record<string, unknown>) => ({
  props,
  global: { stubs: { Teleport: true } },
})

describe('DrawerModal', () => {
  it('renders nothing when not open', () => {
    const wrapper = mount(DrawerModal, mountOptions({ open: false, title: 'Test' }))
    expect(wrapper.find('[data-testid="drawer-modal"]').exists()).toBe(false)
  })

  it('renders overlay and content when open', () => {
    const wrapper = mount(DrawerModal, mountOptions({ open: true, title: 'Feld anlegen' }))
    const modal = wrapper.find('[data-testid="drawer-modal"]')
    expect(modal.exists()).toBe(true)
    expect(wrapper.text()).toContain('Feld anlegen')
  })

  it('emits close when overlay is clicked', async () => {
    const wrapper = mount(DrawerModal, mountOptions({ open: true, title: 'Test' }))
    await wrapper.find('[data-testid="drawer-overlay"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close when close button is clicked', async () => {
    const wrapper = mount(DrawerModal, mountOptions({ open: true, title: 'Test' }))
    await wrapper.find('[data-testid="drawer-close-button"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('renders slot content', () => {
    const wrapper = mount(DrawerModal, {
      ...mountOptions({ open: true, title: 'Test' }),
      slots: { default: '<p>Formular-Inhalt</p>' },
    })
    expect(wrapper.text()).toContain('Formular-Inhalt')
  })
})
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

```bash
npx vitest run src/components/DrawerModal.test.ts
```

Expected: FAIL — `DrawerModal.vue` existiert nicht.

- [ ] **Step 3: Implementierung**

`src/components/DrawerModal.vue`:
```vue
<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div
        data-testid="drawer-overlay"
        class="fixed inset-0 bg-black/40"
        @click="$emit('close')"
      />
      <div
        data-testid="drawer-modal"
        class="relative z-10 w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">{{ title }}</h2>
          <button
            data-testid="drawer-close-button"
            class="rounded-full p-1 hover:bg-gray-100"
            @click="$emit('close')"
          >
            <span class="sr-only">Schließen</span>
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
}>()

defineEmits<{
  close: []
}>()
</script>
```

- [ ] **Step 4: Test ausführen — muss grün sein**

```bash
npx vitest run src/components/DrawerModal.test.ts
```

Expected: PASS (alle 5 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/DrawerModal.vue src/components/DrawerModal.test.ts
git commit -m "feat: add DrawerModal component (overlay + close + slot) with TDD"
```

---

### Task 27: NumberDisplay — Formatierte Zahlenausgabe (TDD)

**Files:**
- Create: `src/components/NumberDisplay.test.ts`
- Create: `src/components/NumberDisplay.vue`

- [ ] **Step 1: Failing Tests schreiben**

`src/components/NumberDisplay.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NumberDisplay from './NumberDisplay.vue'

describe('NumberDisplay', () => {
  it('renders area format', () => {
    const wrapper = mount(NumberDisplay, {
      props: { value: 12.5, format: 'area' },
    })
    expect(wrapper.find('[data-testid="number-display"]').text()).toBe('12,50 ha')
  })

  it('renders nutrient per ha format', () => {
    const wrapper = mount(NumberDisplay, {
      props: { value: 220, format: 'nutrient-per-ha', code: 'N' },
    })
    expect(wrapper.find('[data-testid="number-display"]').text()).toBe('220 kg N/ha')
  })

  it('renders nutrient total format', () => {
    const wrapper = mount(NumberDisplay, {
      props: { value: 2750, format: 'nutrient-total', code: 'N' },
    })
    expect(wrapper.find('[data-testid="number-display"]').text()).toBe('2.750 kg N')
  })

  it('renders yield format', () => {
    const wrapper = mount(NumberDisplay, {
      props: { value: 80, format: 'yield' },
    })
    expect(wrapper.find('[data-testid="number-display"]').text()).toBe('80 dt/ha')
  })

  it('renders percent format', () => {
    const wrapper = mount(NumberDisplay, {
      props: { value: 27, format: 'percent' },
    })
    expect(wrapper.find('[data-testid="number-display"]').text()).toBe('27 %')
  })
})
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

```bash
npx vitest run src/components/NumberDisplay.test.ts
```

Expected: FAIL — `NumberDisplay.vue` existiert nicht.

- [ ] **Step 3: Implementierung**

`src/components/NumberDisplay.vue`:
```vue
<template>
  <span data-testid="number-display">{{ formatted }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNumberFormat } from '@/composables/useNumberFormat'

const props = defineProps<{
  value: number
  format: 'area' | 'nutrient-per-ha' | 'nutrient-total' | 'yield' | 'percent'
  code?: string
}>()

const { formatArea, formatNutrientPerHa, formatNutrientTotal, formatYield, formatNumber } = useNumberFormat()

const formatted = computed(() => {
  switch (props.format) {
    case 'area':
      return formatArea(props.value)
    case 'nutrient-per-ha':
      return formatNutrientPerHa(props.value, props.code ?? '')
    case 'nutrient-total':
      return formatNutrientTotal(props.value, props.code ?? '')
    case 'yield':
      return formatYield(props.value)
    case 'percent':
      return `${formatNumber(props.value)} %`
  }
})
</script>
```

- [ ] **Step 4: Test ausführen — muss grün sein**

```bash
npx vitest run src/components/NumberDisplay.test.ts
```

Expected: PASS (alle 5 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/NumberDisplay.vue src/components/NumberDisplay.test.ts
git commit -m "feat: add NumberDisplay component with German formatting (TDD)"
```

---

### Task 28: BottomNav — Mobile Navigation

> **Abweichung von Richtlinie:** Die Programmierrichtlinien nennen 4 Nav-Punkte: Felder, Planung, Profil, [Admin].
> Im MVP hat Anbauplanung keine eigene Top-Level-Route — sie ist unter `/felder/:fieldId/planung` genested.
> Ein separater "Planung"-Tab würde ohne Feld-Kontext nicht funktionieren. Daher nur 3 Tabs: Felder, Profil, [Admin].
> Falls später eine Top-Level-Planungsübersicht gewünscht ist, wird der Tab ergänzt.

**Files:**
- Create: `src/components/BottomNav.test.ts`
- Create: `src/components/BottomNav.vue`

- [ ] **Step 1: Failing Tests schreiben**

`src/components/BottomNav.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import BottomNav from './BottomNav.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/felder', name: 'felder', component: { template: '<div />' } },
      { path: '/profil', name: 'profil', component: { template: '<div />' } },
      { path: '/admin', name: 'admin', component: { template: '<div />' } },
    ],
  })
}

describe('BottomNav', () => {
  it('renders Felder and Profil links', () => {
    const router = createTestRouter()
    const wrapper = mount(BottomNav, {
      props: { isAdmin: false },
      global: { plugins: [router] },
    })
    expect(wrapper.find('[data-testid="nav-felder"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav-profil"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav-admin"]').exists()).toBe(false)
  })

  it('renders Admin link when isAdmin is true', () => {
    const router = createTestRouter()
    const wrapper = mount(BottomNav, {
      props: { isAdmin: true },
      global: { plugins: [router] },
    })
    expect(wrapper.find('[data-testid="nav-admin"]').exists()).toBe(true)
  })

  it('highlights active route', async () => {
    const router = createTestRouter()
    await router.push('/felder')
    await router.isReady()
    const wrapper = mount(BottomNav, {
      props: { isAdmin: false },
      global: { plugins: [router] },
    })
    expect(wrapper.find('[data-testid="nav-felder"]').classes()).toContain('text-green-700')
  })
})
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

```bash
npx vitest run src/components/BottomNav.test.ts
```

Expected: FAIL — `BottomNav.vue` existiert nicht.

- [ ] **Step 3: Implementierung**

`src/components/BottomNav.vue`:
```vue
<template>
  <nav
    data-testid="bottom-nav"
    class="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-gray-200 bg-white py-2 sm:hidden"
  >
    <RouterLink
      to="/felder"
      data-testid="nav-felder"
      class="flex flex-col items-center gap-0.5 px-3 py-1 text-xs"
      :class="isActive('/felder') ? 'text-green-700 font-semibold' : 'text-gray-500'"
    >
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
      Felder
    </RouterLink>
    <RouterLink
      to="/profil"
      data-testid="nav-profil"
      class="flex flex-col items-center gap-0.5 px-3 py-1 text-xs"
      :class="isActive('/profil') ? 'text-green-700 font-semibold' : 'text-gray-500'"
    >
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      Profil
    </RouterLink>
    <RouterLink
      v-if="isAdmin"
      to="/admin"
      data-testid="nav-admin"
      class="flex flex-col items-center gap-0.5 px-3 py-1 text-xs"
      :class="isActive('/admin') ? 'text-green-700 font-semibold' : 'text-gray-500'"
    >
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      Admin
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

defineProps<{
  isAdmin: boolean
}>()

const route = useRoute()

function isActive(path: string): boolean {
  return route.path.startsWith(path)
}
</script>
```

- [ ] **Step 4: Test ausführen — muss grün sein**

```bash
npx vitest run src/components/BottomNav.test.ts
```

Expected: PASS (alle 3 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/BottomNav.vue src/components/BottomNav.test.ts
git commit -m "feat: add BottomNav component with conditional Admin tab (TDD)"
```

---

### Task 29: AppLayout — Shell mit Header + BottomNav

**Files:**
- Create: `src/components/AppLayout.vue`

- [ ] **Step 1: AppLayout implementieren**

`src/components/AppLayout.vue`:
```vue
<template>
  <div class="min-h-screen bg-gray-50 pb-16 sm:pb-0">
    <header class="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <div class="flex items-center gap-2">
        <button
          v-if="showBack"
          data-testid="back-button"
          class="rounded-full p-1 hover:bg-gray-100"
          @click="$router.back()"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 class="text-lg font-semibold" data-testid="page-title">{{ title }}</h1>
      </div>
      <button
        data-testid="logout-button"
        class="text-sm text-gray-500 hover:text-gray-700"
        @click="handleLogout"
      >
        Abmelden
      </button>
    </header>

    <main class="mx-auto max-w-2xl px-4 py-4">
      <slot />
    </main>

    <BottomNav :is-admin="auth.isAdminUser" />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'vue-router'
import BottomNav from './BottomNav.vue'

defineProps<{
  title: string
  showBack?: boolean
}>()

const auth = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AppLayout.vue
git commit -m "feat: add AppLayout shell with header, back button, logout, BottomNav"
```

---

### Task 30: AppLayout — Tests (TDD)

**Files:**
- Create: `src/components/AppLayout.test.ts`

- [ ] **Step 1: Failing Tests schreiben**

`src/components/AppLayout.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import AppLayout from './AppLayout.vue'

// Stub BottomNav to isolate AppLayout tests
const BottomNavStub = { template: '<nav data-testid="bottom-nav" />', props: ['isAdmin'] }

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/login', name: 'login', component: { template: '<div />' } },
    ],
  })
}

function mountLayout(props: Record<string, unknown> = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createTestRouter()
  return mount(AppLayout, {
    props: { title: 'Test-Titel', ...props },
    global: {
      plugins: [pinia, router],
      stubs: { BottomNav: BottomNavStub },
    },
    slots: { default: '<p>Slot-Inhalt</p>' },
  })
}

describe('AppLayout', () => {
  it('renders the page title', () => {
    const wrapper = mountLayout()
    expect(wrapper.find('[data-testid="page-title"]').text()).toBe('Test-Titel')
  })

  it('renders slot content', () => {
    const wrapper = mountLayout()
    expect(wrapper.text()).toContain('Slot-Inhalt')
  })

  it('hides back button by default', () => {
    const wrapper = mountLayout()
    expect(wrapper.find('[data-testid="back-button"]').exists()).toBe(false)
  })

  it('shows back button when showBack is true', () => {
    const wrapper = mountLayout({ showBack: true })
    expect(wrapper.find('[data-testid="back-button"]').exists()).toBe(true)
  })

  it('shows logout button', () => {
    const wrapper = mountLayout()
    expect(wrapper.find('[data-testid="logout-button"]').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

```bash
npx vitest run src/components/AppLayout.test.ts
```

Expected: FAIL — `AppLayout.vue` existiert nicht.

- [ ] **Step 3: AppLayout implementieren (siehe Task 29 — bereits geschrieben)**

Die Implementierung von AppLayout.vue wurde bereits in Task 29 definiert. Die Tests validieren die dort erstellte Komponente.

- [ ] **Step 4: Test ausführen — muss grün sein**

```bash
npx vitest run src/components/AppLayout.test.ts
```

Expected: PASS (alle 5 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/AppLayout.test.ts
git commit -m "test: add AppLayout component tests (title, back button, slot, logout)"
```

---

### Task 31: E2E-Test — Auth-Flow (Test zuerst, vor LoginView)

**Files:**
- Create: `tests/e2e/auth.spec.ts`

> **TDD:** Dieser E2E-Test wird **vor** der LoginView implementiert (Task 32). Er schlägt zunächst fehl.

- [ ] **Step 1: E2E-Test für Auth schreiben**

`tests/e2e/auth.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Auth Flow', () => {
  test('shows login page for unauthenticated users', async ({ page }) => {
    await page.goto('/felder')
    await expect(page.getByTestId('app-title')).toHaveText('Düngungsberater')
    await expect(page.getByTestId('auth-form')).toBeVisible()
  })

  test('can toggle between login and register', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByTestId('auth-submit-button')).toHaveText('Anmelden')
    await page.getByTestId('auth-toggle-button').click()
    await expect(page.getByTestId('auth-submit-button')).toHaveText('Registrieren')
    await page.getByTestId('auth-toggle-button').click()
    await expect(page.getByTestId('auth-submit-button')).toHaveText('Anmelden')
  })

  test('shows error on invalid login', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('auth-email-input').fill('invalid@example.com')
    await page.getByTestId('auth-password-input').fill('wrongpassword')
    await page.getByTestId('auth-submit-button').click()
    await expect(page.getByTestId('auth-error')).toBeVisible()
  })

  test('bottom nav is not visible on login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByTestId('bottom-nav')).not.toBeVisible()
  })
})
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/auth.spec.ts
git commit -m "test: add E2E tests for auth flow (login page, toggle, error handling)"
```

---

### Task 32: LoginView — Login und Registrierung

**Files:**
- Create: `src/views/LoginView.vue`

> **TDD:** Die E2E-Tests in Task 31 schlagen fehl, bis diese Implementierung fertig ist.

- [ ] **Step 1: LoginView implementieren**

`src/views/LoginView.vue`:
```vue
<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
    <div class="w-full max-w-sm space-y-6">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-green-800" data-testid="app-title">Düngungsberater</h1>
        <p class="mt-1 text-sm text-gray-500">Düngeplanung nach LfL-Basisdaten</p>
      </div>

      <form
        data-testid="auth-form"
        class="space-y-4 rounded-xl bg-white p-6 shadow"
        @submit.prevent="handleSubmit"
      >
        <h2 class="text-lg font-semibold">
          {{ isLogin ? 'Anmelden' : 'Registrieren' }}
        </h2>

        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">E-Mail</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            data-testid="auth-email-input"
            class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">Passwort</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            minlength="6"
            data-testid="auth-password-input"
            class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
          />
        </div>

        <p
          v-if="errorMessage"
          data-testid="auth-error"
          class="text-sm text-red-600"
        >
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          :disabled="submitting"
          data-testid="auth-submit-button"
          class="w-full rounded-lg bg-green-700 px-4 py-2 text-white font-medium hover:bg-green-800 disabled:opacity-50"
        >
          {{ submitting ? 'Bitte warten…' : (isLogin ? 'Anmelden' : 'Registrieren') }}
        </button>

        <p class="text-center text-sm text-gray-500">
          {{ isLogin ? 'Noch kein Konto?' : 'Bereits registriert?' }}
          <button
            type="button"
            data-testid="auth-toggle-button"
            class="font-medium text-green-700 hover:underline"
            @click="toggleMode"
          >
            {{ isLogin ? 'Registrieren' : 'Anmelden' }}
          </button>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const router = useRouter()

const isLogin = ref(true)
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const submitting = ref(false)

function toggleMode() {
  isLogin.value = !isLogin.value
  errorMessage.value = ''
}

async function handleSubmit() {
  submitting.value = true
  errorMessage.value = ''

  const result = isLogin.value
    ? await auth.login(email.value, password.value)
    : await auth.register(email.value, password.value)

  submitting.value = false

  if (!result.success) {
    errorMessage.value = result.error ?? 'Ein Fehler ist aufgetreten.'
    return
  }

  if (!isLogin.value) {
    errorMessage.value = ''
    isLogin.value = true
    password.value = ''
    // Supabase sends confirmation email by default — show hint
    errorMessage.value = 'Registrierung erfolgreich. Bitte bestätige deine E-Mail.'
    return
  }

  router.push({ name: 'felder' })
}
</script>
```

- [ ] **Step 2: E2E-Tests ausführen**

```bash
npx playwright test tests/e2e/auth.spec.ts
```

Expected: Tests für Login-Seite und Toggle sollten PASS. "Invalid login"-Test erfordert laufendes Supabase — markiert als erwartetes Verhalten bei lokalem Dev.

- [ ] **Step 3: Commit**

```bash
git add src/views/LoginView.vue
git commit -m "feat: add LoginView with login/register toggle and error handling"
```

---

### Task 33: Placeholder-Views für restliche Routen

**Files:**
- Create: `src/views/FieldsView.vue`
- Create: `src/views/CropPlanView.vue`
- Create: `src/views/RecommendationView.vue`
- Create: `src/views/ProfileView.vue`
- Create: `src/views/AdminView.vue`

- [ ] **Step 1: Stub-Views erstellen**

Jede View bekommt ein Minimal-Template mit `AppLayout`, damit der Router nicht fehlt und die App navigierbar ist. Die eigentliche Logik wird in Chunk 4–7 implementiert.

`src/views/FieldsView.vue`:
```vue
<template>
  <AppLayout title="Meine Felder">
    <p data-testid="fields-placeholder" class="text-gray-400">Felder werden in Chunk 4 implementiert.</p>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'
</script>
```

`src/views/CropPlanView.vue`:
```vue
<template>
  <AppLayout title="Anbauplanung" :show-back="true">
    <p data-testid="crop-plan-placeholder" class="text-gray-400">Anbauplanung wird in Chunk 5 implementiert.</p>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'

defineProps<{
  fieldId: string
}>()
</script>
```

`src/views/RecommendationView.vue`:
```vue
<template>
  <AppLayout title="Düngeempfehlung" :show-back="true">
    <p data-testid="recommendation-placeholder" class="text-gray-400">Empfehlung wird in Chunk 6 implementiert.</p>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'

defineProps<{
  fieldId: string
  planId: string
}>()
</script>
```

`src/views/ProfileView.vue`:
```vue
<template>
  <AppLayout title="Profil">
    <p data-testid="profile-placeholder" class="text-gray-400">Profil wird in einem späteren Chunk implementiert.</p>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'
</script>
```

`src/views/AdminView.vue`:
```vue
<template>
  <AppLayout title="Admin" :show-back="true">
    <p data-testid="admin-placeholder" class="text-gray-400">Admin wird in Chunk 7 implementiert.</p>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/views/FieldsView.vue src/views/CropPlanView.vue src/views/RecommendationView.vue src/views/ProfileView.vue src/views/AdminView.vue
git commit -m "feat: add placeholder views for all routes (FieldsView, CropPlanView, RecommendationView, ProfileView, AdminView)"
```

---

### Task 34: ARC42 aktualisieren — Laufzeitsicht Auth-Flow

**Files:**
- Modify: `docs/arc42/06-runtime.md`

- [ ] **Step 1: Auth-Flow-Diagramm ergänzen**

In `docs/arc42/06-runtime.md` ergänzen:

```markdown
## Auth-Flow

```
User → LoginView → AuthStore.login() → AuthService.signIn() → Supabase Auth
  ← Session + userId
  → Router: redirect /felder

User → beliebige Route (requiresAuth)
  → Router beforeEach: AuthStore.isAuthenticated?
    nein → redirect /login
    ja → Route rendern

Admin-Route:
  → Router beforeEach: AuthStore.isAdminUser?
    nein → redirect /felder
    ja → AdminView rendern
```

## Navigation

- **Mobile (< 640px):** BottomNav mit Felder, Profil, [Admin]
- **Desktop (≥ 640px):** BottomNav ist `sm:hidden`, Navigation erfolgt über Header-Links (noch nicht implementiert, Placeholder für spätere Erweiterung)
- **Zurück-Button:** AppLayout rendert conditionalen Zurück-Button wenn `showBack` Prop gesetzt
- **Kein separater "Planung"-Tab:** Anbauplanung wird über Felder → Feld → Planung navigiert (kein Top-Level-Route im MVP)
```

- [ ] **Step 2: Commit**

```bash
git add docs/arc42/06-runtime.md
git commit -m "docs: add ARC42 runtime view for auth flow and navigation"
```

---

## Chunk 4: Felder CRUD (FieldList, FieldForm, FieldsView)

Dieses Chunk implementiert die Feldverwaltung — der erste vollständige CRUD-Workflow der App. Folgt dem UX-Muster: Liste → DrawerModal → Speichern → zurück zur Liste. Nutzt field.service (Chunk 2), AppLayout/DrawerModal/StatusBadge/NumberDisplay (Chunk 3).

**Voraussetzungen:** Chunk 1–3

---

### Task 35: E2E-Test — Felder-Workflow (Test zuerst)

**Files:**
- Create: `tests/e2e/felder.spec.ts`

> **TDD:** E2E-Test wird vor der Implementierung geschrieben und schlägt zunächst fehl.

- [ ] **Step 1: E2E-Test schreiben**

`tests/e2e/felder.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

// Hinweis: Diese Tests setzen einen eingeloggten User voraus.
// Im echten Setup wird ein test-Login-Helper benötigt (z.B. via Supabase Test-User).
// Für die erste Iteration wird der Login manuell im beforeEach ausgeführt.

test.describe('Felder CRUD', () => {
  // TODO: Auth-Setup für Tests — wird nach Supabase-Konfiguration ergänzt
  // test.beforeEach(async ({ page }) => {
  //   await loginAsTestUser(page)
  // })

  test('shows empty state when no fields exist', async ({ page }) => {
    await page.goto('/felder')
    await expect(page.getByTestId('fields-empty-state')).toBeVisible()
  })

  test('can open field creation drawer', async ({ page }) => {
    await page.goto('/felder')
    await page.getByTestId('feld-anlegen-button').click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await expect(page.getByTestId('feld-name-input')).toBeVisible()
    await expect(page.getByTestId('feld-size-input')).toBeVisible()
  })

  test('can create a new field', async ({ page }) => {
    await page.goto('/felder')
    await page.getByTestId('feld-anlegen-button').click()
    await page.getByTestId('feld-name-input').fill('Schlag Nord')
    await page.getByTestId('feld-size-input').fill('12.5')
    await page.getByTestId('feld-speichern-button').click()
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
    await expect(page.getByText('Schlag Nord')).toBeVisible()
  })

  test('can edit an existing field', async ({ page }) => {
    await page.goto('/felder')
    // Assumes a field exists from previous test or seed data
    await page.getByTestId('field-list').locator('[data-testid^="field-item-"]').first().click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await page.getByTestId('feld-name-input').fill('Schlag Süd')
    await page.getByTestId('feld-speichern-button').click()
    await expect(page.getByText('Schlag Süd')).toBeVisible()
  })

  test('can delete a field', async ({ page }) => {
    await page.goto('/felder')
    await page.getByTestId('field-list').locator('[data-testid^="field-item-"]').first().click()
    await page.getByTestId('feld-loeschen-button').click()
    // Confirm deletion
    await page.getByTestId('feld-loeschen-confirm-button').click()
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
  })

  test('field list shows size in German format', async ({ page }) => {
    await page.goto('/felder')
    // Assumes a field with size 12.5 exists
    await expect(page.getByText('12,50 ha')).toBeVisible()
  })
})
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/felder.spec.ts
git commit -m "test: add E2E tests for Felder CRUD workflow"
```

---

### Task 36: FieldList — Feldliste-Komponente (TDD)

**Files:**
- Create: `src/components/FieldList.test.ts`
- Create: `src/components/FieldList.vue`

- [ ] **Step 1: Failing Tests schreiben**

`src/components/FieldList.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FieldList from './FieldList.vue'
import type { Field } from '@/types'

const mockFields: Field[] = [
  {
    id: 'f1',
    user_id: 'u1',
    name: 'Schlag Nord',
    size_ha: 12.5,
    synced: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f2',
    user_id: 'u1',
    name: 'Schlag Süd',
    size_ha: 8.75,
    synced: true,
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
]

describe('FieldList', () => {
  it('renders empty state when no fields', () => {
    const wrapper = mount(FieldList, { props: { fields: [], planCounts: {} } })
    expect(wrapper.find('[data-testid="fields-empty-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="field-list"]').exists()).toBe(false)
  })

  it('renders list of fields', () => {
    const wrapper = mount(FieldList, { props: { fields: mockFields, planCounts: {} } })
    expect(wrapper.find('[data-testid="field-list"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid^="field-item-"]')).toHaveLength(2)
  })

  it('displays field name and size', () => {
    const wrapper = mount(FieldList, { props: { fields: mockFields, planCounts: {} } })
    const firstItem = wrapper.find('[data-testid="field-item-f1"]')
    expect(firstItem.text()).toContain('Schlag Nord')
    expect(firstItem.text()).toContain('12,50 ha')
  })

  it('shows "done" badge when field has plans', () => {
    const wrapper = mount(FieldList, {
      props: { fields: mockFields, planCounts: { f1: 2 } },
    })
    const badge = wrapper.find('[data-testid="field-item-f1"] [data-testid="status-badge"]')
    expect(badge.text()).toContain('✓')
  })

  it('shows "empty" badge when field has no plans', () => {
    const wrapper = mount(FieldList, {
      props: { fields: mockFields, planCounts: {} },
    })
    const badge = wrapper.find('[data-testid="field-item-f1"] [data-testid="status-badge"]')
    expect(badge.text()).toContain('—')
  })

  it('emits select event when field is clicked', async () => {
    const wrapper = mount(FieldList, { props: { fields: mockFields, planCounts: {} } })
    await wrapper.find('[data-testid="field-item-f1"]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['f1']])
  })
})
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

```bash
npx vitest run src/components/FieldList.test.ts
```

Expected: FAIL — `FieldList.vue` existiert nicht.

- [ ] **Step 3: Implementierung**

`src/components/FieldList.vue`:
```vue
<template>
  <div v-if="fields.length === 0" data-testid="fields-empty-state" class="py-12 text-center">
    <p class="text-gray-400">Noch keine Felder angelegt.</p>
    <p class="mt-1 text-sm text-gray-400">Tippe auf „+ Feld anlegen", um zu starten.</p>
  </div>

  <ul v-else data-testid="field-list" class="space-y-2">
    <li
      v-for="field in fields"
      :key="field.id"
      :data-testid="`field-item-${field.id}`"
      class="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50"
      @click="$emit('select', field.id)"
    >
      <div>
        <p class="font-medium">{{ field.name }}</p>
        <p class="text-sm text-gray-500">
          <NumberDisplay :value="field.size_ha" format="area" />
        </p>
      </div>
      <StatusBadge :status="(planCounts[field.id] ?? 0) > 0 ? 'done' : 'empty'" />
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { Field } from '@/types'
import StatusBadge from './StatusBadge.vue'
import NumberDisplay from './NumberDisplay.vue'

defineProps<{
  fields: Field[]
  planCounts: Record<string, number>
}>()

defineEmits<{
  select: [fieldId: string]
}>()
</script>
```

- [ ] **Step 4: Test ausführen — muss grün sein**

```bash
npx vitest run src/components/FieldList.test.ts
```

Expected: PASS (alle 6 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/FieldList.vue src/components/FieldList.test.ts
git commit -m "feat: add FieldList component with status badges and German number format (TDD)"
```

---

### Task 37: FieldForm — Feld anlegen/bearbeiten Formular (TDD)

**Files:**
- Create: `src/components/FieldForm.test.ts`
- Create: `src/components/FieldForm.vue`

- [ ] **Step 1: Failing Tests schreiben**

`src/components/FieldForm.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FieldForm from './FieldForm.vue'
import type { Field } from '@/types'

describe('FieldForm', () => {
  it('renders empty form for new field', () => {
    const wrapper = mount(FieldForm, { props: {} })
    expect(wrapper.find('[data-testid="feld-name-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="feld-size-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="feld-loeschen-button"]').exists()).toBe(false)
  })

  it('pre-fills form when editing existing field', () => {
    const field: Field = {
      id: 'f1',
      user_id: 'u1',
      name: 'Schlag Nord',
      size_ha: 12.5,
      synced: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    const wrapper = mount(FieldForm, { props: { field } })
    const nameInput = wrapper.find('[data-testid="feld-name-input"]').element as HTMLInputElement
    const sizeInput = wrapper.find('[data-testid="feld-size-input"]').element as HTMLInputElement
    expect(nameInput.value).toBe('Schlag Nord')
    expect(sizeInput.value).toBe('12.5')
  })

  it('shows delete button when editing', () => {
    const field: Field = {
      id: 'f1', user_id: 'u1', name: 'Test', size_ha: 1,
      synced: true, created_at: '', updated_at: '',
    }
    const wrapper = mount(FieldForm, { props: { field } })
    expect(wrapper.find('[data-testid="feld-loeschen-button"]').exists()).toBe(true)
  })

  it('emits save with form data', async () => {
    const wrapper = mount(FieldForm, { props: {} })
    await wrapper.find('[data-testid="feld-name-input"]').setValue('Neues Feld')
    await wrapper.find('[data-testid="feld-size-input"]').setValue('5.5')
    await wrapper.find('[data-testid="feld-speichern-button"]').trigger('click')
    expect(wrapper.emitted('save')).toEqual([[{ name: 'Neues Feld', size_ha: 5.5 }]])
  })

  it('emits delete when delete confirmed', async () => {
    const field: Field = {
      id: 'f1', user_id: 'u1', name: 'Test', size_ha: 1,
      synced: true, created_at: '', updated_at: '',
    }
    const wrapper = mount(FieldForm, { props: { field } })
    await wrapper.find('[data-testid="feld-loeschen-button"]').trigger('click')
    expect(wrapper.find('[data-testid="feld-loeschen-confirm-button"]').exists()).toBe(true)
    await wrapper.find('[data-testid="feld-loeschen-confirm-button"]').trigger('click')
    expect(wrapper.emitted('delete')).toEqual([[]])
  })

  it('validates that name is required', async () => {
    const wrapper = mount(FieldForm, { props: {} })
    await wrapper.find('[data-testid="feld-size-input"]').setValue('5.5')
    await wrapper.find('[data-testid="feld-speichern-button"]').trigger('click')
    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.find('[data-testid="feld-name-error"]').exists()).toBe(true)
  })

  it('validates that size must be positive', async () => {
    const wrapper = mount(FieldForm, { props: {} })
    await wrapper.find('[data-testid="feld-name-input"]').setValue('Test')
    await wrapper.find('[data-testid="feld-size-input"]').setValue('0')
    await wrapper.find('[data-testid="feld-speichern-button"]').trigger('click')
    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.find('[data-testid="feld-size-error"]').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

```bash
npx vitest run src/components/FieldForm.test.ts
```

Expected: FAIL — `FieldForm.vue` existiert nicht.

- [ ] **Step 3: Implementierung**

`src/components/FieldForm.vue`:
```vue
<template>
  <form class="space-y-4" @submit.prevent="handleSave">
    <div>
      <label for="field-name" class="block text-sm font-medium text-gray-700">Feldname</label>
      <input
        id="field-name"
        v-model="name"
        type="text"
        data-testid="feld-name-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
        :class="{ 'border-red-500': nameError }"
      />
      <p v-if="nameError" data-testid="feld-name-error" class="mt-1 text-sm text-red-600">
        {{ nameError }}
      </p>
    </div>

    <div>
      <label for="field-size" class="block text-sm font-medium text-gray-700">Größe (ha)</label>
      <input
        id="field-size"
        v-model.number="sizeHa"
        type="number"
        step="0.01"
        min="0"
        data-testid="feld-size-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
        :class="{ 'border-red-500': sizeError }"
      />
      <p v-if="sizeError" data-testid="feld-size-error" class="mt-1 text-sm text-red-600">
        {{ sizeError }}
      </p>
    </div>

    <button
      type="submit"
      data-testid="feld-speichern-button"
      class="w-full rounded-lg bg-green-700 px-4 py-2 text-white font-medium hover:bg-green-800"
    >
      Speichern
    </button>

    <div v-if="field" class="border-t border-gray-200 pt-4">
      <button
        v-if="!confirmDelete"
        type="button"
        data-testid="feld-loeschen-button"
        class="w-full rounded-lg border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
        @click="confirmDelete = true"
      >
        Feld löschen
      </button>
      <div v-else class="space-y-2">
        <p class="text-sm text-red-600">Feld wirklich löschen? Alle Planungen gehen verloren.</p>
        <button
          type="button"
          data-testid="feld-loeschen-confirm-button"
          class="w-full rounded-lg bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700"
          @click="$emit('delete')"
        >
          Endgültig löschen
        </button>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Field } from '@/types'

const props = defineProps<{
  field?: Field
}>()

const emit = defineEmits<{
  save: [data: { name: string; size_ha: number }]
  delete: []
}>()

const name = ref(props.field?.name ?? '')
const sizeHa = ref(props.field?.size_ha ?? 0)
const nameError = ref('')
const sizeError = ref('')
const confirmDelete = ref(false)

function handleSave() {
  nameError.value = ''
  sizeError.value = ''

  if (!name.value.trim()) {
    nameError.value = 'Feldname ist erforderlich.'
    return
  }
  if (!sizeHa.value || sizeHa.value <= 0) {
    sizeError.value = 'Größe muss größer als 0 sein.'
    return
  }

  emit('save', { name: name.value.trim(), size_ha: sizeHa.value })
}
</script>
```

- [ ] **Step 4: Test ausführen — muss grün sein**

```bash
npx vitest run src/components/FieldForm.test.ts
```

Expected: PASS (alle 7 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/FieldForm.vue src/components/FieldForm.test.ts
git commit -m "feat: add FieldForm component with validation and delete confirmation (TDD)"
```

---

### Task 38: FieldsView — Felder-Übersicht verbinden

**Files:**
- Modify: `src/views/FieldsView.vue` (Placeholder aus Task 33 ersetzen)

- [ ] **Step 1: FieldsView implementieren**

`src/views/FieldsView.vue`:
```vue
<template>
  <AppLayout title="Meine Felder">
    <div class="space-y-4">
      <button
        data-testid="feld-anlegen-button"
        class="w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 hover:border-green-500 hover:text-green-700"
        @click="openNew"
      >
        + Feld anlegen
      </button>

      <p
        v-if="errorMessage"
        data-testid="fields-error"
        class="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600"
      >
        {{ errorMessage }}
      </p>

      <FieldList
        :fields="fields"
        :plan-counts="planCounts"
        @select="openEdit"
      />
    </div>

    <DrawerModal
      :open="drawerOpen"
      :title="editingField ? 'Feld bearbeiten' : 'Neues Feld'"
      @close="closeDrawer"
    >
      <FieldForm
        :field="editingField"
        @save="handleSave"
        @delete="handleDelete"
      />
    </DrawerModal>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { getFields, createField, updateField, deleteField } from '@/services/field.service'
import { getPlansForField } from '@/services/field-crop-plan.service'
import type { Field } from '@/types'
import AppLayout from '@/components/AppLayout.vue'
import DrawerModal from '@/components/DrawerModal.vue'
import FieldList from '@/components/FieldList.vue'
import FieldForm from '@/components/FieldForm.vue'

const auth = useAuthStore()

const fields = ref<Field[]>([])
const planCounts = ref<Record<string, number>>({})
const drawerOpen = ref(false)
const editingField = ref<Field | undefined>()

async function loadFields() {
  if (!auth.userId) return
  fields.value = await getFields(auth.userId)

  // Plan-Counts für Status-Badges laden
  const counts: Record<string, number> = {}
  for (const field of fields.value) {
    const plans = await getPlansForField(field.id)
    counts[field.id] = plans.length
  }
  planCounts.value = counts
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

const errorMessage = ref('')

async function handleSave(data: { name: string; size_ha: number }) {
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

onMounted(loadFields)
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/views/FieldsView.vue
git commit -m "feat: implement FieldsView with CRUD via DrawerModal (list, create, edit, delete)"
```

---

### Task 39: Felder-Workflow Smoke-Test

- [ ] **Step 1: Dev-Server starten und Felder-Flow manuell testen**

```bash
npm run dev
```

Prüfe im Browser:
1. Login-Seite wird angezeigt
2. Nach Login: FieldsView mit leerem Zustand
3. „+ Feld anlegen" öffnet DrawerModal
4. Name + Größe eingeben → Speichern → Feld erscheint in Liste
5. Feld anklicken → Bearbeiten → Speichern
6. Feld löschen → Bestätigung → Feld verschwindet

- [ ] **Step 2: E2E-Tests ausführen**

```bash
npx playwright test tests/e2e/felder.spec.ts
```

Expected: Tests, die keinen Auth-Setup brauchen, sollten PASS. Auth-abhängige Tests markieren wir als erwartetes Verhalten bis Supabase-Test-Setup steht.

---

### Task 40: Navigation Felder → Anbauplanung

**Files:**
- Modify: `src/components/FieldList.vue`
- Modify: `src/components/FieldList.test.ts`
- Modify: `src/views/FieldsView.vue`

- [ ] **Step 1: Failing Test zuerst — navigate-Event testen**

In `src/components/FieldList.test.ts` hinzufügen:

```typescript
  it('emits navigate when Planung button is clicked', async () => {
    const wrapper = mount(FieldList, { props: { fields: mockFields, planCounts: {} } })
    await wrapper.find('[data-testid="field-planung-button-f1"]').trigger('click')
    expect(wrapper.emitted('navigate')).toEqual([['f1']])
    // Klick auf Button darf nicht select auslösen (@click.stop)
    expect(wrapper.emitted('select')).toBeUndefined()
  })
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

```bash
npx vitest run src/components/FieldList.test.ts
```

Expected: FAIL — `field-planung-button-f1` existiert nicht.

- [ ] **Step 3: FieldList.vue erweitern — Planung-Button hinzufügen**

In `src/components/FieldList.vue` die alleinstehende `<StatusBadge>`-Zeile im `<li>` Block **ersetzen** durch einen Wrapper mit StatusBadge + Planung-Button:

**Ersetze:**
```vue
      <StatusBadge :status="(planCounts[field.id] ?? 0) > 0 ? 'done' : 'empty'" />
```

**Durch:**
```vue
      <div class="flex items-center gap-2">
        <StatusBadge :status="(planCounts[field.id] ?? 0) > 0 ? 'done' : 'empty'" />
        <button
          :data-testid="`field-planung-button-${field.id}`"
          class="rounded-lg bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
          @click.stop="$emit('navigate', field.id)"
        >
          Planung →
        </button>
      </div>
```

Ergänze `navigate` in `defineEmits`:
```typescript
defineEmits<{
  select: [fieldId: string]
  navigate: [fieldId: string]
}>()
```

- [ ] **Step 4: Test ausführen — muss grün sein**

```bash
npx vitest run src/components/FieldList.test.ts
```

Expected: PASS (alle 7 Tests)

- [ ] **Step 5: FieldsView — navigate-Event an Router binden**

In `src/views/FieldsView.vue`:

1. Import ergänzen: `import { useRouter } from 'vue-router'`
2. Konstante ergänzen: `const router = useRouter()`
3. Im `<FieldList>` Tag `@navigate="navigateToPlan"` ergänzen
4. Funktion ergänzen:

```typescript
function navigateToPlan(fieldId: string) {
  router.push({ name: 'anbauplanung', params: { fieldId } })
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/FieldList.vue src/components/FieldList.test.ts src/views/FieldsView.vue
git commit -m "feat: add navigation from field list to Anbauplanung"
```

---

## Chunk 5: Anbauplanung (CropPlanList, CropPlanForm, CropPlanView)

Dieses Chunk implementiert die Anbauplanung pro Feld: Kultur wählen, Ertrag eingeben, Pläne auflisten. Folgt demselben UX-Muster wie Felder (Liste → DrawerModal → Speichern). Nutzt crop.service und field-crop-plan.service (Chunk 2), alle Shared Components (Chunk 3).

**Voraussetzungen:** Chunk 1–4

---

### Task 41: E2E-Test — Anbauplanung-Workflow (Test zuerst)

**Files:**
- Create: `tests/e2e/anbauplanung.spec.ts`

- [ ] **Step 1: E2E-Test schreiben**

`tests/e2e/anbauplanung.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Anbauplanung', () => {
  // TODO: Auth-Setup + Feld-Fixture für Tests

  test('shows empty state when no plans exist for field', async ({ page }) => {
    await page.goto('/felder/test-field-id/planung')
    await expect(page.getByTestId('crop-plans-empty-state')).toBeVisible()
  })

  test('can open plan creation drawer', async ({ page }) => {
    await page.goto('/felder/test-field-id/planung')
    await page.getByTestId('plan-anlegen-button').click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await expect(page.getByTestId('plan-crop-select')).toBeVisible()
    await expect(page.getByTestId('plan-yield-input')).toBeVisible()
    await expect(page.getByTestId('plan-season-input')).toBeVisible()
  })

  test('pre-fills yield when crop is selected', async ({ page }) => {
    await page.goto('/felder/test-field-id/planung')
    await page.getByTestId('plan-anlegen-button').click()
    await page.getByTestId('plan-crop-select').selectOption({ label: /Winterweizen/ })
    const yieldInput = page.getByTestId('plan-yield-input')
    await expect(yieldInput).not.toHaveValue('')
  })

  test('can create a new plan', async ({ page }) => {
    await page.goto('/felder/test-field-id/planung')
    await page.getByTestId('plan-anlegen-button').click()
    await page.getByTestId('plan-crop-select').selectOption({ index: 1 })
    await page.getByTestId('plan-season-input').fill('2026')
    await page.getByTestId('plan-speichern-button').click()
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
    await expect(page.getByTestId('crop-plan-list')).toBeVisible()
  })

  test('navigates to recommendation from plan', async ({ page }) => {
    await page.goto('/felder/test-field-id/planung')
    await page.getByTestId('crop-plan-list').locator('[data-testid^="plan-empfehlung-button-"]').first().click()
    await expect(page).toHaveURL(/empfehlung/)
  })
})
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/anbauplanung.spec.ts
git commit -m "test: add E2E tests for Anbauplanung workflow"
```

---

### Task 42: CropPlanList — Planungs-Liste (TDD)

**Files:**
- Create: `src/components/CropPlanList.test.ts`
- Create: `src/components/CropPlanList.vue`

- [ ] **Step 1: Failing Tests schreiben**

`src/components/CropPlanList.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CropPlanList from './CropPlanList.vue'
import type { FieldCropPlan, Crop } from '@/types'

const mockCrops: Crop[] = [
  {
    id: 'crop-winterweizen',
    name_de: 'Winterweizen',
    category: 'Getreide',
    sow_month_from: 9,
    sow_month_to: 11,
    harvest_month_from: 7,
    harvest_month_to: 8,
    ref_yield_dt_ha: 80,
    nmin_depth_cm: 90,
  },
]

const mockPlans: FieldCropPlan[] = [
  {
    id: 'plan-1',
    field_id: 'f1',
    crop_id: 'crop-winterweizen',
    season_year: 2026,
    expected_yield_dt_ha: 85,
    synced: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

describe('CropPlanList', () => {
  it('renders empty state when no plans', () => {
    const wrapper = mount(CropPlanList, { props: { plans: [], crops: mockCrops } })
    expect(wrapper.find('[data-testid="crop-plans-empty-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="crop-plan-list"]').exists()).toBe(false)
  })

  it('renders list of plans', () => {
    const wrapper = mount(CropPlanList, { props: { plans: mockPlans, crops: mockCrops } })
    expect(wrapper.find('[data-testid="crop-plan-list"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid^="plan-item-"]')).toHaveLength(1)
  })

  it('displays crop name and season', () => {
    const wrapper = mount(CropPlanList, { props: { plans: mockPlans, crops: mockCrops } })
    const item = wrapper.find('[data-testid="plan-item-plan-1"]')
    expect(item.text()).toContain('Winterweizen')
    expect(item.text()).toContain('2026')
  })

  it('displays expected yield in German format', () => {
    const wrapper = mount(CropPlanList, { props: { plans: mockPlans, crops: mockCrops } })
    const item = wrapper.find('[data-testid="plan-item-plan-1"]')
    expect(item.text()).toContain('85 dt/ha')
  })

  it('emits select when plan is clicked', async () => {
    const wrapper = mount(CropPlanList, { props: { plans: mockPlans, crops: mockCrops } })
    await wrapper.find('[data-testid="plan-item-plan-1"]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['plan-1']])
  })

  it('emits navigate when Empfehlung button is clicked', async () => {
    const wrapper = mount(CropPlanList, { props: { plans: mockPlans, crops: mockCrops } })
    await wrapper.find('[data-testid="plan-empfehlung-button-plan-1"]').trigger('click')
    expect(wrapper.emitted('navigate')).toEqual([['plan-1']])
    expect(wrapper.emitted('select')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

```bash
npx vitest run src/components/CropPlanList.test.ts
```

Expected: FAIL — `CropPlanList.vue` existiert nicht.

- [ ] **Step 3: Implementierung**

`src/components/CropPlanList.vue`:
```vue
<template>
  <div v-if="plans.length === 0" data-testid="crop-plans-empty-state" class="py-12 text-center">
    <p class="text-gray-400">Noch keine Anbauplanung für dieses Feld.</p>
    <p class="mt-1 text-sm text-gray-400">Tippe auf „+ Planung anlegen", um zu starten.</p>
  </div>

  <ul v-else data-testid="crop-plan-list" class="space-y-2">
    <li
      v-for="plan in plans"
      :key="plan.id"
      :data-testid="`plan-item-${plan.id}`"
      class="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50"
      @click="$emit('select', plan.id)"
    >
      <div>
        <p class="font-medium">{{ cropName(plan.crop_id) }}</p>
        <p class="text-sm text-gray-500">
          Saison {{ plan.season_year }} · <NumberDisplay :value="plan.expected_yield_dt_ha" format="yield" />
        </p>
      </div>
      <button
        :data-testid="`plan-empfehlung-button-${plan.id}`"
        class="rounded-lg bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
        @click.stop="$emit('navigate', plan.id)"
      >
        Empfehlung →
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { FieldCropPlan, Crop } from '@/types'
import NumberDisplay from './NumberDisplay.vue'

const props = defineProps<{
  plans: FieldCropPlan[]
  crops: Crop[]
}>()

defineEmits<{
  select: [planId: string]
  navigate: [planId: string]
}>()

function cropName(cropId: string): string {
  return props.crops.find((c) => c.id === cropId)?.name_de ?? 'Unbekannte Kultur'
}
</script>
```

- [ ] **Step 4: Test ausführen — muss grün sein**

```bash
npx vitest run src/components/CropPlanList.test.ts
```

Expected: PASS (alle 6 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/CropPlanList.vue src/components/CropPlanList.test.ts
git commit -m "feat: add CropPlanList component with crop name lookup and yield display (TDD)"
```

---

### Task 43: CropPlanForm — Planung anlegen/bearbeiten (TDD)

**Files:**
- Create: `src/components/CropPlanForm.test.ts`
- Create: `src/components/CropPlanForm.vue`

- [ ] **Step 1: Failing Tests schreiben**

`src/components/CropPlanForm.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CropPlanForm from './CropPlanForm.vue'
import type { Crop, FieldCropPlan } from '@/types'

const mockCrops: Crop[] = [
  {
    id: 'crop-winterweizen',
    name_de: 'Winterweizen',
    category: 'Getreide',
    sow_month_from: 9,
    sow_month_to: 11,
    harvest_month_from: 7,
    harvest_month_to: 8,
    ref_yield_dt_ha: 80,
    nmin_depth_cm: 90,
  },
  {
    id: 'crop-wintergerste',
    name_de: 'Wintergerste',
    category: 'Getreide',
    sow_month_from: 9,
    sow_month_to: 10,
    harvest_month_from: 6,
    harvest_month_to: 7,
    ref_yield_dt_ha: 70,
    nmin_depth_cm: 90,
  },
]

describe('CropPlanForm', () => {
  it('renders crop select with all crops', () => {
    const wrapper = mount(CropPlanForm, { props: { crops: mockCrops } })
    const select = wrapper.find('[data-testid="plan-crop-select"]')
    expect(select.exists()).toBe(true)
    const options = select.findAll('option').filter((o) => o.element.value !== '')
    expect(options).toHaveLength(2)
  })

  it('pre-fills yield when crop is selected', async () => {
    const wrapper = mount(CropPlanForm, { props: { crops: mockCrops } })
    await wrapper.find('[data-testid="plan-crop-select"]').setValue('crop-winterweizen')
    const yieldInput = wrapper.find('[data-testid="plan-yield-input"]').element as HTMLInputElement
    expect(yieldInput.value).toBe('80')
  })

  it('pre-fills current year as season', () => {
    const wrapper = mount(CropPlanForm, { props: { crops: mockCrops } })
    const seasonInput = wrapper.find('[data-testid="plan-season-input"]').element as HTMLInputElement
    expect(seasonInput.value).toBe(new Date().getFullYear().toString())
  })

  it('pre-fills form when editing existing plan', () => {
    const plan: FieldCropPlan = {
      id: 'p1',
      field_id: 'f1',
      crop_id: 'crop-wintergerste',
      season_year: 2025,
      expected_yield_dt_ha: 75,
      synced: true,
      created_at: '',
      updated_at: '',
    }
    const wrapper = mount(CropPlanForm, { props: { crops: mockCrops, plan } })
    const cropSelect = wrapper.find('[data-testid="plan-crop-select"]').element as HTMLSelectElement
    const yieldInput = wrapper.find('[data-testid="plan-yield-input"]').element as HTMLInputElement
    const seasonInput = wrapper.find('[data-testid="plan-season-input"]').element as HTMLInputElement
    expect(cropSelect.value).toBe('crop-wintergerste')
    expect(yieldInput.value).toBe('75')
    expect(seasonInput.value).toBe('2025')
  })

  it('emits save with form data', async () => {
    const wrapper = mount(CropPlanForm, { props: { crops: mockCrops } })
    await wrapper.find('[data-testid="plan-crop-select"]').setValue('crop-winterweizen')
    await wrapper.find('[data-testid="plan-yield-input"]').setValue('90')
    await wrapper.find('[data-testid="plan-season-input"]').setValue('2026')
    await wrapper.find('[data-testid="plan-speichern-button"]').trigger('click')
    expect(wrapper.emitted('save')).toEqual([[{
      crop_id: 'crop-winterweizen',
      season_year: 2026,
      expected_yield_dt_ha: 90,
    }]])
  })

  it('validates that crop is required', async () => {
    const wrapper = mount(CropPlanForm, { props: { crops: mockCrops } })
    await wrapper.find('[data-testid="plan-season-input"]').setValue('2026')
    await wrapper.find('[data-testid="plan-speichern-button"]').trigger('click')
    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.find('[data-testid="plan-crop-error"]').exists()).toBe(true)
  })

  it('shows delete button only when editing', () => {
    const wrapper = mount(CropPlanForm, { props: { crops: mockCrops } })
    expect(wrapper.find('[data-testid="plan-loeschen-button"]').exists()).toBe(false)

    const plan: FieldCropPlan = {
      id: 'p1', field_id: 'f1', crop_id: 'crop-winterweizen',
      season_year: 2026, expected_yield_dt_ha: 80,
      synced: true, created_at: '', updated_at: '',
    }
    const wrapperEdit = mount(CropPlanForm, { props: { crops: mockCrops, plan } })
    expect(wrapperEdit.find('[data-testid="plan-loeschen-button"]').exists()).toBe(true)
  })

  it('emits delete when delete is confirmed', async () => {
    const plan: FieldCropPlan = {
      id: 'p1', field_id: 'f1', crop_id: 'crop-winterweizen',
      season_year: 2026, expected_yield_dt_ha: 80,
      synced: true, created_at: '', updated_at: '',
    }
    const wrapper = mount(CropPlanForm, { props: { crops: mockCrops, plan } })
    await wrapper.find('[data-testid="plan-loeschen-button"]').trigger('click')
    expect(wrapper.find('[data-testid="plan-loeschen-confirm-button"]').exists()).toBe(true)
    await wrapper.find('[data-testid="plan-loeschen-confirm-button"]').trigger('click')
    expect(wrapper.emitted('delete')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

```bash
npx vitest run src/components/CropPlanForm.test.ts
```

Expected: FAIL — `CropPlanForm.vue` existiert nicht.

- [ ] **Step 3: Implementierung**

`src/components/CropPlanForm.vue`:
```vue
<template>
  <form class="space-y-4" @submit.prevent="handleSave">
    <div>
      <label for="plan-crop" class="block text-sm font-medium text-gray-700">Kultur</label>
      <select
        id="plan-crop"
        v-model="cropId"
        data-testid="plan-crop-select"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
        :class="{ 'border-red-500': cropError }"
        @change="onCropChange"
      >
        <option value="">— Kultur wählen —</option>
        <option v-for="crop in crops" :key="crop.id" :value="crop.id">
          {{ crop.name_de }} ({{ crop.category }})
        </option>
      </select>
      <p v-if="cropError" data-testid="plan-crop-error" class="mt-1 text-sm text-red-600">
        {{ cropError }}
      </p>
    </div>

    <div>
      <label for="plan-season" class="block text-sm font-medium text-gray-700">Saison (Jahr)</label>
      <input
        id="plan-season"
        v-model.number="seasonYear"
        type="number"
        min="2020"
        max="2040"
        data-testid="plan-season-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
      />
    </div>

    <div>
      <label for="plan-yield" class="block text-sm font-medium text-gray-700">
        Erwarteter Ertrag (dt/ha)
      </label>
      <input
        id="plan-yield"
        v-model.number="expectedYield"
        type="number"
        step="0.1"
        min="0"
        data-testid="plan-yield-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
      />
      <p v-if="selectedCrop" class="mt-1 text-xs text-gray-400">
        Referenzertrag: {{ selectedCrop.ref_yield_dt_ha }} dt/ha
      </p>
    </div>

    <button
      type="submit"
      data-testid="plan-speichern-button"
      class="w-full rounded-lg bg-green-700 px-4 py-2 text-white font-medium hover:bg-green-800"
    >
      Speichern
    </button>

    <div v-if="plan" class="border-t border-gray-200 pt-4">
      <button
        v-if="!confirmDelete"
        type="button"
        data-testid="plan-loeschen-button"
        class="w-full rounded-lg border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
        @click="confirmDelete = true"
      >
        Planung löschen
      </button>
      <div v-else class="space-y-2">
        <p class="text-sm text-red-600">Planung wirklich löschen?</p>
        <button
          type="button"
          data-testid="plan-loeschen-confirm-button"
          class="w-full rounded-lg bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700"
          @click="$emit('delete')"
        >
          Endgültig löschen
        </button>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Crop, FieldCropPlan } from '@/types'

const props = defineProps<{
  crops: Crop[]
  plan?: FieldCropPlan
}>()

const emit = defineEmits<{
  save: [data: { crop_id: string; season_year: number; expected_yield_dt_ha: number }]
  delete: []
}>()

const cropId = ref(props.plan?.crop_id ?? '')
const seasonYear = ref(props.plan?.season_year ?? new Date().getFullYear())
const expectedYield = ref(props.plan?.expected_yield_dt_ha ?? 0)
const cropError = ref('')
const confirmDelete = ref(false)

const selectedCrop = computed(() => props.crops.find((c) => c.id === cropId.value))

function onCropChange() {
  const crop = selectedCrop.value
  if (crop && !props.plan) {
    expectedYield.value = crop.ref_yield_dt_ha
  }
}

function handleSave() {
  cropError.value = ''

  if (!cropId.value) {
    cropError.value = 'Bitte eine Kultur wählen.'
    return
  }

  emit('save', {
    crop_id: cropId.value,
    season_year: seasonYear.value,
    expected_yield_dt_ha: expectedYield.value,
  })
}
</script>
```

- [ ] **Step 4: Test ausführen — muss grün sein**

```bash
npx vitest run src/components/CropPlanForm.test.ts
```

Expected: PASS (alle 8 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/CropPlanForm.vue src/components/CropPlanForm.test.ts
git commit -m "feat: add CropPlanForm with crop selection, yield pre-fill, validation (TDD)"
```

---

### Task 44: CropPlanView — Anbauplanung pro Feld

**Files:**
- Modify: `src/views/CropPlanView.vue` (Placeholder aus Task 33 ersetzen)

- [ ] **Step 1: CropPlanView implementieren**

`src/views/CropPlanView.vue`:
```vue
<template>
  <AppLayout :title="fieldName ? `Planung: ${fieldName}` : 'Anbauplanung'" :show-back="true">
    <div class="space-y-4">
      <button
        data-testid="plan-anlegen-button"
        class="w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 hover:border-green-500 hover:text-green-700"
        @click="openNew"
      >
        + Planung anlegen
      </button>

      <p
        v-if="errorMessage"
        data-testid="plans-error"
        class="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600"
      >
        {{ errorMessage }}
      </p>

      <CropPlanList
        :plans="plans"
        :crops="crops"
        @select="openEdit"
        @navigate="navigateToRecommendation"
      />
    </div>

    <DrawerModal
      :open="drawerOpen"
      :title="editingPlan ? 'Planung bearbeiten' : 'Neue Planung'"
      @close="closeDrawer"
    >
      <CropPlanForm
        :crops="crops"
        :plan="editingPlan"
        @save="handleSave"
        @delete="handleDelete"
      />
    </DrawerModal>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getPlansForField, createPlan, updatePlan, deletePlan } from '@/services/field-crop-plan.service'
import { getCrops } from '@/services/crop.service'
import { getFields } from '@/services/field.service'
import { useAuthStore } from '@/stores/auth.store'
import type { FieldCropPlan, Crop } from '@/types'
import AppLayout from '@/components/AppLayout.vue'
import DrawerModal from '@/components/DrawerModal.vue'
import CropPlanList from '@/components/CropPlanList.vue'
import CropPlanForm from '@/components/CropPlanForm.vue'

const props = defineProps<{
  fieldId: string
}>()

const auth = useAuthStore()
const router = useRouter()

const plans = ref<FieldCropPlan[]>([])
const crops = ref<Crop[]>([])
const fieldName = ref('')
const drawerOpen = ref(false)
const editingPlan = ref<FieldCropPlan | undefined>()
const errorMessage = ref('')

async function loadData() {
  try {
    crops.value = await getCrops()
    plans.value = await getPlansForField(props.fieldId)

    // Feldname für Header laden
    if (auth.userId) {
      const fields = await getFields(auth.userId)
      const field = fields.find((f) => f.id === props.fieldId)
      fieldName.value = field?.name ?? ''
    }
  } catch (e) {
    console.error('Fehler beim Laden:', e)
    errorMessage.value = 'Daten konnten nicht geladen werden.'
  }
}

function openNew() {
  editingPlan.value = undefined
  drawerOpen.value = true
}

function openEdit(planId: string) {
  editingPlan.value = plans.value.find((p) => p.id === planId)
  drawerOpen.value = true
}

function closeDrawer() {
  drawerOpen.value = false
  editingPlan.value = undefined
}

function navigateToRecommendation(planId: string) {
  router.push({
    name: 'empfehlung',
    params: { fieldId: props.fieldId, planId },
  })
}

async function handleSave(data: { crop_id: string; season_year: number; expected_yield_dt_ha: number }) {
  errorMessage.value = ''
  try {
    if (editingPlan.value) {
      await updatePlan(editingPlan.value.id, data)
    } else {
      await createPlan({ ...data, field_id: props.fieldId })
    }
    closeDrawer()
    await loadData()
  } catch (e) {
    console.error('Fehler beim Speichern:', e)
    errorMessage.value = 'Fehler beim Speichern. Bitte erneut versuchen.'
  }
}

async function handleDelete() {
  if (!editingPlan.value) return
  errorMessage.value = ''
  try {
    await deletePlan(editingPlan.value.id)
    closeDrawer()
    await loadData()
  } catch (e) {
    console.error('Fehler beim Löschen:', e)
    errorMessage.value = 'Fehler beim Löschen. Bitte erneut versuchen.'
  }
}

onMounted(loadData)
</script>
```

- [ ] **Step 2: Prüfe, dass `deletePlan` im Service existiert**

Die Funktion `deletePlan` wurde im field-crop-plan.service (Task 21, Chunk 2) definiert. Falls nicht: ergänze analog zu `deleteField`.

- [ ] **Step 3: Commit**

```bash
git add src/views/CropPlanView.vue
git commit -m "feat: implement CropPlanView with plan CRUD, crop selection, and recommendation navigation"
```

---

### Task 45: Anbauplanung Smoke-Test

- [ ] **Step 1: Dev-Server starten und Anbauplanung manuell testen**

```bash
npm run dev
```

Prüfe im Browser:
1. Feld anlegen (falls noch keines existiert)
2. „Planung →" auf einem Feld klicken → CropPlanView
3. „+ Planung anlegen" → DrawerModal mit Kulturauswahl
4. Kultur wählen → Ertrag wird automatisch vorausgefüllt
5. Speichern → Plan in Liste sichtbar
6. Plan bearbeiten (Klick auf Plan)
7. „Empfehlung →" auf einem Plan → navigiert zu /empfehlung

- [ ] **Step 2: E2E-Tests ausführen**

```bash
npx playwright test tests/e2e/anbauplanung.spec.ts
```

---

## Chunk 6: Berechnungslogik + Düngeempfehlung

Das Herzstück der App: `useNutrientCalculation` berechnet den Nährstoffbedarf, `useRecommendation` orchestriert Berechnung → Produkt-Matching → Speichern. Dazu die UI-Komponenten RecommendationCard und ProductList, und die RecommendationView als Zusammenführung.

**Formel (für alle Nährstoffe identisch):**
```
empfehlung = demand_kg_ha + (expected_yield - ref_yield) × per_yield_correction
```

**Voraussetzungen:** Chunk 1–5

---

### Task 46: useNutrientCalculation — Kernlogik (TDD)

**Files:**
- Create: `src/composables/useNutrientCalculation.test.ts`
- Create: `src/composables/useNutrientCalculation.ts`

- [ ] **Step 1: Failing Tests schreiben**

`src/composables/useNutrientCalculation.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { useNutrientCalculation } from './useNutrientCalculation'
import type { CropNutrientDemand, NutrientType } from '@/types'

const NUTRIENT_TYPES: NutrientType[] = [
  { id: 'nt-n',    code: 'N',    label_de: 'Stickstoff', unit: 'kg/ha', sort_order: 1, is_system: true },
  { id: 'nt-p2o5', code: 'P2O5', label_de: 'Phosphat',   unit: 'kg/ha', sort_order: 2, is_system: true },
  { id: 'nt-k2o',  code: 'K2O',  label_de: 'Kalium',     unit: 'kg/ha', sort_order: 3, is_system: true },
  { id: 'nt-mgo',  code: 'MgO',  label_de: 'Magnesium',  unit: 'kg/ha', sort_order: 4, is_system: true },
  { id: 'nt-s',    code: 'S',    label_de: 'Schwefel',    unit: 'kg/ha', sort_order: 5, is_system: true },
]

// Winterweizen LfL-Daten: ref_yield=80, demand_n=230, per_yield_correction_n=1.0
const WINTERWEIZEN_DEMANDS: CropNutrientDemand[] = [
  { id: 'cnd-ww-n',  crop_id: 'crop-winterweizen', nutrient_type_id: 'nt-n',    demand_kg_ha: 230, ref_yield_dt_ha: 80, per_yield_correction: 1.0,  source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-ww-p',  crop_id: 'crop-winterweizen', nutrient_type_id: 'nt-p2o5', demand_kg_ha: 64,  ref_yield_dt_ha: 80, per_yield_correction: 0.80, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-ww-k',  crop_id: 'crop-winterweizen', nutrient_type_id: 'nt-k2o',  demand_kg_ha: 48,  ref_yield_dt_ha: 80, per_yield_correction: 0.60, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-ww-mg', crop_id: 'crop-winterweizen', nutrient_type_id: 'nt-mgo',  demand_kg_ha: 12.8, ref_yield_dt_ha: 80, per_yield_correction: 0.16, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
  { id: 'cnd-ww-s',  crop_id: 'crop-winterweizen', nutrient_type_id: 'nt-s',    demand_kg_ha: 9.6, ref_yield_dt_ha: 80, per_yield_correction: 0.12, source: 'lfl', user_id: null, valid_from: '2025-01-01' },
]

describe('useNutrientCalculation', () => {
  const { calculateNutrientDemand } = useNutrientCalculation()

  describe('calculateNutrientDemand', () => {
    it('calculates N demand at reference yield (no correction)', () => {
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 10)
      const n = results.find((r) => r.nutrient_code === 'N')!
      // 230 + (80 - 80) × 1.0 = 230
      expect(n.value_kg_ha).toBe(230)
      expect(n.value_kg_total).toBe(2300) // 230 × 10 ha
    })

    it('calculates N demand with higher yield (+10 dt/ha)', () => {
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 90, 10)
      const n = results.find((r) => r.nutrient_code === 'N')!
      // 230 + (90 - 80) × 1.0 = 240
      expect(n.value_kg_ha).toBe(240)
      expect(n.value_kg_total).toBe(2400)
    })

    it('calculates N demand with lower yield (-20 dt/ha)', () => {
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 60, 5)
      const n = results.find((r) => r.nutrient_code === 'N')!
      // 230 + (60 - 80) × 1.0 = 210
      expect(n.value_kg_ha).toBe(210)
      expect(n.value_kg_total).toBe(1050) // 210 × 5
    })

    it('calculates P2O5 demand at reference yield', () => {
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 12.5)
      const p = results.find((r) => r.nutrient_code === 'P2O5')!
      // 64 + (80 - 80) × 0.80 = 64
      expect(p.value_kg_ha).toBe(64)
      expect(p.value_kg_total).toBe(800) // 64 × 12.5
    })

    it('calculates P2O5 demand with yield correction', () => {
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 90, 10)
      const p = results.find((r) => r.nutrient_code === 'P2O5')!
      // 64 + (90 - 80) × 0.80 = 72
      expect(p.value_kg_ha).toBe(72)
    })

    it('calculates all 5 nutrients (N, P2O5, K2O, MgO, S)', () => {
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 10)
      expect(results).toHaveLength(5)
      expect(results.map((r) => r.nutrient_code)).toEqual(['N', 'P2O5', 'K2O', 'MgO', 'S'])
    })

    it('sorts results by nutrient sort_order', () => {
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 10)
      expect(results[0].nutrient_code).toBe('N')
      expect(results[4].nutrient_code).toBe('S')
    })

    it('returns empty array when no demands provided', () => {
      const results = calculateNutrientDemand([], NUTRIENT_TYPES, 80, 10)
      expect(results).toHaveLength(0)
    })

    it('sets nutrient_label and unit from NutrientType', () => {
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 80, 10)
      const n = results.find((r) => r.nutrient_code === 'N')!
      expect(n.nutrient_label).toBe('Stickstoff')
      expect(n.unit).toBe('kg/ha')
    })

    it('ensures value_kg_ha is never negative', () => {
      // Extremfall: yield viel niedriger als Referenz
      const results = calculateNutrientDemand(WINTERWEIZEN_DEMANDS, NUTRIENT_TYPES, 0, 1)
      const n = results.find((r) => r.nutrient_code === 'N')!
      // 230 + (0 - 80) × 1.0 = 150 — immer noch positiv
      expect(n.value_kg_ha).toBe(150)
      // Aber: Darf nie unter 0 fallen
      expect(n.value_kg_ha).toBeGreaterThanOrEqual(0)
    })
  })
})
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

```bash
npx vitest run src/composables/useNutrientCalculation.test.ts
```

Expected: FAIL — `useNutrientCalculation` existiert nicht.

- [ ] **Step 3: Implementierung**

`src/composables/useNutrientCalculation.ts`:
```typescript
import type { CropNutrientDemand, NutrientType, NutrientResult } from '@/types'

export function useNutrientCalculation() {
  /**
   * Berechnet den Nährstoffbedarf für alle vorhandenen Nährstoffe.
   *
   * Formel (identisch für alle Nährstoffe):
   *   empfehlung = demand_kg_ha + (expected_yield - ref_yield) × per_yield_correction
   *
   * @param demands - CropNutrientDemand-Einträge für die gewählte Kultur
   * @param nutrientTypes - Alle verfügbaren Nährstofftypen (für Label/Code/Sortierung)
   * @param expectedYieldDtHa - Vom Landwirt erwarteter Ertrag in dt/ha
   * @param fieldSizeHa - Feldgröße in Hektar
   */
  function calculateNutrientDemand(
    demands: CropNutrientDemand[],
    nutrientTypes: NutrientType[],
    expectedYieldDtHa: number,
    fieldSizeHa: number,
  ): NutrientResult[] {
    return demands
      .map((demand) => {
        const nutrient = nutrientTypes.find((nt) => nt.id === demand.nutrient_type_id)
        if (!nutrient) return null

        const yieldDiff = expectedYieldDtHa - demand.ref_yield_dt_ha
        const valueKgHa = Math.max(
          0,
          demand.demand_kg_ha + yieldDiff * demand.per_yield_correction,
        )

        return {
          nutrient_code: nutrient.code,
          nutrient_label: nutrient.label_de,
          value_kg_ha: Math.round(valueKgHa * 100) / 100,
          value_kg_total: Math.round(valueKgHa * fieldSizeHa * 100) / 100,
          unit: nutrient.unit,
        } satisfies NutrientResult
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

- [ ] **Step 4: Test ausführen — muss grün sein**

```bash
npx vitest run src/composables/useNutrientCalculation.test.ts
```

Expected: PASS (alle 10 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/composables/useNutrientCalculation.ts src/composables/useNutrientCalculation.test.ts
git commit -m "feat: add useNutrientCalculation composable with LfL-based demand formula (TDD)"
```

---

### Task 47: useRecommendation — Orchestrierung (TDD)

**Files:**
- Create: `src/composables/useRecommendation.test.ts`
- Create: `src/composables/useRecommendation.ts`

- [ ] **Step 1: Failing Tests schreiben**

`src/composables/useRecommendation.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { useRecommendation } from './useRecommendation'
import type { FertilizerProduct, NutrientResult } from '@/types'

const mockProducts: FertilizerProduct[] = [
  {
    id: 'fp-kas', name: 'KAS 27% N',
    n_pct: 27, p2o5_pct: 0, k2o_pct: 0, mgo_pct: 4, s_pct: 0,
    form: 'mineral', affiliate_url: '', shop_name: 'Dünger-Shop.de', active: true,
  },
  {
    id: 'fp-dap', name: 'DAP 18/46',
    n_pct: 18, p2o5_pct: 46, k2o_pct: 0, mgo_pct: 0, s_pct: 0,
    form: 'mineral', affiliate_url: '', shop_name: 'Dünger-Shop.de', active: true,
  },
  {
    id: 'fp-kornkali', name: 'Kornkali 40% K2O',
    n_pct: 0, p2o5_pct: 0, k2o_pct: 40, mgo_pct: 6, s_pct: 4,
    form: 'mineral', affiliate_url: '', shop_name: 'Dünger-Shop.de', active: true,
  },
]

describe('useRecommendation', () => {
  const { matchProducts } = useRecommendation()

  describe('matchProducts', () => {
    it('matches N product for nitrogen demand', () => {
      const results: NutrientResult[] = [
        { nutrient_code: 'N', nutrient_label: 'Stickstoff', value_kg_ha: 230, value_kg_total: 2300, unit: 'kg/ha' },
      ]
      const matches = matchProducts(results, mockProducts)
      const nMatch = matches.find((m) => m.product.id === 'fp-kas')
      expect(nMatch).toBeDefined()
      // 230 kg N/ha ÷ 0.27 = 851.85 kg KAS/ha
      expect(nMatch!.amount_kg_ha).toBeCloseTo(851.85, 0)
    })

    it('matches P2O5 product for phosphate demand', () => {
      const results: NutrientResult[] = [
        { nutrient_code: 'P2O5', nutrient_label: 'Phosphat', value_kg_ha: 64, value_kg_total: 640, unit: 'kg/ha' },
      ]
      const matches = matchProducts(results, mockProducts)
      const pMatch = matches.find((m) => m.product.id === 'fp-dap')
      expect(pMatch).toBeDefined()
      // 64 kg P2O5/ha ÷ 0.46 = 139.13 kg DAP/ha
      expect(pMatch!.amount_kg_ha).toBeCloseTo(139.13, 0)
    })

    it('calculates total amount based on field size', () => {
      const results: NutrientResult[] = [
        { nutrient_code: 'N', nutrient_label: 'Stickstoff', value_kg_ha: 230, value_kg_total: 2300, unit: 'kg/ha' },
      ]
      const matches = matchProducts(results, mockProducts)
      const nMatch = matches.find((m) => m.product.id === 'fp-kas')!
      // 2300 kg N ÷ 0.27 = 8518.52 kg KAS total
      expect(nMatch.amount_kg_total).toBeCloseTo(8518.52, 0)
    })

    it('returns empty array when no demand', () => {
      const matches = matchProducts([], mockProducts)
      expect(matches).toHaveLength(0)
    })

    it('skips nutrients with no matching product', () => {
      const results: NutrientResult[] = [
        { nutrient_code: 'Ca', nutrient_label: 'Calcium', value_kg_ha: 50, value_kg_total: 500, unit: 'kg/ha' },
      ]
      const matches = matchProducts(results, mockProducts)
      expect(matches).toHaveLength(0)
    })
  })
})
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

```bash
npx vitest run src/composables/useRecommendation.test.ts
```

Expected: FAIL — `useRecommendation` existiert nicht.

- [ ] **Step 3: Implementierung**

`src/composables/useRecommendation.ts`:
```typescript
import type { NutrientResult, FertilizerProduct, ProductMatch } from '@/types'

// Mapping: Nährstoff-Code → Produkt-Property für den %-Anteil
const NUTRIENT_TO_PCT: Record<string, keyof FertilizerProduct> = {
  N: 'n_pct',
  P2O5: 'p2o5_pct',
  K2O: 'k2o_pct',
  MgO: 'mgo_pct',
  S: 's_pct',
}

export function useRecommendation() {
  /**
   * Findet für jeden Nährstoffbedarf das beste Einzelprodukt.
   * Wählt das Produkt mit dem höchsten %-Anteil für den jeweiligen Nährstoff.
   */
  function matchProducts(
    nutrientResults: NutrientResult[],
    products: FertilizerProduct[],
  ): ProductMatch[] {
    const matches: ProductMatch[] = []

    for (const result of nutrientResults) {
      const pctKey = NUTRIENT_TO_PCT[result.nutrient_code]
      if (!pctKey) continue

      // Finde das Produkt mit dem höchsten Anteil dieses Nährstoffs
      const bestProduct = products
        .filter((p) => (p[pctKey] as number) > 0)
        .sort((a, b) => (b[pctKey] as number) - (a[pctKey] as number))[0]

      if (!bestProduct) continue

      const pct = bestProduct[pctKey] as number
      const amountKgHa = Math.round((result.value_kg_ha / (pct / 100)) * 100) / 100
      const amountKgTotal = Math.round((result.value_kg_total / (pct / 100)) * 100) / 100

      matches.push({
        product: bestProduct,
        amount_kg_ha: amountKgHa,
        amount_kg_total: amountKgTotal,
      })
    }

    return matches
  }

  return { matchProducts }
}
```

- [ ] **Step 4: Test ausführen — muss grün sein**

```bash
npx vitest run src/composables/useRecommendation.test.ts
```

Expected: PASS (alle 5 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/composables/useRecommendation.ts src/composables/useRecommendation.test.ts
git commit -m "feat: add useRecommendation composable with product matching (TDD)"
```

---

### Task 48: RecommendationCard — Nährstoff-Ergebnisanzeige (TDD)

**Files:**
- Create: `src/components/RecommendationCard.test.ts`
- Create: `src/components/RecommendationCard.vue`

- [ ] **Step 1: Failing Tests schreiben**

`src/components/RecommendationCard.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RecommendationCard from './RecommendationCard.vue'
import type { NutrientResult } from '@/types'

const mockResults: NutrientResult[] = [
  { nutrient_code: 'N', nutrient_label: 'Stickstoff', value_kg_ha: 230, value_kg_total: 2300, unit: 'kg/ha' },
  { nutrient_code: 'P2O5', nutrient_label: 'Phosphat', value_kg_ha: 64, value_kg_total: 640, unit: 'kg/ha' },
]

describe('RecommendationCard', () => {
  it('renders all nutrient results', () => {
    const wrapper = mount(RecommendationCard, { props: { results: mockResults } })
    expect(wrapper.findAll('[data-testid^="nutrient-row-"]')).toHaveLength(2)
  })

  it('displays nutrient code and value per ha', () => {
    const wrapper = mount(RecommendationCard, { props: { results: mockResults } })
    const nRow = wrapper.find('[data-testid="nutrient-row-N"]')
    expect(nRow.text()).toContain('N')
    expect(nRow.text()).toContain('230')
    expect(nRow.text()).toContain('kg N/ha')
  })

  it('displays total value', () => {
    const wrapper = mount(RecommendationCard, { props: { results: mockResults } })
    const nRow = wrapper.find('[data-testid="nutrient-row-N"]')
    expect(nRow.text()).toContain('2.300')
  })

  it('renders nothing when no results', () => {
    const wrapper = mount(RecommendationCard, { props: { results: [] } })
    expect(wrapper.find('[data-testid="recommendation-card"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

```bash
npx vitest run src/components/RecommendationCard.test.ts
```

Expected: FAIL — `RecommendationCard.vue` existiert nicht.

- [ ] **Step 3: Implementierung**

`src/components/RecommendationCard.vue`:
```vue
<template>
  <div v-if="results.length > 0" data-testid="recommendation-card" class="rounded-xl border border-gray-200 bg-white p-4">
    <h3 class="mb-3 text-sm font-semibold text-gray-700">Nährstoffbedarf</h3>
    <div class="space-y-2">
      <div
        v-for="result in results"
        :key="result.nutrient_code"
        :data-testid="`nutrient-row-${result.nutrient_code}`"
        class="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NutrientResult } from '@/types'
import NumberDisplay from './NumberDisplay.vue'

defineProps<{
  results: NutrientResult[]
}>()
</script>
```

- [ ] **Step 4: Test ausführen — muss grün sein**

```bash
npx vitest run src/components/RecommendationCard.test.ts
```

Expected: PASS (alle 4 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/RecommendationCard.vue src/components/RecommendationCard.test.ts
git commit -m "feat: add RecommendationCard component with nutrient display (TDD)"
```

---

### Task 49: ProductList — Produktempfehlungen mit Affiliate-Links (TDD)

**Files:**
- Create: `src/components/ProductList.test.ts`
- Create: `src/components/ProductList.vue`

- [ ] **Step 1: Failing Tests schreiben**

`src/components/ProductList.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProductList from './ProductList.vue'
import type { ProductMatch } from '@/types'

const mockMatches: ProductMatch[] = [
  {
    product: {
      id: 'fp-kas', name: 'KAS 27% N',
      n_pct: 27, p2o5_pct: 0, k2o_pct: 0, mgo_pct: 4, s_pct: 0,
      form: 'mineral', affiliate_url: 'https://shop.example.com/kas', shop_name: 'Dünger-Shop.de', active: true,
    },
    amount_kg_ha: 851.85,
    amount_kg_total: 8518.52,
  },
  {
    product: {
      id: 'fp-dap', name: 'DAP 18/46',
      n_pct: 18, p2o5_pct: 46, k2o_pct: 0, mgo_pct: 0, s_pct: 0,
      form: 'mineral', affiliate_url: '', shop_name: 'Dünger-Shop.de', active: true,
    },
    amount_kg_ha: 139.13,
    amount_kg_total: 1391.3,
  },
]

describe('ProductList', () => {
  it('renders all product matches', () => {
    const wrapper = mount(ProductList, { props: { matches: mockMatches } })
    expect(wrapper.findAll('[data-testid^="product-item-"]')).toHaveLength(2)
  })

  it('displays product name and amount', () => {
    const wrapper = mount(ProductList, { props: { matches: mockMatches } })
    const item = wrapper.find('[data-testid="product-item-fp-kas"]')
    expect(item.text()).toContain('KAS 27% N')
    expect(item.text()).toContain('851')
  })

  it('shows affiliate link when URL is set', () => {
    const wrapper = mount(ProductList, { props: { matches: mockMatches } })
    const link = wrapper.find('[data-testid="product-link-fp-kas"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('https://shop.example.com/kas')
    expect(link.text()).toContain('Dünger-Shop.de')
  })

  it('hides affiliate link when URL is empty', () => {
    const wrapper = mount(ProductList, { props: { matches: mockMatches } })
    expect(wrapper.find('[data-testid="product-link-fp-dap"]').exists()).toBe(false)
  })

  it('renders nothing when no matches', () => {
    const wrapper = mount(ProductList, { props: { matches: [] } })
    expect(wrapper.find('[data-testid="product-list"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

```bash
npx vitest run src/components/ProductList.test.ts
```

Expected: FAIL — `ProductList.vue` existiert nicht.

- [ ] **Step 3: Implementierung**

`src/components/ProductList.vue`:
```vue
<template>
  <div v-if="matches.length > 0" data-testid="product-list" class="rounded-xl border border-gray-200 bg-white p-4">
    <h3 class="mb-3 text-sm font-semibold text-gray-700">Empfohlene Düngerprodukte</h3>
    <div class="space-y-3">
      <div
        v-for="match in matches"
        :key="match.product.id"
        :data-testid="`product-item-${match.product.id}`"
        class="rounded-lg border border-gray-100 bg-gray-50 p-3"
      >
        <div class="flex items-start justify-between">
          <div>
            <p class="font-medium text-sm">{{ match.product.name }}</p>
            <p class="text-xs text-gray-500 mt-1">
              <NumberDisplay :value="match.amount_kg_ha" format="nutrient-per-ha" code="Produkt" />
              · gesamt: {{ formatKg(match.amount_kg_total) }}
            </p>
          </div>
          <a
            v-if="match.product.affiliate_url"
            :href="match.product.affiliate_url"
            :data-testid="`product-link-${match.product.id}`"
            target="_blank"
            rel="noopener noreferrer"
            class="shrink-0 rounded-lg bg-green-700 px-3 py-1 text-xs font-medium text-white hover:bg-green-800"
          >
            {{ match.product.shop_name }} →
          </a>
        </div>
      </div>
    </div>
    <p class="mt-3 text-xs text-gray-400">
      Shop-Links sind Affiliate-Links. Bei Kauf erhalten wir eine Provision.
    </p>
  </div>
</template>

<script setup lang="ts">
import type { ProductMatch } from '@/types'
import NumberDisplay from './NumberDisplay.vue'
import { useNumberFormat } from '@/composables/useNumberFormat'

defineProps<{
  matches: ProductMatch[]
}>()

const { formatNumber } = useNumberFormat()

function formatKg(kg: number): string {
  return `${formatNumber(kg)} kg`
}
</script>
```

- [ ] **Step 4: Test ausführen — muss grün sein**

```bash
npx vitest run src/components/ProductList.test.ts
```

Expected: PASS (alle 5 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ProductList.vue src/components/ProductList.test.ts
git commit -m "feat: add ProductList component with affiliate links (TDD)"
```

---

### Task 50: E2E-Test — Empfehlungs-Workflow (Test zuerst)

**Files:**
- Create: `tests/e2e/empfehlung.spec.ts`

- [ ] **Step 1: E2E-Test schreiben**

`tests/e2e/empfehlung.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Düngeempfehlung', () => {
  // TODO: Auth-Setup + Feld + Plan Fixture

  test('shows recommendation card with nutrient values', async ({ page }) => {
    // Navigiere zu einer existierenden Empfehlung
    await page.goto('/felder/test-field-id/planung/test-plan-id/empfehlung')
    await expect(page.getByTestId('recommendation-card')).toBeVisible()
    await expect(page.getByTestId('nutrient-row-N')).toBeVisible()
  })

  test('shows product list with affiliate links', async ({ page }) => {
    await page.goto('/felder/test-field-id/planung/test-plan-id/empfehlung')
    await expect(page.getByTestId('product-list')).toBeVisible()
  })

  test('can recalculate recommendation', async ({ page }) => {
    await page.goto('/felder/test-field-id/planung/test-plan-id/empfehlung')
    await page.getByTestId('empfehlung-berechnen-button').click()
    await expect(page.getByTestId('recommendation-card')).toBeVisible()
  })

  test('displays field and crop context', async ({ page }) => {
    await page.goto('/felder/test-field-id/planung/test-plan-id/empfehlung')
    await expect(page.getByTestId('empfehlung-context')).toBeVisible()
  })
})
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/empfehlung.spec.ts
git commit -m "test: add E2E tests for Düngeempfehlung workflow"
```

---

### Task 51: RecommendationView — Empfehlungsanzeige

**Files:**
- Modify: `src/views/RecommendationView.vue` (Placeholder aus Task 33 ersetzen)

- [ ] **Step 1: RecommendationView implementieren**

`src/views/RecommendationView.vue`:
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

      <button
        data-testid="empfehlung-berechnen-button"
        class="w-full rounded-lg bg-green-700 px-4 py-2 text-white font-medium hover:bg-green-800 disabled:opacity-50"
        :disabled="calculating"
        @click="calculate"
      >
        {{ calculating ? 'Berechne…' : (nutrientResults.length > 0 ? 'Neu berechnen' : 'Empfehlung berechnen') }}
      </button>

      <RecommendationCard :results="nutrientResults" />
      <ProductList :matches="productMatches" />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { getPlansForField } from '@/services/field-crop-plan.service'
import { getCrops } from '@/services/crop.service'
import { getNutrientDemands } from '@/services/crop.service'
import { getNutrientTypes } from '@/services/nutrient.service'
import { getProducts } from '@/services/product.service'
import { getFields } from '@/services/field.service'
import { saveRecommendation, getRecommendation } from '@/services/recommendation.service'
import { useNutrientCalculation } from '@/composables/useNutrientCalculation'
import { useRecommendation } from '@/composables/useRecommendation'
import type { FieldCropPlan, Crop, NutrientResult, ProductMatch } from '@/types'
import AppLayout from '@/components/AppLayout.vue'
import NumberDisplay from '@/components/NumberDisplay.vue'
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
const nutrientResults = ref<NutrientResult[]>([])
const productMatches = ref<ProductMatch[]>([])
const calculating = ref(false)
const errorMessage = ref('')

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

    // Lade vorhandene Empfehlung, falls bereits berechnet
    const existing = await getRecommendation(props.planId)
    if (existing) {
      await rebuildResultsFromRecommendation(existing.values)
    }
  } catch (e) {
    console.error('Fehler beim Laden:', e)
    errorMessage.value = 'Daten konnten nicht geladen werden.'
  }
}

async function rebuildResultsFromRecommendation(
  values: { nutrient_type_id: string; value_kg_ha: number; value_kg_total: number; source_used: string }[],
) {
  const nutrientTypes = await getNutrientTypes()
  nutrientResults.value = values
    .map((v) => {
      const nt = nutrientTypes.find((n) => n.id === v.nutrient_type_id)
      if (!nt) return null
      return {
        nutrient_code: nt.code,
        nutrient_label: nt.label_de,
        value_kg_ha: v.value_kg_ha,
        value_kg_total: v.value_kg_total,
        unit: nt.unit,
      } satisfies NutrientResult
    })
    .filter((r): r is NutrientResult => r !== null)
    .sort((a, b) => {
      const allNt = nutrientTypes
      const orderA = allNt.find((nt) => nt.code === a.nutrient_code)?.sort_order ?? 99
      const orderB = allNt.find((nt) => nt.code === b.nutrient_code)?.sort_order ?? 99
      return orderA - orderB
    })

  const products = await getProducts()
  productMatches.value = matchProducts(nutrientResults.value, products)
}

async function calculate() {
  if (!plan.value || !crop.value) return
  calculating.value = true
  errorMessage.value = ''

  try {
    const nutrientTypes = await getNutrientTypes()
    const demands = await getNutrientDemands(plan.value.crop_id)
    const products = await getProducts()

    nutrientResults.value = calculateNutrientDemand(
      demands,
      nutrientTypes,
      plan.value.expected_yield_dt_ha,
      fieldSizeHa.value,
    )

    productMatches.value = matchProducts(nutrientResults.value, products)

    // Ergebnis speichern
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
  } finally {
    calculating.value = false
  }
}

onMounted(loadData)
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/views/RecommendationView.vue
git commit -m "feat: implement RecommendationView with calculation, product matching, and persistence"
```

---

### Task 52: ARC42 aktualisieren — Berechnungslogik

**Files:**
- Modify: `docs/arc42/08-concepts.md`

- [ ] **Step 1: Querschnittliches Konzept Berechnungslogik dokumentieren**

In `docs/arc42/08-concepts.md` ergänzen:

```markdown
## Berechnungslogik

### Nährstoffberechnung (Stufe 1 / MVP)

Für alle Nährstoffe (N, P2O5, K2O, MgO, S) gilt dieselbe Formel:

```
empfehlung_kg_ha = demand_kg_ha + (expected_yield - ref_yield) × per_yield_correction
empfehlung_kg_total = empfehlung_kg_ha × field_size_ha
```

- `demand_kg_ha`: LfL-Bedarfswert aus `crop_nutrient_demands`
- `ref_yield`: Referenzertrag der Kultur
- `expected_yield`: Vom Landwirt eingegebener erwarteter Ertrag
- `per_yield_correction`: Korrektur pro dt Ertragsabweichung
  - N: Wert aus Tab. 9a (typisch 1.0 kg N / dt)
  - P2O5/K2O/MgO/S: Nährstoffgehalt in kg/dt aus Tab. 1a

Die Berechnung lebt ausschließlich in `useNutrientCalculation.ts`. Kein anderer Teil der App berechnet Nährstoffwerte.

### Produkt-Matching

Für jeden berechneten Nährstoffbedarf wird das Produkt mit dem höchsten %-Anteil des jeweiligen Nährstoffs empfohlen:

```
produkt_menge_kg_ha = empfehlung_kg_ha / (produkt_nährstoff_pct / 100)
```

### Offline-Berechnung

Die Berechnung läuft identisch online wie offline. Einziger Unterschied: `calculated_offline: true` wird in der Empfehlung gespeichert. Alle benötigten Daten (Kulturen, Nährstoffwerte, Produkte) werden aus IndexedDB geladen (Fallback auf `src/constants/` Seed-Daten).
```

- [ ] **Step 2: Commit**

```bash
git add docs/arc42/08-concepts.md
git commit -m "docs: add ARC42 cross-cutting concept for nutrient calculation logic"
```

---

## Chunk 7: Admin-Bereich (Kulturen, Nährstoffwerte, Produkte)

Admin-CRUD für Stammdaten. Nur online verfügbar, rollenbasiert (Route Guard prüft `isAdminUser`). Alle drei Bereiche (Kulturen, Nährstoffwerte, Produkte) folgen dem gleichen Muster: Tab → Liste → DrawerModal → Speichern. Kein Offline-Support nötig.

**Voraussetzungen:** Chunk 1–6 (insbesondere Services aus Chunk 2 mit Admin-CRUD-Funktionen)

---

### Task 53: AdminCropList + AdminCropForm (TDD)

**Files:**
- Create: `src/components/AdminCropList.test.ts`
- Create: `src/components/AdminCropList.vue`
- Create: `src/components/AdminCropForm.test.ts`
- Create: `src/components/AdminCropForm.vue`

- [ ] **Step 1: Failing Tests für AdminCropList**

`src/components/AdminCropList.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AdminCropList from './AdminCropList.vue'
import type { Crop } from '@/types'

const mockCrops: Crop[] = [
  {
    id: 'crop-winterweizen', name_de: 'Winterweizen', category: 'Getreide',
    sow_month_from: 9, sow_month_to: 11, harvest_month_from: 7, harvest_month_to: 8,
    ref_yield_dt_ha: 80, nmin_depth_cm: 90,
  },
  {
    id: 'crop-wintergerste', name_de: 'Wintergerste', category: 'Getreide',
    sow_month_from: 9, sow_month_to: 10, harvest_month_from: 6, harvest_month_to: 7,
    ref_yield_dt_ha: 70, nmin_depth_cm: 90,
  },
]

describe('AdminCropList', () => {
  it('renders list of crops', () => {
    const wrapper = mount(AdminCropList, { props: { crops: mockCrops } })
    expect(wrapper.findAll('[data-testid^="admin-crop-item-"]')).toHaveLength(2)
  })

  it('displays crop name and category', () => {
    const wrapper = mount(AdminCropList, { props: { crops: mockCrops } })
    const item = wrapper.find('[data-testid="admin-crop-item-crop-winterweizen"]')
    expect(item.text()).toContain('Winterweizen')
    expect(item.text()).toContain('Getreide')
  })

  it('emits select when crop is clicked', async () => {
    const wrapper = mount(AdminCropList, { props: { crops: mockCrops } })
    await wrapper.find('[data-testid="admin-crop-item-crop-winterweizen"]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['crop-winterweizen']])
  })
})
```

- [ ] **Step 2: Failing Tests für AdminCropForm**

`src/components/AdminCropForm.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AdminCropForm from './AdminCropForm.vue'
import type { Crop } from '@/types'

describe('AdminCropForm', () => {
  it('renders empty form for new crop', () => {
    const wrapper = mount(AdminCropForm, { props: {} })
    expect(wrapper.find('[data-testid="admin-crop-name-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-crop-category-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-crop-ref-yield-input"]').exists()).toBe(true)
  })

  it('pre-fills when editing', () => {
    const crop: Crop = {
      id: 'c1', name_de: 'Winterweizen', category: 'Getreide',
      sow_month_from: 9, sow_month_to: 11, harvest_month_from: 7, harvest_month_to: 8,
      ref_yield_dt_ha: 80, nmin_depth_cm: 90,
    }
    const wrapper = mount(AdminCropForm, { props: { crop } })
    const nameInput = wrapper.find('[data-testid="admin-crop-name-input"]').element as HTMLInputElement
    expect(nameInput.value).toBe('Winterweizen')
  })

  it('emits save with all form data', async () => {
    const wrapper = mount(AdminCropForm, { props: {} })
    await wrapper.find('[data-testid="admin-crop-name-input"]').setValue('Sommergerste')
    await wrapper.find('[data-testid="admin-crop-category-input"]').setValue('Getreide')
    await wrapper.find('[data-testid="admin-crop-sow-from-input"]').setValue('3')
    await wrapper.find('[data-testid="admin-crop-sow-to-input"]').setValue('4')
    await wrapper.find('[data-testid="admin-crop-harvest-from-input"]').setValue('7')
    await wrapper.find('[data-testid="admin-crop-harvest-to-input"]').setValue('8')
    await wrapper.find('[data-testid="admin-crop-ref-yield-input"]').setValue('60')
    await wrapper.find('[data-testid="admin-crop-nmin-depth-select"]').setValue('90')
    await wrapper.find('[data-testid="admin-crop-speichern-button"]').trigger('click')
    expect(wrapper.emitted('save')).toBeDefined()
    const emitted = wrapper.emitted('save')![0][0] as Omit<Crop, 'id'>
    expect(emitted.name_de).toBe('Sommergerste')
    expect(emitted.category).toBe('Getreide')
    expect(emitted.sow_month_from).toBe(3)
    expect(emitted.sow_month_to).toBe(4)
    expect(emitted.harvest_month_from).toBe(7)
    expect(emitted.harvest_month_to).toBe(8)
    expect(emitted.ref_yield_dt_ha).toBe(60)
    expect(emitted.nmin_depth_cm).toBe(90)
  })

  it('shows delete button when editing and emits delete on click', async () => {
    const crop: Crop = {
      id: 'c1', name_de: 'Test', category: 'Getreide',
      sow_month_from: 9, sow_month_to: 11, harvest_month_from: 7, harvest_month_to: 8,
      ref_yield_dt_ha: 80, nmin_depth_cm: 90,
    }
    const wrapper = mount(AdminCropForm, { props: { crop } })
    expect(wrapper.find('[data-testid="admin-crop-loeschen-button"]').exists()).toBe(true)
    await wrapper.find('[data-testid="admin-crop-loeschen-button"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeDefined()
  })

  it('hides delete button for new crop', () => {
    const wrapper = mount(AdminCropForm, { props: {} })
    expect(wrapper.find('[data-testid="admin-crop-loeschen-button"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 3: Tests ausführen — müssen fehlschlagen**

```bash
npx vitest run src/components/AdminCropList.test.ts src/components/AdminCropForm.test.ts
```

Expected: FAIL — Dateien existieren nicht.

- [ ] **Step 4: AdminCropList implementieren**

`src/components/AdminCropList.vue`:
```vue
<template>
  <ul class="space-y-2">
    <li
      v-for="crop in crops"
      :key="crop.id"
      :data-testid="`admin-crop-item-${crop.id}`"
      class="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50"
      @click="$emit('select', crop.id)"
    >
      <div>
        <p class="font-medium">{{ crop.name_de }}</p>
        <p class="text-sm text-gray-500">{{ crop.category }} · Ref: {{ crop.ref_yield_dt_ha }} dt/ha</p>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { Crop } from '@/types'

defineProps<{
  crops: Crop[]
}>()

defineEmits<{
  select: [cropId: string]
}>()
</script>
```

- [ ] **Step 5: AdminCropForm implementieren**

`src/components/AdminCropForm.vue`:
```vue
<template>
  <form class="space-y-4" @submit.prevent="handleSave">
    <div>
      <label class="block text-sm font-medium text-gray-700">Kulturname (deutsch)</label>
      <input v-model="nameDe" type="text" required data-testid="admin-crop-name-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700">Kategorie</label>
      <input v-model="category" type="text" required data-testid="admin-crop-category-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Aussaat von (Monat)</label>
        <input v-model.number="sowFrom" type="number" min="1" max="12" data-testid="admin-crop-sow-from-input"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Aussaat bis (Monat)</label>
        <input v-model.number="sowTo" type="number" min="1" max="12" data-testid="admin-crop-sow-to-input"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Ernte von (Monat)</label>
        <input v-model.number="harvestFrom" type="number" min="1" max="12" data-testid="admin-crop-harvest-from-input"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Ernte bis (Monat)</label>
        <input v-model.number="harvestTo" type="number" min="1" max="12" data-testid="admin-crop-harvest-to-input"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Referenzertrag (dt/ha)</label>
        <input v-model.number="refYield" type="number" step="0.1" min="0" data-testid="admin-crop-ref-yield-input"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Nmin-Tiefe (cm)</label>
        <select v-model.number="nminDepth" data-testid="admin-crop-nmin-depth-select"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2">
          <option :value="0">0 (keine)</option>
          <option :value="60">60</option>
          <option :value="90">90</option>
        </select>
      </div>
    </div>

    <button type="submit" data-testid="admin-crop-speichern-button"
      class="w-full rounded-lg bg-green-700 px-4 py-2 text-white font-medium hover:bg-green-800">
      Speichern
    </button>

    <button v-if="crop" type="button" data-testid="admin-crop-loeschen-button"
      class="w-full rounded-lg border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
      @click="$emit('delete')">
      Kultur löschen
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Crop } from '@/types'

const props = defineProps<{
  crop?: Crop
}>()

const emit = defineEmits<{
  save: [data: Omit<Crop, 'id'>]
  delete: []
}>()

const nameDe = ref(props.crop?.name_de ?? '')
const category = ref(props.crop?.category ?? '')
const sowFrom = ref(props.crop?.sow_month_from ?? 1)
const sowTo = ref(props.crop?.sow_month_to ?? 1)
const harvestFrom = ref(props.crop?.harvest_month_from ?? 1)
const harvestTo = ref(props.crop?.harvest_month_to ?? 1)
const refYield = ref(props.crop?.ref_yield_dt_ha ?? 0)
const nminDepth = ref(props.crop?.nmin_depth_cm ?? 90)

function handleSave() {
  emit('save', {
    name_de: nameDe.value,
    category: category.value,
    sow_month_from: Number(sowFrom.value),
    sow_month_to: Number(sowTo.value),
    harvest_month_from: Number(harvestFrom.value),
    harvest_month_to: Number(harvestTo.value),
    ref_yield_dt_ha: Number(refYield.value),
    nmin_depth_cm: Number(nminDepth.value),
  })
}
</script>
```

- [ ] **Step 6: Tests ausführen — müssen grün sein**

```bash
npx vitest run src/components/AdminCropList.test.ts src/components/AdminCropForm.test.ts
```

Expected: PASS (3 + 5 = 8 Tests)

- [ ] **Step 7: Commit**

```bash
git add src/components/AdminCropList.vue src/components/AdminCropList.test.ts src/components/AdminCropForm.vue src/components/AdminCropForm.test.ts
git commit -m "feat: add AdminCropList and AdminCropForm components (TDD)"
```

---

### Task 54: AdminNutrientList + AdminNutrientForm (TDD)

**Files:**
- Create: `src/components/AdminNutrientList.test.ts`
- Create: `src/components/AdminNutrientList.vue`
- Create: `src/components/AdminNutrientForm.test.ts`
- Create: `src/components/AdminNutrientForm.vue`

- [ ] **Step 1: Failing Tests für AdminNutrientList**

`src/components/AdminNutrientList.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AdminNutrientList from './AdminNutrientList.vue'
import type { CropNutrientDemand, NutrientType, Crop } from '@/types'

const mockNutrientTypes: NutrientType[] = [
  { id: 'nt-n', code: 'N', label_de: 'Stickstoff', unit: 'kg/ha', sort_order: 1, is_system: true },
]

const mockCrops: Crop[] = [
  {
    id: 'crop-winterweizen', name_de: 'Winterweizen', category: 'Getreide',
    sow_month_from: 9, sow_month_to: 11, harvest_month_from: 7, harvest_month_to: 8,
    ref_yield_dt_ha: 80, nmin_depth_cm: 90,
  },
]

const mockDemands: CropNutrientDemand[] = [
  {
    id: 'cnd-1', crop_id: 'crop-winterweizen', nutrient_type_id: 'nt-n',
    demand_kg_ha: 230, ref_yield_dt_ha: 80, per_yield_correction: 1.0,
    source: 'lfl', user_id: null, valid_from: '2025-01-01',
  },
]

describe('AdminNutrientList', () => {
  it('renders list of demands', () => {
    const wrapper = mount(AdminNutrientList, {
      props: { demands: mockDemands, nutrientTypes: mockNutrientTypes, crops: mockCrops },
    })
    expect(wrapper.findAll('[data-testid^="admin-nutrient-item-"]')).toHaveLength(1)
  })

  it('displays crop name, nutrient code, and demand', () => {
    const wrapper = mount(AdminNutrientList, {
      props: { demands: mockDemands, nutrientTypes: mockNutrientTypes, crops: mockCrops },
    })
    const item = wrapper.find('[data-testid="admin-nutrient-item-cnd-1"]')
    expect(item.text()).toContain('Winterweizen')
    expect(item.text()).toContain('N')
    expect(item.text()).toContain('230')
  })

  it('emits select when demand is clicked', async () => {
    const wrapper = mount(AdminNutrientList, {
      props: { demands: mockDemands, nutrientTypes: mockNutrientTypes, crops: mockCrops },
    })
    await wrapper.find('[data-testid="admin-nutrient-item-cnd-1"]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['cnd-1']])
  })
})
```

- [ ] **Step 2: Failing Tests für AdminNutrientForm**

`src/components/AdminNutrientForm.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AdminNutrientForm from './AdminNutrientForm.vue'
import type { Crop, NutrientType, CropNutrientDemand } from '@/types'

const mockCrops: Crop[] = [
  {
    id: 'crop-winterweizen', name_de: 'Winterweizen', category: 'Getreide',
    sow_month_from: 9, sow_month_to: 11, harvest_month_from: 7, harvest_month_to: 8,
    ref_yield_dt_ha: 80, nmin_depth_cm: 90,
  },
]

const mockNutrientTypes: NutrientType[] = [
  { id: 'nt-n', code: 'N', label_de: 'Stickstoff', unit: 'kg/ha', sort_order: 1, is_system: true },
  { id: 'nt-p2o5', code: 'P2O5', label_de: 'Phosphat', unit: 'kg/ha', sort_order: 2, is_system: true },
]

describe('AdminNutrientForm', () => {
  it('renders crop and nutrient selects', () => {
    const wrapper = mount(AdminNutrientForm, {
      props: { crops: mockCrops, nutrientTypes: mockNutrientTypes },
    })
    expect(wrapper.find('[data-testid="admin-nutrient-crop-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-nutrient-type-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-nutrient-demand-input"]').exists()).toBe(true)
  })

  it('emits save with form data', async () => {
    const wrapper = mount(AdminNutrientForm, {
      props: { crops: mockCrops, nutrientTypes: mockNutrientTypes },
    })
    await wrapper.find('[data-testid="admin-nutrient-crop-select"]').setValue('crop-winterweizen')
    await wrapper.find('[data-testid="admin-nutrient-type-select"]').setValue('nt-n')
    await wrapper.find('[data-testid="admin-nutrient-demand-input"]').setValue('230')
    await wrapper.find('[data-testid="admin-nutrient-ref-yield-input"]').setValue('80')
    await wrapper.find('[data-testid="admin-nutrient-correction-input"]').setValue('1.0')
    await wrapper.find('[data-testid="admin-nutrient-speichern-button"]').trigger('click')
    expect(wrapper.emitted('save')).toBeDefined()
    const emitted = wrapper.emitted('save')![0][0] as Record<string, unknown>
    expect(emitted.crop_id).toBe('crop-winterweizen')
    expect(emitted.nutrient_type_id).toBe('nt-n')
    expect(emitted.demand_kg_ha).toBe(230)
    expect(emitted.ref_yield_dt_ha).toBe(80)
    expect(emitted.per_yield_correction).toBe(1.0)
  })

  it('pre-fills when editing', () => {
    const demand: CropNutrientDemand = {
      id: 'cnd-1', crop_id: 'crop-winterweizen', nutrient_type_id: 'nt-n',
      demand_kg_ha: 230, ref_yield_dt_ha: 80, per_yield_correction: 1.0,
      source: 'lfl', user_id: null, valid_from: '2025-01-01',
    }
    const wrapper = mount(AdminNutrientForm, {
      props: { crops: mockCrops, nutrientTypes: mockNutrientTypes, demand },
    })
    const demandInput = wrapper.find('[data-testid="admin-nutrient-demand-input"]').element as HTMLInputElement
    expect(Number(demandInput.value)).toBe(230)
  })

  it('shows delete button when editing and emits delete on click', async () => {
    const demand: CropNutrientDemand = {
      id: 'cnd-1', crop_id: 'crop-winterweizen', nutrient_type_id: 'nt-n',
      demand_kg_ha: 230, ref_yield_dt_ha: 80, per_yield_correction: 1.0,
      source: 'lfl', user_id: null, valid_from: '2025-01-01',
    }
    const wrapper = mount(AdminNutrientForm, {
      props: { crops: mockCrops, nutrientTypes: mockNutrientTypes, demand },
    })
    expect(wrapper.find('[data-testid="admin-nutrient-loeschen-button"]').exists()).toBe(true)
    await wrapper.find('[data-testid="admin-nutrient-loeschen-button"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeDefined()
  })

  it('hides delete button for new demand', () => {
    const wrapper = mount(AdminNutrientForm, {
      props: { crops: mockCrops, nutrientTypes: mockNutrientTypes },
    })
    expect(wrapper.find('[data-testid="admin-nutrient-loeschen-button"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 3: Tests ausführen — müssen fehlschlagen**

```bash
npx vitest run src/components/AdminNutrientList.test.ts src/components/AdminNutrientForm.test.ts
```

- [ ] **Step 4: AdminNutrientList implementieren**

`src/components/AdminNutrientList.vue`:
```vue
<template>
  <ul class="space-y-2">
    <li
      v-for="demand in demands"
      :key="demand.id"
      :data-testid="`admin-nutrient-item-${demand.id}`"
      class="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50"
      @click="$emit('select', demand.id)"
    >
      <div>
        <p class="font-medium">{{ cropName(demand.crop_id) }} — {{ nutrientCode(demand.nutrient_type_id) }}</p>
        <p class="text-sm text-gray-500">
          {{ demand.demand_kg_ha }} kg/ha · Ref: {{ demand.ref_yield_dt_ha }} dt/ha · Quelle: {{ demand.source }}
        </p>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { CropNutrientDemand, NutrientType, Crop } from '@/types'

const props = defineProps<{
  demands: CropNutrientDemand[]
  nutrientTypes: NutrientType[]
  crops: Crop[]
}>()

defineEmits<{ select: [demandId: string] }>()

function cropName(cropId: string): string {
  return props.crops.find((c) => c.id === cropId)?.name_de ?? cropId
}

function nutrientCode(ntId: string): string {
  return props.nutrientTypes.find((nt) => nt.id === ntId)?.code ?? ntId
}
</script>
```

- [ ] **Step 5: AdminNutrientForm implementieren**

`src/components/AdminNutrientForm.vue`:
```vue
<template>
  <form class="space-y-4" @submit.prevent="handleSave">
    <div>
      <label class="block text-sm font-medium text-gray-700">Kultur</label>
      <select v-model="cropId" required data-testid="admin-nutrient-crop-select"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2">
        <option value="">— wählen —</option>
        <option v-for="crop in crops" :key="crop.id" :value="crop.id">{{ crop.name_de }}</option>
      </select>
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700">Nährstoff</label>
      <select v-model="nutrientTypeId" required data-testid="admin-nutrient-type-select"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2">
        <option value="">— wählen —</option>
        <option v-for="nt in nutrientTypes" :key="nt.id" :value="nt.id">{{ nt.code }} ({{ nt.label_de }})</option>
      </select>
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700">Bedarf (kg/ha)</label>
      <input v-model.number="demandKgHa" type="number" step="0.1" required data-testid="admin-nutrient-demand-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700">Referenzertrag (dt/ha)</label>
      <input v-model.number="refYield" type="number" step="0.1" required data-testid="admin-nutrient-ref-yield-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700">Korrektur pro dt</label>
      <input v-model.number="correction" type="number" step="0.01" required data-testid="admin-nutrient-correction-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
    </div>

    <button type="submit" data-testid="admin-nutrient-speichern-button"
      class="w-full rounded-lg bg-green-700 px-4 py-2 text-white font-medium hover:bg-green-800">
      Speichern
    </button>

    <button v-if="demand" type="button" data-testid="admin-nutrient-loeschen-button"
      class="w-full rounded-lg border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
      @click="$emit('delete')">
      Nährstoffwert löschen
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Crop, NutrientType, CropNutrientDemand } from '@/types'

const props = defineProps<{
  crops: Crop[]
  nutrientTypes: NutrientType[]
  demand?: CropNutrientDemand
}>()

const emit = defineEmits<{
  save: [data: Omit<CropNutrientDemand, 'id'>]
  delete: []
}>()

const cropId = ref(props.demand?.crop_id ?? '')
const nutrientTypeId = ref(props.demand?.nutrient_type_id ?? '')
const demandKgHa = ref(props.demand?.demand_kg_ha ?? 0)
const refYield = ref(props.demand?.ref_yield_dt_ha ?? 0)
const correction = ref(props.demand?.per_yield_correction ?? 0)

function handleSave() {
  emit('save', {
    crop_id: cropId.value,
    nutrient_type_id: nutrientTypeId.value,
    demand_kg_ha: Number(demandKgHa.value),
    ref_yield_dt_ha: Number(refYield.value),
    per_yield_correction: Number(correction.value),
    source: 'lfl',
    user_id: null,
    valid_from: new Date().toISOString().split('T')[0],
  })
}
</script>
```

- [ ] **Step 6: Tests ausführen — müssen grün sein**

```bash
npx vitest run src/components/AdminNutrientList.test.ts src/components/AdminNutrientForm.test.ts
```

Expected: PASS (3 + 5 = 8 Tests)

- [ ] **Step 7: Commit**

```bash
git add src/components/AdminNutrientList.vue src/components/AdminNutrientList.test.ts src/components/AdminNutrientForm.vue src/components/AdminNutrientForm.test.ts
git commit -m "feat: add AdminNutrientList and AdminNutrientForm components (TDD)"
```

---

### Task 55: AdminProductList + AdminProductForm (TDD)

**Files:**
- Create: `src/components/AdminProductList.test.ts`
- Create: `src/components/AdminProductList.vue`
- Create: `src/components/AdminProductForm.test.ts`
- Create: `src/components/AdminProductForm.vue`

- [ ] **Step 1: Failing Tests für AdminProductList**

`src/components/AdminProductList.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AdminProductList from './AdminProductList.vue'
import type { FertilizerProduct } from '@/types'

const mockProducts: FertilizerProduct[] = [
  {
    id: 'fp-kas', name: 'KAS 27% N',
    n_pct: 27, p2o5_pct: 0, k2o_pct: 0, mgo_pct: 4, s_pct: 0,
    form: 'mineral', affiliate_url: 'https://example.com', shop_name: 'Shop', active: true,
  },
  {
    id: 'fp-dap', name: 'DAP 18/46',
    n_pct: 18, p2o5_pct: 46, k2o_pct: 0, mgo_pct: 0, s_pct: 0,
    form: 'mineral', affiliate_url: '', shop_name: 'Shop', active: false,
  },
]

describe('AdminProductList', () => {
  it('renders list of products', () => {
    const wrapper = mount(AdminProductList, { props: { products: mockProducts } })
    expect(wrapper.findAll('[data-testid^="admin-product-item-"]')).toHaveLength(2)
  })

  it('shows active/inactive status', () => {
    const wrapper = mount(AdminProductList, { props: { products: mockProducts } })
    const inactive = wrapper.find('[data-testid="admin-product-item-fp-dap"]')
    expect(inactive.text()).toContain('inaktiv')
  })

  it('emits select when clicked', async () => {
    const wrapper = mount(AdminProductList, { props: { products: mockProducts } })
    await wrapper.find('[data-testid="admin-product-item-fp-kas"]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['fp-kas']])
  })
})
```

- [ ] **Step 2: Failing Tests für AdminProductForm**

`src/components/AdminProductForm.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AdminProductForm from './AdminProductForm.vue'
import type { FertilizerProduct } from '@/types'

describe('AdminProductForm', () => {
  it('renders all nutrient percent inputs', () => {
    const wrapper = mount(AdminProductForm, { props: {} })
    expect(wrapper.find('[data-testid="admin-product-name-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-product-n-pct-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-product-p2o5-pct-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-product-k2o-pct-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-product-affiliate-input"]').exists()).toBe(true)
  })

  it('emits save with form data', async () => {
    const wrapper = mount(AdminProductForm, { props: {} })
    await wrapper.find('[data-testid="admin-product-name-input"]').setValue('Test-Dünger')
    await wrapper.find('[data-testid="admin-product-n-pct-input"]').setValue('27')
    await wrapper.find('[data-testid="admin-product-speichern-button"]').trigger('click')
    expect(wrapper.emitted('save')).toBeDefined()
    const emitted = wrapper.emitted('save')![0][0] as Record<string, unknown>
    expect(emitted.name).toBe('Test-Dünger')
    expect(emitted.n_pct).toBe(27)
  })

  it('pre-fills when editing', () => {
    const product: FertilizerProduct = {
      id: 'fp-1', name: 'KAS 27%',
      n_pct: 27, p2o5_pct: 0, k2o_pct: 0, mgo_pct: 4, s_pct: 0,
      form: 'mineral', affiliate_url: 'https://example.com', shop_name: 'TestShop', active: true,
    }
    const wrapper = mount(AdminProductForm, { props: { product } })
    const nameInput = wrapper.find('[data-testid="admin-product-name-input"]').element as HTMLInputElement
    expect(nameInput.value).toBe('KAS 27%')
    const nInput = wrapper.find('[data-testid="admin-product-n-pct-input"]').element as HTMLInputElement
    expect(Number(nInput.value)).toBe(27)
  })

  it('shows delete button when editing and emits delete on click', async () => {
    const product: FertilizerProduct = {
      id: 'fp-1', name: 'KAS 27%',
      n_pct: 27, p2o5_pct: 0, k2o_pct: 0, mgo_pct: 4, s_pct: 0,
      form: 'mineral', affiliate_url: '', shop_name: 'Shop', active: true,
    }
    const wrapper = mount(AdminProductForm, { props: { product } })
    expect(wrapper.find('[data-testid="admin-product-loeschen-button"]').exists()).toBe(true)
    await wrapper.find('[data-testid="admin-product-loeschen-button"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeDefined()
  })

  it('hides delete button for new product', () => {
    const wrapper = mount(AdminProductForm, { props: {} })
    expect(wrapper.find('[data-testid="admin-product-loeschen-button"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 3: Tests ausführen — müssen fehlschlagen**

```bash
npx vitest run src/components/AdminProductList.test.ts src/components/AdminProductForm.test.ts
```

- [ ] **Step 4: AdminProductList implementieren**

`src/components/AdminProductList.vue`:
```vue
<template>
  <ul class="space-y-2">
    <li
      v-for="product in products"
      :key="product.id"
      :data-testid="`admin-product-item-${product.id}`"
      class="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50"
      @click="$emit('select', product.id)"
    >
      <div>
        <p class="font-medium">{{ product.name }}</p>
        <p class="text-sm text-gray-500">{{ product.form }} · {{ product.shop_name }}</p>
      </div>
      <span
        class="rounded-full px-2 py-0.5 text-xs font-medium"
        :class="product.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'"
      >
        {{ product.active ? 'aktiv' : 'inaktiv' }}
      </span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { FertilizerProduct } from '@/types'

defineProps<{ products: FertilizerProduct[] }>()
defineEmits<{ select: [productId: string] }>()
</script>
```

- [ ] **Step 5: AdminProductForm implementieren**

`src/components/AdminProductForm.vue`:
```vue
<template>
  <form class="space-y-4" @submit.prevent="handleSave">
    <div>
      <label class="block text-sm font-medium text-gray-700">Produktname</label>
      <input v-model="name" type="text" required data-testid="admin-product-name-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
    </div>
    <div class="grid grid-cols-3 gap-3">
      <div>
        <label class="block text-sm font-medium text-gray-700">N %</label>
        <input v-model.number="nPct" type="number" step="0.1" min="0" max="100" data-testid="admin-product-n-pct-input"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">P2O5 %</label>
        <input v-model.number="p2o5Pct" type="number" step="0.1" min="0" max="100" data-testid="admin-product-p2o5-pct-input"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">K2O %</label>
        <input v-model.number="k2oPct" type="number" step="0.1" min="0" max="100" data-testid="admin-product-k2o-pct-input"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm font-medium text-gray-700">MgO %</label>
        <input v-model.number="mgoPct" type="number" step="0.1" min="0" max="100" data-testid="admin-product-mgo-pct-input"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">S %</label>
        <input v-model.number="sPct" type="number" step="0.1" min="0" max="100" data-testid="admin-product-s-pct-input"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
      </div>
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700">Form</label>
      <select v-model="form" data-testid="admin-product-form-select"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2">
        <option value="mineral">Mineralisch</option>
        <option value="organic">Organisch</option>
      </select>
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700">Affiliate-URL</label>
      <input v-model="affiliateUrl" type="url" data-testid="admin-product-affiliate-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700">Shop-Name</label>
      <input v-model="shopName" type="text" data-testid="admin-product-shop-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
    </div>
    <div class="flex items-center gap-2">
      <input v-model="active" type="checkbox" id="product-active" data-testid="admin-product-active-checkbox"
        class="rounded border-gray-300" />
      <label for="product-active" class="text-sm font-medium text-gray-700">Aktiv</label>
    </div>

    <button type="submit" data-testid="admin-product-speichern-button"
      class="w-full rounded-lg bg-green-700 px-4 py-2 text-white font-medium hover:bg-green-800">
      Speichern
    </button>

    <button v-if="product" type="button" data-testid="admin-product-loeschen-button"
      class="w-full rounded-lg border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
      @click="$emit('delete')">
      Produkt löschen
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FertilizerProduct } from '@/types'

const props = defineProps<{
  product?: FertilizerProduct
}>()

const emit = defineEmits<{
  save: [data: Omit<FertilizerProduct, 'id'>]
  delete: []
}>()

const name = ref(props.product?.name ?? '')
const nPct = ref(props.product?.n_pct ?? 0)
const p2o5Pct = ref(props.product?.p2o5_pct ?? 0)
const k2oPct = ref(props.product?.k2o_pct ?? 0)
const mgoPct = ref(props.product?.mgo_pct ?? 0)
const sPct = ref(props.product?.s_pct ?? 0)
const form = ref<'mineral' | 'organic'>(props.product?.form ?? 'mineral')
const affiliateUrl = ref(props.product?.affiliate_url ?? '')
const shopName = ref(props.product?.shop_name ?? '')
const active = ref(props.product?.active ?? true)

function handleSave() {
  emit('save', {
    name: name.value,
    n_pct: Number(nPct.value),
    p2o5_pct: Number(p2o5Pct.value),
    k2o_pct: Number(k2oPct.value),
    mgo_pct: Number(mgoPct.value),
    s_pct: Number(sPct.value),
    form: form.value,
    affiliate_url: affiliateUrl.value,
    shop_name: shopName.value,
    active: active.value,
  })
}
</script>
```

- [ ] **Step 6: Tests ausführen — müssen grün sein**

```bash
npx vitest run src/components/AdminProductList.test.ts src/components/AdminProductForm.test.ts
```

Expected: PASS (3 + 5 = 8 Tests)

- [ ] **Step 7: Commit**

```bash
git add src/components/AdminProductList.vue src/components/AdminProductList.test.ts src/components/AdminProductForm.vue src/components/AdminProductForm.test.ts
git commit -m "feat: add AdminProductList and AdminProductForm components (TDD)"
```

---

### Task 56: E2E-Test — Admin-Bereich (vor Implementierung)

**Files:**
- Create: `tests/e2e/admin.spec.ts`

- [ ] **Step 1: E2E-Test schreiben**

`tests/e2e/admin.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Admin-Bereich', () => {
  // Voraussetzung: Auth-Setup als Admin-User.
  // Implementierung des Auth-Fixtures hängt von der konkreten
  // Supabase-Test-Konfiguration ab (z.B. storageState oder Test-Token).
  // Muss vor dem ersten E2E-Lauf eingerichtet werden.

  test('shows admin tabs', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByTestId('admin-tabs')).toBeVisible()
    await expect(page.getByTestId('admin-tab-crops')).toBeVisible()
    await expect(page.getByTestId('admin-tab-nutrients')).toBeVisible()
    await expect(page.getByTestId('admin-tab-products')).toBeVisible()
  })

  test('can switch between tabs', async ({ page }) => {
    await page.goto('/admin')
    await page.getByTestId('admin-tab-products').click()
    await expect(page.getByTestId('admin-product-anlegen-button')).toBeVisible()
    await page.getByTestId('admin-tab-crops').click()
    await expect(page.getByTestId('admin-crop-anlegen-button')).toBeVisible()
  })

  test('can open crop creation drawer', async ({ page }) => {
    await page.goto('/admin')
    await page.getByTestId('admin-crop-anlegen-button').click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await expect(page.getByTestId('admin-crop-name-input')).toBeVisible()
  })

  test('can open product creation drawer', async ({ page }) => {
    await page.goto('/admin')
    await page.getByTestId('admin-tab-products').click()
    await page.getByTestId('admin-product-anlegen-button').click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await expect(page.getByTestId('admin-product-name-input')).toBeVisible()
  })
})
```

- [ ] **Step 2: Tests ausführen — müssen fehlschlagen** (AdminView ist noch ein Placeholder)

```bash
npx playwright test tests/e2e/admin.spec.ts
```

Expected: FAIL — Tabs und Buttons existieren nicht im Placeholder.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/admin.spec.ts
git commit -m "test: add E2E tests for Admin-Bereich (tabs, crop/product drawers)"
```

---

### Task 57: AdminView — Dashboard mit Tabs (TDD)

**Files:**
- Create: `src/views/AdminView.test.ts`
- Modify: `src/views/AdminView.vue` (Placeholder ersetzen)

- [ ] **Step 1: Failing Tests für AdminView**

`src/views/AdminView.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AdminView from './AdminView.vue'

// Mock all services
vi.mock('@/services/crop.service', () => ({
  getCrops: vi.fn(),
  createCrop: vi.fn(),
  updateCrop: vi.fn(),
  deleteCrop: vi.fn(),
}))
vi.mock('@/services/nutrient.service', () => ({
  getNutrientTypes: vi.fn(),
  getAllNutrientDemands: vi.fn(),
  createNutrientDemand: vi.fn(),
  updateNutrientDemand: vi.fn(),
  deleteNutrientDemand: vi.fn(),
}))
vi.mock('@/services/product.service', () => ({
  getAllProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
}))

// Stub child components to isolate AdminView logic
const stubs = {
  AppLayout: { template: '<div><slot /></div>' },
  AdminCropList: true,
  AdminCropForm: true,
  AdminNutrientList: true,
  AdminNutrientForm: true,
  AdminProductList: true,
  AdminProductForm: true,
  DrawerModal: { template: '<div v-if="open" data-testid="drawer-modal"><slot /></div>', props: ['open', 'title'] },
}

import { getCrops } from '@/services/crop.service'
import { getNutrientTypes, getAllNutrientDemands } from '@/services/nutrient.service'
import { getAllProducts } from '@/services/product.service'

const mockGetCrops = getCrops as ReturnType<typeof vi.fn>
const mockGetNutrientTypes = getNutrientTypes as ReturnType<typeof vi.fn>
const mockGetAllDemands = getAllNutrientDemands as ReturnType<typeof vi.fn>
const mockGetAllProducts = getAllProducts as ReturnType<typeof vi.fn>

describe('AdminView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCrops.mockResolvedValue([])
    mockGetNutrientTypes.mockResolvedValue([])
    mockGetAllDemands.mockResolvedValue([])
    mockGetAllProducts.mockResolvedValue([])
  })

  it('renders all three tabs', async () => {
    const wrapper = mount(AdminView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-testid="admin-tab-crops"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-tab-nutrients"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-tab-products"]').exists()).toBe(true)
  })

  it('loads data on mount', async () => {
    mount(AdminView, { global: { stubs } })
    await flushPromises()
    expect(mockGetCrops).toHaveBeenCalledOnce()
    expect(mockGetNutrientTypes).toHaveBeenCalledOnce()
    expect(mockGetAllDemands).toHaveBeenCalledOnce()
    expect(mockGetAllProducts).toHaveBeenCalledOnce()
  })

  it('shows error message when loadAll fails', async () => {
    mockGetCrops.mockRejectedValue(new Error('Network error'))
    const wrapper = mount(AdminView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-testid="admin-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-error"]').text()).toContain('Admin-Daten konnten nicht geladen werden')
  })

  it('hides error message initially when load succeeds', async () => {
    const wrapper = mount(AdminView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-testid="admin-error"]').exists()).toBe(false)
  })

  it('switches tabs on click', async () => {
    const wrapper = mount(AdminView, { global: { stubs } })
    await flushPromises()
    // Initially crops tab is active → crop-anlegen-button visible
    expect(wrapper.find('[data-testid="admin-crop-anlegen-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-product-anlegen-button"]').exists()).toBe(false)
    // Switch to products tab
    await wrapper.find('[data-testid="admin-tab-products"]').trigger('click')
    expect(wrapper.find('[data-testid="admin-product-anlegen-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-crop-anlegen-button"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Tests ausführen — müssen fehlschlagen**

```bash
npx vitest run src/views/AdminView.test.ts
```

Expected: FAIL — AdminView ist noch ein Placeholder ohne Tabs.

- [ ] **Step 3: AdminView implementieren**

`src/views/AdminView.vue`:
```vue
<template>
  <AppLayout title="Admin">
    <div class="space-y-4">
      <div data-testid="admin-tabs" class="flex gap-2 border-b border-gray-200">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :data-testid="`admin-tab-${tab.id}`"
          class="px-4 py-2 text-sm font-medium border-b-2 -mb-px"
          :class="activeTab === tab.id ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <p
        v-if="errorMessage"
        data-testid="admin-error"
        class="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600"
      >
        {{ errorMessage }}
      </p>

      <!-- Kulturen -->
      <div v-if="activeTab === 'crops'">
        <button data-testid="admin-crop-anlegen-button"
          class="mb-4 w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 hover:border-green-500 hover:text-green-700"
          @click="openCropNew">
          + Kultur anlegen
        </button>
        <AdminCropList :crops="crops" @select="openCropEdit" />
        <DrawerModal :open="cropDrawerOpen" :title="editingCrop ? 'Kultur bearbeiten' : 'Neue Kultur'" @close="closeCropDrawer">
          <AdminCropForm :crop="editingCrop" @save="handleCropSave" @delete="handleCropDelete" />
        </DrawerModal>
      </div>

      <!-- Nährstoffwerte -->
      <div v-if="activeTab === 'nutrients'">
        <button data-testid="admin-nutrient-anlegen-button"
          class="mb-4 w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 hover:border-green-500 hover:text-green-700"
          @click="openNutrientNew">
          + Nährstoffwert anlegen
        </button>
        <AdminNutrientList :demands="demands" :nutrient-types="nutrientTypes" :crops="crops" @select="openNutrientEdit" />
        <DrawerModal :open="nutrientDrawerOpen" :title="editingDemand ? 'Wert bearbeiten' : 'Neuer Wert'" @close="closeNutrientDrawer">
          <AdminNutrientForm :crops="crops" :nutrient-types="nutrientTypes" :demand="editingDemand" @save="handleNutrientSave" @delete="handleNutrientDelete" />
        </DrawerModal>
      </div>

      <!-- Produkte -->
      <div v-if="activeTab === 'products'">
        <button data-testid="admin-product-anlegen-button"
          class="mb-4 w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 hover:border-green-500 hover:text-green-700"
          @click="openProductNew">
          + Produkt anlegen
        </button>
        <AdminProductList :products="products" @select="openProductEdit" />
        <DrawerModal :open="productDrawerOpen" :title="editingProduct ? 'Produkt bearbeiten' : 'Neues Produkt'" @close="closeProductDrawer">
          <AdminProductForm :product="editingProduct" @save="handleProductSave" @delete="handleProductDelete" />
        </DrawerModal>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getCrops, createCrop, updateCrop, deleteCrop } from '@/services/crop.service'
import { getNutrientTypes, getAllNutrientDemands } from '@/services/nutrient.service'
import { createNutrientDemand, updateNutrientDemand, deleteNutrientDemand } from '@/services/nutrient.service'
import { getAllProducts, createProduct, updateProduct, deleteProduct } from '@/services/product.service'
import type { Crop, CropNutrientDemand, NutrientType, FertilizerProduct } from '@/types'
import AppLayout from '@/components/AppLayout.vue'
import DrawerModal from '@/components/DrawerModal.vue'
import AdminCropList from '@/components/AdminCropList.vue'
import AdminCropForm from '@/components/AdminCropForm.vue'
import AdminNutrientList from '@/components/AdminNutrientList.vue'
import AdminNutrientForm from '@/components/AdminNutrientForm.vue'
import AdminProductList from '@/components/AdminProductList.vue'
import AdminProductForm from '@/components/AdminProductForm.vue'

const tabs = [
  { id: 'crops', label: 'Kulturen' },
  { id: 'nutrients', label: 'Nährstoffwerte' },
  { id: 'products', label: 'Produkte' },
]

const activeTab = ref('crops')
const errorMessage = ref('')

// --- Crops ---
const crops = ref<Crop[]>([])
const cropDrawerOpen = ref(false)
const editingCrop = ref<Crop | undefined>()

// --- Nutrients ---
const nutrientTypes = ref<NutrientType[]>([])
const demands = ref<CropNutrientDemand[]>([])
const nutrientDrawerOpen = ref(false)
const editingDemand = ref<CropNutrientDemand | undefined>()

// --- Products ---
const products = ref<FertilizerProduct[]>([])
const productDrawerOpen = ref(false)
const editingProduct = ref<FertilizerProduct | undefined>()

async function loadAll() {
  try {
    crops.value = await getCrops()
    nutrientTypes.value = await getNutrientTypes()
    products.value = await getAllProducts()
    demands.value = await getAllNutrientDemands()
  } catch (e) {
    console.error('Fehler beim Laden:', e)
    errorMessage.value = 'Admin-Daten konnten nicht geladen werden.'
  }
}

// --- Crop handlers ---
function openCropNew() { editingCrop.value = undefined; cropDrawerOpen.value = true }
function openCropEdit(cropId: string) { editingCrop.value = crops.value.find((c) => c.id === cropId); cropDrawerOpen.value = true }
function closeCropDrawer() { cropDrawerOpen.value = false; editingCrop.value = undefined }

async function handleCropSave(data: Omit<Crop, 'id'>) {
  errorMessage.value = ''
  try {
    if (editingCrop.value) { await updateCrop(editingCrop.value.id, data) }
    else { await createCrop(data) }
    closeCropDrawer()
    await loadAll()
  } catch (e) {
    console.error('Fehler:', e)
    errorMessage.value = 'Fehler beim Speichern der Kultur.'
  }
}

async function handleCropDelete() {
  if (!editingCrop.value) return
  try {
    await deleteCrop(editingCrop.value.id)
    closeCropDrawer()
    await loadAll()
  } catch (e) {
    console.error('Fehler:', e)
    errorMessage.value = 'Fehler beim Löschen der Kultur.'
  }
}

// --- Nutrient handlers ---
function openNutrientNew() { editingDemand.value = undefined; nutrientDrawerOpen.value = true }
function openNutrientEdit(demandId: string) { editingDemand.value = demands.value.find((d) => d.id === demandId); nutrientDrawerOpen.value = true }
function closeNutrientDrawer() { nutrientDrawerOpen.value = false; editingDemand.value = undefined }

async function handleNutrientSave(data: Omit<CropNutrientDemand, 'id'>) {
  errorMessage.value = ''
  try {
    if (editingDemand.value) { await updateNutrientDemand(editingDemand.value.id, data) }
    else { await createNutrientDemand(data) }
    closeNutrientDrawer()
    await loadAll()
  } catch (e) {
    console.error('Fehler:', e)
    errorMessage.value = 'Fehler beim Speichern des Nährstoffwerts.'
  }
}

async function handleNutrientDelete() {
  if (!editingDemand.value) return
  try {
    await deleteNutrientDemand(editingDemand.value.id)
    closeNutrientDrawer()
    await loadAll()
  } catch (e) {
    console.error('Fehler:', e)
    errorMessage.value = 'Fehler beim Löschen des Nährstoffwerts.'
  }
}

// --- Product handlers ---
function openProductNew() { editingProduct.value = undefined; productDrawerOpen.value = true }
function openProductEdit(productId: string) { editingProduct.value = products.value.find((p) => p.id === productId); productDrawerOpen.value = true }
function closeProductDrawer() { productDrawerOpen.value = false; editingProduct.value = undefined }

async function handleProductSave(data: Omit<FertilizerProduct, 'id'>) {
  errorMessage.value = ''
  try {
    if (editingProduct.value) { await updateProduct(editingProduct.value.id, data) }
    else { await createProduct(data) }
    closeProductDrawer()
    await loadAll()
  } catch (e) {
    console.error('Fehler:', e)
    errorMessage.value = 'Fehler beim Speichern des Produkts.'
  }
}

async function handleProductDelete() {
  if (!editingProduct.value) return
  try {
    await deleteProduct(editingProduct.value.id)
    closeProductDrawer()
    await loadAll()
  } catch (e) {
    console.error('Fehler:', e)
    errorMessage.value = 'Fehler beim Löschen des Produkts.'
  }
}

onMounted(loadAll)
</script>
```

- [ ] **Step 4: Unit-Tests ausführen — müssen grün sein**

```bash
npx vitest run src/views/AdminView.test.ts
```

Expected: PASS (5 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/views/AdminView.vue src/views/AdminView.test.ts
git commit -m "feat: implement AdminView with tabs for crops, nutrients, and products CRUD (TDD)"
```

- [ ] **Step 6: E2E-Tests ausführen — müssen jetzt grün sein**

```bash
npx playwright test tests/e2e/admin.spec.ts
```

Expected: PASS (4 Tests — alle aus Task 56 geschriebenen E2E-Tests)

---

## Chunk 8: PWA-Konfiguration, ProfileView, Finale Integration

PWA-Setup mit vite-plugin-pwa (Manifest, Service Worker, Offline-Caching der App-Shell). ProfileView als einfache Profilseite (MVP Stufe 1 — vollständige "eigene Nährstoffwerte" kommen in Stufe 2). Abschließender Integrationstest über den gesamten Hauptworkflow.

**Voraussetzungen:** Chunk 1–7

---

### Task 58: PWA-Konfiguration (vite-plugin-pwa)

**Files:**
- Modify: `vite.config.ts` (PWA-Plugin hinzufügen)
- Create: `public/favicon.svg`

- [ ] **Step 1: vite.config.ts um PWA-Plugin erweitern**

`vite.config.ts` — ersetze die gesamte Datei:
```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Düngungsberater',
        short_name: 'Dünger',
        description: 'Düngeplanung für Landwirte nach LfL-Basisdaten',
        theme_color: '#15803d',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 2: Favicon erstellen**

`public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#15803d"/>
  <text x="50" y="68" font-size="52" font-family="system-ui" text-anchor="middle" fill="white">🌱</text>
</svg>
```

- [ ] **Step 3: Build testen — PWA-Manifest wird generiert**

```bash
npm run build
ls dist/manifest.webmanifest
```

Expected: Datei existiert. `dist/` enthält `sw.js` und `manifest.webmanifest`.

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts public/favicon.svg
git commit -m "feat: configure vite-plugin-pwa with manifest, service worker, and offline caching"
```

---

### Task 59: ProfileView — Einfaches Profil (MVP Stufe 1)

**Files:**
- Create: `src/views/ProfileView.test.ts`
- Modify: `src/views/ProfileView.vue` (Placeholder ersetzen)

Stufe 1: Zeigt User-Email und Logout-Button. Die vollständige Verwaltung eigener Nährstoffwerte kommt in Stufe 2.

- [ ] **Step 1: Failing Tests für ProfileView**

`src/views/ProfileView.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ProfileView from './ProfileView.vue'

const mockLogout = vi.fn()

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: vi.fn(() => ({
    userId: 'u1',
    userEmail: 'bauer@test.de',
    isAuthenticated: true,
    logout: mockLogout,
  })),
}))

vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

const stubs = {
  AppLayout: { template: '<div><slot /></div>' },
}

describe('ProfileView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogout.mockResolvedValue(undefined)
  })

  it('displays user email', async () => {
    const wrapper = mount(ProfileView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-testid="profile-email"]').text()).toContain('bauer@test.de')
  })

  it('renders logout button', async () => {
    const wrapper = mount(ProfileView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-testid="profile-logout-button"]').exists()).toBe(true)
  })

  it('shows app version info', async () => {
    const wrapper = mount(ProfileView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-testid="profile-version"]').exists()).toBe(true)
  })

  it('shows error when logout fails', async () => {
    mockLogout.mockRejectedValue(new Error('Network'))
    const wrapper = mount(ProfileView, { global: { stubs } })
    await flushPromises()
    await wrapper.find('[data-testid="profile-logout-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="profile-error"]').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Tests ausführen — müssen fehlschlagen**

```bash
npx vitest run src/views/ProfileView.test.ts
```

Expected: FAIL — ProfileView ist noch ein Placeholder.

- [ ] **Step 3: ProfileView implementieren**

`src/views/ProfileView.vue`:
```vue
<template>
  <AppLayout title="Profil">
    <div class="space-y-6">
      <p
        v-if="errorMessage"
        data-testid="profile-error"
        class="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600"
      >
        {{ errorMessage }}
      </p>

      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <h2 class="text-sm font-medium text-gray-500">Angemeldet als</h2>
        <p data-testid="profile-email" class="mt-1 text-lg font-medium text-gray-900">
          {{ authStore.userEmail ?? '—' }}
        </p>
      </div>

      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <h2 class="text-sm font-medium text-gray-500">App-Info</h2>
        <p data-testid="profile-version" class="mt-1 text-sm text-gray-600">
          Düngungsberater MVP · Stufe 1
        </p>
        <p class="text-sm text-gray-400">
          Basisdaten: LfL Bayern 2025/2026
        </p>
      </div>

      <button
        data-testid="profile-logout-button"
        class="w-full rounded-lg border border-red-300 px-4 py-3 text-center font-medium text-red-600 hover:bg-red-50"
        @click="handleLogout"
      >
        Abmelden
      </button>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import AppLayout from '@/components/AppLayout.vue'

const authStore = useAuthStore()
const router = useRouter()
const errorMessage = ref('')

async function handleLogout() {
  errorMessage.value = ''
  try {
    await authStore.logout()
    router.push('/login')
  } catch (e) {
    console.error('Fehler beim Abmelden:', e)
    errorMessage.value = 'Fehler beim Abmelden. Bitte erneut versuchen.'
  }
}
</script>
```

- [ ] **Step 4: Tests ausführen — müssen grün sein**

```bash
npx vitest run src/views/ProfileView.test.ts
```

Expected: PASS (4 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/views/ProfileView.vue src/views/ProfileView.test.ts
git commit -m "feat: implement ProfileView with user info and logout (TDD)"
```

---

### Task 60: Sync-Service — Online-Event-Listener

**Files:**
- Modify: `src/main.ts` (Sync bei App-Start und online-Event registrieren)

Der Sync-Service aus Chunk 2 existiert bereits. Hier wird er in den App-Lebenszyklus integriert.

- [ ] **Step 1: main.ts um Sync-Integration erweitern**

`src/main.ts` — ersetze die gesamte Datei:
```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { syncAll } from '@/services/sync.service'
import './assets/main.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// Offline-Daten synchronisieren bei App-Start und Reconnect.
// Hinweis: useOfflineCache.setupAutoSync() wird NICHT zusätzlich verwendet,
// um doppelte Listener zu vermeiden. Sync läuft ausschließlich hier.
if (navigator.onLine) {
  syncAll().catch(console.error)
}

window.addEventListener('online', () => {
  syncAll().catch(console.error)
})
```

- [ ] **Step 2: Build prüfen**

```bash
npm run build
```

Expected: Build erfolgreich, keine Fehler.

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat: integrate sync service with app lifecycle (online event + startup)"
```

---

### Task 61: Integrationstest — Gesamter Hauptworkflow (E2E)

**Files:**
- Create: `tests/e2e/workflow.spec.ts`

Abschließender E2E-Test, der den Hauptworkflow von Login bis Empfehlung durchspielt.

- [ ] **Step 1: E2E-Integrationstest schreiben**

`tests/e2e/workflow.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Hauptworkflow: Login → Feld → Anbauplanung → Empfehlung', () => {
  // Voraussetzung: Test-User existiert in Supabase.
  // Auth-Fixture wie in auth.spec.ts konfigurieren.

  test('complete workflow produces recommendation', async ({ page }) => {
    // 1. Login
    await page.goto('/login')
    await page.getByTestId('login-email-input').fill('test@example.com')
    await page.getByTestId('login-password-input').fill('testpassword123')
    await page.getByTestId('login-submit-button').click()
    await expect(page).toHaveURL('/felder')

    // 2. Feld anlegen
    await page.getByTestId('feld-anlegen-button').click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await page.getByTestId('feld-name-input').fill('Testfeld Workflow')
    await page.getByTestId('feld-size-input').fill('10')
    await page.getByTestId('feld-speichern-button').click()
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()

    // 3. Feld in Liste sichtbar
    const fieldItem = page.locator('[data-testid^="field-item-"]').filter({ hasText: 'Testfeld Workflow' })
    await expect(fieldItem).toBeVisible()

    // 4. Zur Anbauplanung navigieren (über Planung-Button, nicht Klick auf Feld)
    await fieldItem.locator('[data-testid^="field-planung-button-"]').click()
    await expect(page.getByTestId('plan-anlegen-button')).toBeVisible()

    // 5. Anbauplanung erstellen
    await page.getByTestId('plan-anlegen-button').click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await page.getByTestId('plan-crop-select').selectOption({ label: /Winterweizen/ })
    await page.getByTestId('plan-speichern-button').click()
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()

    // 6. Zur Empfehlung navigieren (über Empfehlung-Button am Plan-Eintrag)
    await page.locator('[data-testid^="plan-empfehlung-button-"]').first().click()

    // 7. Empfehlung wird angezeigt
    await expect(page.getByTestId('recommendation-card')).toBeVisible()
    await expect(page.getByTestId('nutrient-row-N')).toBeVisible()

    // 8. Produktempfehlungen sichtbar
    await expect(page.getByTestId('product-list')).toBeVisible()
  })
})
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/workflow.spec.ts
git commit -m "test: add end-to-end workflow integration test (login → field → plan → recommendation)"
```

---

### Task 62: ARC42 aktualisieren — Finale Dokumentation

**Files:**
- Modify: `docs/arc42/05-building-blocks.md` (Admin-Baustein ergänzen)
- Modify: `docs/arc42/08-concepts.md` (PWA-Konzept ergänzen)
- Create: `docs/arc42/09-decisions/ADR-004-pwa-offline-strategy.md`

- [ ] **Step 1: Bausteinsicht aktualisieren**

Ergänze in `docs/arc42/05-building-blocks.md` am Ende:

```markdown
## Admin-Bereich

| Baustein | Datei | Verantwortung |
|---|---|---|
| AdminCropList/Form | `src/components/AdminCrop*.vue` | CRUD für Kulturen |
| AdminNutrientList/Form | `src/components/AdminNutrient*.vue` | CRUD für Nährstoffwerte |
| AdminProductList/Form | `src/components/AdminProduct*.vue` | CRUD für Düngerprodukte |
| AdminView | `src/views/AdminView.vue` | Tab-basiertes Dashboard, orchestriert alle Admin-CRUD-Komponenten |

## Profil

| Baustein | Datei | Verantwortung |
|---|---|---|
| ProfileView | `src/views/ProfileView.vue` | User-Info, Logout, App-Version |
```

- [ ] **Step 2: Querschnittliche Konzepte aktualisieren**

Ergänze in `docs/arc42/08-concepts.md` am Ende:

```markdown
## PWA / Service Worker

- `vite-plugin-pwa` mit `autoUpdate`-Strategie
- Workbox cached App-Shell (JS, CSS, HTML, SVG, Fonts)
- Supabase-API-Aufrufe werden via `NetworkFirst`-Strategie gecacht (1 Tag TTL)
- Manifest: `Düngungsberater` als standalone-App installierbar
- Theme-Color: `#15803d` (Grün, passend zum Agrar-Kontext)
```

- [ ] **Step 3: ADR-004 schreiben**

`docs/arc42/09-decisions/ADR-004-pwa-offline-strategy.md`:
```markdown
# ADR-004: PWA mit NetworkFirst-Caching

**Status:** Accepted
**Datum:** 2026-03-11

**Kontext:** Die App soll als PWA installierbar und offline nutzbar sein. Stammdaten werden in IndexedDB (Dexie.js) gecacht (ADR-002). Für die App-Shell und Assets wird ein Service Worker benötigt.

**Entscheidung:** vite-plugin-pwa mit Workbox. Strategie:
- App-Shell (JS/CSS/HTML): Precaching bei Install
- Supabase-API-Calls: NetworkFirst mit 24h Fallback-Cache
- Offline erstellte Daten: Dexie.js + Sync-Service (nicht im Service Worker)

**Konsequenzen:**
- App startet auch offline (aus dem Precache)
- API-Daten haben max. 24h Verzögerung im Offline-Fall
- autoUpdate sorgt für automatische SW-Updates ohne User-Interaktion
- Kein manuelles Cache-Management nötig — Workbox übernimmt Precache-Manifest
```

- [ ] **Step 4: Commit**

```bash
git add docs/arc42/
git commit -m "docs: update ARC42 with admin building blocks, PWA concept, and ADR-004"
```

---

### Task 63: Alle Tests laufen lassen — Finale Prüfung

- [ ] **Step 1: Unit-Tests ausführen**

```bash
npm run test:run
```

Expected: PASS — alle Unit-Tests grün.

- [ ] **Step 2: Build prüfen**

```bash
npm run build
```

Expected: Build erfolgreich.

- [ ] **Step 3: Lint prüfen**

```bash
npm run lint
```

Expected: Keine Lint-Fehler. Falls Fehler: `npm run lint:fix` und Commit.

- [ ] **Step 4: E2E-Tests ausführen**

```bash
npm run test:e2e
```

Expected: Alle E2E-Tests grün (Auth, Felder, Anbauplanung, Empfehlung, Admin, Workflow).

- [ ] **Step 5: Abschluss-Commit (falls Fixes nötig waren)**

```bash
git add -A
git commit -m "fix: resolve remaining lint/test issues for MVP release"
```
