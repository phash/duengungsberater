import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import router from './router'
import { syncAll } from '@/services/sync.service'
import { useAuthStore } from '@/stores/auth.store'
import { useOfflineStore } from '@/stores/offline.store'
import { __setDeferredPrompt } from '@/composables/usePwaInstall'

// Self-hosted fonts (DSGVO)
import '@fontsource-variable/fraunces/index.css'
import '@fontsource/outfit/300.css'
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/700.css'

import './assets/main.css'

// PWA Install-Prompt: Event VOR Komponenten-Mount abfangen, damit
// usePwaInstall() zuverlaessig den deferred prompt findet.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  __setDeferredPrompt(e as unknown as Parameters<typeof __setDeferredPrompt>[0])
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// Offline-Store: online/offline-Listener registrieren + Sync-Zähler initialisieren
useOfflineStore().init()

// PWA: Service Worker registrieren + alle 60s auf Updates prüfen.
// Bei neuem SW wird sofort aktiviert (autoUpdate) → nächster Seitenaufruf hat neue Version.
registerSW({
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      setInterval(() => {
        registration.update()
      }, 60 * 1000)
    }
  },
})

// Auth initialisieren, dann Offline-Daten synchronisieren.
// auth.init() muss abgeschlossen sein, bevor syncAll() den userId braucht.
// online-Listener wird erst NACH init registriert, sonst Race mit Default-State.
const auth = useAuthStore()
auth.init().then(() => {
  if (navigator.onLine && !auth.isGuest) {
    syncAll().catch(console.error)
  }
  window.addEventListener('online', () => {
    if (!auth.isGuest) syncAll().catch(console.error)
  })
})
