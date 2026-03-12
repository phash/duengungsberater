# Düngungsberater

PWA für professionelle Landwirte zur präzisen Düngeplanung auf Basis der offiziellen LfL-Basisdaten Bayern.

## Funktionen

- **Nährstoffberechnung** nach LfL-Basisdaten (N, P, K, Mg, S und mehr)
- **Korrekturfaktoren** für Vorfrucht, Zwischenfrucht und Humusgehalt
- **Offline-Betrieb** — Felder, Anbauplanung und Empfehlungen funktionieren ohne Netz
- **Produktempfehlungen** mit Affiliate-Links zu Dünger-Shops
- **Admin-Bereich** für Pflege von Kulturen, Nährstoffwerten, Korrekturen und Produkten
- **PWA** — installierbar auf Smartphone und Tablet

## Tech Stack

| Bereich | Technologie |
|---|---|
| Frontend | Vue 3 + TypeScript + Tailwind CSS |
| Build | Vite + vite-plugin-pwa |
| Backend | Supabase (Auth, PostgreSQL, Row-Level Security) |
| Offline | Dexie.js (IndexedDB) |
| Tests | Vitest (Unit) + Playwright (E2E) |

## Architektur

```
src/
  components/     # Rein visuelle Komponenten
  composables/    # Business-Logik (useNutrientCalculation, useOfflineSync, ...)
  views/          # Route-Level-Komponenten
  stores/         # Pinia: Auth, Offline-Status
  services/       # Supabase-Aufrufe (field, crop, nutrient, correction, ...)
  constants/      # LfL-Referenzwerte (Fallback wenn DB leer)
  types/          # Gemeinsame TypeScript-Typen

tests/
  unit/           # Vitest-Unit-Tests (Berechnungslogik)
  e2e/            # Playwright E2E-Tests

supabase/
  migrations/     # Datenbankschema
  seed.sql        # Initialdaten (LfL-Werte, Korrekturfaktoren)
```

## Entwicklung

### Voraussetzungen

- Node.js 20+
- Supabase CLI (`npm i -g supabase`)

### Setup

```bash
# Abhängigkeiten installieren
npm install

# Umgebungsvariablen
cp .env.example .env
# VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY eintragen

# Lokale Supabase-Instanz starten
supabase start

# Entwicklungsserver
npm run dev
```

### Befehle

```bash
npm run dev          # Entwicklungsserver (Vite)
npm run build        # Produktions-Build
npm run preview      # Build lokal vorschauen

npm run test         # Unit-Tests (Vitest, watch mode)
npm run test:run     # Unit-Tests einmalig
npm run test:e2e     # E2E-Tests (Playwright, headless)
npm run test:e2e:ui  # E2E-Tests mit Playwright UI

npm run lint         # ESLint prüfen
npm run lint:fix     # ESLint automatisch korrigieren
npm run format       # Prettier formatieren
```

### Einzelne Tests

```bash
npx vitest run src/composables/useNutrientCalculation.test.ts
npx playwright test tests/e2e/felder.spec.ts
```

## Datenbank

Das Supabase-Schema liegt in `supabase/migrations/`. Seed-Daten (LfL-Basisdaten, Korrekturfaktoren) sind in `supabase/seed.sql`.

```bash
# Schema + Seed neu aufsetzen
supabase db reset
```

## Offline-Strategie

Alle Stammdaten (Kulturen, Nährstoffwerte, Korrekturfaktoren, Produkte) werden beim ersten Online-Start in IndexedDB gecacht. Offline erstellte Pläne und Empfehlungen werden mit `synced: false` gepuffert und beim nächsten `online`-Event automatisch synchronisiert. Als letzter Fallback dienen die in `src/constants/` eingebetteten LfL-Referenzwerte.

## Dokumentation

- `docs/arc42/` — Architekturdokumentation (ARC42)
- `docs/guidelines/programming-guidelines.md` — Entwicklungsrichtlinien
- `docs/superpowers/specs/` — Feature-Spezifikationen

## Lizenz

Privates Projekt — alle Rechte vorbehalten.
