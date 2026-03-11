<template>
  <div v-if="auth.loading" class="flex items-center justify-center min-h-screen">
    <p class="text-gray-500">Laden…</p>
  </div>
  <RouterView v-else />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()

onMounted(() => {
  auth.init()
})
</script>
