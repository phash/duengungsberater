# Onboarding-Checkliste — Design

**Stand:** 2026-04-17
**Autor:** Manuel Rödig + Claude
**Status:** Design approved

---

## Zweck

Neue Nutzer (registriert **und** Gast) brauchen einen geführten Einstieg in die App. Aktuell landet man nach der Registrierung auf einer leeren Felder-Liste mit einem einzigen „+ Feld anlegen"-Button — ohne Kontext, was danach kommt oder warum die App wertvoll ist.

Die Onboarding-Checkliste begleitet neue Nutzer nicht-blockend durch die **vier Kern-Schritte** der App, visualisiert Fortschritt, motiviert zum Abschluss und promotet die PWA-Installation.

---

## Nicht-Ziele (YAGNI)

- Keine DB-Persistenz des Onboarding-Status (rein LocalStorage).
- Keine serverseitige Segmentierung „neuer User" nach Registrierungsdatum.
- Kein Spotlight-Overlay / keine Intro.js-artige Tour.
- Kein Wizard-Modus (der die App blockt, bis Schritte abgeschlossen sind).
- Kein Cross-Device-Sync des Dismiss-Status.
- Keine mehrsprachige Unterstützung (Deutsch only, wie die restliche App).

---

## Architektur-Überblick

```
src/
  components/
    onboarding/
      OnboardingCard.vue           ← Container-Karte (Headline, Progress, Steps)
      OnboardingStep.vue           ← einzelner Schritt (Icon, Text, Action, Status)
      PwaInstallHint.vue           ← Hinweis-Modal mit iOS-Anleitung
  composables/
    useOnboardingState.ts          ← Computed state aus Stores + LocalStorage
    usePwaInstall.ts               ← beforeinstallprompt-Handling + iOS-Detection
  main.ts                          ← Event-Capture beforeinstallprompt
  views/
    FieldsView.vue                 ← Einbindung der OnboardingCard
    ProfileView.vue                ← „Onboarding wieder anzeigen"-Link
```

Keine neue DB-Tabelle, keine neue Service-Datei. Onboarding-Status ist **abgeleiteter Zustand** aus bereits vorhandenen Stores (`fields`, `plans`, `recommendations`) + 2 LocalStorage-Keys (`onboarding_dismissed`, `pwa_install_later`).

---

## Die 4 Schritte

| # | Titel | Kurzbeschreibung | `done`-Bedingung | Aktion / Zielort |
|---|-------|------------------|------------------|------------------|
| 1 | **Erstes Feld anlegen** | „Lege dein erstes Feld an — manuell oder direkt aus iBalis importieren." | `fields.length > 0` | Zwei Aktions-Buttons: „+ Manuell anlegen" → öffnet `FieldForm`-Drawer · „iBalis importieren" → öffnet `IBalisImportDrawer`/`IBalisConnectDrawer`-Wahl |
| 2 | **Anbau planen** | „Wähle eine Kultur und gib das Ertragsziel für die aktuelle Saison an." | mind. ein `field_crop_plan`-Eintrag existiert | „Anbau planen" → `router.push('/felder/<firstFieldId>')` und öffnet dort Plan-Formular |
| 3 | **Empfehlung ansehen** | „Lass dir die Düngung nach LfL-Basisdaten berechnen — mit Korrekturen für Vorfrucht, Humus und Nmin." | mind. eine `recommendation` existiert (lokal in Dexie oder via Service gecacht) | „Empfehlung ansehen" → navigiert zum ersten Plan + Recommendation-View |
| 4 | **App installieren** | „Installiere die App auf dem Startbildschirm — für schnellen Zugriff und Offline-Nutzung auf dem Feld." | `isStandalone === true` **ODER** `localStorage['pwa_install_later'] === 'true'` | Chrome/Edge: `beforeinstallprompt.prompt()` · iOS Safari: Hinweis-Modal mit Anleitung „Teilen → Zum Home-Bildschirm" · Firefox/sonst: „Später"-Button |

Reihenfolge **bewusst** so: erst Datenwerte sehen (1–3), dann App-Installation (4) — erst wenn der Nutzer Wert erkannt hat, ist er bereit zu installieren.

---

## UI-Verhalten

### Welcome-Variante (leere App)

Sobald `fields.length === 0 && !dismissed`:

```
┌─────────────────────────────────────────────┐
│   Willkommen beim Düngungsberater! ×        │
│   ─────────────────────────────────         │
│   In 4 Schritten zu deiner ersten           │
│   bedarfsgerechten Düngeempfehlung nach     │
│   LfL-Basisdaten Bayern.                    │
│                                             │
│   Fortschritt: [▓░░░] 0/4                   │
│                                             │
│   ⓘ  1. Erstes Feld anlegen    [Starten]    │
│   ◌  2. Anbau planen                        │
│   ◌  3. Empfehlung ansehen                  │
│   ◌  4. App installieren                    │
└─────────────────────────────────────────────┘
```

### Kompakte Variante (Arbeit läuft)

Sobald mind. ein Schritt abgeschlossen:

```
┌─────────────────────────────────────────────┐
│  Dein Einstieg    [▓▓▓░] 2/4       ▾    ×   │
│  ────────────────────────────────────       │
│  ✓  1. Erstes Feld angelegt                 │
│  ✓  2. Anbau geplant                        │
│  ⓘ  3. Empfehlung ansehen   [Ansehen]       │
│  ◌  4. App installieren                     │
└─────────────────────────────────────────────┘
```

Klappzustand per `<details>`-Element (nativ, barrierefrei). **Default: open**, damit Steps sofort sichtbar sind. User kann manuell zuklappen.

### Auto-Ausblenden

Wenn `progress === 4`: 1.5 s grüner „Geschafft! 🎉"-Toast (lokal in der Karte), dann Fade-out der gesamten Karte. `localStorage['onboarding_dismissed'] = 'true'` wird implizit gesetzt.

### Manuell dismissen

Dismiss-Button (×) mit `aria-label="Onboarding ausblenden"`. Setzt `localStorage['onboarding_dismissed'] = 'true'`. Keine Bestätigungsdialog — nicht-kritisch, reversibel im Profil.

### Reaktivieren

In `ProfileView.vue` neuer Link „Onboarding erneut anzeigen" (nur sichtbar wenn `dismissed === true` ODER `progress === 4`). Klick entfernt den LocalStorage-Key.

### Admins

Zeigt sich genauso — Admin-Rolle bekommt keine Sonderbehandlung. Wer das nicht sehen will, kann dismissen.

### Gäste

- Schritt 1 funktioniert identisch (Feld in Dexie anlegen).
- Zusätzlicher Hinweis-Text **innerhalb** der Welcome-Variante: „Als Gast bleiben deine Daten auf diesem Gerät. Registriere dich später, um sie zu sichern."
- Schritt 4 (App-Install) ist gerade für Gäste sinnvoll — sie haben sonst keinen wiederkehrenden Einstiegspunkt.

---

## State-Flow

### `useOnboardingState.ts`

**Datenquellen-Entscheidung:** Pinia-Stores für `plans` und `recommendations` existieren nicht. Statt sie einzuführen (Scope-Creep), liest das Composable bei Mount **direkt aus Dexie** (`db.plans.count()`, `db.recommendations.count()`). Bei Feld-Änderungen (beobachtet via Dexie `liveQuery` oder manuelles `recompute()`-Signal aus `FieldsView`) wird neu aggregiert. Das ist offline-first-kompatibel und vermeidet neue Stores.

```typescript
export function useOnboardingState() {
  const auth = useAuthStore()
  const fieldsRef = ref<number>(0)
  const plansRef = ref<number>(0)
  const recosRef = ref<number>(0)

  const dismissed = ref(safeReadLS('onboarding_dismissed') === 'true')
  const pwaLater = ref(safeReadLS('pwa_install_later') === 'true')
  const { isStandalone } = usePwaInstall()

  async function recompute() {
    fieldsRef.value = await db.fields.count()
    plansRef.value = await db.plans.count()
    recosRef.value = await db.recommendations.count()
  }

  // Bei Mount einmalig + reactive via liveQuery:
  onMounted(() => {
    recompute()
    // Dexie liveQuery triggert automatisch bei Table-Mutationen
  })

  const step1Done = computed(() => fieldsRef.value > 0)
  const step2Done = computed(() => plansRef.value > 0)
  const step3Done = computed(() => recosRef.value > 0)
  const step4Done = computed(() => isStandalone.value || pwaLater.value)
  const progress = computed(() =>
    [step1Done.value, step2Done.value, step3Done.value, step4Done.value]
      .filter(Boolean).length,
  )

  function dismiss() { safeWriteLS('onboarding_dismissed', 'true'); dismissed.value = true }
  function reset() { safeRemoveLS('onboarding_dismissed'); dismissed.value = false }
  function markPwaLater() { safeWriteLS('pwa_install_later', 'true'); pwaLater.value = true }

  return {
    step1Done, step2Done, step3Done, step4Done,
    progress, dismissed,
    dismiss, reset, markPwaLater, recompute,
  }
}
```

`safeReadLS` / `safeWriteLS` / `safeRemoveLS` fangen `QuotaExceededError` und Safari-Private-Mode-Fehler in `try/catch` ab (fail silent).

### `usePwaInstall.ts`

```typescript
// main.ts fängt das Event, bevor Components mounten:
let deferredPrompt: BeforeInstallPromptEvent | null = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  // auch global expose für Composable-Zugriff:
  window.__deferredPwaPrompt = e
})

// useable im Composable:
export function usePwaInstall() {
  const canPrompt = ref(!!window.__deferredPwaPrompt)
  const isStandalone = ref(checkStandalone())
  const isIOS = ref(/iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window))

  async function install(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    const prompt = window.__deferredPwaPrompt
    if (!prompt) return 'unavailable'
    prompt.prompt()
    const result = await prompt.userChoice
    window.__deferredPwaPrompt = null
    canPrompt.value = false
    return result.outcome
  }

  return { canPrompt, isStandalone, isIOS, install }
}

function checkStandalone(): boolean {
  // iOS Safari:
  if ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone) return true
  // Chrome/Edge/Firefox on desktop/Android:
  return window.matchMedia('(display-mode: standalone)').matches
}
```

---

## Edge Cases

| Fall | Verhalten |
|------|-----------|
| LocalStorage gesperrt (Safari Private) | `dismiss()`/`markPwaLater()` schlagen still fehl; Checkliste bleibt für die Session sichtbar |
| `beforeinstallprompt` kommt nie (Firefox, iOS, Desktop-Safari) | Schritt 4 zeigt iOS-Modal bzw. „Später"-Button. Nie hängender Skeleton. |
| User installiert PWA, startet im Standalone-Mode | `isStandalone = true` → Schritt 4 ist done, Checkliste verschwindet bei nächstem Mount |
| Schritt 4 „Später" geklickt, später aber doch installiert | `isStandalone` übersteuert `pwaLater`; Schritt 4 bleibt als „done" |
| Offline | Alle State-Reads sind lokal (Dexie) → Checkliste funktioniert ohne Internet |
| User bricht Schritt-Action ab (schließt Drawer ohne Speichern) | Schritt bleibt im Zustand `ⓘ active`, wird erst grün wenn Daten tatsächlich persistent sind |
| Feld wird wieder gelöscht (leere App) | Checkliste springt zurück auf „Welcome-Variante" (konsistent) |
| `progress === 4` und User dismissed nicht selbst | Auto-Fade 1.5 s nach Mount, dann `dismiss()` |

---

## Barrierefreiheit

- `<details>`/`<summary>` für Klappzustand (Tastatur-zugreifbar)
- Progress-Bar mit `role="progressbar"`, `aria-valuenow`, `aria-valuemax=4`, `aria-valuetext="2 von 4 Schritten"`
- Jeder Step ist ein `<li>` mit Icon + `aria-current="step"` wenn der aktive/unerledigte Step ist
- Dismiss-Button: `aria-label="Onboarding ausblenden"`, Touch-Target ≥44×44 px (siehe UI-Review Quick-Wins)
- Kontrast: Text mindestens `stone-500+` auf Parchment, Icons `field-600`/`wheat-600` in `wheat-700` wenn als Schrift
- Respektiert `prefers-reduced-motion` (Fade-out dann instant)
- `data-testid` auf jedem interaktiven Element: `onboarding-card`, `onboarding-step-{N}`, `onboarding-step-{N}-action`, `onboarding-dismiss`, `onboarding-progress`

---

## Integration

### `FieldsView.vue`

Direkt unter dem Header, über dem Field-List-Empty-State bzw. über der Field-List:

```vue
<OnboardingCard
  v-if="!onboarding.dismissed.value && onboarding.progress.value < 4"
  :is-guest="auth.isGuest"
  @open-new-field="openFieldDrawer"
  @open-ibalis="openIBalisChoice"
  @go-to-plan="goToPlanForFirstField"
  @go-to-recommendation="goToRecommendationForFirstPlan"
/>
```

### `ProfileView.vue`

Im Profil-Tab ein neuer Abschnitt „Einstellungen":

```vue
<button
  v-if="onboarding.dismissed.value"
  data-testid="onboarding-reset"
  @click="onboarding.reset"
>
  Onboarding erneut anzeigen
</button>
```

### `main.ts`

Event-Capture **vor** `app.mount('#app')` einfügen. Das ist kritisch, damit das Event nicht verloren geht, wenn es zwischen App-Load und Komponenten-Mount feuert.

---

## Testing-Strategie

### Unit (Vitest)

- `useOnboardingState.test.ts`
  - Alle Computeds (step1–4 Done) mit gemockten Stores
  - `dismiss()` schreibt LocalStorage, `reset()` löscht
  - `progress` addiert korrekt
  - LocalStorage-Fehler werden geschluckt (Private Mode-Simulation)
- `usePwaInstall.test.ts`
  - `isStandalone` reagiert auf `matchMedia`-Mock
  - `isIOS` anhand UA-Mock
  - `install()` ohne Prompt liefert `'unavailable'`

### E2E (Playwright)

`tests/e2e/onboarding.spec.ts`

- **Test 1: Neuer User sieht Welcome-Card**
  Registrieren → Felder-Seite → `[data-testid="onboarding-card"]` sichtbar → Progress 0/4
- **Test 2: Schritt 1 wird grün nach Feld-Anlage**
  Klick auf „+ Manuell anlegen" in der Card → Field-Form → Speichern → Step 1 hat `✓`-Icon
- **Test 3: Dismiss persistiert**
  Dismiss → Reload → Card nicht sichtbar
- **Test 4: Reset im Profil funktioniert**
  Nach Dismiss → Profil öffnen → „Onboarding erneut anzeigen" → Felder-Seite → Card wieder da
- **Test 5: Auto-Fade wenn alle 4 grün**
  4 Schritte manuell abschließen (oder per localStorage-Seed) → Card verschwindet nach 1.5 s

### Accessibility

- `tests/e2e/onboarding-a11y.spec.ts` mit `@axe-core/playwright`: keine ax-Violations auf FieldsView mit sichtbarer Card.

---

## Analytics (Matomo)

Tracking-Events für Funnel-Analyse (respektiert Opt-Out):

- `Onboarding / Shown` — beim ersten Mount pro Session
- `Onboarding / Step-{N}-Completed`
- `Onboarding / Step-{N}-Action-Clicked`
- `Onboarding / Dismissed` (manuell)
- `Onboarding / Reset`
- `Onboarding / Pwa-Install-Prompted`, `Onboarding / Pwa-Install-{Accepted|Dismissed}`

Via `trackEvent()` aus `src/utils/tracking.ts` (bereits vorhanden).

---

## Rollout / Migration

- Keine DB-Migration nötig.
- Rollout: nächstes Deployment deployed Feature für alle User gleichzeitig.
- Bestehende User (registriert vor Feature-Launch) sehen die Checkliste ebenfalls — falls sie bereits alle Schritte de facto erfüllt haben, ist die Card aber bereits auf 4/4 und fadet sofort aus. Dadurch keine Störung.
- User, die bereits vorher manuell ein Feld + Plan + Recommendation angelegt haben und PWA installiert haben: Checkliste zeigt 4/4 → Fade → kein Eindruck von Regression.

---

## Offene Risiken

1. **PWA-Install-Events** können in WebView-Umgebungen (iOS PWA in „Home Screen") überraschende Reihenfolge haben. Workaround: `isStandalone`-Check ist primärer Wahrheitswert, `pwaLater` nur Fallback.
2. **Performance**: Wenn `recommendations`-Store groß ist, könnte reactive-computeds teuer werden. Mitigierung: `step3Done` ist `boolean` („existiert mind. eine"), keine Sortierung.
3. **Sprache/Tonfall** („Duzen"): Bestätigt. Wenn später auf „Sie" umgestellt wird, nur 1 Datei (Component-Template) betroffen.

---

## Aufwand-Schätzung

| Unit | Aufwand |
|------|---------|
| `useOnboardingState.ts` + Tests | 1.5 h |
| `usePwaInstall.ts` + Tests + main.ts-Hook | 1 h |
| `OnboardingCard.vue` + `OnboardingStep.vue` + `PwaInstallHint.vue` | 2.5 h |
| Integration `FieldsView.vue` + `ProfileView.vue` | 1 h |
| E2E-Tests | 1 h |
| Matomo-Events | 0.5 h |
| **Gesamt** | **~7.5 h** |

---

## Referenzen

- Review-Finding (2026-04-17): UI/UX Top-5 Strategisch #4 „PWA Install-Flow + Onboarding"
- Bestehende Spec: `docs/superpowers/specs/2026-03-30-guest-modus-design.md` (Guest-Flow, auf dem wir aufbauen)
- CLAUDE.md Regel: „Gleichartige Workflows — Datenerfassung immer: Liste → Drawer/Modal → Speichern → zurück zur Liste" — die Checkliste verletzt das nicht, sondern leitet zu diesen Drawer-Flows.
