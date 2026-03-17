<template>
  <form class="space-y-4" @submit.prevent="handleSave">
    <div>
      <label for="plan-crop" class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">Kultur</label>
      <select
        id="plan-crop"
        v-model="cropId"
        data-testid="plan-crop-select"
        class="w-full rounded-xl border border-stone-200 bg-parchment px-4 py-2.5 text-stone-900 transition-all duration-200 focus:border-field-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-field-500/20"
        :class="{ 'border-red-400!': cropError }"
        @change="onCropChange"
      >
        <option value="">— Kultur wählen —</option>
        <option v-for="crop in crops" :key="crop.id" :value="crop.id">
          {{ crop.name_de }} ({{ crop.category }})
        </option>
      </select>
      <p v-if="cropError" data-testid="plan-crop-error" class="mt-1.5 text-sm text-red-600">
        {{ cropError }}
      </p>
    </div>

    <div>
      <label for="plan-season" class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">Saison (Jahr)</label>
      <input
        id="plan-season"
        v-model.number="seasonYear"
        type="number"
        min="2020"
        max="2040"
        data-testid="plan-season-input"
        class="w-full rounded-xl border border-stone-200 bg-parchment px-4 py-2.5 text-stone-900 transition-all duration-200 focus:border-field-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-field-500/20"
      />
    </div>

    <div>
      <label for="plan-yield" class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">
        Erwarteter Ertrag (dt/ha)
      </label>
      <input
        id="plan-yield"
        v-model.number="expectedYield"
        type="number"
        step="0.1"
        min="0"
        data-testid="plan-yield-input"
        class="w-full rounded-xl border border-stone-200 bg-parchment px-4 py-2.5 text-stone-900 transition-all duration-200 focus:border-field-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-field-500/20"
      />
      <p v-if="selectedCrop" class="mt-1.5 text-xs text-stone-400">
        Referenzertrag: {{ selectedCrop.ref_yield_dt_ha }} dt/ha
      </p>
    </div>

    <button
      type="submit"
      data-testid="plan-speichern-button"
      class="w-full rounded-xl bg-field-600 px-4 py-3 font-semibold text-white shadow-lg shadow-field-600/20 transition-all duration-200 hover:bg-field-700 active:scale-[0.98]"
    >
      Speichern
    </button>

    <div v-if="plan" class="border-t border-stone-200 pt-4">
      <button
        v-if="!confirmDelete"
        type="button"
        data-testid="plan-loeschen-button"
        class="w-full rounded-xl border border-red-200 px-4 py-2.5 text-red-600 font-medium transition-colors hover:bg-red-50"
        @click="confirmDelete = true"
      >
        Planung löschen
      </button>
      <div v-else class="space-y-2">
        <p class="text-sm text-red-600">Planung wirklich löschen?</p>
        <button
          type="button"
          data-testid="plan-loeschen-confirm-button"
          class="w-full rounded-xl bg-red-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-red-700"
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
