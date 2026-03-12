<template>
  <div>
    <div v-if="corrections.length === 0" class="py-4 text-center text-sm text-gray-400">
      Keine Korrekturen vorhanden
    </div>

    <template v-for="group in groups" :key="group.type">
      <h4 class="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{{ group.label }}</h4>
      <div class="space-y-1">
        <button
          v-for="c in group.items"
          :key="c.id"
          :data-testid="`admin-correction-item-${c.id}`"
          class="flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-left text-sm hover:bg-gray-100"
          @click="$emit('select', c.id)"
        >
          <span class="font-medium">{{ c.label_de }}</span>
          <span class="text-xs text-gray-500">{{ valuePreview(c.id) }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Correction, CorrectionValue, NutrientType } from '@/types'

const props = defineProps<{
  corrections: Correction[]
  correctionValues: CorrectionValue[]
  nutrientTypes: NutrientType[]
}>()

defineEmits<{
  select: [id: string]
}>()

const TYPE_LABELS: Record<string, string> = {
  vorfrucht: 'Vorfrucht',
  zwischenfrucht: 'Zwischenfrucht',
  humus: 'Humus',
}

const groups = computed(() => {
  const types = ['vorfrucht', 'zwischenfrucht', 'humus'] as const
  return types
    .map(type => ({
      type,
      label: TYPE_LABELS[type],
      items: props.corrections
        .filter(c => c.type === type)
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
    .filter(g => g.items.length > 0)
})

function valuePreview(correctionId: string): string {
  const vals = props.correctionValues.filter(v => v.correction_id === correctionId)
  if (vals.length === 0) return ''
  return vals
    .map(v => {
      const nt = props.nutrientTypes.find(n => n.id === v.nutrient_type_id)
      const code = nt?.code ?? '?'
      return `${code}: ${v.value_kg_ha > 0 ? '+' : ''}${v.value_kg_ha} kg/ha`
    })
    .join(', ')
}
</script>
