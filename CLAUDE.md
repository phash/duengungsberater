# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Quick Start

```bash
bash generate-env.sh           # Sichere .env generieren
./deploy.sh                    # Lokal starten (Port 3080)
./deploy.sh --prod             # VPS-Deployment mit Caddy
./deploy.sh --prod --no-cache  # VPS ohne Docker-Cache (bei Code-Änderungen)
```

Öffne: http://localhost:3080 — Registrierung + Login direkt in der App.
Mail-Catcher: http://localhost:9000 (Inbucket)

**Ohne Docker:** `node auth-server.js` + `npm run dev` → http://localhost:5173
Admin-Login (nur auth-server): `admin@test.de` / `admin1234`

⚠️ **`auth-server.js` ist DEV-ONLY.** Crasht absichtlich bei `NODE_ENV=production` (Plaintext-Passwörter, Hardcoded-Admin, keine RLS). Produktion nutzt ausschließlich self-hosted Supabase (`docker-compose.yml` + `docker-compose.caddy.yml`). Die alte `docker-compose.prod.yml` wurde entfernt.

Details: `docs/deployment.md` | Infrastruktur: `docs/infrastructure.md`

**Prod-Deploy:** SSH `musikersuche@82.165.40.140` → `cd /opt/duengungsberater && ./deploy.sh --prod`. Bei Änderungen an Dependencies (`package.json`, `ibalis-proxy/package.json`) oder Dockerfile immer `--no-cache`. `deploy.sh` macht eigenes `git pull`, also erst lokal pushen.

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
- Vitest Unit-Tests

---

## Docker-Stack

Self-Hosted Supabase: `app` (nginx), `db` (PostgreSQL), `auth` (GoTrue), `rest` (PostgREST), `mail` (Inbucket), `migrate`, `ibalis-proxy`

`.env` immer via `generate-env.sh` generieren (Passwörter hex-encoded, keine Sonderzeichen!).

**Neue DB-Migration hinzufügen (3 Stellen!):**
1. SQL-Datei: `supabase/migrations/NNN_name.sql`
2. Volume-Mount: `docker-compose.yml` → migrate service → volumes
3. Ausführung: `docker/migrate.sh` → neuer psql-Aufruf mit echo

**Prod-Container-Namen:** `duengungsberater-db-1` (Service `db`), `duengungsberater-app` (kein `-1` Suffix wegen `container_name`). Nicht verwechseln mit docker-compose.prod.yml Naming.

Details: `docs/deployment.md` | Infrastruktur (VPS, Caddy, Mail, Matomo): `docs/infrastructure.md`

---

## Caddy / CSP / Tracking

Reverse-Proxy + Security-Header werden **im Caddyfile auf dem Server** gesetzt (`/opt/caddyserver/Caddyfile`, Block `duenger.mr-development.de`), nicht in nginx oder im App-Container.

- **Matomo Same-Origin:** `/matomo/*` wird via Caddy `handle_path` an `https://musikersuche.org` proxied → kein Drittanbieter-Verbindungsaufbau im Browser (DSGVO). `index.html` lädt entsprechend `var u="/matomo/";`.
- **CSP:** restriktiv (`script-src 'self' 'unsafe-inline'`, kein Drittanbieter); `unsafe-inline` für Scripts bleibt vorerst, weil JSON-LD + Matomo inline laufen. Wenn JSON-LD/Matomo extrahiert wird, kann `unsafe-inline` entfallen.
- **OSM-Tiles** sind in CSP `img-src` für `https://*.tile.openstreetmap.org` whitelisted (Feldkarte).
- Caddy-Reload: `docker restart caddy-proxy` (Admin-Socket ist nicht exposed → `caddy reload` schlägt fehl, Restart ist der Pfad).

---

## Design System ("Terrain")

**Fonts:** Fraunces (Display-Serif) + Outfit (Body-Sans) — **self-hosted via `@fontsource`** in `src/main.ts` (DSGVO: kein Google-Fonts-CDN).
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

**Regionale Nmin-Richtwerte:** `nmin_regional_values` Tabelle mit endgültigen LfL-Werten pro Crop-Group × Regierungsbezirk × Jahr. Mapping Crop→Group über `nmin_crop_group_mapping`. Fallback "Sonstige Fruchtarten" für unmapped Crops. Region auf `fields.region` (auto-detect aus Geometrie via `src/constants/regions.ts`, Boundaries aus BKG VG2500). Priorität: Bodenprobe > LfL-Richtwert > kein Nmin.

**Geodaten:** Regierungsbezirk-Grenzen aus BKG VG2500 (vereinfacht, ~22KB). Quelldaten in `vg2500_12-31.utm32s.gpkg.zip` (EPSG:25832 UTM). Extraktion via `scripts/extract-regions.mjs` (proj4 für Koordinaten-Transformation). Point-in-Polygon (Ray-Casting) in `src/constants/regions.ts`.

**iBalis-Integration (Agrardatennetzwerk Bayern):**
- **Datei-Import:** GeoPackage (`.gpkg`) und Shapefile-ZIP (`.zip`) via `iBalisImportDrawer` — Koordinaten von EPSG:25832 nach WGS84, tableName wird gegen SQL-Injection validiert, WKB-Ring max 100k Punkte
- **API-Import:** OAuth2 Authorization Code Flow über `ibalis-proxy/` → `IBalisConnectDrawer` — Betriebsnummer als 3 Gruppen (276/09/BNR9), Feldstücke mit WKT-Geometrien, Mock-Modus bis StMELF-Credentials eintreffen
- **Service:** `src/services/ibalis.service.ts` — WKT→GeoJSON Konverter, OAuth2 Flow-Management

**Feldkarte (FieldMap):** Leaflet mit OpenStreetMap-Tiles. Felder als Polygone mit permanenten Labels (Name + Fläche). Klick in Feldliste → Karte fliegt zum Feld. Gewähltes Feld gold hervorgehoben.

**E-Mail-Templates:** HTML-Templates in `docker/mail-templates/` und `public/mail-*.html` (GoTrue erwartet HTTP-URLs). Terrain-Design mit Parchment-Hintergrund, grünem CTA-Button. Templates für: Confirmation, Recovery, Email-Change.

**E-Mail-Verifizierung:** Client-seitig via `/verify` Vue-Route. GoTrue sendet Link mit `token`-Parameter. VerifyView ruft GoTrue API auf und zeigt Erfolg/Fehler. Behandelt Gmail/Outlook Linkscanner (Token bereits verbraucht → trotzdem Erfolg zeigen).

**Drawer-CRUD-Pattern:** `useCrudDrawer<T>()` Composable in `src/composables/useCrudDrawer.ts` — generisches Open/Close/Edit-Management. Verwendet in AdminView (5 Tabs).

**Admin User Management:** Admin kann registrierte User einsehen, sperren (ban) und löschen. SQL-View `admin_users_view` auf `auth.users` + RPC-Funktionen (`admin_list_users`, `admin_ban_user`, `admin_unban_user`, `admin_delete_user`), alle mit `is_admin()` Guard und Selbst-Schutz. Service: `src/services/user-admin.service.ts`. UI: "User" Tab in AdminView mit `AdminUserList` Komponente + Bestätigungsdialog für Löschung.

**App Header (AppLayout):** Sticky frosted-glass Header mit Düngungsberater-Logo, Seitentitel und Hamburger-Menü (drei Striche). Dropdown enthält: Profil, Hilfe, Admin (nur Admins), Impressum, Datenschutz, AGB, Abmelden. Click-Outside schließt das Menü.

**Onboarding-Checkliste:** `src/components/onboarding/OnboardingCard.vue` in `FieldsView` oberhalb Feld-Liste. State via `useOnboardingState` aus Dexie `liveQuery`, **gefiltert nach `auth.userId`** (sonst zählen Felder eines vorigen Logins als „erledigt"). 4 Schritte (Feld → Plan → Empfehlung → PWA-Install). Dismiss-Flag in `localStorage['onboarding_dismissed']`, Reset im Profil. PWA-Install via `usePwaInstall` (capture `beforeinstallprompt` in `main.ts`).

**PWA Auto-Update:** Service Worker wird in `main.ts` via `registerSW()` registriert und prüft alle 60 Sekunden auf Updates. Neue Versionen werden automatisch aktiviert (`registerType: 'autoUpdate'`).

**Zahlenformate:** `useNumberFormat()` in `src/composables/useNumberFormat.ts` — zentral für alle Formatierungen (formatNumber, formatArea, formatValue, formatSigned). Keine lokalen Format-Duplikate in Komponenten.

**Öffentliche Seiten (kein Auth nötig):**
- `/` — Landing Page (Hero, Features, Vorteile, iBalis-Sektion, Nährstoffe, CTA)
- `/login` — Login/Registrierung/Passwort-Reset
- `/verify` — E-Mail-Verifizierung
- `/impressum` — § 5 TMG, Haftung, Urheberrecht, Streitschlichtung (EU OS-Plattform + VSBG §36/37)
- `/datenschutz` — DSGVO (inkl. Matomo Same-Origin, iBalis OAuth2, self-hosted Fonts)
- `/agb` — Nutzungsbedingungen (inkl. Haftungsausschluss § 3)
- `/hilfe` — Benutzerhandbuch (Funktionsübersicht, Anleitungen)

**SEO/GEO:**
- Meta Tags (title, description, keywords, canonical, Open Graph, geo.region DE-BY)
- JSON-LD WebApplication Schema (Features, Audience, Area Bayern)
- `robots.txt` + `sitemap.xml`
- Matomo Tracking (Details in `docs/infrastructure.md`)

**Zwei Bereiche:**
- Landwirt-App (PWA, offline-fähig): Auth → Felder (Liste + Karte + iBalis-Import) → Anbauplanung → Empfehlung → Produkte
- Admin-Bereich (nur online, rollenbasiert): Kulturen, Nährstoffwerte, Korrekturen, Produkte, User-Verwaltung (Ban/Delete)

**Navigation:**
- Login-Seite: Footer-Links zu Impressum, Datenschutz, AGB
- App (eingeloggt): Hamburger-Menü im Header (Profil, Hilfe, Admin, Legal-Links, Abmelden) + BottomNav mobil (Felder, Profil, Admin)
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

---

## Fallstricke (aus vergangenen Sessions gelernt)

- **Node 25 `localStorage`** kollidiert mit jsdom — Tests brauchen `vi.stubGlobal('localStorage', mock)` mit eigenem in-memory-Stub (siehe `src/composables/useOnboardingState.test.ts`).
- **Playwright `testMatch`** — neue `tests/e2e/*.spec.ts` ohne Eintrag in `playwright.config.ts` werden **silent ignoriert**. Passendes Project anhängen (`auth-tests` für Guest-Mode, `user-tests` für eingeloggt, `profil-tests` für `/profil`).
- **Route-Namen deutsch:** `felder`, `anbauplanung` (param `fieldId`), `empfehlung` (params `fieldId`+`planId`), `profil`. `/profil` ist `requiresAuth: true`, nicht als Gast erreichbar.
- **Dexie-Tabellen:** `db.fields`, `db.fieldCropPlans` (nicht `plans`), `db.recommendations`, `db.recommendationValues`. Für reactive Counts: `liveQuery(() => db.X.count()).subscribe(...)`, unsubscribe im `onUnmounted`.
- **Test-Mock-Chain bei Dexie-nutzenden Views:** Tests für Views, die `useOnboardingState`/andere Dexie-Composables importieren, müssen diese mocken (Pattern in `src/views/ProfileView.test.ts`) — sonst „Invalid vnode"-Fehler.
- **`data-testid` deutsch & kebab-case:** `feld-name-input`, `feld-speichern-button`, `onboarding-card`, `onboarding-step-{N}-action-{suffix}`.
- **`vue-tsc --noEmit` ist laxer als `vue-tsc -b`:** Lokaler `npx vue-tsc --noEmit` lässt manche Fehler durch, die der Container-Build (`npm run build` → `vue-tsc -b && vite build`) fängt. Vor `git push` lokal `npm run build` laufen lassen, sonst kippt der Prod-Deploy mit TS-Errors.
- **Composables, die Pinia nutzen, im Test:** Wenn ein Composable `useAuthStore()` o.ä. importiert, muss der Test entweder `setActivePinia(createPinia())` in `beforeEach` setzen ODER den Store via `vi.mock('@/stores/auth.store', …)` ersetzen (Pattern: `src/composables/useOnboardingState.test.ts`).
