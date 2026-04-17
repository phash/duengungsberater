# Onboarding-Checkliste — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Neue Nutzer mit einer nicht-blockenden 4-Schritt-Checkliste (Feld → Plan → Empfehlung → App-Install) durch die Kern-Flows führen, Fortschritt visualisieren, PWA-Install promoten.

**Architecture:** Reine UI-Feature ohne Backend-Änderungen. State kommt aus Dexie-Live-Queries (`fields`, `fieldCropPlans`, `recommendations`). Persistenz nur in LocalStorage (`onboarding_dismissed`, `pwa_install_later`). PWA-Install über `beforeinstallprompt`-Event-Capture in `main.ts`.

**Tech Stack:** Vue 3 Composition API, Dexie `liveQuery`, Tailwind v4 (Design-System `stone`/`field`/`parchment`), Vitest für Composables, Playwright für E2E, Matomo für Funnel-Analyse.

**Spec-Referenz:** `docs/superpowers/specs/2026-04-17-onboarding-checkliste-design.md`

---

## File Structure

**Neu:**
- `src/composables/usePwaInstall.ts` — `beforeinstallprompt`-Wrapper, `isStandalone`/`isIOS`
- `src/composables/usePwaInstall.test.ts` — Unit-Tests
- `src/composables/useOnboardingState.ts` — Step-Computeds, Dismiss-Flow
- `src/composables/useOnboardingState.test.ts` — Unit-Tests
- `src/components/onboarding/OnboardingCard.vue` — Container-Karte
- `src/components/onboarding/OnboardingStep.vue` — Einzelner Schritt
- `src/components/onboarding/PwaInstallHint.vue` — iOS-Anleitung-Modal
- `tests/e2e/onboarding.spec.ts` — E2E-Flow

**Modifiziert:**
- `src/main.ts` — `beforeinstallprompt`-Event-Capture vor `app.mount()`
- `src/utils/tracking.ts` — keine Änderung nötig (bestehende `trackEvent()` reicht)
- `src/views/FieldsView.vue` — `<OnboardingCard>` einbinden
- `src/views/ProfileView.vue` — „Onboarding erneut anzeigen"-Button
- `src/types/index.ts` (falls Types ergänzt werden müssen — prüfen)

---

## Task 1: `usePwaInstall` Composable

**Files:**
- Create: `/home/manuel/claude/duengungsberater/src/composables/usePwaInstall.ts`
- Create: `/home/manuel/claude/duengungsberater/src/composables/usePwaInstall.test.ts`
- Modify: `/home/manuel/claude/duengungsberater/src/main.ts`

- [ ] **Step 1: Failing Test schreiben**

`src/composables/usePwaInstall.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { usePwaInstall, __setDeferredPrompt } from './usePwaInstall'

describe('usePwaInstall', () => {
  beforeEach(() => {
    __setDeferredPrompt(null)
    // matchMedia Mock
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    __setDeferredPrompt(null)
  })

  it('isStandalone=false when not standalone', () => {
    const { isStandalone } = usePwaInstall()
    expect(isStandalone.value).toBe(false)
  })

  it('isStandalone=true when display-mode: standalone matches', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: true, media: '', addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }),
    })
    const { isStandalone } = usePwaInstall()
    expect(isStandalone.value).toBe(true)
  })

  it('isIOS=true for iPhone UA', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      configurable: true,
    })
    const { isIOS } = usePwaInstall()
    expect(isIOS.value).toBe(true)
  })

  it('canPrompt=false when no deferred prompt', () => {
    __setDeferredPrompt(null)
    const { canPrompt } = usePwaInstall()
    expect(canPrompt.value).toBe(false)
  })

  it('canPrompt=true when deferred prompt set', () => {
    __setDeferredPrompt({ prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'accepted' }) } as unknown as BeforeInstallPromptEvent)
    const { canPrompt } = usePwaInstall()
    expect(canPrompt.value).toBe(true)
  })

  it('install() without prompt returns "unavailable"', async () => {
    __setDeferredPrompt(null)
    const { install } = usePwaInstall()
    expect(await install()).toBe('unavailable')
  })

  it('install() calls prompt() and returns outcome', async () => {
    const promptFn = vi.fn()
    __setDeferredPrompt({
      prompt: promptFn,
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    } as unknown as BeforeInstallPromptEvent)
    const { install, canPrompt } = usePwaInstall()
    const result = await install()
    expect(promptFn).toHaveBeenCalled()
    expect(result).toBe('accepted')
    expect(canPrompt.value).toBe(false)
  })
})
```

- [ ] **Step 2: Test laufen — muss failen**

```bash
cd /home/manuel/claude/duengungsberater
npm run test:run -- usePwaInstall
```

Erwartet: `Cannot find module './usePwaInstall'`.

- [ ] **Step 3: `usePwaInstall.ts` implementieren**

`src/composables/usePwaInstall.ts`:

```typescript
import { ref } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

// Modul-lokale Ref — wird von main.ts via __setDeferredPrompt() gefüllt,
// bevor Komponenten mounten. Singleton-Pattern für PWA-Install-Event.
let deferredPrompt: BeforeInstallPromptEvent | null = null

export function __setDeferredPrompt(p: BeforeInstallPromptEvent | null): void {
  deferredPrompt = p
}

function isStandaloneMode(): boolean {
  // iOS Safari sondert über window.navigator.standalone
  const nav = window.navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return true
  return window.matchMedia('(display-mode: standalone)').matches
}

function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent)
}

export function usePwaInstall() {
  const canPrompt = ref<boolean>(deferredPrompt !== null)
  const isStandalone = ref<boolean>(isStandaloneMode())
  const isIOS = ref<boolean>(isIOSDevice())

  async function install(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!deferredPrompt) return 'unavailable'
    const prompt = deferredPrompt
    await prompt.prompt()
    const result = await prompt.userChoice
    deferredPrompt = null
    canPrompt.value = false
    return result.outcome
  }

  return { canPrompt, isStandalone, isIOS, install }
}
```

- [ ] **Step 4: Test laufen — muss grün sein**

```bash
npm run test:run -- usePwaInstall
```

Erwartet: 7/7 Tests passed.

- [ ] **Step 5: `main.ts` — Event-Capture einbauen**

Ersetze in `/home/manuel/claude/duengungsberater/src/main.ts` den Kopf-Block so, dass **vor** `app.mount('#app')` das Event gelauscht wird:

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import router from './router'
import { syncAll } from '@/services/sync.service'
import { useAuthStore } from '@/stores/auth.store'
import { __setDeferredPrompt } from '@/composables/usePwaInstall'

// Self-hosted fonts (DSGVO)
import '@fontsource-variable/fraunces/index.css'
import '@fontsource/outfit/300.css'
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/700.css'

import './assets/main.css'

// PWA Install-Prompt: Event capturen BEVOR Komponenten mounten,
// damit usePwaInstall() das Event zuverlaessig aufruft.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  __setDeferredPrompt(e as unknown as Parameters<typeof __setDeferredPrompt>[0])
})

const app = createApp(App)
// ...Rest unveraendert
```

(Die folgenden Zeilen bleiben unveraendert — `app.use(createPinia())` etc.)

- [ ] **Step 6: Lint + Build**

```bash
npm run lint && npm run build
```

Erwartet: keine Fehler.

- [ ] **Step 7: Commit**

```bash
git add src/composables/usePwaInstall.ts src/composables/usePwaInstall.test.ts src/main.ts
git commit -m "$(cat <<'EOF'
feat(onboarding): usePwaInstall composable + beforeinstallprompt-capture

- Singleton-Pattern haelt deferred prompt aus main.ts-Capture fest
- isStandalone + isIOS fuer UI-Entscheidungen (Chrome-Install vs. iOS-Anleitung)
- install() ruft prompt() auf, liefert outcome zurueck (fuer Matomo-Tracking)
- 7/7 Unit-Tests gruen

Task 1/8 aus plan 2026-04-17-onboarding-checkliste.md
EOF
)"
```

---

## Task 2: `useOnboardingState` Composable

**Files:**
- Create: `/home/manuel/claude/duengungsberater/src/composables/useOnboardingState.ts`
- Create: `/home/manuel/claude/duengungsberater/src/composables/useOnboardingState.test.ts`

**Vorbereitung:** Dexie-Tabellen heißen `fields`, `fieldCropPlans`, `recommendations` (siehe `src/db/dexie.ts`). Schritte 1–3 zählen aus diesen Tabellen via `liveQuery`.

- [ ] **Step 1: Failing Test schreiben**

`src/composables/useOnboardingState.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'

// Dexie-Mock: liefert Zahlen fuer fields/plans/recos
const fieldsCount = ref(0)
const plansCount = ref(0)
const recosCount = ref(0)

vi.mock('@/db/dexie', () => ({
  db: {
    fields: { count: () => Promise.resolve(fieldsCount.value) },
    fieldCropPlans: { count: () => Promise.resolve(plansCount.value) },
    recommendations: { count: () => Promise.resolve(recosCount.value) },
  },
}))

// usePwaInstall-Mock
const standaloneMock = ref(false)
vi.mock('./usePwaInstall', () => ({
  usePwaInstall: () => ({
    isStandalone: standaloneMock,
    canPrompt: ref(false),
    isIOS: ref(false),
    install: vi.fn(),
  }),
}))

import {
  useOnboardingState,
  ONBOARDING_DISMISSED_KEY,
  PWA_INSTALL_LATER_KEY,
} from './useOnboardingState'

describe('useOnboardingState', () => {
  beforeEach(() => {
    fieldsCount.value = 0
    plansCount.value = 0
    recosCount.value = 0
    standaloneMock.value = false
    localStorage.clear()
  })

  it('progress=0 wenn alles leer', async () => {
    const state = useOnboardingState()
    await state.recompute()
    expect(state.progress.value).toBe(0)
  })

  it('step1Done wenn fields.length > 0', async () => {
    fieldsCount.value = 1
    const state = useOnboardingState()
    await state.recompute()
    expect(state.step1Done.value).toBe(true)
    expect(state.progress.value).toBe(1)
  })

  it('alle 4 done wenn alles gesetzt', async () => {
    fieldsCount.value = 2
    plansCount.value = 1
    recosCount.value = 1
    standaloneMock.value = true
    const state = useOnboardingState()
    await state.recompute()
    expect(state.progress.value).toBe(4)
  })

  it('step4Done via pwaLater-Flag', async () => {
    localStorage.setItem(PWA_INSTALL_LATER_KEY, 'true')
    const state = useOnboardingState()
    await state.recompute()
    expect(state.step4Done.value).toBe(true)
  })

  it('dismiss() schreibt LocalStorage', () => {
    const state = useOnboardingState()
    state.dismiss()
    expect(state.dismissed.value).toBe(true)
    expect(localStorage.getItem(ONBOARDING_DISMISSED_KEY)).toBe('true')
  })

  it('reset() loescht Dismiss', () => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true')
    const state = useOnboardingState()
    expect(state.dismissed.value).toBe(true)
    state.reset()
    expect(state.dismissed.value).toBe(false)
    expect(localStorage.getItem(ONBOARDING_DISMISSED_KEY)).toBeNull()
  })

  it('markPwaLater() setzt Flag persistent', () => {
    const state = useOnboardingState()
    state.markPwaLater()
    expect(localStorage.getItem(PWA_INSTALL_LATER_KEY)).toBe('true')
  })

  it('LocalStorage-Fehler (privater Modus) werden geschluckt', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded')
    })
    const state = useOnboardingState()
    expect(() => state.dismiss()).not.toThrow()
    setItemSpy.mockRestore()
  })
})
```

- [ ] **Step 2: Test laufen — muss failen**

```bash
npm run test:run -- useOnboardingState
```

Erwartet: Modul existiert nicht.

- [ ] **Step 3: `useOnboardingState.ts` implementieren**

`src/composables/useOnboardingState.ts`:

```typescript
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { liveQuery, type Subscription } from 'dexie'
import { db } from '@/db/dexie'
import { usePwaInstall } from './usePwaInstall'

export const ONBOARDING_DISMISSED_KEY = 'onboarding_dismissed'
export const PWA_INSTALL_LATER_KEY = 'pwa_install_later'

function safeReadLS(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

function safeWriteLS(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* privater Modus / Quota */ }
}

function safeRemoveLS(key: string): void {
  try { localStorage.removeItem(key) } catch { /* privater Modus */ }
}

export function useOnboardingState() {
  const fieldsRef = ref(0)
  const plansRef = ref(0)
  const recosRef = ref(0)

  const dismissed = ref(safeReadLS(ONBOARDING_DISMISSED_KEY) === 'true')
  const pwaLater = ref(safeReadLS(PWA_INSTALL_LATER_KEY) === 'true')

  const { isStandalone } = usePwaInstall()

  const step1Done = computed(() => fieldsRef.value > 0)
  const step2Done = computed(() => plansRef.value > 0)
  const step3Done = computed(() => recosRef.value > 0)
  const step4Done = computed(() => isStandalone.value || pwaLater.value)

  const progress = computed(() =>
    [step1Done.value, step2Done.value, step3Done.value, step4Done.value]
      .filter(Boolean).length
  )

  async function recompute(): Promise<void> {
    fieldsRef.value = await db.fields.count()
    plansRef.value = await db.fieldCropPlans.count()
    recosRef.value = await db.recommendations.count()
  }

  // Dexie liveQuery: reactive Count-Updates bei Table-Mutationen
  const subs: Subscription[] = []
  onMounted(() => {
    subs.push(liveQuery(() => db.fields.count()).subscribe((n) => { fieldsRef.value = n }))
    subs.push(liveQuery(() => db.fieldCropPlans.count()).subscribe((n) => { plansRef.value = n }))
    subs.push(liveQuery(() => db.recommendations.count()).subscribe((n) => { recosRef.value = n }))
  })

  onUnmounted(() => {
    for (const s of subs) s.unsubscribe()
  })

  function dismiss(): void {
    safeWriteLS(ONBOARDING_DISMISSED_KEY, 'true')
    dismissed.value = true
  }

  function reset(): void {
    safeRemoveLS(ONBOARDING_DISMISSED_KEY)
    dismissed.value = false
  }

  function markPwaLater(): void {
    safeWriteLS(PWA_INSTALL_LATER_KEY, 'true')
    pwaLater.value = true
  }

  return {
    step1Done, step2Done, step3Done, step4Done,
    progress, dismissed, pwaLater,
    dismiss, reset, markPwaLater, recompute,
  }
}
```

- [ ] **Step 4: Test laufen — muss grün sein**

```bash
npm run test:run -- useOnboardingState
```

Erwartet: 8/8 Tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useOnboardingState.ts src/composables/useOnboardingState.test.ts
git commit -m "$(cat <<'EOF'
feat(onboarding): useOnboardingState composable (Dexie liveQuery)

Liefert reactive step1-4 + progress aus Dexie-Tabellen
(fields, fieldCropPlans, recommendations). LocalStorage-Flags
dismissed und pwa_install_later persistent, fail-silent bei
privatem Modus. 8/8 Unit-Tests gruen.

Task 2/8 aus plan 2026-04-17-onboarding-checkliste.md
EOF
)"
```

---

## Task 3: `PwaInstallHint` Komponente (iOS-Modal)

**Files:**
- Create: `/home/manuel/claude/duengungsberater/src/components/onboarding/PwaInstallHint.vue`

- [ ] **Step 1: Komponente schreiben**

`src/components/onboarding/PwaInstallHint.vue`:

```vue
<template>
  <div
    v-if="open"
    data-testid="pwa-install-hint"
    role="dialog"
    aria-modal="true"
    aria-labelledby="pwa-hint-title"
    class="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4"
    @click.self="$emit('close')"
  >
    <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-warm-lg">
      <h2 id="pwa-hint-title" class="font-display text-lg font-semibold text-stone-900">
        App zum Home-Bildschirm hinzufügen
      </h2>
      <p class="mt-2 text-sm text-stone-600">
        iOS Safari bietet keinen Install-Button. So gehst du vor:
      </p>
      <ol class="mt-4 space-y-3 text-sm text-stone-700">
        <li class="flex gap-3">
          <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-field-100 text-xs font-semibold text-field-700">1</span>
          <span>Tippe unten in Safari auf das <strong class="text-stone-900">Teilen-Symbol</strong> (Quadrat mit Pfeil nach oben).</span>
        </li>
        <li class="flex gap-3">
          <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-field-100 text-xs font-semibold text-field-700">2</span>
          <span>Wähle <strong class="text-stone-900">„Zum Home-Bildschirm"</strong> (ggf. nach unten scrollen).</span>
        </li>
        <li class="flex gap-3">
          <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-field-100 text-xs font-semibold text-field-700">3</span>
          <span>Bestätige mit <strong class="text-stone-900">„Hinzufügen"</strong>. Die App erscheint als Icon auf dem Home-Bildschirm.</span>
        </li>
      </ol>
      <div class="mt-6 flex gap-3">
        <button
          type="button"
          data-testid="pwa-hint-close"
          class="flex-1 min-h-[44px] rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field-600"
          @click="$emit('close')"
        >
          Verstanden
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()
</script>
```

- [ ] **Step 2: Build-Check**

```bash
npm run build
```

Erwartet: OK (keine Verwendung, kein Fehler).

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/PwaInstallHint.vue
git commit -m "feat(onboarding): PwaInstallHint-Modal mit iOS-Anleitung"
```

---

## Task 4: `OnboardingStep` Komponente

**Files:**
- Create: `/home/manuel/claude/duengungsberater/src/components/onboarding/OnboardingStep.vue`

- [ ] **Step 1: Komponente schreiben**

`src/components/onboarding/OnboardingStep.vue`:

```vue
<template>
  <li
    :data-testid="`onboarding-step-${number}`"
    :aria-current="current ? 'step' : undefined"
    class="flex items-start gap-3 rounded-xl p-3 transition-colors"
    :class="done ? 'bg-field-50/60' : current ? 'bg-white' : 'bg-transparent'"
  >
    <span
      class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      :class="done ? 'bg-field-600 text-white' : current ? 'bg-wheat-500 text-white' : 'border border-stone-300 text-stone-400'"
      aria-hidden="true"
    >
      <svg v-if="done" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12l5 5L20 7" />
      </svg>
      <span v-else>{{ number }}</span>
    </span>

    <div class="flex-1 min-w-0">
      <p class="text-sm font-semibold text-stone-800">
        {{ title }}
      </p>
      <p v-if="hint" class="mt-0.5 text-xs text-stone-500">{{ hint }}</p>
      <div v-if="!done && actions.length > 0" class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="action in actions"
          :key="action.label"
          type="button"
          :data-testid="`onboarding-step-${number}-action-${action.testIdSuffix}`"
          class="min-h-[44px] rounded-xl bg-field-600 px-4 py-2 text-sm font-semibold text-white shadow-warm-xs transition hover:bg-field-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field-600 focus-visible:ring-offset-2"
          :class="action.secondary ? '!bg-white !text-field-700 !border !border-field-200 hover:!bg-field-50' : ''"
          @click="$emit('action', action.key)"
        >
          {{ action.label }}
        </button>
      </div>
    </div>
  </li>
</template>

<script setup lang="ts">
export interface OnboardingStepAction {
  key: string
  label: string
  testIdSuffix: string
  secondary?: boolean
}

defineProps<{
  number: 1 | 2 | 3 | 4
  title: string
  hint?: string
  done: boolean
  current: boolean
  actions: OnboardingStepAction[]
}>()

defineEmits<{
  action: [key: string]
}>()
</script>
```

- [ ] **Step 2: Build-Check**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/OnboardingStep.vue
git commit -m "feat(onboarding): OnboardingStep-Komponente mit Done/Current-Zuständen"
```

---

## Task 5: `OnboardingCard` Container

**Files:**
- Create: `/home/manuel/claude/duengungsberater/src/components/onboarding/OnboardingCard.vue`

- [ ] **Step 1: Komponente schreiben**

`src/components/onboarding/OnboardingCard.vue`:

```vue
<template>
  <section
    v-if="visible"
    data-testid="onboarding-card"
    class="rounded-2xl bg-white p-5 shadow-warm-sm transition-opacity duration-500"
    :class="{ 'opacity-0': fadingOut }"
    aria-labelledby="onboarding-headline"
  >
    <header class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h2
          id="onboarding-headline"
          class="font-display text-lg font-semibold text-stone-900"
        >
          {{ isWelcome ? 'Willkommen beim Düngungsberater!' : 'Dein Einstieg' }}
        </h2>
        <p class="mt-1 text-sm text-stone-600">
          {{ isWelcome
            ? 'In 4 Schritten zu deiner ersten bedarfsgerechten Düngeempfehlung nach LfL-Basisdaten Bayern.'
            : 'So holst du das Meiste aus der App heraus.' }}
        </p>
        <p v-if="isGuest && isWelcome" class="mt-2 rounded-lg bg-wheat-50 px-3 py-2 text-xs text-wheat-700">
          Als Gast bleiben deine Daten auf diesem Gerät. Registriere dich später, um sie zu sichern.
        </p>
      </div>
      <button
        type="button"
        data-testid="onboarding-dismiss"
        aria-label="Onboarding ausblenden"
        class="-mr-1 -mt-1 flex h-10 w-10 items-center justify-center rounded-xl text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field-600"
        @click="handleDismiss"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </header>

    <div
      class="mt-4 flex items-center gap-3"
      role="progressbar"
      :aria-valuenow="state.progress.value"
      aria-valuemin="0"
      aria-valuemax="4"
      :aria-valuetext="`${state.progress.value} von 4 Schritten abgeschlossen`"
    >
      <div class="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
        <div
          class="h-full rounded-full bg-field-600 transition-[width] duration-300"
          :style="{ width: `${(state.progress.value / 4) * 100}%` }"
        />
      </div>
      <span
        data-testid="onboarding-progress"
        class="text-xs font-semibold text-stone-600"
      >
        {{ state.progress.value }}/4
      </span>
    </div>

    <details class="mt-4" :open="detailsOpen" @toggle="detailsOpen = ($event.target as HTMLDetailsElement).open">
      <summary class="cursor-pointer list-none text-sm font-medium text-stone-600 hover:text-stone-900 sr-only">
        Schritte anzeigen/ausblenden
      </summary>
      <ol class="mt-2 space-y-1">
        <OnboardingStep
          :number="1"
          title="Erstes Feld anlegen"
          hint="Manuell oder direkt aus iBalis importieren."
          :done="state.step1Done.value"
          :current="currentStep === 1"
          :actions="[
            { key: 'new-field', label: '+ Manuell anlegen', testIdSuffix: 'new' },
            { key: 'ibalis-import', label: 'iBalis importieren', testIdSuffix: 'ibalis', secondary: true },
          ]"
          @action="onStepAction"
        />
        <OnboardingStep
          :number="2"
          title="Anbau planen"
          hint="Kultur, Ertragsziel und Saison festlegen."
          :done="state.step2Done.value"
          :current="currentStep === 2"
          :actions="state.step1Done.value ? [{ key: 'plan', label: 'Anbau planen', testIdSuffix: 'plan' }] : []"
          @action="onStepAction"
        />
        <OnboardingStep
          :number="3"
          title="Empfehlung ansehen"
          hint="Düngung nach LfL-Basisdaten — mit Korrekturen für Vorfrucht, Humus, Nmin."
          :done="state.step3Done.value"
          :current="currentStep === 3"
          :actions="state.step2Done.value ? [{ key: 'recommendation', label: 'Empfehlung ansehen', testIdSuffix: 'reco' }] : []"
          @action="onStepAction"
        />
        <OnboardingStep
          :number="4"
          title="App installieren"
          hint="Schneller Zugriff + Offline auf dem Feld."
          :done="state.step4Done.value"
          :current="currentStep === 4"
          :actions="step4Actions"
          @action="onStepAction"
        />
      </ol>
    </details>

    <PwaInstallHint :open="iosHintOpen" @close="iosHintOpen = false" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import OnboardingStep, { type OnboardingStepAction } from './OnboardingStep.vue'
import PwaInstallHint from './PwaInstallHint.vue'
import { useOnboardingState } from '@/composables/useOnboardingState'
import { usePwaInstall } from '@/composables/usePwaInstall'
import { trackEvent } from '@/utils/tracking'

const props = defineProps<{
  isGuest: boolean
}>()

const emit = defineEmits<{
  'open-new-field': []
  'open-ibalis': []
  'go-to-plan': []
  'go-to-recommendation': []
}>()

const state = useOnboardingState()
const { canPrompt, isIOS, install } = usePwaInstall()

const iosHintOpen = ref(false)
const detailsOpen = ref(true)
const fadingOut = ref(false)
const fadedOut = ref(false)

const isWelcome = computed(() => !state.step1Done.value)

const currentStep = computed(() => {
  if (!state.step1Done.value) return 1
  if (!state.step2Done.value) return 2
  if (!state.step3Done.value) return 3
  if (!state.step4Done.value) return 4
  return 0
})

const step4Actions = computed<OnboardingStepAction[]>(() => {
  if (isIOS.value) {
    return [{ key: 'pwa-ios', label: 'So geht\'s auf dem iPhone', testIdSuffix: 'ios' }]
  }
  if (canPrompt.value) {
    return [
      { key: 'pwa-install', label: 'Jetzt installieren', testIdSuffix: 'install' },
      { key: 'pwa-later', label: 'Später', testIdSuffix: 'later', secondary: true },
    ]
  }
  return [{ key: 'pwa-later', label: 'Später', testIdSuffix: 'later', secondary: true }]
})

const visible = computed(() => !state.dismissed.value && !fadedOut.value)

// Auto-fade wenn alle 4 grün sind
watch(() => state.progress.value, (n) => {
  if (n === 4 && !fadingOut.value) {
    trackEvent('Onboarding', 'Completed')
    setTimeout(() => { fadingOut.value = true }, 1500)
    setTimeout(() => { fadedOut.value = true; state.dismiss() }, 2000)
  }
}, { immediate: false })

// Shown-Tracking einmalig pro Session
if (visible.value) {
  trackEvent('Onboarding', 'Shown')
}

function handleDismiss() {
  state.dismiss()
  trackEvent('Onboarding', 'Dismissed')
}

async function onStepAction(key: string) {
  trackEvent('Onboarding', `Step-Action-${key}`)
  switch (key) {
    case 'new-field':
      emit('open-new-field')
      return
    case 'ibalis-import':
      emit('open-ibalis')
      return
    case 'plan':
      emit('go-to-plan')
      return
    case 'recommendation':
      emit('go-to-recommendation')
      return
    case 'pwa-install': {
      trackEvent('Onboarding', 'Pwa-Install-Prompted')
      const outcome = await install()
      trackEvent('Onboarding', `Pwa-Install-${outcome}`)
      return
    }
    case 'pwa-ios':
      iosHintOpen.value = true
      return
    case 'pwa-later':
      state.markPwaLater()
      return
  }
}

// Props werden benutzt (Linter beruhigen)
void props.isGuest
</script>
```

- [ ] **Step 2: Build + Lint**

```bash
npm run build && npm run lint
```

Erwartet: OK.

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/OnboardingCard.vue
git commit -m "$(cat <<'EOF'
feat(onboarding): OnboardingCard-Container mit Welcome + Progress + Matomo-Events

- Welcome-Variante fuer Schritt-1-offen, kompakte Variante sonst
- Progress-Bar + aria-valuetext
- Gast-Hinweis innerhalb Welcome
- Step 4: Chrome Install-Prompt, iOS-Modal, "Spaeter"-Fallback
- Auto-Fade 1.5s nach 4/4, manueller Dismiss
- 5 Matomo-Events: Shown, Completed, Dismissed, Step-Action-{key}, Pwa-Install-{outcome}

Task 5/8 aus plan 2026-04-17-onboarding-checkliste.md
EOF
)"
```

---

## Task 6: Einbindung in `FieldsView.vue`

**Files:**
- Modify: `/home/manuel/claude/duengungsberater/src/views/FieldsView.vue`

- [ ] **Step 1: `FieldsView.vue` Template erweitern**

In `FieldsView.vue` direkt **nach** der `<GuestBanner />`-Zeile einfügen (also zwischen `GuestBanner` und `feld-anlegen-button`):

```vue
      <GuestBanner />
      <OnboardingCard
        :is-guest="auth.isGuest"
        @open-new-field="openNew"
        @open-ibalis="importDrawerOpen = true"
        @go-to-plan="goToFirstFieldPlan"
        @go-to-recommendation="goToFirstRecommendation"
      />
```

- [ ] **Step 2: Import + Helper-Funktionen ergänzen**

Im `<script setup>`-Block von `FieldsView.vue`:

(a) Zu den existierenden Imports hinzufügen:

```typescript
import OnboardingCard from '@/components/onboarding/OnboardingCard.vue'
import { db } from '@/db/dexie'
```

(b) Zwei neue Funktionen (Position: vor dem Script-Ende, nach den bestehenden Handlern):

```typescript
async function goToFirstFieldPlan() {
  // Erstes vorhandenes Feld finden
  const firstField = await db.fields.orderBy('id').first()
  if (!firstField) return
  router.push({ name: 'field-plan', params: { fieldId: firstField.id } })
}

async function goToFirstRecommendation() {
  // Erstes Feld mit Plan finden
  const firstPlan = await db.fieldCropPlans.orderBy('id').first()
  if (!firstPlan) return
  router.push({
    name: 'recommendation',
    params: { fieldId: firstPlan.field_id, planId: firstPlan.id },
  })
}
```

**Route-Namen prüfen:** Im Router (`src/router/index.ts`) nachsehen, wie die Feld-Plan- und Empfehlungs-Routen tatsächlich heißen. Die Namen `field-plan`/`recommendation` sind Annahmen. Falls die Routen anders benannt sind (z.B. `FieldPlan`, `Recommendation`): Namen anpassen. Falls `name` nicht gesetzt, `path`-basierten `push` nutzen:

```typescript
router.push(`/felder/${firstField.id}/plan`)
```

(Exakte URLs entnimmt man dem Router.)

- [ ] **Step 3: Build + Manueller Test**

```bash
npm run build && npm run dev
```

Browser auf `/felder` → OnboardingCard sichtbar mit 0/4-Progress. Step 1 → „+ Manuell anlegen" öffnet Field-Drawer. Nach Speichern → Step 1 grün, Progress 1/4.

- [ ] **Step 4: Commit**

```bash
git add src/views/FieldsView.vue
git commit -m "feat(onboarding): OnboardingCard in FieldsView einbinden

Aktionen-Binding: open-new-field -> openNew(), open-ibalis ->
importDrawerOpen=true, go-to-plan und go-to-recommendation ueber
db-Lookup der ersten Entitaet.

Task 6/8 aus plan 2026-04-17-onboarding-checkliste.md"
```

---

## Task 7: Reset-Link in `ProfileView.vue`

**Files:**
- Modify: `/home/manuel/claude/duengungsberater/src/views/ProfileView.vue`

- [ ] **Step 1: Template-Block ergänzen**

In `ProfileView.vue`, direkt **nach** der Account-Card (dem `<!-- Account card -->`-Block) einfügen:

```vue
      <!-- Onboarding erneut anzeigen -->
      <div
        v-if="onboarding.dismissed.value"
        class="rounded-2xl bg-white p-5 shadow-warm-sm"
      >
        <p class="text-sm font-medium text-stone-700">Onboarding</p>
        <p class="mt-1 text-xs text-stone-500">
          Blende die Einstieg-Checkliste auf der Felder-Seite wieder ein.
        </p>
        <button
          type="button"
          data-testid="onboarding-reset"
          class="mt-3 min-h-[44px] rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field-600"
          @click="resetOnboarding"
        >
          Onboarding erneut anzeigen
        </button>
      </div>
```

- [ ] **Step 2: Script-Block erweitern**

Im `<script setup>`-Block:

```typescript
import { useOnboardingState } from '@/composables/useOnboardingState'
import { trackEvent } from '@/utils/tracking'

const onboarding = useOnboardingState()

function resetOnboarding() {
  onboarding.reset()
  trackEvent('Onboarding', 'Reset')
}
```

- [ ] **Step 3: Build-Check**

```bash
npm run build
```

- [ ] **Step 4: Manueller Test**

`npm run dev` → Felder → Onboarding dismissen (×) → Profil-Tab öffnen → „Onboarding erneut anzeigen" klicken → zurück zu Felder → Card wieder da.

- [ ] **Step 5: Commit**

```bash
git add src/views/ProfileView.vue
git commit -m "feat(onboarding): Reset-Link im ProfileView

Sichtbar nur wenn onboarding.dismissed=true. Setzt LocalStorage-Flag
zurueck und trackt 'Onboarding/Reset' in Matomo.

Task 7/8 aus plan 2026-04-17-onboarding-checkliste.md"
```

---

## Task 8: E2E-Tests

**Files:**
- Create: `/home/manuel/claude/duengungsberater/tests/e2e/onboarding.spec.ts`

- [ ] **Step 1: E2E-Test schreiben**

`tests/e2e/onboarding.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Onboarding-Checkliste', () => {
  test.beforeEach(async ({ page }) => {
    // Guest-Mode: LocalStorage säubern
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
    })
  })

  test('zeigt Welcome-Card bei leerer App', async ({ page }) => {
    await page.goto('/felder')
    await expect(page.getByTestId('onboarding-card')).toBeVisible()
    await expect(page.getByTestId('onboarding-progress')).toHaveText('0/4')
  })

  test('Step 1 wird grün nach Feld-Anlage', async ({ page }) => {
    await page.goto('/felder')
    await page.getByTestId('onboarding-step-1-action-new').click()
    await page.getByTestId('feld-name-input').fill('Test-Acker')
    await page.getByTestId('feld-size-input').fill('5')
    await page.getByTestId('feld-speichern-button').click()
    await expect(page.getByTestId('onboarding-progress')).toHaveText('1/4')
    // Step 1 done -> Icon in der Card
    await expect(page.getByTestId('onboarding-step-1')).toContainText('Erstes Feld anlegen')
  })

  test('Dismiss persistiert über Reload', async ({ page }) => {
    await page.goto('/felder')
    await page.getByTestId('onboarding-dismiss').click()
    await expect(page.getByTestId('onboarding-card')).not.toBeVisible()
    await page.reload()
    await expect(page.getByTestId('onboarding-card')).not.toBeVisible()
  })

  test('Reset im Profil reaktiviert Card', async ({ page }) => {
    await page.goto('/felder')
    await page.getByTestId('onboarding-dismiss').click()
    await page.goto('/profil')
    await page.getByTestId('onboarding-reset').click()
    await page.goto('/felder')
    await expect(page.getByTestId('onboarding-card')).toBeVisible()
  })

  test('„Später" bei Step 4 markiert PWA als erledigt (Non-iOS)', async ({ page }) => {
    // UA als Desktop-Firefox (kein canPrompt, kein iOS)
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
        configurable: true,
      })
    })
    await page.goto('/felder')
    await page.getByTestId('onboarding-step-4-action-later').click()
    await expect(page.getByTestId('onboarding-progress')).toHaveText('1/4')
  })
})
```

Hinweis zu den `data-testid`s: `feld-name-input`, `feld-size-input`, `feld-speichern-button` setzen voraus, dass das `FieldForm` diese Test-IDs hat. Falls nicht, vorher in `FieldForm.vue` ergänzen oder den Selektor anpassen.

- [ ] **Step 2: `FieldForm` auf vorhandene testids prüfen**

```bash
grep -n "data-testid" /home/manuel/claude/duengungsberater/src/components/FieldForm.vue
```

Falls fehlend: zu `name`-Input `data-testid="feld-name-input"`, zum Größe-Input `data-testid="feld-size-input"`, zum Speichern-Button `data-testid="feld-speichern-button"` ergänzen.

- [ ] **Step 3: Playwright ausführen**

```bash
cd /home/manuel/claude/duengungsberater
npm run test:e2e -- onboarding.spec
```

Erwartet: 5/5 Tests grün. Fehlschläge meist wegen falscher Test-IDs → Fix in FieldForm.vue bzw. Anpassung der Selektoren.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/onboarding.spec.ts src/components/FieldForm.vue
git commit -m "$(cat <<'EOF'
test(onboarding): E2E-Tests fuer Checkliste-Flow

5 Scenarios:
- Welcome-Card bei leerer App
- Step 1 wird gruen nach Feld-Anlage
- Dismiss persistiert ueber Reload
- Reset im Profil reaktiviert Card
- "Spaeter" bei Step 4 markiert PWA als erledigt

Ggf. data-testid in FieldForm ergaenzt.

Task 8/8 aus plan 2026-04-17-onboarding-checkliste.md
EOF
)"
```

---

## Abschluss

- [ ] **Abschluss-Step 1: Alle Tests grün**

```bash
cd /home/manuel/claude/duengungsberater
npm run lint && npm run test:run && npm run test:e2e -- onboarding.spec
```

Erwartet: Lint clean, Unit-Tests alle grün (+15 neue), E2E onboarding 5/5.

- [ ] **Abschluss-Step 2: ARC42-Update**

Im Projekt existiert `docs/arc42/`. Wenn dort eine Struktur für Komponenten gepflegt wird, ergänze einen Unterabschnitt „Onboarding":

- Datei `docs/arc42/06-laufzeitsicht.md` (oder entsprechend) um Onboarding-Flow erweitern
- Datei `docs/arc42/09-design-entscheidungen.md` um „ADR: Onboarding-State aus Dexie liveQuery, nicht Pinia-Store" ergänzen

Falls kein ARC42-Pflegeprozess existiert: skippen und in nächster Spec nachholen.

- [ ] **Abschluss-Step 3: Manueller Smoke-Test**

- `npm run dev`
- Inkognito-Tab → `/felder`
- 4 Schritte durchspielen: Feld → Plan → Empfehlung → Install
- Dismiss testen
- Profil → Reset testen
- PWA-Install in Chrome (Icon in Adressleiste)
- PWA-Install-Prompt testen (sollte Matomo-Event `Pwa-Install-accepted` feuern)

---

## Self-Review-Checkliste

**Spec-Coverage (Abgleich mit `docs/superpowers/specs/2026-04-17-onboarding-checkliste-design.md`):**
- ✅ Komponentenstruktur: Card + Step + Hint (Task 3, 4, 5)
- ✅ `useOnboardingState` (Task 2)
- ✅ `usePwaInstall` + main.ts-Hook (Task 1)
- ✅ 4 Schritte mit korrekten `done`-Bedingungen (Dexie counts)
- ✅ Welcome + kompakte Variante (via `isWelcome`-computed)
- ✅ Dismiss-Button + Auto-Fade bei 4/4
- ✅ Reset-Link im Profil (Task 7)
- ✅ Admins + Gäste sehen identische Card (keine Rollen-Logik)
- ✅ PWA-Install für Chrome, iOS-Modal, „Später"-Fallback
- ✅ LocalStorage fail-silent
- ✅ Matomo-Events (Shown, Completed, Dismissed, Step-Action-*, Pwa-Install-*)
- ✅ Accessibility: aria-label, aria-current, role="progressbar", 44px Touch-Targets, `sr-only`-Summary
- ✅ Testing: Vitest-Unit für beide Composables, Playwright-E2E 5 Scenarios

**Placeholder-Scan:** Keine TBD/TODO/„implement later". Jeder Step hat konkreten Code oder Befehl.

**Type-Konsistenz:**
- `OnboardingStepAction.key` wird in `OnboardingCard.onStepAction` gegen alle 8 `case`-Werte (new-field, ibalis-import, plan, recommendation, pwa-install, pwa-ios, pwa-later) konsistent geprüft.
- `db.fieldCropPlans` (Dexie-Tabellenname) konsistent über Task 2 und Task 6 hinweg.
- `ONBOARDING_DISMISSED_KEY`/`PWA_INSTALL_LATER_KEY` exportiert in Task 2, importiert in Task 7 (Reset) und Task 8 (E2E-Cleanup ist localStorage.clear(), keine Key-Duplikate).

---

**Plan complete.** Saved to `docs/superpowers/plans/2026-04-17-onboarding-checkliste.md`.
