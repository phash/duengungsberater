<template>
  <div v-if="fields.length === 0" data-testid="fields-empty-state" class="animate-fade-in-up py-16 text-center">
    <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
      <svg class="h-8 w-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" />
      </svg>
    </div>
    <p class="font-medium text-stone-400">Noch keine Felder angelegt.</p>
    <p class="mt-1 text-sm text-stone-400">Tippe auf „+ Feld anlegen", um zu starten.</p>
  </div>

  <ul v-else data-testid="field-list" class="space-y-3 stagger">
    <li
      v-for="field in fields"
      :key="field.id"
      :data-testid="`field-item-${field.id}`"
      class="card-lift cursor-pointer rounded-2xl bg-white px-4 py-4 shadow-warm-sm hover:shadow-warm-md"
      @click="$emit('select', field.id)"
    >
      <div class="flex items-center justify-between">
        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold text-stone-800">{{ field.name }}</p>
          <p class="mt-0.5 text-sm text-stone-500">
            <NumberDisplay :value="field.size_ha" format="area" />
          </p>
        </div>
        <div class="ml-3 flex items-center gap-2.5">
          <StatusBadge :status="(planCounts[field.id] ?? 0) > 0 ? 'done' : 'empty'" />
          <button
            :data-testid="`field-planung-button-${field.id}`"
            class="rounded-xl bg-field-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-field-700 hover:shadow-md active:scale-95"
            @click.stop="$emit('navigate', field.id)"
          >
            Planung →
          </button>
        </div>
      </div>
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
  navigate: [fieldId: string]
}>()
</script>
