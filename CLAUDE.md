# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Projekt

**Düngungsberater** — PWA für professionelle Landwirte zur Düngeplanung auf Basis der LfL-Basisdaten Bayern.

Design Spec: `docs/superpowers/specs/2026-03-11-duenger-design.md`
Programmierrichtlinien: `docs/guidelines/programming-guidelines.md` ← **vor jeder Implementierung lesen**
Architekturdokumentation (ARC42): `docs/arc42/`

---

## Entwicklungs-Befehle

```bash
npm run dev          # Entwicklungsserver (Vite)
npm run build        # Produktions-Build
npm run preview      # Build lokal vorschauen

npm run test         # Unit-Tests (Vitest, watch mode)
npm run test:run     # Unit-Tests einmalig ausführen
npm run test:e2e     # E2E-Tests (Playwright, headless)
npm run test:e2e:ui  # E2E-Tests mit Playwright UI

npm run lint         # ESLint prüfen
npm run lint:fix     # ESLint automatisch korrigieren
npm run format       # Prettier formatieren
```

Einzelnen Test ausführen:
```bash
npx vitest run src/composables/useNutrientCalculation.test.ts
npx playwright test tests/e2e/felder.spec.ts
```

---

## Architektur

**Tech Stack:** Vue 3 + Vite + TypeScript + Tailwind CSS + Supabase + Dexie.js (IndexedDB) + vite-plugin-pwa

```
src/
  components/     # Rein visuelle Komponenten (kein direkter API-/Store-Zugriff)
  composables/    # Business-Logik (use*.ts) — hier lebt die Berechnungslogik
  views/          # Route-Level-Komponenten, koordinieren Composables + Components
  stores/         # Pinia: Auth-State, Offline-Cache-Status
  services/       # Alle Supabase-Aufrufe — kein direkter Supabase-Zugriff außerhalb
  constants/      # LfL-Referenzwerte und App-Konstanten
  types/          # Gemeinsame TypeScript-Typen

tests/
  unit/           # Vitest-Unit-Tests (Berechnungslogik)
  e2e/            # Playwright E2E-Tests (ein File pro Screen/Workflow)

docs/
  arc42/          # Architekturdokumentation (ARC42), immer aktuell halten
  guidelines/     # Programmierrichtlinien
  superpowers/    # Design Specs
```

**Kernkonzept:** Berechnungslogik liegt ausschließlich in `src/composables/useNutrientCalculation.ts` und wird identisch für Online- und Offline-Betrieb verwendet. Services sprechen mit Supabase, Composables sprechen mit Services — keine Supabase-Aufrufe in Komponenten.

**Offline-Strategie:** Kulturdaten, Nährstoffwerte und Korrekturfaktoren werden in IndexedDB (Dexie.js) gecacht. Offline erstellte Pläne werden mit `synced: false` gepuffert und beim nächsten `online`-Event synchronisiert.

**Nährstoffsystem:** Flexibel über `nutrient_types` + `crop_nutrient_demands` — nicht hardcoded auf N/P/K. User-Werte (`source: 'user'`) haben Vorrang vor LfL-Werten (`source: 'lfl'`).

**Zwei Bereiche:**
- Landwirt-App (PWA, offline-fähig): Auth → Felder → Anbauplanung → Empfehlung → Produkte
- Admin-Bereich (nur online, rollenbasiert): Kulturen, Nährstoffwerte, Korrekturen, Produkte pflegen

---

## Wichtigste Regeln (aus den Programmierrichtlinien)

1. **Spec zuerst** — keine Implementierung ohne approved Spec
2. **TDD** — Test → Implementierung → Refactor, nie umgekehrt
3. **`data-testid` auf allen interaktiven Elementen** — Pflicht von Anfang an
4. **ARC42 parallel aktualisieren** — nicht nachträglich
5. **Gleichartige Workflows** — Datenerfassung immer: Liste → Drawer/Modal → Speichern → zurück zur Liste
6. **Zahlenformate** — deutsches Komma, Einheit immer anzeigen (z.B. `220 kg N/ha`)
