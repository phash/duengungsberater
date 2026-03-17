<template>
  <AppLayout title="Profil">
    <div class="space-y-5 stagger">
      <p
        v-if="errorMessage"
        data-testid="profile-error"
        class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </p>

      <!-- Account card -->
      <div class="rounded-2xl bg-white p-5 shadow-warm-sm">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-field-100">
            <svg class="h-6 w-6 text-field-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-stone-500">Angemeldet als</p>
            <p data-testid="profile-email" class="mt-0.5 text-lg font-semibold text-stone-900">
              {{ authStore.userEmail ?? '—' }}
            </p>
          </div>
        </div>
      </div>

      <!-- App info card -->
      <div class="rounded-2xl bg-white p-5 shadow-warm-sm">
        <p class="text-xs font-semibold uppercase tracking-wider text-stone-500">App-Info</p>
        <p data-testid="profile-version" class="mt-2 font-display text-sm font-medium text-stone-700">
          Düngungsberater MVP · Stufe 1
        </p>
        <p class="mt-1 text-sm text-stone-400">
          Basisdaten: LfL Bayern 2025/2026
        </p>
      </div>

      <!-- Logout -->
      <button
        data-testid="profile-logout-button"
        class="w-full rounded-2xl border border-red-200 px-4 py-3.5 text-center font-semibold text-red-600 transition-colors hover:bg-red-50"
        @click="handleLogout"
      >
        Abmelden
      </button>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import AppLayout from '@/components/AppLayout.vue'

const authStore = useAuthStore()
const router = useRouter()
const errorMessage = ref('')

async function handleLogout() {
  errorMessage.value = ''
  try {
    await authStore.logout()
    router.push('/login')
  } catch (e) {
    console.error('Fehler beim Abmelden:', e)
    errorMessage.value = 'Fehler beim Abmelden. Bitte erneut versuchen.'
  }
}
</script>
