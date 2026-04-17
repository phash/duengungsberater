import { ref, computed, onMounted, onUnmounted } from 'vue'
import { liveQuery, type Subscription } from 'dexie'
import { db } from '@/db/dexie'
import { usePwaInstall } from './usePwaInstall'

export const ONBOARDING_DISMISSED_KEY = 'onboarding_dismissed'
export const PWA_INSTALL_LATER_KEY = 'pwa_install_later'

function safeReadLS(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeWriteLS(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* privater Modus / Quota — fail silent */
  }
}

function safeRemoveLS(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* privater Modus */
  }
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

  const progress = computed(
    () =>
      [step1Done.value, step2Done.value, step3Done.value, step4Done.value].filter(
        Boolean,
      ).length,
  )

  async function recompute(): Promise<void> {
    fieldsRef.value = await db.fields.count()
    plansRef.value = await db.fieldCropPlans.count()
    recosRef.value = await db.recommendations.count()
  }

  const subs: Subscription[] = []

  onMounted(() => {
    subs.push(
      liveQuery(() => db.fields.count()).subscribe((n) => {
        fieldsRef.value = n
      }) as Subscription,
    )
    subs.push(
      liveQuery(() => db.fieldCropPlans.count()).subscribe((n) => {
        plansRef.value = n
      }) as Subscription,
    )
    subs.push(
      liveQuery(() => db.recommendations.count()).subscribe((n) => {
        recosRef.value = n
      }) as Subscription,
    )
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
    step1Done,
    step2Done,
    step3Done,
    step4Done,
    progress,
    dismissed,
    pwaLater,
    dismiss,
    reset,
    markPwaLater,
    recompute,
  }
}
