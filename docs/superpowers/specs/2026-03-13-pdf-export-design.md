# PDF-Export (Drucken) — Design Spec

**Datum:** 2026-03-13
**Status:** Approved

---

## Überblick

Die Düngeempfehlung soll als Druckansicht ausgegeben werden können. Umsetzung über den Browser-Druckdialog (`window.print()`) mit Print-CSS — keine externe Bibliothek, offline-fähig, kein zusätzliches Bundle-Gewicht.

---

## Anforderungen

- Alle Inhalte der Empfehlungsseite sind im Ausdruck enthalten: Kontext (Kultur, Saison, Ertrag, Feld), Nmin-Info, aktive Korrekturfaktoren, Nährstoffbedarf inkl. Aufschlüsselung, Produktempfehlungen mit Affiliate-Links
- Nährstoff-Aufschlüsselung (Grundbedarf, Ertragskorrektur, Korrekturen) ist im Ausdruck **immer aufgeklappt**, unabhängig vom interaktiven Zustand
- Print-Button erscheint im Header der Empfehlungsseite (rechts neben dem Titel)
- Keine neuen Abhängigkeiten, kein neuer State, kein neues Bundle

---

## Technische Umsetzung

### Ansatz: `v-show` + `@media print` CSS

Die Breakdown-Divs in `RecommendationCard` werden von `v-if` auf `v-show` umgestellt, damit sie stets im DOM verbleiben. Print-CSS erzwingt ihre Sichtbarkeit und blendet UI-Chrome aus.

### Dateien

| Datei | Änderung |
|---|---|
| `src/components/AppLayout.vue` | Optionaler `actions`-Slot im Header (zwischen Titel-Gruppe und Logout-Button) |
| `src/components/RecommendationCard.vue` | `v-if` → `v-show` für Breakdown-Divs |
| `src/assets/main.css` | `@media print` Block |
| `src/views/RecommendationView.vue` | Print-Button im `#actions`-Slot |

---

## AppLayout — `actions` Slot

```html
<div class="flex items-center gap-2">
  <slot name="actions" />
  <button data-testid="logout-button" ...>Abmelden</button>
</div>
```

Der Slot ist optional. Alle anderen Views bleiben unverändert.

---

## RecommendationCard — `v-show` statt `v-if`

```html
<div
  v-show="expandedCode === result.nutrient_code && !!result.breakdown"
  :data-testid="`nutrient-breakdown-${result.nutrient_code}`"
  ...
>
```

Der interaktive Expand/Collapse bleibt erhalten. Im Ausdruck greift Print-CSS ein.

---

## RecommendationView — Print-Button

```html
<AppLayout title="Düngeempfehlung" :show-back="true">
  <template #actions>
    <button
      data-testid="empfehlung-drucken-button"
      class="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
      @click="window.print()"
    >
      <!-- Drucker-SVG-Icon -->
      Drucken
    </button>
  </template>
  ...
</AppLayout>
```

---

## Print-CSS (`src/assets/main.css`)

```css
@media print {
  /* Nährstoff-Aufschlüsselung immer einblenden */
  [data-testid^="nutrient-breakdown-"] {
    display: block !important;
  }

  /* UI-Chrome ausblenden */
  [data-testid="back-button"],
  [data-testid="logout-button"],
  [data-testid="empfehlung-drucken-button"],
  [data-testid="correction-panel"],
  [data-testid="bottom-nav"],
  nav {
    display: none !important;
  }

  /* Seitenformat */
  @page {
    margin: 1.5cm;
  }

  body {
    font-size: 12pt;
    background: white;
  }
}
```

---

## Tests

**E2E (`tests/e2e/empfehlung.spec.ts` erweitern):**
- Print-Button sichtbar auf Empfehlungsseite (`data-testid="empfehlung-drucken-button"`)
- Print-Button nicht sichtbar auf anderen Seiten (Felder, Profil)

**Unit:** Keine neuen Unit-Tests nötig — Logik ändert sich nicht.

---

## Nicht im Scope

- PDF-Download als Datei (kein `jsPDF` o.ä.)
- Gestaltung der Produktliste im Ausdruck (Affiliate-Links erscheinen als URL im Browser-Druck)
- Drucken anderer Seiten (nur Empfehlungsseite)
