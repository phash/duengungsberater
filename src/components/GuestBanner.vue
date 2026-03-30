<template>
  <div
    v-if="visible"
    class="flex items-center justify-between gap-3 rounded-2xl border border-wheat-200 bg-wheat-50 px-4 py-3 text-sm text-stone-700"
    data-testid="guest-banner"
  >
    <p>
      Du nutzt den Rechner als Gast. Deine Daten werden nur lokal gespeichert.
      <router-link to="/login" class="font-semibold text-field-700 underline hover:text-field-900">
        Registrieren
      </router-link>
      um Daten dauerhaft zu speichern.
    </p>
    <button
      data-testid="guest-banner-dismiss"
      class="shrink-0 rounded-lg p-1 text-stone-400 hover:bg-wheat-100 hover:text-stone-600"
      @click="dismiss"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const dismissed = ref(sessionStorage.getItem('guest_banner_dismissed') === 'true')
const visible = computed(() => auth.isGuest && !dismissed.value)

function dismiss() {
  dismissed.value = true
  sessionStorage.setItem('guest_banner_dismissed', 'true')
}
</script>
