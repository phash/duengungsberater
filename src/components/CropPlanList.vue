<template>
  <div v-if="plans.length === 0" data-testid="crop-plans-empty-state" class="animate-fade-in-up py-16 text-center">
    <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
      <svg class="h-8 w-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    </div>
    <p class="font-medium text-stone-400">Noch keine Anbauplanung für dieses Feld.</p>
    <p class="mt-1 text-sm text-stone-400">Tippe auf „+ Planung anlegen", um zu starten.</p>
  </div>

  <ul v-else data-testid="crop-plan-list" class="space-y-3 stagger">
    <li
      v-for="plan in plans"
      :key="plan.id"
      :data-testid="`plan-item-${plan.id}`"
      class="card-lift cursor-pointer rounded-2xl bg-white px-4 py-4 shadow-warm-sm hover:shadow-warm-md"
      @click="$emit('select', plan.id)"
    >
      <div class="flex items-center justify-between">
        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold text-stone-800">{{ cropName(plan.crop_id) }}</p>
          <p class="mt-0.5 text-sm text-stone-500">
            Saison {{ plan.season_year }} ·
            <NumberDisplay :value="plan.expected_yield_dt_ha" format="yield" />
          </p>
        </div>
        <button
          :data-testid="`plan-empfehlung-button-${plan.id}`"
          class="ml-3 rounded-xl bg-field-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-field-700 hover:shadow-md active:scale-95"
          @click.stop="$emit('navigate', plan.id)"
        >
          Empfehlung →
        </button>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { FieldCropPlan, Crop } from '@/types'
import NumberDisplay from './NumberDisplay.vue'

const props = defineProps<{
  plans: FieldCropPlan[]
  crops: Crop[]
}>()

defineEmits<{
  select: [planId: string]
  navigate: [planId: string]
}>()

function cropName(cropId: string): string {
  return props.crops.find((c) => c.id === cropId)?.name_de ?? 'Unbekannte Kultur'
}
</script>
