<template>
  <div class="min-h-screen bg-parchment pb-24 sm:pb-0">
    <!-- Frosted glass header -->
    <header class="sticky top-0 z-30 border-b border-stone-200/60 bg-white/80 backdrop-blur-xl">
      <div class="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <div class="flex items-center gap-2.5">
          <button
            v-if="showBack"
            data-testid="back-button"
            class="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-100 text-stone-600 transition-colors hover:bg-stone-200"
            @click="$router.back()"
          >
            <span class="sr-only">Zurück</span>
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 class="font-display text-lg font-semibold text-stone-900" data-testid="page-title">{{ title }}</h1>
        </div>
        <div class="flex items-center gap-2">
          <slot name="actions" />
          <button
            data-testid="logout-button"
            class="rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
            @click="handleLogout"
          >
            Abmelden
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-2xl px-4 py-5">
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
