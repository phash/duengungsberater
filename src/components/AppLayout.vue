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
          <div class="relative" ref="menuRef">
            <button
              data-testid="header-menu-button"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
              @click="menuOpen = !menuOpen"
            >
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            <Transition
              enter-active-class="transition duration-100 ease-out"
              enter-from-class="opacity-0 scale-95"
              enter-to-class="opacity-100 scale-100"
              leave-active-class="transition duration-75 ease-in"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <div
                v-if="menuOpen"
                class="absolute right-0 top-full mt-1 w-40 rounded-xl border border-stone-200/60 bg-white/95 py-1 shadow-warm-lg backdrop-blur-xl"
                data-testid="header-menu-dropdown"
              >
                <RouterLink
                  to="/impressum"
                  class="block px-3 py-2 text-xs text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-700"
                  @click="menuOpen = false"
                >Impressum</RouterLink>
                <RouterLink
                  to="/datenschutz"
                  class="block px-3 py-2 text-xs text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-700"
                  @click="menuOpen = false"
                >Datenschutz</RouterLink>
                <RouterLink
                  to="/agb"
                  class="block px-3 py-2 text-xs text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-700"
                  @click="menuOpen = false"
                >AGB</RouterLink>
                <div class="my-1 border-t border-stone-100"></div>
                <button
                  data-testid="logout-button"
                  class="w-full px-3 py-2 text-left text-xs text-stone-400 transition-colors hover:bg-stone-50 hover:text-stone-600"
                  @click="handleLogout"
                >
                  Abmelden
                </button>
              </div>
            </Transition>
          </div>
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
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'vue-router'
import BottomNav from './BottomNav.vue'

defineProps<{
  title: string
  showBack?: boolean
}>()

const auth = useAuthStore()
const router = useRouter()
const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

function onClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    menuOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))

async function handleLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>
