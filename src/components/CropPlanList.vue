<template>
  <div v-if="plans.length === 0" data-testid="crop-plans-empty-state" class="py-12 text-center">
    <p class="text-gray-400">Noch keine Anbauplanung für dieses Feld.</p>
    <p class="mt-1 text-sm text-gray-400">Tippe auf „+ Planung anlegen", um zu starten.</p>
  </div>

  <ul v-else data-testid="crop-plan-list" class="space-y-2">
    <li
      v-for="plan in plans"
      :key="plan.id"
      :data-testid="`plan-item-${plan.id}`"
      class="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50"
      @click="$emit('select', plan.id)"
    >
      <div>
        <p class="font-medium">{{ cropName(plan.crop_id) }}</p>
        <p class="text-sm text-gray-500">
          Saison {{ plan.season_year }} ·
          <NumberDisplay :value="plan.expected_yield_dt_ha" format="yield" />
        </p>
      </div>
      <button
        :data-testid="`plan-empfehlung-button-${plan.id}`"
        class="rounded-lg bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
        @click.stop="$emit('navigate', plan.id)"
      >
        Empfehlung →
      </button>
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
