<template>
  <AppLayout title="Anbauplanung" :show-back="true">
    <p data-testid="crop-plan-placeholder" class="text-gray-400">Anbauplanung wird in Chunk 5 implementiert.</p>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'

defineProps<{
  fieldId: string
}>()
</script>
