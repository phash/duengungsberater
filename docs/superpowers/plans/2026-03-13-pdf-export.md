# PDF-Export (Browser Print) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Print-Button auf der Empfehlungsseite, der `window.print()` auslöst; Print-CSS blendet UI-Chrome aus und zeigt alle Nährstoff-Breakdowns immer auf.

**Architecture:** `v-if` → `v-show` in `RecommendationCard` hält Breakdown-Elemente stets im DOM. `AppLayout` erhält einen optionalen `actions`-Slot für seiten-spezifische Header-Buttons. `@media print` in `main.css` steuert Druckansicht ausschließlich via `data-testid`-Selektoren.

**Tech Stack:** Vue 3, TypeScript, Tailwind CSS, Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-03-13-pdf-export-design.md`

---

## Dateiübersicht

| Aktion | Datei | Verantwortung |
|---|---|---|
| Modify | `src/components/RecommendationCard.vue` | `v-if` → `v-show` für Breakdown-Divs |
| Modify | `src/components/RecommendationCard.test.ts` | Tests auf `isVisible()` umstellen |
| Modify | `src/components/AppLayout.vue` | Optionaler `actions`-Slot im Header |
| Modify | `src/views/RecommendationView.vue` | Print-Button im `#actions`-Slot |
| Modify | `src/assets/main.css` | `@media print` Block |
| Modify | `tests/e2e/empfehlung.spec.ts` | E2E-Test: Print-Button sichtbar/nicht sichtbar |

---

## Chunk 1: RecommendationCard — v-show Migration

### Task 1: Unit-Tests auf `isVisible()` umstellen

**Files:**
- Modify: `src/components/RecommendationCard.test.ts:72-108`

Mit `v-show` bleibt jedes Breakdown-Div immer im DOM (existiert, aber `display: none`), auch wenn die Kultur gar keine Breakdown-Daten hat (z.B. P2O5 in den Testdaten). Bestehende Tests prüfen Sichtbarkeit mit `.exists()` — das stimmt nach der Umstellung nicht mehr.

**TDD-Logik:** Step 1 schreibt Tests, die das gewünschte Verhalten nach der v-show-Umstellung beschreiben (`exists() === true`, `isVisible() === false`). Step 2 führt sie gegen den aktuellen Code (noch v-if) aus — sie schlagen fehl, weil das Element mit v-if nicht im DOM ist. Task 2 implementiert dann v-show, woraufhin alle Tests bestehen.

- [ ] **Step 1: Bestehende Breakdown-Tests ersetzen**

`src/components/RecommendationCard.test.ts`, die 5 Breakdown-Tests ab Zeile 72 ersetzen durch:

```typescript
it('does not show breakdown by default', () => {
  const wrapper = mount(RecommendationCard, { props: { results: mockResultsWithBreakdown } })
  const breakdown = wrapper.find('[data-testid="nutrient-breakdown-N"]')
  expect(breakdown.exists()).toBe(true)
  expect(breakdown.isVisible()).toBe(false)
})

it('shows breakdown after clicking nutrient row', async () => {
  const wrapper = mount(RecommendationCard, { props: { results: mockResultsWithBreakdown } })
  await wrapper.find('[data-testid="nutrient-row-N"]').trigger('click')
  const breakdown = wrapper.find('[data-testid="nutrient-breakdown-N"]')
  expect(breakdown.isVisible()).toBe(true)
  expect(breakdown.text()).toContain('230')
  expect(breakdown.text()).toContain('Vorfrucht (Winterraps)')
  expect(breakdown.text()).toContain('-10')
})

it('closes breakdown when clicking same row again', async () => {
  const wrapper = mount(RecommendationCard, { props: { results: mockResultsWithBreakdown } })
  await wrapper.find('[data-testid="nutrient-row-N"]').trigger('click')
  expect(wrapper.find('[data-testid="nutrient-breakdown-N"]').isVisible()).toBe(true)
  await wrapper.find('[data-testid="nutrient-row-N"]').trigger('click')
  expect(wrapper.find('[data-testid="nutrient-breakdown-N"]').isVisible()).toBe(false)
})

it('closes other breakdown when opening a new one (accordion)', async () => {
  const wrapper = mount(RecommendationCard, { props: { results: mockResultsWithBreakdown } })
  await wrapper.find('[data-testid="nutrient-row-N"]').trigger('click')
  expect(wrapper.find('[data-testid="nutrient-breakdown-N"]').isVisible()).toBe(true)
  await wrapper.find('[data-testid="nutrient-row-P2O5"]').trigger('click')
  expect(wrapper.find('[data-testid="nutrient-breakdown-N"]').isVisible()).toBe(false)
})

it('does not show breakdown for nutrient without breakdown data', async () => {
  const wrapper = mount(RecommendationCard, { props: { results: mockResultsWithBreakdown } })
  await wrapper.find('[data-testid="nutrient-row-P2O5"]').trigger('click')
  const breakdown = wrapper.find('[data-testid="nutrient-breakdown-P2O5"]')
  expect(breakdown.exists()).toBe(true)
  expect(breakdown.isVisible()).toBe(false)
})
```

- [ ] **Step 2: Tests ausführen — Failures erwarten**

```bash
npx vitest run src/components/RecommendationCard.test.ts
```

Expected: Mehrere Tests FAIL (mit dem aktuellen v-if-Code) — konkret:
- `does not show breakdown by default`: scheitert an `expect(breakdown.exists()).toBe(true)` — mit `v-if` ist das Element nicht im DOM, `exists()` gibt `false`
- `does not show breakdown for nutrient without breakdown data`: gleiche Ursache — P2O5 hat kein Breakdown-Objekt, v-if rendert das Element nicht, `exists()` gibt `false`. **Nach** der v-show-Umstellung (Task 2) ist das Element immer im DOM, `exists()` gibt `true` und `isVisible()` gibt `false` → Test besteht.
- `closes breakdown when clicking same row again` und `closes other breakdown when opening a new one`: scheitern, weil `isVisible()` auf einem nicht-existenten Element (nach dem Schließen mit `v-if`) einen VTU-Fehler wirft

### Task 2: `v-if` → `v-show` in RecommendationCard

**Files:**
- Modify: `src/components/RecommendationCard.vue:38`

- [ ] **Step 1: `v-if` durch `v-show` ersetzen**

In `src/components/RecommendationCard.vue`, Zeile 39 (Breakdown-Div):

```html
<!-- VORHER -->
<div
  v-if="expandedCode === result.nutrient_code && result.breakdown"
  :data-testid="`nutrient-breakdown-${result.nutrient_code}`"
  class="ml-4 mt-1 rounded-lg bg-gray-100 px-3 py-2 text-sm"
>

<!-- NACHHER -->
<div
  v-show="expandedCode === result.nutrient_code && !!result.breakdown"
  :data-testid="`nutrient-breakdown-${result.nutrient_code}`"
  class="ml-4 mt-1 rounded-lg bg-gray-100 px-3 py-2 text-sm"
>
```

- [ ] **Step 2: Unit-Tests ausführen — alle grün**

```bash
npx vitest run src/components/RecommendationCard.test.ts
```

Expected: Alle 9 Tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/RecommendationCard.vue src/components/RecommendationCard.test.ts
git commit -m "refactor(recommendation-card): v-if → v-show for breakdowns to support print"
```

---

## Chunk 2: AppLayout Slot + Print-Button + E2E

### Task 3: E2E-Test für Print-Button schreiben

**Files:**
- Modify: `tests/e2e/empfehlung.spec.ts`

- [ ] **Step 1: Failing E2E-Tests ans Ende des bestehenden `describe`-Blocks anhängen**

Am Ende von `tests/e2e/empfehlung.spec.ts`, innerhalb des `describe('UC-L-09–12: Düngeempfehlung', ...)` Blocks (vor der schließenden `})`):

```typescript
  test('Print-Button ist auf der Empfehlungsseite sichtbar', async ({ page }) => {
    await expect(page.getByTestId('empfehlung-drucken-button')).toBeVisible()
  })

  test('Print-Button erscheint nicht auf der Felder-Seite', async ({ page }) => {
    await page.goto('/felder')
    await expect(page.getByTestId('empfehlung-drucken-button')).toHaveCount(0)
  })
```

- [ ] **Step 2: E2E-Tests ausführen — Failure erwarten**

```bash
npx playwright test tests/e2e/empfehlung.spec.ts --grep "Print-Button"
```

Expected: `Print-Button ist auf der Empfehlungsseite sichtbar` FAIL — Element nicht gefunden

### Task 4: AppLayout — `actions` Slot hinzufügen

**Files:**
- Modify: `src/components/AppLayout.vue:31-37`

Der bestehende `<button data-testid="logout-button">` wird in ein `<div class="flex items-center gap-2">` eingebettet, davor kommt der optionale Slot.

- [ ] **Step 1: Header-rechts anpassen**

```html
<!-- VORHER (Zeile 31–37) -->
<button
  data-testid="logout-button"
  class="text-sm text-gray-500 hover:text-gray-700"
  @click="handleLogout"
>
  Abmelden
</button>

<!-- NACHHER -->
<div class="flex items-center gap-2">
  <slot name="actions" />
  <button
    data-testid="logout-button"
    class="text-sm text-gray-500 hover:text-gray-700"
    @click="handleLogout"
  >
    Abmelden
  </button>
</div>
```

### Task 5: RecommendationView — Print-Button einfügen

**Files:**
- Modify: `src/views/RecommendationView.vue`

> ⚠️ **Achtung:** Die Spec zeigt `@click="window.print()"` direkt im Template. Das funktioniert **nicht** in Vue 3 — `window` ist kein whitelisted Global in Templates. Ausschließlich `@click="printPage"` verwenden (Funktion aus Step 1).

`window` ist in Vue 3 Templates nicht direkt zugänglich (kein Whitelisting). Daher eine Hilfsfunktion `printPage` in `<script setup>` definieren.

- [ ] **Step 1: `printPage`-Funktion in `<script setup>` hinzufügen**

In `src/views/RecommendationView.vue`, nach den bestehenden `import`-Statements und `const props = ...` Zeile, eine Funktion ergänzen:

```typescript
function printPage() {
  window.print()
}
```

- [ ] **Step 2: `#actions`-Slot in `<AppLayout>` einfügen**

Den öffnenden `<AppLayout>`-Tag anpassen:

```html
<!-- VORHER -->
<AppLayout title="Düngeempfehlung" :show-back="true">

<!-- NACHHER -->
<AppLayout title="Düngeempfehlung" :show-back="true">
  <template #actions>
    <button
      data-testid="empfehlung-drucken-button"
      class="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
      @click="printPage"
    >
      <svg class="h-4 w-4" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
        />
      </svg>
      Drucken
    </button>
  </template>
```

- [ ] **Step 3: E2E-Tests ausführen — grün**

```bash
npx playwright test tests/e2e/empfehlung.spec.ts --grep "Print-Button"
```

Expected: Beide Tests PASS

- [ ] **Step 4: Alle Empfehlungs-E2E-Tests ausführen**

```bash
npx playwright test tests/e2e/empfehlung.spec.ts
```

Expected: Alle Tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/AppLayout.vue src/views/RecommendationView.vue tests/e2e/empfehlung.spec.ts
git commit -m "feat(print): add actions slot to AppLayout and print button to RecommendationView"
```

### Task 6: Print-CSS

**Files:**
- Modify: `src/assets/main.css`

- [ ] **Step 1: `@media print` Block an `main.css` anhängen**

```css
@import 'tailwindcss';

@media print {
  /* Nährstoff-Aufschlüsselung immer einblenden */
  [data-testid^="nutrient-breakdown-"] {
    display: block !important;
  }

  /* UI-Chrome ausblenden */
  [data-testid="back-button"],
  [data-testid="logout-button"],
  [data-testid="empfehlung-drucken-button"],
  [data-testid="correction-panel"],
  [data-testid="bottom-nav"],
  nav {
    display: none !important;
  }

  /* Seitenformat */
  @page {
    margin: 1.5cm;
  }

  body {
    font-size: 12pt;
    background: white;
  }
}
```

- [ ] **Step 2: Manuell verifizieren**

1. `npm run dev` starten
2. Einloggen, Feld + Planung anlegen, Empfehlungsseite öffnen
3. Drucken-Button klicken → Druckvorschau prüfen:
   - BottomNav nicht sichtbar
   - Header-Buttons (Zurück, Abmelden, Drucken) nicht sichtbar
   - Nährstoff-Aufschlüsselung sichtbar (auch ohne vorheriges Aufklappen)
   - Produktliste sichtbar

- [ ] **Step 3: Alle Unit-Tests ausführen**

```bash
npm run test:run
```

Expected: Alle Tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/assets/main.css
git commit -m "feat(print): add @media print CSS for clean print layout"
```
