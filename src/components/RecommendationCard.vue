<template>
  <div v-if="results.length > 0" data-testid="recommendation-card" class="rounded-xl border border-gray-200 bg-white p-4">
    <h3 class="mb-3 text-sm font-semibold text-gray-700">Nährstoffbedarf</h3>
    <div class="space-y-2">
      <div
        v-for="result in results"
        :key="result.nutrient_code"
        :data-testid="`nutrient-row-${result.nutrient_code}`"
        class="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
      >
        <div>
          <span class="font-medium">{{ result.nutrient_code }}</span>
          <span class="ml-1 text-xs text-gray-500">({{ result.nutrient_label }})</span>
        </div>
        <div class="text-right">
          <NumberDisplay :value="result.value_kg_ha" format="nutrient-per-ha" :code="result.nutrient_code" />
          <p class="text-xs text-gray-400">
            gesamt: <NumberDisplay :value="result.value_kg_total" format="nutrient-total" :code="result.nutrient_code" />
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NutrientResult } from '@/types'
import NumberDisplay from './NumberDisplay.vue'

defineProps<{
  results: NutrientResult[]
}>()
</script>
