import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '@/db/dexie'

export const useOfflineStore = defineStore('offline', () => {
  const isOnline = ref(navigator.onLine)
  const syncPending = ref(0)

  const hasPendingSync = computed(() => syncPending.value > 0)

  function init() {
    window.addEventListener('online', () => { isOnline.value = true })
    window.addEventListener('offline', () => { isOnline.value = false })
    refreshSyncCount()
  }

  async function refreshSyncCount() {
    const unsyncedFields = await db.fields.where('synced').equals(false).count()
    const unsyncedPlans = await db.fieldCropPlans.where('synced').equals(false).count()
    syncPending.value = unsyncedFields + unsyncedPlans
  }

  return { isOnline, syncPending, hasPendingSync, init, refreshSyncCount }
})
