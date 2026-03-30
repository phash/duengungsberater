import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authService from '@/services/auth.service'

const GUEST_ID_KEY = 'duenger_guest_id'

export const useAuthStore = defineStore('auth', () => {
  const userId = ref<string | null>(null)
  const userEmail = ref<string | null>(null)
  const isAdminUser = ref(false)
  const loading = ref(true)
  let authSubscription: { unsubscribe: () => void } | null = null

  const isAuthenticated = computed(() => userId.value !== null)
  const isGuest = computed(() => userId.value?.startsWith('guest-') ?? false)
  const isRegistered = computed(() => isAuthenticated.value && !isGuest.value)

  async function init() {
    loading.value = true
    userId.value = await authService.getCurrentUserId()
    if (userId.value) {
      userEmail.value = await authService.getCurrentUserEmail()
      isAdminUser.value = await authService.isAdmin()
    } else {
      // No Supabase session — activate guest mode
      const stored = localStorage.getItem(GUEST_ID_KEY)
      const guestId = stored ?? `guest-${crypto.randomUUID()}`
      if (!stored) localStorage.setItem(GUEST_ID_KEY, guestId)
      userId.value = guestId
    }
    loading.value = false

    const { data } = authService.onAuthStateChange(async (id) => {
      userId.value = id
      if (id) {
        userEmail.value = await authService.getCurrentUserEmail()
        isAdminUser.value = await authService.isAdmin()

        // Migrate guest data to real account
        if (!id.startsWith('guest-')) {
          const guestId = localStorage.getItem(GUEST_ID_KEY)
          if (guestId) {
            try {
              const { db } = await import('@/db/dexie')
              // Get guest field IDs before migration
              const guestFields = await db.fields.where('user_id').equals(guestId).toArray()
              const guestFieldIds = guestFields.map((f) => f.id)
              // Migrate fields to real user
              await db.fields
                .where('user_id')
                .equals(guestId)
                .modify({ user_id: id, synced: false })
              // Mark plans of migrated fields as unsynced
              if (guestFieldIds.length > 0) {
                await db.fieldCropPlans
                  .where('field_id')
                  .anyOf(guestFieldIds)
                  .modify({ synced: false })
              }
              localStorage.removeItem(GUEST_ID_KEY)
              // Sync migrated data to server
              const { syncAll } = await import('@/services/sync.service')
              syncAll().catch(() => {
                /* silent fail */
              })
            } catch {
              /* migration failed silently — guest data stays local */
            }
          }
        }

        const { cacheStammdaten } = await import('@/services/sync.service')
        cacheStammdaten(id).catch(() => {
          /* silent fail */
        })
      } else {
        userEmail.value = null
        isAdminUser.value = false
      }
    })
    authSubscription = data.subscription
  }

  async function login(email: string, password: string) {
    return authService.signIn(email, password)
  }

  async function register(email: string, password: string) {
    return authService.signUp(email, password)
  }

  async function logout() {
    authSubscription?.unsubscribe()
    authSubscription = null
    await authService.signOut()
    userId.value = null
    userEmail.value = null
    isAdminUser.value = false
  }

  return { userId, userEmail, isAuthenticated, isGuest, isRegistered, isAdminUser, loading, init, login, register, logout }
})
