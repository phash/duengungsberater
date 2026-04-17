import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'

// In-Memory LocalStorage-Mock (Node 25 experimental-localStorage bricht jsdom)
function makeLsMock() {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)) },
    removeItem: (k: string) => { store.delete(k) },
    clear: () => { store.clear() },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size },
  }
}
const lsMock = makeLsMock()
vi.stubGlobal('localStorage', lsMock)
Object.defineProperty(window, 'localStorage', { value: lsMock, configurable: true })

// Dexie-Mock: Zahlen hochzaehlbar
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

// dexie liveQuery: stub — Subscription mit unsubscribe-Noop
vi.mock('dexie', () => ({
  liveQuery: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
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
    window.localStorage.clear()
  })

  it('progress=0 wenn alles leer', async () => {
    const state = useOnboardingState()
    await state.recompute()
    expect(state.progress.value).toBe(0)
  })

  it('step1Done wenn fields > 0', async () => {
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
    window.localStorage.setItem(PWA_INSTALL_LATER_KEY, 'true')
    const state = useOnboardingState()
    await state.recompute()
    expect(state.step4Done.value).toBe(true)
  })

  it('dismiss() schreibt LocalStorage', () => {
    const state = useOnboardingState()
    state.dismiss()
    expect(state.dismissed.value).toBe(true)
    expect(window.localStorage.getItem(ONBOARDING_DISMISSED_KEY)).toBe('true')
  })

  it('reset() loescht Dismiss', () => {
    window.localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true')
    const state = useOnboardingState()
    expect(state.dismissed.value).toBe(true)
    state.reset()
    expect(state.dismissed.value).toBe(false)
    expect(window.localStorage.getItem(ONBOARDING_DISMISSED_KEY)).toBeNull()
  })

  it('markPwaLater() setzt Flag persistent', () => {
    const state = useOnboardingState()
    state.markPwaLater()
    expect(window.localStorage.getItem(PWA_INSTALL_LATER_KEY)).toBe('true')
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
