<template>
  <form class="space-y-4" @submit.prevent="handleSave">
    <div>
      <label class="block text-sm font-medium text-gray-700">Kulturname (deutsch)</label>
      <input v-model="nameDe" type="text" required data-testid="admin-crop-name-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700">Kategorie</label>
      <input v-model="category" type="text" required data-testid="admin-crop-category-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Aussaat von (Monat)</label>
        <input v-model.number="sowFrom" type="number" min="1" max="12" data-testid="admin-crop-sow-from-input"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Aussaat bis (Monat)</label>
        <input v-model.number="sowTo" type="number" min="1" max="12" data-testid="admin-crop-sow-to-input"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Ernte von (Monat)</label>
        <input v-model.number="harvestFrom" type="number" min="1" max="12" data-testid="admin-crop-harvest-from-input"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Ernte bis (Monat)</label>
        <input v-model.number="harvestTo" type="number" min="1" max="12" data-testid="admin-crop-harvest-to-input"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Referenzertrag (dt/ha)</label>
        <input v-model.number="refYield" type="number" step="0.1" min="0" data-testid="admin-crop-ref-yield-input"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Nmin-Tiefe (cm)</label>
        <select v-model.number="nminDepth" data-testid="admin-crop-nmin-depth-select"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2">
          <option :value="0">0 (keine)</option>
          <option :value="60">60</option>
          <option :value="90">90</option>
        </select>
      </div>
    </div>
    <button type="submit" data-testid="admin-crop-speichern-button"
      class="w-full rounded-lg bg-green-700 px-4 py-2 text-white font-medium hover:bg-green-800">
      Speichern
    </button>
    <button v-if="crop" type="button" data-testid="admin-crop-loeschen-button"
      class="w-full rounded-lg border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
      @click="$emit('delete')">
      Kultur löschen
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Crop } from '@/types'

const props = defineProps<{ crop?: Crop }>()
const emit = defineEmits<{ save: [data: Omit<Crop, 'id'>]; delete: [] }>()

const nameDe = ref(props.crop?.name_de ?? '')
const category = ref(props.crop?.category ?? '')
const sowFrom = ref(props.crop?.sow_month_from ?? 1)
const sowTo = ref(props.crop?.sow_month_to ?? 1)
const harvestFrom = ref(props.crop?.harvest_month_from ?? 1)
const harvestTo = ref(props.crop?.harvest_month_to ?? 1)
const refYield = ref(props.crop?.ref_yield_dt_ha ?? 0)
const nminDepth = ref(props.crop?.nmin_depth_cm ?? 90)

function handleSave() {
  emit('save', {
    name_de: nameDe.value,
    category: category.value,
    sow_month_from: Number(sowFrom.value),
    sow_month_to: Number(sowTo.value),
    harvest_month_from: Number(harvestFrom.value),
    harvest_month_to: Number(harvestTo.value),
    ref_yield_dt_ha: Number(refYield.value),
    nmin_depth_cm: Number(nminDepth.value),
  })
}
</script>
