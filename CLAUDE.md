# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Quick Start (Lokal)

### Terminal 1: Auth-Server (Mock Supabase)
```bash
node auth-server.js
# 🚀 Mock Auth Server running on http://localhost:3000
# 📝 In-Memory storage (no database required)
```

### Terminal 2: Vue-App
```bash
npm run dev
# ➜  Local: http://localhost:5173/
```

**Öffne dann:** http://localhost:5173/

### Test-Anmeldung
- Email: beliebig (z.B. `test@example.com`)
- Passwort: beliebig (z.B. `test123`)

### Features
- ✅ **HMR (Hot Module Replacement)** - Auto-Reload bei Code-Änderungen
- ✅ **OAuth2 Password Grant** - Supabase-kompatible Auth
- ✅ **In-Memory Storage** - Keine externe DB nötig
- ✅ **E2E Tests** - Playwright Tests enthalten

---

## Projekt

**Düngungsberater** — PWA für professionelle Landwirte zur Düngeplanung auf Basis der LfL-Basisdaten Bayern.

GitHub: https://github.com/phash/duengungsberater

Design Spec: `docs/superpowers/specs/2026-03-11-duenger-design.md`
Programmierrichtlinien: `docs/guidelines/programming-guidelines.md` ← **vor jeder Implementierung lesen**
Architekturdokumentation (ARC42): `docs/arc42/`

---

## Entwicklungs-Befehle

### Lokale Entwicklung (2 Services)

**Terminal 1 — Auth-Server (Port 3000):**
```bash
node auth-server.js
# Mock Supabase Auth API, speichert Sessions in Memory + PostgreSQL
```

**Terminal 2 — Vue App (Port 5173):**
```bash
npm run dev          # Entwicklungsserver (Vite)
npm run build        # Produktions-Build
npm run preview      # Build lokal vorschauen
```

### Tests
```bash
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

### Docker (vollständiges Setup)
```bash
docker compose up     # Auth-Server + Vue-App (alle Services)
docker compose down   # Alles stoppen
```

**Services:**
- `auth-server` (Port 3000) — Mock Supabase
- `app` (Port 5173) — Vue App

**Umgebungsvariablen (.env):**
```
VITE_SUPABASE_URL=http://localhost:3000
VITE_SUPABASE_ANON_KEY=<fake-key>
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

**Services (Local Development):**
- **auth-server.js** — Mock Supabase Auth API (Express.js)
  - In-Memory User Store (kein PostgreSQL nötig)
  - OAuth2 Password Grant Flow
  - Endpoints: `/auth/v1/signup`, `/auth/v1/signin`, `/auth/v1/token`
  - CORS aktiviert für localhost:5173
- **Vue-App (Vite)** — Vue 3 + TypeScript + Tailwind CSS
  - Hot Module Replacement (HMR) aktiviert
  - Spricht mit auth-server (kein echtes Supabase nötig)
  - Offline-fähig (IndexedDB via Dexie.js)

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
