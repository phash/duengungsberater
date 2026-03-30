<template>
  <div v-if="auth.loading" class="flex min-h-screen items-center justify-center bg-parchment">
    <div class="flex flex-col items-center gap-4">
      <div class="flex gap-2">
        <div class="h-2.5 w-2.5 rounded-full bg-field-600 loader-dot"></div>
        <div class="h-2.5 w-2.5 rounded-full bg-field-500 loader-dot"></div>
        <div class="h-2.5 w-2.5 rounded-full bg-field-400 loader-dot"></div>
      </div>
      <p class="text-sm tracking-wide text-stone-400">Laden…</p>
    </div>
  </div>
  <RouterView v-else />
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
</script>
