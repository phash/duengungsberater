<template>
  <span
    data-testid="status-badge"
    class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
    :class="badgeClasses"
  >
    {{ icon }}
    <span v-if="label">{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: 'done' | 'action' | 'empty'
  label?: string
}>()

const icon = computed(() => {
  switch (props.status) {
    case 'done':
      return '✓'
    case 'action':
      return '⚠'
    case 'empty':
      return '—'
  }
})

const badgeClasses = computed(() => {
  switch (props.status) {
    case 'done': return 'bg-field-100 text-field-700'
    case 'action': return 'bg-wheat-100 text-wheat-600'
    case 'empty': return 'bg-stone-100 text-stone-500'
  }
})
</script>
