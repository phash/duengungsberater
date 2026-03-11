<template>
  <span data-testid="number-display">{{ formatted }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNumberFormat } from '@/composables/useNumberFormat'

const props = defineProps<{
  value: number
  format: 'area' | 'nutrient-per-ha' | 'nutrient-total' | 'yield' | 'percent'
  code?: string
}>()

const { formatArea, formatNutrientPerHa, formatNutrientTotal, formatYield, formatNumber } = useNumberFormat()

const formatted = computed(() => {
  switch (props.format) {
    case 'area':
      return formatArea(props.value)
    case 'nutrient-per-ha':
      return formatNutrientPerHa(props.value, props.code ?? '')
    case 'nutrient-total':
      return formatNutrientTotal(props.value, props.code ?? '')
    case 'yield':
      return formatYield(props.value)
    case 'percent':
      return `${formatNumber(props.value)} %`
  }
})
</script>
