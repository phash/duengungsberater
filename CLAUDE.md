# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Quick Start (Docker — empfohlen)

```bash
cp .env.docker .env          # Konfiguration erstellen
docker compose up -d --build  # Alle Services starten
```

Öffne: http://localhost:3080 — Registrierung + Login direkt in der App.
Mail-Catcher: http://localhost:9000 (Inbucket)

```bash
docker compose down            # Stoppen
docker compose down -v         # Stoppen + Daten löschen
docker compose logs -f         # Logs
docker compose up -d --build app  # Nur App neu bauen
```

### Quick Start (ohne Docker)

```bash
# Terminal 1
node auth-server.js

# Terminal 2
npm run dev
```

Öffne: http://localhost:5173 — Login mit beliebiger E-Mail + Passwort.
**Admin-Login:** `admin@test.de` / `admin1234` (nur wenn auth-server läuft)

---

## Projekt

**Düngungsberater** — PWA für professionelle Landwirte zur Düngeplanung auf Basis der LfL-Basisdaten Bayern.

GitHub: https://github.com/phash/duengungsberater

Design Spec: `docs/superpowers/specs/2026-03-11-duenger-design.md`
Programmierrichtlinien: `docs/guidelines/programming-guidelines.md` ← **vor jeder Implementierung lesen**
Architekturdokumentation (ARC42): `docs/arc42/`

---

## Entwicklungs-Befehle

```bash
npm run dev          # Entwicklungsserver (Vite, Port 5173)
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

---

## Docker-Stack (Self-Hosted Supabase)

`docker-compose.yml` — Fullstack mit echtem Supabase (GoTrue + PostgREST):

| Service | Image | Port | Zweck |
|---------|-------|------|-------|
| `app` | nginx (Multi-stage Build) | 3080 | PWA + API Reverse Proxy |
| `db` | postgres:15-alpine | — | Datenbank |
| `auth` | supabase/gotrue:v2.158.1 | — | Authentifizierung |
| `rest` | postgrest/postgrest:v12.2.3 | — | REST API |
| `mail` | inbucket | 9000 | E-Mail-Catcher |
| `migrate` | postgres (one-shot) | — | App-Migrationen + Seed |

**Konfiguration:** `.env` (kopiert von `.env.docker`)
- `SITE_URL` — Öffentliche URL (lokal: `http://localhost:3080`, VPS: `https://domain.de`)
- `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY` — Supabase-Credentials
- `MAILER_AUTOCONFIRM` — `true` = kein E-Mail nötig, `false` = Bestätigungsmail via Inbucket

**Docker-Dateien:**

| Datei | Zweck |
|---|---|
| `docker-compose.yml` | Self-Hosted Supabase Stack (Haupt-Setup) |
| `docker-compose.test.yml` | Testrechner (Mock Auth + Cloudflared) |
| `docker-compose.prod.yml` | VPS Produktion (Prod-Build + nginx) |
| `Dockerfile` | Prod-Image (Multi-stage: node build → nginx serve) |
| `Dockerfile.auth` | Mock Auth-Server (Express.js, für Test-Setup) |
| `docker/nginx.conf` | nginx: SPA-Routing + API-Proxy (/auth/v1, /rest/v1) |
| `docker/init-db/00-setup.sh` | DB-Init: Rollen, Auth-Schema, Enums |
| `docker/migrate.sh` | App-Migrationen nach GoTrue-Start |
| `.env.docker` | Konfigurationsvorlage |

### Produktion (VPS)

```bash
# .env anpassen: SITE_URL, POSTGRES_PASSWORD, JWT_SECRET, eigene API-Keys
docker compose up -d --build
```

Deployment-Guide: `docs/deployment.md`
**Prod-Domain:** `duengungsberater.phash.de`

---

## Design System ("Terrain")

**Fonts:** Fraunces (Display-Serif) + Outfit (Body-Sans) via Google Fonts
**Farben:** Tailwind v4 `@theme` in `src/assets/main.css`:
- `parchment` / `parchment-dark` — Warme Creme-Hintergründe
- `field-50` bis `field-900` — Agrar-Grün (Primary)
- `wheat-50` bis `wheat-600` — Weizen-Gold (Akzente, Warnings)
- `harvest` — Ernte-Orange (Shop-Buttons)
- `shadow-warm-*` — Braun-getönte Schatten

**Klassen:** `card-lift` (Hover-Lift), `stagger` (Kinder-Animation), `animate-fade-in-up`, `animate-slide-up`

---

## Architektur

**Tech Stack:** Vue 3 + Vite + TypeScript + Tailwind CSS v4 + Supabase + Dexie.js (IndexedDB) + vite-plugin-pwa + Leaflet (Karte)

```
src/
  components/     # Rein visuelle Komponenten (kein direkter API-/Store-Zugriff)
  composables/    # Business-Logik (use*.ts) — hier lebt die Berechnungslogik
  views/          # Route-Level-Komponenten, koordinieren Composables + Components
  stores/         # Pinia: Auth-State, Offline-Cache-Status
  services/       # Alle Supabase-Aufrufe — kein direkter Supabase-Zugriff außerhalb
  constants/      # LfL-Referenzwerte und App-Konstanten
  types/          # Gemeinsame TypeScript-Typen

docker/           # Docker-Init-Scripts, nginx-Config, Migrations-Runner
supabase/         # SQL-Migrationen + Seed-Daten
```

**Kernkonzept:** Berechnungslogik liegt ausschließlich in `src/composables/useNutrientCalculation.ts` und wird identisch für Online- und Offline-Betrieb verwendet. Services sprechen mit Supabase, Composables sprechen mit Services — keine Supabase-Aufrufe in Komponenten.

**Offline-Strategie:** Kulturdaten, Nährstoffwerte und Korrekturfaktoren werden in IndexedDB (Dexie.js) gecacht. Offline erstellte Pläne werden mit `synced: false` gepuffert und beim nächsten `online`-Event synchronisiert.

**Nährstoffsystem:** Flexibel über `nutrient_types` + `crop_nutrient_demands` — nicht hardcoded auf N/P/K. User-Werte (`source: 'user'`) haben Vorrang vor LfL-Werten (`source: 'lfl'`).

**iBalis-Import:** Felder aus GeoPackage (`.gpkg`) und Shapefile-ZIP (`.zip`) importieren. "Alle übernehmen"-Button für Batch-Import. Koordinaten werden von EPSG:25832 nach WGS84 konvertiert. Feldgrenzen werden auf Leaflet-Karte mit Labels angezeigt.

**Feldkarte (FieldMap):** Leaflet mit OpenStreetMap-Tiles. Felder als Polygone mit permanenten Labels (Name + Fläche). Klick in Feldliste → Karte fliegt zum Feld. Gewähltes Feld gold hervorgehoben.

**Zwei Bereiche:**
- Landwirt-App (PWA, offline-fähig): Auth → Felder (Liste + Karte) → Anbauplanung → Empfehlung → Produkte
- Admin-Bereich (nur online, rollenbasiert): Kulturen, Nährstoffwerte, Korrekturen, Produkte pflegen

---

## Wichtigste Regeln (aus den Programmierrichtlinien)

1. **Spec zuerst** — keine Implementierung ohne approved Spec
2. **TDD** — Test → Implementierung → Refactor, nie umgekehrt
3. **`data-testid` auf allen interaktiven Elementen** — Pflicht von Anfang an
4. **ARC42 parallel aktualisieren** — nicht nachträglich
5. **Gleichartige Workflows** — Datenerfassung immer: Liste → Drawer/Modal → Speichern → zurück zur Liste
6. **Zahlenformate** — deutsches Komma, Einheit immer anzeigen (z.B. `220 kg N/ha`)
