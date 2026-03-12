<template>
  <form class="space-y-4" @submit.prevent="handleSave">
    <div>
      <label class="block text-sm font-medium text-gray-700">Kultur</label>
      <select
        v-model="cropId"
        required
        data-testid="admin-nutrient-crop-select"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
      >
        <option value="">— wählen —</option>
        <option v-for="crop in crops" :key="crop.id" :value="crop.id">{{ crop.name_de }}</option>
      </select>
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700">Nährstoff</label>
      <select
        v-model="nutrientTypeId"
        required
        data-testid="admin-nutrient-type-select"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
      >
        <option value="">— wählen —</option>
        <option v-for="nt in nutrientTypes" :key="nt.id" :value="nt.id">
          {{ nt.code }} ({{ nt.label_de }})
        </option>
      </select>
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700">Bedarf (kg/ha)</label>
      <input
        v-model.number="demandKgHa"
        type="number"
        step="0.1"
        min="0.1"
        required
        data-testid="admin-nutrient-demand-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700">Referenzertrag (dt/ha)</label>
      <input
        v-model.number="refYield"
        type="number"
        step="0.1"
        required
        data-testid="admin-nutrient-ref-yield-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700">Korrektur pro dt</label>
      <input
        v-model.number="correction"
        type="number"
        step="0.01"
        required
        data-testid="admin-nutrient-correction-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
      />
    </div>
    <button
      type="submit"
      data-testid="admin-nutrient-speichern-button"
      class="w-full rounded-lg bg-green-700 px-4 py-2 text-white font-medium hover:bg-green-800"
    >
      Speichern
    </button>
    <div v-if="demand" class="border-t border-gray-200 pt-4">
      <button
        v-if="!confirmDelete"
        type="button"
        data-testid="admin-nutrient-loeschen-button"
        class="w-full rounded-lg border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
        @click="confirmDelete = true"
      >
        Nährstoffwert löschen
      </button>
      <div v-else class="space-y-2">
        <p class="text-sm text-red-600">Nährstoffwert wirklich löschen?</p>
        <button
          type="button"
          data-testid="admin-nutrient-loeschen-confirm-button"
          class="w-full rounded-lg bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700"
          @click="$emit('delete')"
        >
          Endgültig löschen
        </button>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Crop, NutrientType, CropNutrientDemand } from '@/types'

const props = defineProps<{
  crops: Crop[]
  nutrientTypes: NutrientType[]
  demand?: CropNutrientDemand
}>()
const emit = defineEmits<{ save: [data: Omit<CropNutrientDemand, 'id'>]; delete: [] }>()

const cropId = ref(props.demand?.crop_id ?? '')
const nutrientTypeId = ref(props.demand?.nutrient_type_id ?? '')
const demandKgHa = ref(props.demand?.demand_kg_ha ?? 0)
const refYield = ref(props.demand?.ref_yield_dt_ha ?? 0)
const correction = ref(props.demand?.per_yield_correction ?? 0)
const confirmDelete = ref(false)

function handleSave() {
  emit('save', {
    crop_id: cropId.value,
    nutrient_type_id: nutrientTypeId.value,
    demand_kg_ha: Number(demandKgHa.value),
    ref_yield_dt_ha: Number(refYield.value),
    per_yield_correction: Number(correction.value),
    source: 'lfl',
    user_id: null,
    valid_from: new Date().toISOString().split('T')[0] ?? '',
  })
}
</script>
