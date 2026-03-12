# Design Spec: E2E-Tests für alle Use Cases

**Datum:** 2026-03-12
**Scope:** Playwright E2E-Tests für alle 28 User Stories (UC-L-01–13, UC-A-01–08, UC-S-01)
**Umgebung:** Lokale Supabase-Instanz (real, kein Mock)

---

## Ziel

Vollständige E2E-Testabdeckung aller Use Cases aus `docs/use-cases-and-user-stories.md`. Alle bestehenden Test-Files (auth, felder, anbauplanung, empfehlung, admin, workflow, korrekturen) werden gelöscht und durch die hier beschriebene neue Struktur ersetzt.

---

## Architektur

### Auth-Strategie: Global Setup + storageState

Playwright `globalSetup` läuft einmalig vor allen Tests:
- Erstellt `.auth/`-Verzeichnis falls nicht vorhanden (`fs.mkdirSync('.auth', { recursive: true })`)
- Loggt `test@example.com` / `testpassword123` ein → speichert `.auth/user.json`
- Loggt `admin@example.com` / `adminpassword123` ein → speichert `.auth/admin.json`

Drei Playwright-Projekte in `playwright.config.ts`:
- `auth-tests`: kein storageState (testet Login/Logout/Register selbst)
- `user-tests`: `storageState: '.auth/user.json'`
- `admin-tests`: `storageState: '.auth/admin.json'`

`workflow.spec.ts` gehört zu `auth-tests` (kein storageState), da der Test manuell einloggt.

### Dateistruktur

```
tests/e2e/
  global.setup.ts          # Auth-Setup: User + Admin einloggen, .auth/ anlegen
  helpers/
    create-field.ts        # UI-Helper: Feld anlegen + Referenz zurückgeben
    create-plan.ts         # UI-Helper: Anbauplanung anlegen
    delete-field.ts        # UI-Helper: Feld über UI löschen (für afterEach)
  auth.spec.ts             # UC-L-01, UC-L-02, UC-L-13
  felder.spec.ts           # UC-L-03, UC-L-04, UC-L-05
  anbauplanung.spec.ts     # UC-L-06, UC-L-07, UC-L-08
  empfehlung.spec.ts       # UC-L-09, UC-L-10, UC-L-11, UC-L-12
  admin.spec.ts            # UC-A-01–UC-A-08 (alle 4 Admin-Tabs)
  workflow.spec.ts         # Vollständiger Durchlauf Login → Empfehlung
```

**Ersetzt und gelöscht:** `korrekturen.spec.ts` (Inhalte verteilt auf `empfehlung.spec.ts` und `admin.spec.ts`)

### Kanonische data-testid-Namen

Verbindliche Referenz — aus Quellcode abgeleitet, alle Tests müssen diese verwenden:

| Element | data-testid |
|---|---|
| Login E-Mail | `auth-email-input` |
| Login Passwort | `auth-password-input` |
| Login/Register Button | `auth-submit-button` |
| Toggle Login↔Register | `auth-toggle-button` |
| Auth Fehler | `auth-error` |
| Auth Formular | `auth-form` |
| Feld-Listen-Item | `field-item-{id}` (Englisch) |
| Feld Größe Input | `feld-size-input` |
| Feld Name Input | `feld-name-input` |
| Feld Speichern | `feld-speichern-button` |
| Feld Löschen | `feld-loeschen-button` |
| Feld Löschen Bestätigen | `feld-loeschen-confirm-button` |
| Feld anlegen Button | `feld-anlegen-button` |
| Plan Kultur Select | `plan-crop-select` |
| Plan Ertrag Input | `plan-yield-input` |
| Plan Speichern | `plan-speichern-button` |
| Plan Empfehlung Button | `plan-empfehlung-button-{id}` |
| Plan anlegen Button | `plan-anlegen-button` |
| Drawer Modal | `drawer-modal` |
| Correction Panel | `correction-panel` |
| Correction Panel Toggle | `correction-panel-toggle` |
| Correction Vorfrucht | `correction-vorfrucht-select` |
| Correction Zwischenfrucht | `correction-zwischenfrucht-select` |
| Correction Humus | `correction-humus-select` |
| Nährstoff-Zeile | `nutrient-row-{code}` (z.B. `nutrient-row-N`) |
| Recommendation Card | `recommendation-card` |
| Produkt Liste | `product-list` |
| Empfehlung Kontext | `empfehlung-context` |

### Test-Daten-Strategie

- Testdaten-Namen enthalten `Date.now()`-Suffix → keine Kollisionen
- `beforeEach` erstellt benötigte Daten über die UI
- `afterEach` löscht erstellte Daten über UI-Löschen-Flow
- Falls Test vor Datenerstellung fehlschlägt: `afterEach` prüft Existenz vor Löschen (`if (await page.locator(...).count() > 0)`)
- Admin-Tests nutzen denselben Ansatz; Supabase-direkter Cleanup ist **nicht** vorgesehen (würde Testbedingungen von Produktionsbedingungen entkoppeln)

### Warte-Strategie (kein `waitForTimeout`)

- **Nie** `waitForTimeout(n)` verwenden
- Stattdessen: `await expect(locator).toBeVisible()`, `await page.waitForURL(...)`, `await page.waitForResponse(...)`
- Nach Speichern: auf Drawer-Schließen warten: `await expect(page.getByTestId('drawer-modal')).not.toBeVisible()`

---

## Test-Files im Detail

### `global.setup.ts`

```typescript
// Pseudocode
import fs from 'fs'
import { chromium } from '@playwright/test'

async function globalSetup() {
  fs.mkdirSync('.auth', { recursive: true })
  const browser = await chromium.launch()

  // User
  const userPage = await browser.newPage()
  await userPage.goto('/login')
  await userPage.fill('[data-testid="auth-email-input"]', 'test@example.com')
  await userPage.fill('[data-testid="auth-password-input"]', 'testpassword123')
  await userPage.click('[data-testid="auth-submit-button"]')
  await userPage.waitForURL('/felder')
  await userPage.context().storageState({ path: '.auth/user.json' })

  // Admin
  const adminPage = await browser.newPage()
  await adminPage.goto('/login')
  await adminPage.fill('[data-testid="auth-email-input"]', 'admin@example.com')
  await adminPage.fill('[data-testid="auth-password-input"]', 'adminpassword123')
  await adminPage.click('[data-testid="auth-submit-button"]')
  await adminPage.waitForURL('/felder')
  await adminPage.context().storageState({ path: '.auth/admin.json' })

  await browser.close()
}
export default globalSetup
```

---

### `auth.spec.ts` (UC-L-01, UC-L-02, UC-L-13) — kein storageState

| Test | UC |
|---|---|
| Unauthentifizierter Zugriff auf /felder → Redirect zu /login | UC-L-02 |
| Login-Formular zeigt E-Mail + Passwort + Button | UC-L-02 |
| Zwischen Login und Registrieren umschalten | UC-L-01 |
| Registrieren: E-Mail bereits vergeben → Fehlermeldung | UC-L-01 |
| Registrieren: Passwort < 6 Zeichen → Validierungsfehler | UC-L-01 |
| Ungültige Credentials → `auth-error` sichtbar | UC-L-02 |
| Erfolgreicher Login → Redirect zu /felder | UC-L-02 |
| Abmelden → Redirect zu /login | UC-L-13 |
| Nach Abmelden: /felder → Redirect zu /login | UC-L-13 |

**Hinweis:** Erfolgreiche Registrierung (inkl. E-Mail-Bestätigung) ist nicht E2E-testbar ohne SMTP-Zugriff — explizit ausgeschlossen.

---

### `felder.spec.ts` (UC-L-03–05) — storageState: user

**Offline-Verhalten** (US-09: `synced: false`-Logik) ist Teil von UC-S-Tests und hier explizit ausgeschlossen.

| Test | UC |
|---|---|
| Leerer Zustand zeigt Empty-State | UC-L-03 |
| Feld anlegen: Drawer öffnet sich mit Name + Größe Feldern | UC-L-03 |
| Feld anlegen: Name + Größe → erscheint in Liste | UC-L-03 |
| Feld anlegen: Größe in deutschem Format (z.B. `12,50 ha`) | UC-L-03 |
| Feld anlegen: Name leer → Speichern blockiert | UC-L-03 |
| Feld anlegen: Größe ≤ 0 → Speichern blockiert | UC-L-03 |
| Feld bearbeiten: Drawer öffnet sich vorausgefüllt | UC-L-04 |
| Feld bearbeiten: Name ändern → Liste zeigt neuen Namen | UC-L-04 |
| Feld löschen: Bestätigungsdialog erscheint | UC-L-05 |
| Feld löschen: Abbrechen → Feld bleibt | UC-L-05 |
| Feld löschen: Bestätigen → Feld verschwindet aus Liste | UC-L-05 |

---

### `anbauplanung.spec.ts` (UC-L-06–08) — storageState: user

`beforeEach`: Feld via `createField(page)` anlegen, zu `/felder/:id/planung` navigieren
`afterEach`: Feld via `deleteField(page, fieldName)` löschen (kaskadiert alle Planungen)

**Offline-Verhalten** explizit ausgeschlossen (→ UC-S-Tests).

| Test | UC |
|---|---|
| Planung anlegen: Kultur-Dropdown zeigt Kulturen | UC-L-06 |
| Planung anlegen: Kulturauswahl füllt `plan-yield-input` mit Referenzertrag | US-11 |
| Planung anlegen: Ertrag ist editierbar | US-12 |
| Planung anlegen: erscheint in Liste | UC-L-06 |
| Mehrere Planungen pro Feld anlegen → beide sichtbar | US-14 |
| Planung bearbeiten: Drawer vorausgefüllt | UC-L-07 |
| Planung bearbeiten: Änderungen in Liste sichtbar | UC-L-07 |
| Planung löschen: Bestätigung erforderlich | UC-L-08 |
| Planung löschen: verschwindet aus Liste | UC-L-08 |
| Zurück-Button → Feldliste | — |

---

### `empfehlung.spec.ts` (UC-L-09–12) — storageState: user

`beforeEach`: Feld + Planung (Winterweizen, 80 dt/ha, 10 ha) via Helpers anlegen, Empfehlungs-URL öffnen
`afterEach`: Feld löschen

**Enthält auch:** Correction-Panel-Tests aus dem bisherigen `korrekturen.spec.ts`

| Test | UC |
|---|---|
| Empfehlung wird automatisch berechnet — kein Button im DOM | UC-L-09 / US-15 |
| Nährstoffwerte in kg/ha und kg gesamt sichtbar | US-16 |
| Zahlenformat: Komma als Dezimaltrenner, Einheit sichtbar | US-16 |
| Kontext-Karte zeigt Kultur, Saison, Ertrag, Feld + Größe | US-15 |
| Correction Panel standardmäßig eingeklappt | UC-L-10 |
| Panel aufklappen → 3 Dropdowns sichtbar (Vorfrucht, Zwischenfrucht, Humus) | UC-L-10 |
| Vorfrucht wählen → N-Wert in `nutrient-row-N` ändert sich | US-18 |
| Zwischenfrucht wählen → N-Wert ändert sich | UC-L-10 |
| Humus wählen → N-Wert ändert sich | UC-L-10 |
| Alle 3 aktiv → Summe der Korrekturen kumuliert korrekt | US-19 |
| Korrekturen persistieren nach Zurück + erneut öffnen | — |
| Nährstoff-Zeile klicken → Aufschlüsselung klappt auf | UC-L-11 / US-17 |
| Aufschlüsselung zeigt Grundbedarf, Ertragskorrektur, Einzelkorrekturen | UC-L-11 |
| Produktliste sichtbar mit Mengenangabe | UC-L-12 / US-20 |
| Mindestens ein Produkt hat Affiliate-Link (`href` nicht leer) | US-21 |

---

### `admin.spec.ts` (UC-A-01–08) — storageState: admin

`afterEach` prüft Existenz des Eintrags vor Löschen (`count() > 0`), um Fehlschlag bei nicht erstellten Daten zu vermeiden.

**Tab Kulturen (UC-A-01, UC-A-02):**

| Test | UC |
|---|---|
| /admin erreichbar als Admin, 4 Tabs sichtbar | — |
| /admin als nicht-Admin → Redirect | — |
| Kultur anlegen: Pflichtfelder ausfüllen → in Liste sichtbar | UC-A-01 |
| Kultur bearbeiten: Drawer vorausgefüllt, Änderung gespeichert | UC-A-02 |
| Kultur löschen: Bestätigung + verschwindet aus Liste | UC-A-02 |

**Tab Nährstoffwerte (UC-A-03, UC-A-04):**

| Test | UC |
|---|---|
| Nährstoffwert anlegen: Kultur + Nährstofftyp + Werte → sichtbar | UC-A-03 |
| Nährstoffwert mit `source: 'user'` anlegen → Quelle-Badge zeigt 'user' | US-26 |
| User-Nährstoffwert überschreibt LfL-Wert in Empfehlung (N-Wert prüfen) | US-26 |
| Nährstoffwert bearbeiten | UC-A-04 |
| Nährstoffwert löschen | UC-A-04 |

**Tab Produkte (UC-A-05, UC-A-06):**

| Test | UC |
|---|---|
| Produkt anlegen: Name, N%, gültige URL → in Liste | UC-A-05 |
| Produkt anlegen: kein Nährstoffgehalt > 0 → Fehler | UC-A-05 |
| Produkt anlegen: ungültige URL → Fehler | UC-A-05 |
| Produkt deaktivieren: `aktiv`-Toggle → in Liste als inaktiv markiert | UC-A-06 |
| Produkt reaktivieren | UC-A-06 |
| Produkt löschen | UC-A-05 |

**Tab Korrekturen (UC-A-07, UC-A-08):**

| Test | UC |
|---|---|
| Korrektur anlegen: Label, Typ, 1 Nährstoffzeile → in Liste | UC-A-07 |
| Zweite Nährstoffzeile dynamisch hinzufügen | UC-A-07 |
| Korrektur anlegen: keine Nährstoffzeile → Fehler | UC-A-07 |
| Korrektur bearbeiten: Label ändern → in Liste | UC-A-08 |
| Korrektur löschen: Bestätigung + verschwindet | UC-A-08 |

---

### `workflow.spec.ts` — auth-tests (kein storageState)

Ein einziger Test, der den vollständigen Hauptworkflow abdeckt:

```
Login → Feld anlegen → zur Anbauplanung → Planung anlegen →
zur Empfehlung → Korrekturfaktor wählen → N-Wert ändert sich →
Produktliste mit Affiliate-Link sichtbar
```

`afterEach`: Feld via `deleteField(page, feldName)` löschen — kaskadiert Planung und Empfehlung.

---

## playwright.config.ts Änderungen

```typescript
export default defineConfig({
  globalSetup: './tests/e2e/global.setup.ts',
  projects: [
    {
      name: 'auth-tests',
      testMatch: ['**/auth.spec.ts', '**/workflow.spec.ts'],
    },
    {
      name: 'user-tests',
      testMatch: ['**/felder.spec.ts', '**/anbauplanung.spec.ts', '**/empfehlung.spec.ts'],
      use: { storageState: '.auth/user.json' },
    },
    {
      name: 'admin-tests',
      testMatch: '**/admin.spec.ts',
      use: { storageState: '.auth/admin.json' },
    },
  ],
})
```

`.auth/` zu `.gitignore` hinzufügen.

---

## Nicht in Scope

- **UC-S-01–03 / US-09** (Offline/Sync/PWA): Service Worker Interception + `navigator.onLine` Mocking — separater Task
- **UC-L-01 erfolgreiche Registrierung**: E-Mail-Bestätigung nicht ohne SMTP-Zugriff testbar
- Visuelle Regression Tests
- Performance Tests
