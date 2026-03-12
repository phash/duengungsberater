# Design Spec: E2E-Tests für alle Use Cases

**Datum:** 2026-03-12
**Scope:** Playwright E2E-Tests für alle 28 User Stories (UC-L-01–13, UC-A-01–08, UC-S-01)
**Umgebung:** Lokale Supabase-Instanz (real, kein Mock)

---

## Ziel

Vollständige E2E-Testabdeckung aller Use Cases aus `docs/use-cases-and-user-stories.md`. Bestehende Test-Files werden ersetzt (inkonsistente Struktur, hardcodierte Platzhalter-IDs, fehlende Auth).

---

## Architektur

### Auth-Strategie: Global Setup + storageState

Playwright `globalSetup` läuft einmalig vor allen Tests:
- Loggt `test@example.com` ein → speichert `.auth/user.json`
- Loggt `admin@example.com` ein → speichert `.auth/admin.json`

Zwei Playwright-Projekte in `playwright.config.ts`:
- `user-tests`: `storageState: '.auth/user.json'`
- `admin-tests`: `storageState: '.auth/admin.json'`
- `auth-tests`: kein storageState (testet Login/Logout selbst)

### Dateistruktur

```
tests/e2e/
  global.setup.ts          # Auth-Setup: User + Admin einloggen
  helpers/
    fixtures.ts            # test.extend() mit userPage / adminPage fixtures
    navigation.ts          # Hilfsfunktionen: navigateToEmpfehlung(page, fieldName)
  auth.spec.ts             # UC-L-01, UC-L-02, UC-L-13
  felder.spec.ts           # UC-L-03, UC-L-04, UC-L-05
  anbauplanung.spec.ts     # UC-L-06, UC-L-07, UC-L-08
  empfehlung.spec.ts       # UC-L-09, UC-L-10, UC-L-11, UC-L-12
  admin.spec.ts            # UC-A-01–UC-A-08 (alle 4 Admin-Tabs)
  workflow.spec.ts         # Vollständiger Durchlauf Login → Empfehlung
```

### Test-Daten-Strategie

- Jeder `test.describe`-Block erstellt eigene Testdaten über die UI (`beforeEach`)
- Testdaten-Namen enthalten Timestamp oder UUID → keine Kollisionen zwischen Parallel-Runs
- Cleanup: `afterEach` löscht erstellte Felder/Pläne über UI (Löschen-Flow)
- Feste Credentials: `test@example.com` / `testpassword123`, `admin@example.com` / `adminpassword123`

---

## Test-Files im Detail

### `global.setup.ts`

```typescript
// Pseudocode
setup('authenticate user', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[data-testid="auth-email-input"]', 'test@example.com')
  await page.fill('[data-testid="auth-password-input"]', 'testpassword123')
  await page.click('[data-testid="auth-submit-button"]')
  await page.waitForURL('/felder')
  await page.context().storageState({ path: '.auth/user.json' })
})

setup('authenticate admin', async ({ page }) => {
  // analog mit admin@example.com → .auth/admin.json
})
```

### `auth.spec.ts` (UC-L-01, UC-L-02, UC-L-13) — kein storageState

| Test | UC |
|---|---|
| Unauthentifizierter Zugriff auf /felder → Redirect zu /login | UC-L-02 |
| Login-Formular zeigt E-Mail + Passwort | UC-L-01 / UC-L-02 |
| Zwischen Login und Registrieren wechseln | UC-L-01 |
| Ungültige Credentials → Fehlermeldung sichtbar | UC-L-02 |
| Erfolgreicher Login → Redirect zu /felder | UC-L-02 |
| Abmelden → Redirect zu /login, Session gelöscht | UC-L-13 |
| Nach Abmelden: /felder → Redirect zu /login | UC-L-13 |

### `felder.spec.ts` (UC-L-03–05) — storageState: user

| Test | UC |
|---|---|
| Leerer Zustand zeigt Empty-State | UC-L-03 |
| Feld anlegen: Formular öffnet sich | UC-L-03 |
| Feld anlegen: Name + Größe → in Liste sichtbar | UC-L-03 |
| Feld anlegen: Größe in deutschem Format (12,50 ha) | UC-L-03 |
| Feld anlegen: Validierung — Name leer | UC-L-03 |
| Feld anlegen: Validierung — Größe ≤ 0 | UC-L-03 |
| Feld bearbeiten: Drawer vorausgefüllt | UC-L-04 |
| Feld bearbeiten: Name ändern → Liste aktualisiert | UC-L-04 |
| Feld löschen: Bestätigung erforderlich | UC-L-05 |
| Feld löschen: Verschwindet aus Liste | UC-L-05 |

### `anbauplanung.spec.ts` (UC-L-06–08) — storageState: user

`beforeEach`: Feld anlegen, zu Anbauplanung navigieren
`afterEach`: Feld löschen (kaskadiert Planungen)

| Test | UC |
|---|---|
| Planung anlegen: Kultur-Dropdown zeigt Kulturen | UC-L-06 |
| Planung anlegen: Kulturauswahl füllt Referenzertrag aus | UC-L-06 / US-11 |
| Planung anlegen: Ertrag editierbar | UC-L-06 / US-12 |
| Planung anlegen: erscheint in Liste | UC-L-06 |
| Mehrere Planungen pro Feld möglich | US-14 |
| Planung bearbeiten: Drawer vorausgefüllt | UC-L-07 |
| Planung bearbeiten: Änderungen gespeichert | UC-L-07 |
| Planung löschen: Bestätigung + verschwindet aus Liste | UC-L-08 |
| Navigation zurück zu Feldliste | — |

### `empfehlung.spec.ts` (UC-L-09–12) — storageState: user

`beforeEach`: Feld + Planung anlegen, zu Empfehlung navigieren

| Test | UC |
|---|---|
| Empfehlung wird automatisch berechnet (kein Button) | UC-L-09 / US-15 |
| Nährstoffwerte in kg/ha und kg gesamt sichtbar | US-16 |
| Zahlenformat: deutsches Komma, Einheit sichtbar | US-16 |
| Kontext-Karte zeigt Kultur, Saison, Ertrag, Feld | US-15 |
| Correction Panel standardmäßig eingeklappt | UC-L-10 |
| Vorfrucht auswählen → N-Wert ändert sich | UC-L-10 / US-18 |
| Zwischenfrucht auswählen → N-Wert ändert sich | UC-L-10 |
| Humus auswählen → N-Wert ändert sich | UC-L-10 |
| Alle 3 Korrekturen kombiniert → kumulieren sich | US-19 |
| Korrekturen persistieren nach Zurück + Wiederkommen | — |
| Nährstoff-Zeile klicken → Aufschlüsselung sichtbar | UC-L-11 / US-17 |
| Aufschlüsselung zeigt: Grundbedarf, Ertragskorrektur, Korrekturen | UC-L-11 |
| Produktliste sichtbar | UC-L-12 / US-20 |
| Produkt-Affiliate-Link vorhanden | US-21 |

### `admin.spec.ts` (UC-A-01–08) — storageState: admin

**Tab Kulturen:**

| Test | UC |
|---|---|
| Admin-Bereich erreichbar, 4 Tabs sichtbar | — |
| Nicht-Admin → Redirect weg von /admin | — |
| Kultur anlegen: alle Pflichtfelder, in Liste sichtbar | UC-A-01 |
| Kultur bearbeiten: Drawer vorausgefüllt, Änderungen gespeichert | UC-A-02 |
| Kultur löschen: Bestätigung + verschwindet | UC-A-02 |

**Tab Nährstoffwerte:**

| Test | UC |
|---|---|
| Nährstoffwert anlegen: Kultur + Nährstoff + Werte | UC-A-03 |
| Nährstoffwert bearbeiten | UC-A-04 |
| Nährstoffwert löschen | UC-A-04 |

**Tab Produkte:**

| Test | UC |
|---|---|
| Produkt anlegen: Name, N%, Affiliate-URL, aktiv | UC-A-05 |
| Produkt aktivieren/deaktivieren | UC-A-06 |
| Produkt löschen | UC-A-05 |
| Validierung: kein Nährstoffgehalt > 0 → Fehler | UC-A-05 |
| Validierung: ungültige URL → Fehler | UC-A-05 |

**Tab Korrekturen:**

| Test | UC |
|---|---|
| Korrektur anlegen: Label, Typ, Nährstoffzeile | UC-A-07 |
| Dynamisch weitere Nährstoffzeile hinzufügen | UC-A-07 |
| Korrektur bearbeiten | UC-A-08 |
| Korrektur löschen (kaskadiert correction_values) | UC-A-08 |
| Validierung: keine Nährstoffzeile → Fehler | UC-A-07 |

### `workflow.spec.ts` — Vollständiger Durchlauf

Ein einziger Test der den kompletten Hauptworkflow abdeckt:
Login → Feld anlegen → Planung anlegen → Empfehlung öffnen → Korrekturfaktor wählen → Produkt-Link sichtbar

---

## playwright.config.ts Änderungen

```typescript
export default defineConfig({
  globalSetup: './tests/e2e/global.setup.ts',
  projects: [
    { name: 'auth-tests', testMatch: '**/auth.spec.ts' },
    {
      name: 'user-tests',
      testMatch: ['**/felder.spec.ts', '**/anbauplanung.spec.ts',
                  '**/empfehlung.spec.ts', '**/workflow.spec.ts'],
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

---

## Nicht in Scope

- UC-S-01–03 (Offline/Sync/PWA): Erfordern Service Worker Interception und `navigator.onLine` Mocking — separater Task
- Visuelle Regression Tests
- Performance Tests
