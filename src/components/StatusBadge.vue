<template>
  <span
    data-testid="status-badge"
    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
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
    case 'done':
      return 'bg-green-100 text-green-800'
    case 'action':
      return 'bg-yellow-100 text-yellow-800'
    case 'empty':
      return 'bg-gray-100 text-gray-600'
  }
})
</script>
