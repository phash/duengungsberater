<template>
  <div class="min-h-screen bg-gray-50 pb-16 sm:pb-0">
    <header
      class="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3"
    >
      <div class="flex items-center gap-2">
        <button
          v-if="showBack"
          data-testid="back-button"
          class="rounded-full p-1 hover:bg-gray-100"
          @click="$router.back()"
        >
          <span class="sr-only">Zurück</span>
          <svg
            class="h-5 w-5"
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h1 class="text-lg font-semibold" data-testid="page-title">{{ title }}</h1>
      </div>
      <div class="flex items-center gap-2">
        <slot name="actions" />
        <button
          data-testid="logout-button"
          class="text-sm text-gray-500 hover:text-gray-700"
          @click="handleLogout"
        >
          Abmelden
        </button>
      </div>
    </header>

    <main class="mx-auto max-w-2xl px-4 py-4">
      <slot />
    </main>

    <BottomNav :is-admin="auth.isAdminUser" />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'vue-router'
import BottomNav from './BottomNav.vue'

defineProps<{
  title: string
  showBack?: boolean
}>()

const auth = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>
