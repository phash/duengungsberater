<template>
  <ul class="space-y-2">
    <li
      v-for="demand in demands"
      :key="demand.id"
      :data-testid="`admin-nutrient-item-${demand.id}`"
      class="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50"
      @click="$emit('select', demand.id)"
    >
      <div>
        <p class="font-medium">
          {{ cropName(demand.crop_id) }} — {{ nutrientCode(demand.nutrient_type_id) }}
        </p>
        <p class="text-sm text-gray-500">
          {{ demand.demand_kg_ha }} kg/ha · Ref: {{ demand.ref_yield_dt_ha }} dt/ha · Quelle:
          {{ demand.source }}
        </p>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { CropNutrientDemand, NutrientType, Crop } from '@/types'
const props = defineProps<{
  demands: CropNutrientDemand[]
  nutrientTypes: NutrientType[]
  crops: Crop[]
}>()
defineEmits<{ select: [demandId: string] }>()
function cropName(cropId: string): string {
  return props.crops.find((c) => c.id === cropId)?.name_de ?? cropId
}
function nutrientCode(ntId: string): string {
  return props.nutrientTypes.find((nt) => nt.id === ntId)?.code ?? ntId
}
</script>
