import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { syncAll } from '@/services/sync.service'
import './assets/main.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// Offline-Daten synchronisieren bei App-Start und Reconnect.
if (navigator.onLine) {
  syncAll().catch(console.error)
}

window.addEventListener('online', () => {
  syncAll().catch(console.error)
})
