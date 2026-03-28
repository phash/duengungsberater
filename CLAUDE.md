# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Quick Start (Docker — empfohlen)

```bash
bash generate-env.sh           # Sichere .env generieren
docker compose up -d --build   # Alle Services starten
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
**Prod-Domain:** `https://duenger.mr-development.de`

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

## CI/CD

GitHub Actions CI (`.github/workflows/ci.yml`) läuft bei Push/PR auf master:
- ESLint
- vue-tsc TypeScript-Check
- Vitest Unit-Tests (199 Tests)

---

## Docker-Stack (Self-Hosted Supabase)

`docker-compose.yml` — Fullstack mit echtem Supabase (GoTrue + PostgREST):

| Service | Image | Port | Zweck |
|---------|-------|------|-------|
| `app` | nginx (Multi-stage Build) | 3080 | PWA + API Reverse Proxy |
| `db` | postgres:16-alpine | — | Datenbank |
| `auth` | supabase/gotrue:v2.158.1 | — | Authentifizierung |
| `rest` | postgrest/postgrest:v12.2.3 | — | REST API |
| `mail` | inbucket | 9000 | E-Mail-Catcher (lokal) |
| `migrate` | postgres (one-shot) | — | App-Migrationen + Seed (idempotent) |
| `ibalis-proxy` | node:20-alpine | 3100 | iBalis OAuth2 Proxy + API Relay |

**Konfiguration:** `.env` (generiert von `generate-env.sh`)
- `SITE_URL` — Öffentliche URL (lokal: `http://localhost:3080`, VPS: `https://duenger.mr-development.de`)
- `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY` — Supabase-Credentials (hex-encoded, keine Sonderzeichen!)
- `MAILER_AUTOCONFIRM` — `true` = kein E-Mail nötig, `false` = Bestätigungsmail
- `IBALIS_MOCK` — `true` = Mock-Daten, `false` = echte iBalis API
- `IBALIS_CLIENT_ID`, `IBALIS_CLIENT_SECRET` — OAuth2 Credentials vom StMELF (ausstehend)

**WICHTIG:** `.env.docker` enthält nur Platzhalter (`REPLACE_ME`). Immer `generate-env.sh` verwenden!

**Docker-Dateien:**

| Datei | Zweck |
|---|---|
| `docker-compose.yml` | Self-Hosted Supabase Stack (Haupt-Setup) |
| `docker-compose.caddy.yml` | Produktion: Caddy-Network, echter Mailserver, kein Port-Binding |
| `docker-compose.test.yml` | Testrechner (Mock Auth + Cloudflared) |
| `Dockerfile` | Prod-Image (Multi-stage: node build → nginx serve) |
| `ibalis-proxy/` | iBalis OAuth2 Proxy-Service (Express.js) |
| `docker/nginx.conf` | nginx: SPA-Routing + API-Proxy (/auth/v1, /rest/v1, /ibalis/) |
| `docker/init-db/00-setup.sh` | DB-Init: Rollen (idempotent mit IF NOT EXISTS) |
| `docker/migrate.sh` | App-Migrationen mit Timeout + ON_ERROR_STOP (aktuell 6 Migrationen) |
| `docker/mail-templates/` | HTML E-Mail-Templates (Terrain-Design) |
| `generate-env.sh` | Sichere .env generieren (`--prod` für VPS, `--force` zum Überschreiben) |

### Produktion (VPS mit Caddy)

```bash
bash generate-env.sh --prod --force
# SMTP_PASS in .env prüfen, dann Mailserver-Account anlegen:
docker exec mailserver setup email add noreply@mr-development.de SMTP_PASS_AUS_ENV

docker compose -f docker-compose.yml -f docker-compose.caddy.yml up -d --build
```

**VPS:** IONOS, Caddy Reverse Proxy (`/opt/caddyserver`), Docker-Mailserver (`/opt/mailserver`)
**Caddy-Config:** `duenger.mr-development.de` Block in `/opt/caddyserver/Caddyfile`
**DNS:** A-Record `duenger` → `82.165.40.140` bei IONOS

**Wichtig bei Prod-Deployment:**
- `--no-cache` bei App-Build wenn Frontend-Änderungen nicht greifen
- App-Container wird automatisch ins `caddy-proxy` Network eingebunden (kein manuelles `docker network connect` nötig, solange ohne `--no-deps` gestartet)
- `ibalis-proxy` muss laufen, sonst crasht nginx (Upstream not found)

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

docker/           # Docker-Init-Scripts, nginx-Config, E-Mail-Templates
ibalis-proxy/     # iBalis OAuth2 Proxy (Express.js, eigener Container)
supabase/         # SQL-Migrationen (idempotent) + Seed-Daten
public/           # Statische Assets, robots.txt, sitemap.xml, E-Mail-Templates
```

**Kernkonzept:** Berechnungslogik liegt in `src/composables/useNutrientCalculation.ts` (inkl. `splitNminToLayers`) und `src/composables/useRecommendation.ts`. Services sprechen mit Supabase, Views koordinieren — keine Supabase-Aufrufe in Komponenten.

**Offline-Strategie:**
- Kulturdaten, Nährstoffwerte und Korrekturfaktoren werden in IndexedDB (Dexie.js v4) gecacht
- Offline erstellte Pläne werden mit `synced: false` gepuffert
- Offline gelöschte Felder/Pläne werden in `pendingDeletes`-Tabelle gequeued
- `syncAll()` mit Mutex (`isSyncing`-Guard) verarbeitet erst Deletes, dann Upserts
- Sync wird bei App-Start und `online`-Event getriggert (nur in `main.ts`, kein doppelter Listener)

**Nährstoffsystem:** Flexibel über `nutrient_types` + `crop_nutrient_demands` — nicht hardcoded auf N/P/K. User-Werte (`source: 'user'`) haben Vorrang vor LfL-Werten (`source: 'lfl'`).

**iBalis-Integration (Agrardatennetzwerk Bayern):**
- **Datei-Import:** GeoPackage (`.gpkg`) und Shapefile-ZIP (`.zip`) via `iBalisImportDrawer` — Koordinaten von EPSG:25832 nach WGS84, tableName wird gegen SQL-Injection validiert, WKB-Ring max 100k Punkte
- **API-Import:** OAuth2 Authorization Code Flow über `ibalis-proxy/` → `IBalisConnectDrawer` — Betriebsnummer als 3 Gruppen (276/09/BNR9), Feldstücke mit WKT-Geometrien, Mock-Modus bis StMELF-Credentials eintreffen
- **Service:** `src/services/ibalis.service.ts` — WKT→GeoJSON Konverter, OAuth2 Flow-Management

**Feldkarte (FieldMap):** Leaflet mit OpenStreetMap-Tiles. Felder als Polygone mit permanenten Labels (Name + Fläche). Klick in Feldliste → Karte fliegt zum Feld. Gewähltes Feld gold hervorgehoben.

**E-Mail-Templates:** HTML-Templates in `docker/mail-templates/` und `public/mail-*.html` (GoTrue erwartet HTTP-URLs). Terrain-Design mit Parchment-Hintergrund, grünem CTA-Button. Templates für: Confirmation, Recovery, Email-Change.

**E-Mail-Verifizierung:** Client-seitig via `/verify` Vue-Route. GoTrue sendet Link mit `token`-Parameter. VerifyView ruft GoTrue API auf und zeigt Erfolg/Fehler. Behandelt Gmail/Outlook Linkscanner (Token bereits verbraucht → trotzdem Erfolg zeigen).

**Drawer-CRUD-Pattern:** `useCrudDrawer<T>()` Composable in `src/composables/useCrudDrawer.ts` — generisches Open/Close/Edit-Management. Verwendet in AdminView (5 Tabs).

**Admin User Management:** Admin kann registrierte User einsehen, sperren (ban) und löschen. SQL-View `admin_users_view` auf `auth.users` + RPC-Funktionen (`admin_list_users`, `admin_ban_user`, `admin_unban_user`, `admin_delete_user`), alle mit `is_admin()` Guard und Selbst-Schutz. Service: `src/services/user-admin.service.ts`. UI: "User" Tab in AdminView mit `AdminUserList` Komponente + Bestätigungsdialog für Löschung.

**App Header (AppLayout):** Sticky frosted-glass Header mit Düngungsberater-Logo, Seitentitel und Hamburger-Menü (drei Striche). Dropdown enthält: Profil, Impressum, Datenschutz, AGB, Abmelden. Click-Outside schließt das Menü.

**PWA Auto-Update:** Service Worker wird in `main.ts` via `registerSW()` registriert und prüft alle 60 Sekunden auf Updates. Neue Versionen werden automatisch aktiviert (`registerType: 'autoUpdate'`).

**Zahlenformate:** `useNumberFormat()` in `src/composables/useNumberFormat.ts` — zentral für alle Formatierungen (formatNumber, formatArea, formatValue, formatSigned). Keine lokalen Format-Duplikate in Komponenten.

**Öffentliche Seiten (kein Auth nötig):**
- `/` — Landing Page (Hero, Features, Vorteile, iBalis-Sektion, Nährstoffe, CTA)
- `/login` — Login/Registrierung/Passwort-Reset
- `/verify` — E-Mail-Verifizierung
- `/impressum` — § 5 TMG, Haftung, Urheberrecht, Streitschlichtung (EU OS-Plattform + VSBG §36/37)
- `/datenschutz` — DSGVO (inkl. Matomo, iBalis OAuth2, Google Fonts)
- `/agb` — Nutzungsbedingungen (inkl. Haftungsausschluss § 3)

**SEO/GEO:**
- Meta Tags (title, description, keywords, canonical, Open Graph, geo.region DE-BY)
- JSON-LD WebApplication Schema (Features, Audience, Area Bayern)
- `robots.txt` + `sitemap.xml` (5 URLs)
- Matomo Tracking (Site ID 3, self-hosted auf musikersuche.org)
- CSP in Caddyfile erlaubt musikersuche.org für Matomo

**Zwei Bereiche:**
- Landwirt-App (PWA, offline-fähig): Auth → Felder (Liste + Karte + iBalis-Import) → Anbauplanung → Empfehlung → Produkte
- Admin-Bereich (nur online, rollenbasiert): Kulturen, Nährstoffwerte, Korrekturen, Produkte, User-Verwaltung (Ban/Delete)

**Navigation:**
- Login-Seite: Footer-Links zu Impressum, Datenschutz, AGB
- App (eingeloggt): Hamburger-Menü im Header (Profil, Legal-Links, Abmelden) + BottomNav mobil (Felder, Profil, Admin)
- Legal-Seiten: Eigenständige Views mit Zurück-Link, kein Auth nötig

---

## Wichtigste Regeln (aus den Programmierrichtlinien)

1. **Spec zuerst** — keine Implementierung ohne approved Spec
2. **TDD** — Test → Implementierung → Refactor, nie umgekehrt
3. **`data-testid` auf allen interaktiven Elementen** — Pflicht von Anfang an
4. **ARC42 parallel aktualisieren** — nicht nachträglich
5. **Gleichartige Workflows** — Datenerfassung immer: Liste → Drawer/Modal → Speichern → zurück zur Liste
6. **Zahlenformate** — deutsches Komma via `useNumberFormat()`, Einheit immer anzeigen (z.B. `220 kg N/ha`)
7. **Kein Supabase-Zugriff in Komponenten** — nur in `src/services/`
8. **Berechnungslogik nur in Composables** — nicht in Views oder Components
9. **SQL-Migrationen idempotent** — `IF NOT EXISTS`, `DROP POLICY IF EXISTS` etc.
10. **Passwörter/Keys hex-encoded** — keine `+`/`=`/`/` die PostgreSQL-URLs brechen
