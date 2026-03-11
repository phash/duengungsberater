<template>
  <AppLayout title="Düngeempfehlung" :show-back="true">
    <p data-testid="recommendation-placeholder" class="text-gray-400">Empfehlung wird in Chunk 6 implementiert.</p>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'

defineProps<{
  fieldId: string
  planId: string
}>()
</script>
