<template>
  <nav
    data-testid="bottom-nav"
    class="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-gray-200 bg-white py-2 sm:hidden"
  >
    <RouterLink
      to="/felder"
      data-testid="nav-felder"
      class="flex flex-col items-center gap-0.5 px-3 py-1 text-xs"
      :class="isActive('/felder') ? 'text-green-700 font-semibold' : 'text-gray-500'"
    >
      <svg class="h-5 w-5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
      Felder
    </RouterLink>
    <RouterLink
      to="/profil"
      data-testid="nav-profil"
      class="flex flex-col items-center gap-0.5 px-3 py-1 text-xs"
      :class="isActive('/profil') ? 'text-green-700 font-semibold' : 'text-gray-500'"
    >
      <svg class="h-5 w-5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      Profil
    </RouterLink>
    <RouterLink
      v-if="isAdmin"
      to="/admin"
      data-testid="nav-admin"
      class="flex flex-col items-center gap-0.5 px-3 py-1 text-xs"
      :class="isActive('/admin') ? 'text-green-700 font-semibold' : 'text-gray-500'"
    >
      <svg class="h-5 w-5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      Admin
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

defineProps<{
  isAdmin: boolean
}>()

const route = useRoute()

function isActive(path: string): boolean {
  return route.path.startsWith(path)
}
</script>
