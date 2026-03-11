<template>
  <div v-if="fields.length === 0" data-testid="fields-empty-state" class="py-12 text-center">
    <p class="text-gray-400">Noch keine Felder angelegt.</p>
    <p class="mt-1 text-sm text-gray-400">Tippe auf „+ Feld anlegen", um zu starten.</p>
  </div>

  <ul v-else data-testid="field-list" class="space-y-2">
    <li
      v-for="field in fields"
      :key="field.id"
      :data-testid="`field-item-${field.id}`"
      class="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50"
      @click="$emit('select', field.id)"
    >
      <div>
        <p class="font-medium">{{ field.name }}</p>
        <p class="text-sm text-gray-500">
          <NumberDisplay :value="field.size_ha" format="area" />
        </p>
      </div>
      <StatusBadge :status="(planCounts[field.id] ?? 0) > 0 ? 'done' : 'empty'" />
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { Field } from '@/types'
import StatusBadge from './StatusBadge.vue'
import NumberDisplay from './NumberDisplay.vue'

defineProps<{
  fields: Field[]
  planCounts: Record<string, number>
}>()

defineEmits<{
  select: [fieldId: string]
}>()
</script>
