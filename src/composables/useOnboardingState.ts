import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { liveQuery, type Subscription } from 'dexie'
import { db } from '@/db/dexie'
import { useAuthStore } from '@/stores/auth.store'
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
  const auth = useAuthStore()

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
    const uid = auth.userId
    if (!uid) {
      fieldsRef.value = 0
      plansRef.value = 0
      recosRef.value = 0
      return
    }
    fieldsRef.value = await db.fields.where('user_id').equals(uid).count()
    const myFieldIds = new Set(
      (await db.fields.where('user_id').equals(uid).toArray()).map((f) => f.id),
    )
    const myPlans = (await db.fieldCropPlans.toArray()).filter((p) =>
      myFieldIds.has(p.field_id),
    )
    plansRef.value = myPlans.length
    const myPlanIds = new Set(myPlans.map((p) => p.id))
    recosRef.value = (await db.recommendations.toArray()).filter((r) =>
      myPlanIds.has(r.field_crop_plan_id),
    ).length
  }

  const subs: Subscription[] = []

  function startSubscriptions(uid: string | null): void {
    for (const s of subs) s.unsubscribe()
    subs.length = 0
    if (!uid) {
      fieldsRef.value = 0
      plansRef.value = 0
      recosRef.value = 0
      return
    }
    subs.push(
      liveQuery(async () => db.fields.where('user_id').equals(uid).count()).subscribe((n) => {
        fieldsRef.value = n
      }) as Subscription,
    )
    subs.push(
      liveQuery(async () => {
        const myIds = new Set(
          (await db.fields.where('user_id').equals(uid).toArray()).map((f) => f.id),
        )
        return (await db.fieldCropPlans.toArray()).filter((p) => myIds.has(p.field_id))
          .length
      }).subscribe((n) => {
        plansRef.value = n
      }) as Subscription,
    )
    subs.push(
      liveQuery(async () => {
        const myFieldIds = new Set(
          (await db.fields.where('user_id').equals(uid).toArray()).map((f) => f.id),
        )
        const myPlanIds = new Set(
          (await db.fieldCropPlans.toArray())
            .filter((p) => myFieldIds.has(p.field_id))
            .map((p) => p.id),
        )
        return (await db.recommendations.toArray()).filter((r) =>
          myPlanIds.has(r.field_crop_plan_id),
        ).length
      }).subscribe((n) => {
        recosRef.value = n
      }) as Subscription,
    )
  }

  onMounted(() => {
    startSubscriptions(auth.userId)
  })

  watch(
    () => auth.userId,
    (uid) => startSubscriptions(uid),
  )

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

  const byNewest = <T extends { created_at?: string }>(a: T, b: T) =>
    (b.created_at ?? '').localeCompare(a.created_at ?? '')

  // Navigation-Ziel für Onboarding-Schritt 2 — Feld DES AKTUELLEN USERS (neuestes zuerst,
  // passend zur FieldList-Sortierung), nicht der globale erste Dexie-Datensatz.
  async function firstFieldId(): Promise<string | null> {
    const uid = auth.userId
    if (!uid) return null
    const myFields = await db.fields.where('user_id').equals(uid).toArray()
    const [newest] = [...myFields].sort(byNewest)
    return newest?.id ?? null
  }

  // Navigation-Ziel für Onboarding-Schritt 3 — Plan eines EIGENEN Feldes.
  async function firstPlanTarget(): Promise<{ fieldId: string; planId: string } | null> {
    const uid = auth.userId
    if (!uid) return null
    const myFieldIds = new Set(
      (await db.fields.where('user_id').equals(uid).toArray()).map((f) => f.id),
    )
    const myPlans = (await db.fieldCropPlans.toArray()).filter((p) => myFieldIds.has(p.field_id))
    const [plan] = [...myPlans].sort(byNewest)
    return plan ? { fieldId: plan.field_id, planId: plan.id } : null
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
    firstFieldId,
    firstPlanTarget,
  }
}
