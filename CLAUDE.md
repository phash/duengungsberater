# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Quick Start (ohne Docker)

```bash
# Terminal 1
node auth-server.js

# Terminal 2
npm run dev
```

Öffne: http://localhost:5173 — Login mit beliebiger E-Mail + Passwort (Registrierung direkt in der App).

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

## Docker-Setups

### Lokal (Entwicklung)

Port 5432 war auf dem Host belegt → Postgres auf 5433.

```bash
docker compose up --build       # Alle Services starten
docker compose down             # Alles stoppen
docker compose logs -f cloudflared  # Tunnel-URL anzeigen
```

**Services:** App :5173 · Auth-Server :3000 · Postgres :5433 · Cloudflare-Tunnel

### Testrechner (frische Maschine)

```bash
git clone https://github.com/phash/duengungsberater
cd duengungsberater
docker compose -f docker-compose.test.yml up --build -d
docker compose -f docker-compose.test.yml logs cloudflared  # → Tunnel-URL
```

**Services:** App :5173 · Auth-Server :3000 · Postgres :5432 · Cloudflare-Tunnel

### Produktion (VPS mit nginx)

Deployment-Guide: `docs/deployment.md`

```bash
POSTGRES_PASSWORD=xxx docker compose -f docker-compose.prod.yml up -d --build

# nginx + SSL einmalig einrichten:
sudo cp docs/nginx-vps.conf /etc/nginx/sites-available/duengungsberater.phash.de
sudo ln -s /etc/nginx/sites-available/duengungsberater.phash.de /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d duengungsberater.phash.de

# Updates:
git pull && docker compose -f docker-compose.prod.yml up -d --build
```

**Prod-Domain:** `duengungsberater.phash.de`
**Prod-Files:** `Dockerfile.prod`, `nginx.app.conf`, `docker-compose.prod.yml`, `docs/nginx-vps.conf`

### Docker-Dateien Übersicht

| Datei | Zweck |
|---|---|
| `docker-compose.yml` | Lokal (Postgres auf Port 5433 wegen Konflikt) |
| `docker-compose.test.yml` | Testrechner (Standard-Ports, inkl. Cloudflared) |
| `docker-compose.prod.yml` | VPS Produktion (Prod-Build, nginx, kein Cloudflared) |
| `Dockerfile` | Dev-Image (Vite Dev-Server + HMR) |
| `Dockerfile.prod` | Prod-Image (Multi-stage Build + nginx) |
| `Dockerfile.auth` | Auth-Server (Express.js Mock) |
| `nginx.app.conf` | nginx-Config im Prod-App-Container (SPA-Routing) |
| `docs/nginx-vps.conf` | VPS nginx Reverse Proxy (HTTPS + API-Routing) |

---

## Cloudflare Tunnel

Alle Docker-Setups (außer Prod) beinhalten einen **Cloudflare Quick Tunnel** — kein Account nötig.

```bash
# Tunnel-URL abfragen:
docker compose logs cloudflared
# oder:
docker compose -f docker-compose.test.yml logs cloudflared
```

Die URL (`https://xxx.trycloudflare.com`) ist von überall erreichbar (Handy, externe Geräte).
**Achtung:** URL ändert sich bei jedem Neustart. Für feste URL → Named Tunnel mit CF-Account.

### Wie der Tunnel funktioniert

Der Vite-Dev-Server proxiert `/auth/v1` und `/rest/v1` intern an den Auth-Server.
Der Browser muss den Auth-Server **nicht direkt** erreichen — alle Aufrufe gehen über die App-URL.
`VITE_SUPABASE_URL` ist bewusst leer → App nutzt `window.location.origin` automatisch.

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
  superpowers/    # Design Specs & Implementierungspläne
  deployment.md   # Deployment-Guide (Docker + VPS + Cloudflare)
  nginx-vps.conf  # VPS nginx Reverse Proxy Config
```

**Kernkonzept:** Berechnungslogik liegt ausschließlich in `src/composables/useNutrientCalculation.ts` und wird identisch für Online- und Offline-Betrieb verwendet. Services sprechen mit Supabase, Composables sprechen mit Services — keine Supabase-Aufrufe in Komponenten.

**Offline-Strategie:** Kulturdaten, Nährstoffwerte und Korrekturfaktoren werden in IndexedDB (Dexie.js) gecacht. Offline erstellte Pläne werden mit `synced: false` gepuffert und beim nächsten `online`-Event synchronisiert.

**Auth-Server (`auth-server.js`)** — Mock Supabase Auth API (Express.js):
- In-Memory User Store + PostgreSQL (wenn verfügbar)
- OAuth2 Password Grant Flow
- Endpoints: `/auth/v1/signup`, `/auth/v1/signin`, `/auth/v1/token`, `/rest/v1/*`
- Admin-User vorbelegt: `admin@test.de` / `admin1234`

**Nährstoffsystem:** Flexibel über `nutrient_types` + `crop_nutrient_demands` — nicht hardcoded auf N/P/K. User-Werte (`source: 'user'`) haben Vorrang vor LfL-Werten (`source: 'lfl'`).

**Zwei Bereiche:**
- Landwirt-App (PWA, offline-fähig): Auth → Felder → Anbauplanung → Empfehlung → Produkte
- Admin-Bereich (nur online, rollenbasiert): Kulturen, Nährstoffwerte, Korrekturen, Produkte pflegen

**iBalis-Import:** Felder aus GeoPackage (`.gpkg`) und Shapefile-ZIP (`.zip`) importieren.
Koordinaten werden von EPSG:25832 nach WGS84 konvertiert. Nicht-importierte Felder bleiben
im Drawer erhalten bis der User „Andere Datei wählen" klickt.

---

## Wichtigste Regeln (aus den Programmierrichtlinien)

1. **Spec zuerst** — keine Implementierung ohne approved Spec
2. **TDD** — Test → Implementierung → Refactor, nie umgekehrt
3. **`data-testid` auf allen interaktiven Elementen** — Pflicht von Anfang an
4. **ARC42 parallel aktualisieren** — nicht nachträglich
5. **Gleichartige Workflows** — Datenerfassung immer: Liste → Drawer/Modal → Speichern → zurück zur Liste
6. **Zahlenformate** — deutsches Komma, Einheit immer anzeigen (z.B. `220 kg N/ha`)
