<template>
  <nav
    data-testid="bottom-nav"
    class="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md rounded-2xl border border-stone-200/40 bg-white/85 backdrop-blur-xl shadow-warm-lg sm:hidden"
  >
    <div class="flex justify-around py-2">
      <RouterLink
        to="/felder"
        data-testid="nav-felder"
        class="group flex flex-col items-center gap-1 px-4 py-1.5 text-xs transition-colors"
        :class="isActive('/felder') ? 'text-field-600 font-semibold' : 'text-stone-400'"
      >
        <svg class="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" :stroke-width="isActive('/felder') ? 2.5 : 1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        Felder
        <span v-if="isActive('/felder')" class="h-1 w-1 rounded-full bg-field-600"></span>
      </RouterLink>

      <RouterLink
        :to="auth.isGuest ? '/login' : '/profil'"
        data-testid="nav-profil"
        class="group flex flex-col items-center gap-1 px-4 py-1.5 text-xs transition-colors"
        :class="isActive('/profil') ? 'text-field-600 font-semibold' : 'text-stone-400'"
      >
        <svg class="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" :stroke-width="isActive('/profil') ? 2.5 : 1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
        Profil
        <span v-if="isActive('/profil')" class="h-1 w-1 rounded-full bg-field-600"></span>
      </RouterLink>

      <RouterLink
        v-if="isAdmin"
        to="/admin"
        data-testid="nav-admin"
        class="group flex flex-col items-center gap-1 px-4 py-1.5 text-xs transition-colors"
        :class="isActive('/admin') ? 'text-field-600 font-semibold' : 'text-stone-400'"
      >
        <svg class="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" :stroke-width="isActive('/admin') ? 2.5 : 1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Admin
        <span v-if="isActive('/admin')" class="h-1 w-1 rounded-full bg-field-600"></span>
      </RouterLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

defineProps<{
  isAdmin: boolean
}>()

const auth = useAuthStore()

const route = useRoute()

function isActive(path: string): boolean {
  return route.path.startsWith(path)
}
</script>
