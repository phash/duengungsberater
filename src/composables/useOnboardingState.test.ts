import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

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

// Dexie-Mock: minimal where/equals/count/toArray (hoisted für vi.mock)
const TEST_USER_ID = 'test-user-1'
const mockState = vi.hoisted(() => ({
  fields: [] as Array<{ id: string; user_id: string }>,
  plans: [] as Array<{ id: string; field_id: string }>,
  recos: [] as Array<{ id: string; field_crop_plan_id: string }>,
}))
const fieldsData = { get value() { return mockState.fields }, set value(v: Array<{ id: string; user_id: string }>) { mockState.fields = v } }
const plansData = { get value() { return mockState.plans }, set value(v: Array<{ id: string; field_id: string }>) { mockState.plans = v } }
const recosData = { get value() { return mockState.recos }, set value(v: Array<{ id: string; field_crop_plan_id: string }>) { mockState.recos = v } }

vi.mock('@/db/dexie', () => {
  function makeTable(key: 'fields' | 'plans' | 'recos') {
    return {
      count: () => Promise.resolve(mockState[key].length),
      toArray: () => Promise.resolve([...mockState[key]]),
      where: (col: string) => ({
        equals: (val: string) => ({
          count: () => Promise.resolve(
            mockState[key].filter((r: Record<string, unknown>) => r[col] === val).length,
          ),
          toArray: () => Promise.resolve(
            mockState[key].filter((r: Record<string, unknown>) => r[col] === val),
          ),
        }),
      }),
    }
  }
  return {
    db: {
      fields: makeTable('fields'),
      fieldCropPlans: makeTable('plans'),
      recommendations: makeTable('recos'),
    },
  }
})

// dexie liveQuery: stub — Subscription mit unsubscribe-Noop
vi.mock('dexie', () => ({
  liveQuery: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
}))

// auth.store-Mock
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({ userId: TEST_USER_ID }),
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
    setActivePinia(createPinia())
    fieldsData.value = []
    plansData.value = []
    recosData.value = []
    standaloneMock.value = false
    window.localStorage.clear()
  })

  it('progress=0 wenn alles leer', async () => {
    const state = useOnboardingState()
    await state.recompute()
    expect(state.progress.value).toBe(0)
  })

  it('step1Done wenn fields > 0', async () => {
    fieldsData.value = [{ id: 'f1', user_id: TEST_USER_ID }]
    const state = useOnboardingState()
    await state.recompute()
    expect(state.step1Done.value).toBe(true)
    expect(state.progress.value).toBe(1)
  })

  it('alle 4 done wenn alles gesetzt', async () => {
    fieldsData.value = [
      { id: 'f1', user_id: TEST_USER_ID },
      { id: 'f2', user_id: TEST_USER_ID },
    ]
    plansData.value = [{ id: 'p1', field_id: 'f1' }]
    recosData.value = [{ id: 'r1', field_crop_plan_id: 'p1' }]
    standaloneMock.value = true
    const state = useOnboardingState()
    await state.recompute()
    expect(state.progress.value).toBe(4)
  })

  it('fields anderer User werden ignoriert', async () => {
    fieldsData.value = [
      { id: 'f1', user_id: 'other-user' },
      { id: 'f2', user_id: 'other-user' },
    ]
    const state = useOnboardingState()
    await state.recompute()
    expect(state.step1Done.value).toBe(false)
    expect(state.progress.value).toBe(0)
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

  // --- Onboarding-Navigation: user-scoped, nicht globaler erster Datensatz (F2) ---

  it('firstFieldId liefert null wenn keine Felder', async () => {
    const state = useOnboardingState()
    expect(await state.firstFieldId()).toBeNull()
  })

  it('firstFieldId liefert nur ein Feld des aktuellen Users', async () => {
    fieldsData.value = [
      { id: 'other', user_id: 'other-user' },
      { id: 'mine', user_id: TEST_USER_ID },
    ]
    const state = useOnboardingState()
    expect(await state.firstFieldId()).toBe('mine')
  })

  it('firstPlanTarget liefert Plan eines eigenen Feldes', async () => {
    fieldsData.value = [{ id: 'mine', user_id: TEST_USER_ID }]
    plansData.value = [{ id: 'p1', field_id: 'mine' }]
    const state = useOnboardingState()
    expect(await state.firstPlanTarget()).toEqual({ fieldId: 'mine', planId: 'p1' })
  })

  it('firstPlanTarget ignoriert Pläne fremder Felder', async () => {
    fieldsData.value = [{ id: 'other', user_id: 'other-user' }]
    plansData.value = [{ id: 'p1', field_id: 'other' }]
    const state = useOnboardingState()
    expect(await state.firstPlanTarget()).toBeNull()
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
