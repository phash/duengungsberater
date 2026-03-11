<template>
  <form class="space-y-4" @submit.prevent="handleSave">
    <div>
      <label for="plan-crop" class="block text-sm font-medium text-gray-700">Kultur</label>
      <select
        id="plan-crop"
        v-model="cropId"
        data-testid="plan-crop-select"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
        :class="{ 'border-red-500': cropError }"
        @change="onCropChange"
      >
        <option value="">— Kultur wählen —</option>
        <option v-for="crop in crops" :key="crop.id" :value="crop.id">
          {{ crop.name_de }} ({{ crop.category }})
        </option>
      </select>
      <p v-if="cropError" data-testid="plan-crop-error" class="mt-1 text-sm text-red-600">
        {{ cropError }}
      </p>
    </div>

    <div>
      <label for="plan-season" class="block text-sm font-medium text-gray-700">Saison (Jahr)</label>
      <input
        id="plan-season"
        v-model.number="seasonYear"
        type="number"
        min="2020"
        max="2040"
        data-testid="plan-season-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
      />
    </div>

    <div>
      <label for="plan-yield" class="block text-sm font-medium text-gray-700">
        Erwarteter Ertrag (dt/ha)
      </label>
      <input
        id="plan-yield"
        v-model.number="expectedYield"
        type="number"
        step="0.1"
        min="0"
        data-testid="plan-yield-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
      />
      <p v-if="selectedCrop" class="mt-1 text-xs text-gray-400">
        Referenzertrag: {{ selectedCrop.ref_yield_dt_ha }} dt/ha
      </p>
    </div>

    <button
      type="submit"
      data-testid="plan-speichern-button"
      class="w-full rounded-lg bg-green-700 px-4 py-2 text-white font-medium hover:bg-green-800"
    >
      Speichern
    </button>

    <div v-if="plan" class="border-t border-gray-200 pt-4">
      <button
        v-if="!confirmDelete"
        type="button"
        data-testid="plan-loeschen-button"
        class="w-full rounded-lg border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
        @click="confirmDelete = true"
      >
        Planung löschen
      </button>
      <div v-else class="space-y-2">
        <p class="text-sm text-red-600">Planung wirklich löschen?</p>
        <button
          type="button"
          data-testid="plan-loeschen-confirm-button"
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
import { ref, computed } from 'vue'
import type { Crop, FieldCropPlan } from '@/types'

const props = defineProps<{
  crops: Crop[]
  plan?: FieldCropPlan
}>()

const emit = defineEmits<{
  save: [data: { crop_id: string; season_year: number; expected_yield_dt_ha: number }]
  delete: []
}>()

const cropId = ref(props.plan?.crop_id ?? '')
const seasonYear = ref(props.plan?.season_year ?? new Date().getFullYear())
const expectedYield = ref(props.plan?.expected_yield_dt_ha ?? 0)
const cropError = ref('')
const confirmDelete = ref(false)

const selectedCrop = computed(() => props.crops.find((c) => c.id === cropId.value))

function onCropChange() {
  const crop = selectedCrop.value
  if (crop && !props.plan) {
    expectedYield.value = crop.ref_yield_dt_ha
  }
}

function handleSave() {
  cropError.value = ''

  if (!cropId.value) {
    cropError.value = 'Bitte eine Kultur wählen.'
    return
  }

  emit('save', {
    crop_id: cropId.value,
    season_year: seasonYear.value,
    expected_yield_dt_ha: expectedYield.value,
  })
}
</script>
