import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import router from './router'
import { syncAll } from '@/services/sync.service'
import './assets/main.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

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

// Offline-Daten synchronisieren bei App-Start und Reconnect.
if (navigator.onLine) {
  syncAll().catch(console.error)
}

window.addEventListener('online', () => {
  syncAll().catch(console.error)
})
