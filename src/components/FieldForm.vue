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

    <!-- Nmin Section -->
    <div data-testid="nmin-section">
      <button
        type="button"
        data-testid="nmin-toggle"
        class="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        @click="nminExpanded = !nminExpanded"
      >
        <span>Nmin-Bodenprobe (optional)</span>
        <span class="text-xs">{{ nminExpanded ? '▲' : '▼' }}</span>
      </button>

      <div v-if="nminExpanded" class="mt-2 space-y-3 rounded-lg border border-gray-200 p-3">
        <div class="flex items-center gap-2">
          <button
            type="button"
            data-testid="nmin-mode-toggle"
            class="text-xs rounded-full px-3 py-1"
            :class="
              nminMode === 'layers' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            "
            @click="nminMode = nminMode === 'layers' ? 'total' : 'layers'"
          >
            {{ nminMode === 'layers' ? 'Tiefenschichten' : 'Gesamtwert' }}
          </button>
        </div>

        <template v-if="nminMode === 'layers'">
          <div>
            <label class="block text-sm text-gray-600">0-30 cm (kg N/ha)</label>
            <input
              v-model.number="nmin030"
              type="number"
              min="0"
              step="1"
              data-testid="nmin-0-30-input"
              class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-600">30-60 cm (kg N/ha)</label>
            <input
              v-model.number="nmin3060"
              type="number"
              min="0"
              step="1"
              data-testid="nmin-30-60-input"
              class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-600">60-90 cm (kg N/ha)</label>
            <input
              v-model.number="nmin6090"
              type="number"
              min="0"
              step="1"
              data-testid="nmin-60-90-input"
              class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
            />
          </div>
        </template>

        <template v-else>
          <div>
            <label class="block text-sm text-gray-600">Gesamt-Nmin (kg N/ha)</label>
            <input
              v-model.number="nminGesamt"
              type="number"
              min="0"
              step="1"
              data-testid="nmin-gesamt-input"
              class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-green-500"
            />
          </div>
        </template>

        <p v-if="nminError" data-testid="nmin-validation-error" class="text-sm text-red-600">
          {{ nminError }}
        </p>
      </div>
    </div>

    <button
      type="submit"
      data-testid="feld-speichern-button"
      class="w-full rounded-lg bg-green-700 px-4 py-2 text-white font-medium hover:bg-green-800"
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
import { ref, watch } from 'vue'
import type { Field } from '@/types'

const props = defineProps<{
  field?: Field
}>()

const emit = defineEmits<{
  save: [
    data: {
      name: string
      size_ha: number
      nmin_0_30: number | null
      nmin_30_60: number | null
      nmin_60_90: number | null
    },
  ]
  delete: []
}>()

const name = ref(props.field?.name ?? '')
const sizeHa = ref(props.field?.size_ha ?? 0)
const nameError = ref('')
const sizeError = ref('')
const confirmDelete = ref(false)

const nminExpanded = ref(
  props.field?.nmin_0_30 != null ||
    props.field?.nmin_30_60 != null ||
    props.field?.nmin_60_90 != null,
)
const nminMode = ref<'layers' | 'total'>('layers')
const nmin030 = ref<number | null>(props.field?.nmin_0_30 ?? null)
const nmin3060 = ref<number | null>(props.field?.nmin_30_60 ?? null)
const nmin6090 = ref<number | null>(props.field?.nmin_60_90 ?? null)
const nminGesamt = ref<number | null>(
  props.field?.nmin_0_30 != null ||
    props.field?.nmin_30_60 != null ||
    props.field?.nmin_60_90 != null
    ? (props.field?.nmin_0_30 ?? 0) +
        (props.field?.nmin_30_60 ?? 0) +
        (props.field?.nmin_60_90 ?? 0)
    : null,
)
const nminError = ref('')

watch(nminMode, (newMode) => {
  if (newMode === 'total') {
    const sum = (nmin030.value ?? 0) + (nmin3060.value ?? 0) + (nmin6090.value ?? 0)
    nminGesamt.value = sum > 0 ? sum : null
  }
})

function sanitizeNmin(v: unknown): number | null {
  if (v === '' || v == null) return null
  return Number(v)
}

function handleSave() {
  nameError.value = ''
  sizeError.value = ''
  nminError.value = ''

  if (!name.value.trim()) {
    nameError.value = 'Feldname ist erforderlich.'
    return
  }
  if (!sizeHa.value || sizeHa.value <= 0) {
    sizeError.value = 'Größe muss größer als 0 sein.'
    return
  }

  // Nmin validation + compute final values
  let finalNmin030: number | null = null
  let finalNmin3060: number | null = null
  let finalNmin6090: number | null = null

  if (nminExpanded.value) {
    if (nminMode.value === 'total') {
      if (nminGesamt.value != null) {
        if (nminGesamt.value < 0) {
          nminError.value = 'Nmin-Wert darf nicht negativ sein.'
          return
        }
        if (nminGesamt.value > 999) {
          nminError.value = 'Nmin-Wert darf nicht über 999 kg N/ha liegen.'
          return
        }
        const base = Math.floor(nminGesamt.value / 3)
        const rest = nminGesamt.value - 2 * base
        finalNmin030 = rest
        finalNmin3060 = base
        finalNmin6090 = base
      }
    } else {
      // Layers mode
      const layers = [
        sanitizeNmin(nmin030.value),
        sanitizeNmin(nmin3060.value),
        sanitizeNmin(nmin6090.value),
      ]
      for (const v of layers) {
        if (v != null && v < 0) {
          nminError.value = 'Nmin-Wert darf nicht negativ sein.'
          return
        }
        if (v != null && v > 999) {
          nminError.value = 'Nmin-Wert darf nicht über 999 kg N/ha liegen.'
          return
        }
      }
      finalNmin030 = sanitizeNmin(nmin030.value)
      finalNmin3060 = sanitizeNmin(nmin3060.value)
      finalNmin6090 = sanitizeNmin(nmin6090.value)
    }
  }

  emit('save', {
    name: name.value.trim(),
    size_ha: sizeHa.value,
    nmin_0_30: finalNmin030,
    nmin_30_60: finalNmin3060,
    nmin_60_90: finalNmin6090,
  })
}
</script>
