<template>
  <form class="space-y-4" @submit.prevent="handleSave">
    <div>
      <label for="field-name" class="block text-sm font-medium text-gray-700">Feldname</label>
      <input
        id="field-name"
        v-model="name"
        type="text"
        data-testid="feld-name-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
        :class="{ 'border-red-500': nameError }"
      />
      <p v-if="nameError" data-testid="feld-name-error" class="mt-1 text-sm text-red-600">
        {{ nameError }}
      </p>
    </div>

    <div>
      <label for="field-size" class="block text-sm font-medium text-gray-700">Größe (ha)</label>
      <input
        id="field-size"
        v-model.number="sizeHa"
        type="number"
        step="0.01"
        min="0"
        data-testid="feld-size-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
        :class="{ 'border-red-500': sizeError }"
      />
      <p v-if="sizeError" data-testid="feld-size-error" class="mt-1 text-sm text-red-600">
        {{ sizeError }}
      </p>
    </div>

    <button
      type="submit"
      data-testid="feld-speichern-button"
      class="w-full rounded-lg bg-green-700 px-4 py-2 text-white font-medium hover:bg-green-800"
      @click.prevent="handleSave"
    >
      Speichern
    </button>

    <div v-if="field" class="border-t border-gray-200 pt-4">
      <button
        v-if="!confirmDelete"
        type="button"
        data-testid="feld-loeschen-button"
        class="w-full rounded-lg border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
        @click="confirmDelete = true"
      >
        Feld löschen
      </button>
      <div v-else class="space-y-2">
        <p class="text-sm text-red-600">Feld wirklich löschen? Alle Planungen gehen verloren.</p>
        <button
          type="button"
          data-testid="feld-loeschen-confirm-button"
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
import type { Field } from '@/types'

const props = defineProps<{
  field?: Field
}>()

const emit = defineEmits<{
  save: [data: { name: string; size_ha: number }]
  delete: []
}>()

const name = ref(props.field?.name ?? '')
const sizeHa = ref(props.field?.size_ha ?? 0)
const nameError = ref('')
const sizeError = ref('')
const confirmDelete = ref(false)

function handleSave() {
  nameError.value = ''
  sizeError.value = ''

  if (!name.value.trim()) {
    nameError.value = 'Feldname ist erforderlich.'
    return
  }
  if (!sizeHa.value || sizeHa.value <= 0) {
    sizeError.value = 'Größe muss größer als 0 sein.'
    return
  }

  emit('save', { name: name.value.trim(), size_ha: sizeHa.value })
}
</script>
