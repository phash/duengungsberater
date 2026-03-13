<template>
  <form class="space-y-4" @submit.prevent="onSave">
    <div>
      <label class="mb-1 block text-sm font-medium text-gray-700">Label</label>
      <input
        v-model="labelDe"
        data-testid="admin-correction-label-input"
        type="text"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label class="mb-1 block text-sm font-medium text-gray-700">Typ</label>
      <select
        v-model="type"
        data-testid="admin-correction-type-select"
        required
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="vorfrucht">Vorfrucht</option>
        <option value="zwischenfrucht">Zwischenfrucht</option>
        <option value="humus">Humus</option>
      </select>
    </div>

    <div>
      <label class="mb-1 block text-sm font-medium text-gray-700">Sortierung</label>
      <input
        v-model.number="sortOrder"
        type="number"
        min="0"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
    </div>

    <!-- Dynamic nutrient value rows -->
    <div>
      <label class="mb-1 block text-sm font-medium text-gray-700">Nährstoff-Abschläge</label>
      <div class="space-y-2">
        <div
          v-for="(row, index) in nutrientRows"
          :key="index"
          :data-testid="`admin-correction-nutrient-row-${index}`"
          class="flex items-center gap-2"
        >
          <select
            v-model="row.nutrient_type_id"
            required
            class="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="" disabled>Nährstoff…</option>
            <option v-for="nt in nutrientTypes" :key="nt.id" :value="nt.id">{{ nt.code }}</option>
          </select>
          <input
            v-model.number="row.value_kg_ha"
            type="number"
            step="any"
            required
            placeholder="kg/ha"
            class="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            class="rounded px-2 py-1 text-red-500 hover:bg-red-50"
            @click="nutrientRows.splice(index, 1)"
          >
            ✕
          </button>
        </div>
      </div>
      <button
        type="button"
        data-testid="admin-correction-add-nutrient-button"
        class="mt-2 text-sm text-green-700 hover:text-green-900"
        @click="nutrientRows.push({ nutrient_type_id: '', value_kg_ha: 0 })"
      >
        + Nährstoff hinzufügen
      </button>
    </div>

    <p v-if="formError" data-testid="admin-correction-error" class="text-sm text-red-600">
      {{ formError }}
    </p>

    <button
      data-testid="admin-correction-speichern-button"
      type="submit"
      class="w-full rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
    >
      Speichern
    </button>

    <!-- Delete (only for existing) -->
    <template v-if="correction">
      <button
        v-if="!confirmDelete"
        data-testid="admin-correction-loeschen-button"
        type="button"
        class="w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        @click="confirmDelete = true"
      >
        Löschen
      </button>
      <button
        v-else
        data-testid="admin-correction-loeschen-confirm-button"
        type="button"
        class="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        @click="$emit('delete')"
      >
        Wirklich löschen?
      </button>
    </template>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Correction, CorrectionValue, NutrientType } from '@/types'

const props = defineProps<{
  nutrientTypes: NutrientType[]
  correction?: Correction
  correctionValues?: CorrectionValue[]
}>()

const emit = defineEmits<{
  save: [
    data: {
      correction: Omit<Correction, 'id'>
      values: { nutrient_type_id: string; value_kg_ha: number }[]
    },
  ]
  delete: []
}>()

const labelDe = ref(props.correction?.label_de ?? '')
const type = ref<Correction['type']>(props.correction?.type ?? 'vorfrucht')
const sortOrder = ref(props.correction?.sort_order ?? 0)
const nutrientRows = ref<{ nutrient_type_id: string; value_kg_ha: number }[]>(
  props.correctionValues?.map((v) => ({
    nutrient_type_id: v.nutrient_type_id,
    value_kg_ha: v.value_kg_ha,
  })) ?? [],
)
const confirmDelete = ref(false)
const formError = ref('')

function onSave() {
  const validValues = nutrientRows.value.filter((r) => r.nutrient_type_id)
  if (validValues.length === 0) {
    formError.value = 'Mindestens eine Nährstoffzeile muss angegeben werden'
    return
  }
  formError.value = ''
  emit('save', {
    correction: {
      type: type.value,
      label_de: labelDe.value,
      sort_order: sortOrder.value,
    },
    values: validValues,
  })
}
</script>
