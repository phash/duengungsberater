<template>
  <AppLayout title="Profil">
    <div class="space-y-6">
      <p
        v-if="errorMessage"
        data-testid="profile-error"
        class="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600"
      >
        {{ errorMessage }}
      </p>

      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <h2 class="text-sm font-medium text-gray-500">Angemeldet als</h2>
        <p data-testid="profile-email" class="mt-1 text-lg font-medium text-gray-900">
          {{ authStore.userEmail ?? '—' }}
        </p>
      </div>

      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <h2 class="text-sm font-medium text-gray-500">App-Info</h2>
        <p data-testid="profile-version" class="mt-1 text-sm text-gray-600">
          Düngungsberater MVP · Stufe 1
        </p>
        <p class="text-sm text-gray-400">
          Basisdaten: LfL Bayern 2025/2026
        </p>
      </div>

      <button
        data-testid="profile-logout-button"
        class="w-full rounded-lg border border-red-300 px-4 py-3 text-center font-medium text-red-600 hover:bg-red-50"
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
