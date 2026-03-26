<template>
  <div v-if="results.length > 0" data-testid="recommendation-card" class="rounded-2xl bg-white p-5 shadow-warm-sm">
    <h3 class="mb-4 font-display text-base font-semibold text-stone-800">Nährstoffbedarf</h3>
    <div class="space-y-2">
      <div v-for="result in results" :key="result.nutrient_code">
        <div
          :data-testid="`nutrient-row-${result.nutrient_code}`"
          class="flex items-center justify-between rounded-xl px-3.5 py-2.5 transition-colors"
          :class="[
            result.breakdown ? 'cursor-pointer hover:bg-parchment-dark' : '',
            expandedCode === result.nutrient_code ? 'bg-parchment-dark' : 'bg-parchment'
          ]"
          @click="toggleBreakdown(result)"
        >
          <div class="flex items-center gap-2.5">
            <span class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-field-100 text-xs font-bold text-field-700">
              {{ result.nutrient_code }}
            </span>
            <span class="text-sm text-stone-500">{{ result.nutrient_label }}</span>
          </div>
          <div class="text-right">
            <NumberDisplay
              :value="result.value_kg_ha"
              format="nutrient-per-ha"
              :code="result.nutrient_code"
            />
            <p class="text-xs text-stone-400">
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
          class="ml-4 mt-1.5 rounded-xl bg-stone-100 px-4 py-3 text-sm animate-fade-in-up"
        >
          <div v-if="result.breakdown" class="flex justify-between py-0.5 text-stone-600">
            <span>Grundbedarf</span>
            <span class="font-medium text-stone-800">{{ formatValue(result.breakdown.base_demand_kg_ha) }} {{ result.unit }}</span>
          </div>
          <div
            v-if="result.breakdown && result.breakdown.yield_correction_kg_ha !== 0"
            class="flex justify-between py-0.5 text-stone-600"
          >
            <span>Ertragskorrektur</span>
            <span class="font-medium text-stone-800">{{ formatSigned(result.breakdown.yield_correction_kg_ha) }} {{ result.unit }}</span>
          </div>
          <div
            v-for="corr in result.breakdown?.corrections_kg_ha ?? []"
            :key="corr.label"
            class="flex justify-between py-0.5 text-stone-600"
          >
            <span>{{ corr.label }}</span>
            <span class="font-medium text-stone-800">{{ formatSigned(corr.value_kg_ha) }} {{ result.unit }}</span>
          </div>
          <div v-if="result.breakdown" class="mt-2 flex justify-between border-t border-stone-300 pt-2 font-semibold text-field-700">
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
import { useNumberFormat } from '@/composables/useNumberFormat'

defineProps<{
  results: NutrientResult[]
}>()

const { formatValue, formatSigned } = useNumberFormat()
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
</script>
