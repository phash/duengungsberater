<template>
  <div class="rounded-xl border border-stone-200 bg-white p-4">
    <p class="text-sm text-stone-700">
      <strong class="text-stone-800">Webanalyse-Status:</strong>
      {{ optedOut ? 'Deaktiviert (Opt-Out aktiv)' : 'Aktiv (anonymisiert, cookielos)' }}
    </p>
    <button
      type="button"
      data-testid="matomo-opt-out-toggle"
      class="mt-3 min-h-[44px] rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field-600"
      @click="toggleOptOut"
    >
      {{ optedOut ? 'Webanalyse wieder aktivieren' : 'Webanalyse deaktivieren (Opt-Out)' }}
    </button>
    <p class="mt-2 text-xs text-stone-500">
      Der Opt-Out-Status wird lokal in Ihrem Browser gespeichert
      (LocalStorage-Schlüssel <code class="text-xs">matomo_opt_out</code>).
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const optedOut = ref(false)

onMounted(() => {
  try {
    optedOut.value = localStorage.getItem('matomo_opt_out') === 'true'
  } catch {
    /* privater Modus */
  }
})

function toggleOptOut() {
  const next = !optedOut.value
  try {
    if (next) {
      localStorage.setItem('matomo_opt_out', 'true')
      window._paq?.push(['optUserOut'])
    } else {
      localStorage.removeItem('matomo_opt_out')
      window._paq?.push(['forgetUserOptOut'])
    }
    optedOut.value = next
  } catch {
    /* privater Modus */
  }
}
</script>
