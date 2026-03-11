import { ref } from 'vue'
import { cacheStammdaten, syncAll } from '@/services/sync.service'
import { useOfflineStore } from '@/stores/offline.store'

export function useOfflineCache() {
  const syncing = ref(false)
  const caching = ref(false)

  async function initCache() {
    caching.value = true
    try {
      await cacheStammdaten()
    } finally {
      caching.value = false
    }
  }

  async function syncOfflineData() {
    const offlineStore = useOfflineStore()
    syncing.value = true
    try {
      const result = await syncAll()
      await offlineStore.refreshSyncCount()
      return result
    } finally {
      syncing.value = false
    }
  }

  function setupAutoSync() {
    window.addEventListener('online', () => {
      syncOfflineData()
    })
  }

  return { syncing, caching, initCache, syncOfflineData, setupAutoSync }
}
