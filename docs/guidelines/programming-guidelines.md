# Programmierrichtlinien — Düngungsberater

Diese Richtlinien gelten verbindlich für alle Implementierungen in diesem Projekt.

---

## 1. Spec-Driven Development

**Keine Implementierung ohne Spec.** Vor jeder neuen Funktion oder jedem User Story muss eine Spec existieren:

1. Spec liegt in `docs/superpowers/specs/YYYY-MM-DD-<thema>-design.md`
2. Spec ist approved (von User oder Reviewer bestätigt)
3. Implementierung folgt der Spec — Abweichungen werden zuerst in der Spec geändert, dann im Code

Wenn eine Implementierung zeigt, dass die Spec unvollständig ist: **stoppen, Spec aktualisieren, dann weiterarbeiten.**

---

## 2. Test-Driven Development (TDD)

**Reihenfolge ist nicht verhandelbar:** Test → Implementierung → Refactor

### Einheitstests (Vitest)

```
1. Test schreiben (schlägt fehl — RED)
2. Minimale Implementierung (wird grün — GREEN)
3. Refactoring ohne neue Funktionalität (REFACTOR)
```

- Berechnungslogik (`useNutrientCalculation`, `useRecommendation`) hat 100% Unit-Test-Abdeckung
- Jede Funktion, die Nährstoffwerte berechnet, wird mit LfL-Referenzwerten getestet
- Tests liegen neben den Dateien: `useNutrientCalculation.test.ts` neben `useNutrientCalculation.ts`

### E2E-Tests (Playwright)

Jeder User-Workflow wird als Playwright-Test abgebildet, **bevor** der Workflow implementiert wird:

```typescript
// Erst der Test:
test('Landwirt kann Empfehlung für Winterweizen berechnen', async ({ page }) => {
  await page.goto('/felder');
  await page.getByRole('button', { name: 'Feld hinzufügen' }).click();
  // ...
  await expect(page.getByTestId('empfehlung-n-kg-ha')).toHaveText('220');
});

// Dann die Implementierung.
```

Playwright-Tests liegen in `tests/e2e/`. Jeder Screen hat eine eigene Testdatei.

### Playwright-Testbarkeit als Design-Requirement

Jedes interaktive Element bekommt ein `data-testid`-Attribut:

```html
<!-- Pflicht für alle klickbaren Elemente, Eingabefelder, Ergebniswerte -->
<button data-testid="berechnen-button">Empfehlung berechnen</button>
<span data-testid="empfehlung-n-kg-ha">{{ nKgHa }}</span>
```

Naming-Konvention für `data-testid`:
- Aktionen: `<ressource>-<aktion>-button` → `feld-anlegen-button`, `empfehlung-berechnen-button`
- Anzeige: `<ressource>-<wert>` → `empfehlung-n-kg-ha`, `feld-groesse-ha`
- Listen-Items: `<ressource>-item-<id>` oder `<ressource>-list`

---

## 3. Clean Code

### Allgemein

- **Eine Verantwortung pro Datei:** Composable, Component oder Service — nie gemischt
- **Keine Magic Numbers:** Alle Konstanten (z.B. LfL-Standardwerte) in `src/constants/` auslagern
- **Funktionsnamen beschreiben die Absicht:** `calculateNitrogenDemand()` nicht `calc()`
- **Keine Kommentare für offensichtliches:** Kommentare erklären das *Warum*, nicht das *Was*
- **Maximale Funktionslänge:** ~30 Zeilen. Länger → aufteilen.
- **Maximale Dateilänge:** ~200 Zeilen. Länger → aufteilen.

### Vue 3 Konventionen

```
src/
  components/       # Rein visuelle Komponenten, keine Business-Logik
  composables/      # Business-Logik als Composables (use*.ts)
  views/            # Route-Level-Komponenten, koordinieren Composables + Components
  stores/           # Pinia Stores für globalen State (Auth, offline-Cache)
  services/         # API-Calls (Supabase), kein direkter Supabase-Aufruf in Composables
  constants/        # LfL-Standardwerte, App-Konstanten
  types/            # TypeScript-Typdefinitionen
```

- **Composables** kapseln die gesamte Berechnungslogik — Services sprechen mit Supabase, Composables sprechen mit Services
- **Keine direkten Supabase-Aufrufe in Komponenten**
- **TypeScript überall** — kein `any`, keine impliziten Typen

### Berechnungslogik

Die Nährstoffberechnung liegt ausschließlich in `src/composables/useNutrientCalculation.ts`. Dieselbe Logik wird für Online- und Offline-Berechnungen verwendet — keine Duplikation.

---

## 4. UX-Konsistenz

### Gleichartige Workflows

Jeder Datenerfassungs-Workflow folgt demselben Muster:

```
1. Liste der vorhandenen Einträge (mit Status-Badge)
2. "+ Neu"-Button öffnet Formular (nicht neue Seite, sondern Drawer/Modal)
3. Formular: Standardwerte vorausgefüllt, optionale Felder klar markiert
4. Speichern → zurück zur Liste, neuer Eintrag ist sichtbar und hervorgehoben
5. Bearbeiten über Klick auf Listeneintrag (gleicher Drawer/Modal)
```

Dieses Muster gilt für: Felder, Anbauplanung, Admin-Kulturen, Admin-Produkte.

### Gleichartige Datendarstellung

| Datentyp | Format | Beispiel |
|---|---|---|
| Fläche | `X,XX ha` | `12,50 ha` |
| Nährstoffmengen pro ha | `XXX kg N/ha` | `220 kg N/ha` |
| Nährstoffmengen gesamt | `X.XXX kg N` | `2.750 kg N` |
| Erträge | `XX dt/ha` | `80 dt/ha` |
| Prozentwerte | `XX %` | `27 %` |
| Saison | `YYYY` | `2025` |

Zahlen immer mit deutschem Dezimaltrennzeichen (Komma). Einheiten immer anzeigen, nie weglassen.

### Status-Badges (konsistent in der gesamten App)

```
✓ Grün   — Empfehlung vorhanden / Aufgabe erledigt
⚠ Gelb   — Aktion erforderlich (z.B. keine Kultur gewählt)
— Grau   — Noch nicht begonnen / kein Eintrag
```

### Navigation

- Bottom Navigation auf Mobile (max. 4 Punkte: Felder, Planung, Profil, [Admin])
- Breadcrumb auf Desktop für tiefere Ebenen
- Zurück-Button immer oben links, führt zur vorherigen Liste

---

## 5. ARC42-Dokumentation

Die Architekturdokumentation liegt in `docs/arc42/` und wird **parallel zur Implementierung** aktualisiert — nicht danach.

### Pflicht-Sektionen (immer aktuell halten)

| Sektion | Datei | Aktualisieren wenn... |
|---|---|---|
| 1. Einführung & Ziele | `01-introduction.md` | Neue Features den Scope ändern |
| 3. Kontextabgrenzung | `03-context.md` | Neue externe Systeme (Affiliates, APIs) |
| 5. Bausteinsicht | `05-building-blocks.md` | Neue Composables, Services, Komponenten-Gruppen |
| 6. Laufzeitsicht | `06-runtime.md` | Neue User-Workflows oder Offline-Sync-Flows |
| 8. Querschnittliche Konzepte | `08-concepts.md` | Neue Patterns (Offline-Strategie, Auth-Konzept, Berechnungslogik) |
| 9. Architekturentscheidungen | `09-decisions.md` | **Jede** bewusste technische Entscheidung als ADR |

### Architecture Decision Records (ADR)

Jede nicht-triviale Architekturentscheidung wird als ADR festgehalten:

```markdown
# ADR-001: Dexie.js für IndexedDB-Offline-Cache

**Status:** Accepted
**Datum:** YYYY-MM-DD

**Kontext:** PWA muss Berechnungen offline ermöglichen...
**Entscheidung:** Dexie.js wird verwendet, weil...
**Konsequenzen:** ...
```

ADRs in `docs/arc42/09-decisions/ADR-XXX-<titel>.md`.

---

## 6. Entwicklungs-Workflow

### Vor jeder neuen Funktion

```
1. Spec prüfen — existiert und ist approved?
2. ARC42 aktualisieren — betrifft die Funktion die Architektur?
3. Playwright-Test schreiben (schlägt fehl)
4. Unit-Tests schreiben (schlagen fehl)
5. Implementieren
6. Tests grün
7. data-testid auf allen neuen Elementen
```

### Commit-Konvention

```
feat: Feldverwaltung — Feld anlegen und bearbeiten
fix: Berechnung N-Abschlag Vorfrucht Raps korrigiert
test: E2E-Tests Empfehlungsflow
docs: ARC42 Bausteinsicht aktualisiert
chore: Abhängigkeiten aktualisiert
```

---

## 7. Technische Vorgaben

### Supabase / Datenzugriff

- Alle Supabase-Aufrufe laufen über `src/services/`
- Row Level Security (RLS) ist in Supabase aktiviert — kein Datenzugriff ohne Auth
- Offline-Writes werden in IndexedDB gepuffert, mit Timestamp und `synced: false`
- Sync läuft beim App-Start und bei Verbindungswiederherstellung (`online`-Event)

### Fehlerbehandlung

- Netzwerkfehler landen immer im Offline-Pfad, nie als Fehlerdialog
- Validierungsfehler werden inline am Feld angezeigt (nicht als Toast)
- Unerwartete Fehler: kurzer Toast, Details in der Browser-Konsole

### Linting & Formatting

- ESLint + Prettier, Konfiguration in `eslint.config.js`
- Kein Commit ohne grüne Linter-Prüfung (pre-commit hook via Husky)
