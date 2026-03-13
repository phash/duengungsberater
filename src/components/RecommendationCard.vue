<template>
  <div
    v-if="results.length > 0"
    data-testid="recommendation-card"
    class="rounded-xl border border-gray-200 bg-white p-4"
  >
    <h3 class="mb-3 text-sm font-semibold text-gray-700">Nährstoffbedarf</h3>
    <div class="space-y-2">
      <div v-for="result in results" :key="result.nutrient_code">
        <div
          :data-testid="`nutrient-row-${result.nutrient_code}`"
          class="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
          :class="{ 'cursor-pointer hover:bg-gray-100': result.breakdown }"
          @click="toggleBreakdown(result)"
        >
          <div>
            <span class="font-medium">{{ result.nutrient_code }}</span>
            <span class="ml-1 text-xs text-gray-500">({{ result.nutrient_label }})</span>
          </div>
          <div class="text-right">
            <NumberDisplay
              :value="result.value_kg_ha"
              format="nutrient-per-ha"
              :code="result.nutrient_code"
            />
            <p class="text-xs text-gray-400">
              gesamt:
              <NumberDisplay
                :value="result.value_kg_total"
                format="nutrient-total"
                :code="result.nutrient_code"
              />
            </p>
          </div>
        </div>

        <!-- Breakdown accordion -->
        <div
          v-show="expandedCode === result.nutrient_code && !!result.breakdown"
          :data-testid="`nutrient-breakdown-${result.nutrient_code}`"
          class="ml-4 mt-1 rounded-lg bg-gray-100 px-3 py-2 text-sm"
        >
          <div v-if="result.breakdown" class="flex justify-between py-0.5">
            <span class="text-gray-600">Grundbedarf</span>
            <span>{{ formatValue(result.breakdown.base_demand_kg_ha) }} {{ result.unit }}</span>
          </div>
          <div
            v-if="result.breakdown && result.breakdown.yield_correction_kg_ha !== 0"
            class="flex justify-between py-0.5"
          >
            <span class="text-gray-600">Ertragskorrektur</span>
            <span
              >{{ formatSigned(result.breakdown.yield_correction_kg_ha) }} {{ result.unit }}</span
            >
          </div>
          <div
            v-for="corr in result.breakdown?.corrections_kg_ha ?? []"
            :key="corr.label"
            class="flex justify-between py-0.5"
          >
            <span class="text-gray-600">{{ corr.label }}</span>
            <span>{{ formatSigned(corr.value_kg_ha) }} {{ result.unit }}</span>
          </div>
          <div v-if="result.breakdown" class="mt-1 flex justify-between border-t border-gray-300 pt-1 font-semibold">
            <span>Empfehlung</span>
            <span>{{ formatValue(result.value_kg_ha) }} {{ result.unit }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { NutrientResult } from '@/types'
import NumberDisplay from './NumberDisplay.vue'

defineProps<{
  results: NutrientResult[]
}>()

const expandedCode = ref<string | null>(null)

function toggleBreakdown(result: NutrientResult) {
  if (expandedCode.value === result.nutrient_code) {
    expandedCode.value = null
    return
  }
  if (!result.breakdown) {
    expandedCode.value = null
    return
  }
  expandedCode.value = result.nutrient_code
}

function formatValue(value: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(value)
}

function formatSigned(value: number): string {
  const prefix = value > 0 ? '+' : ''
  return prefix + new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(value)
}
</script>
