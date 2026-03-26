<template>
  <form class="space-y-4" @submit.prevent="handleSave">
    <div>
      <label for="field-name" class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">Feldname</label>
      <input
        id="field-name"
        v-model="name"
        type="text"
        data-testid="feld-name-input"
        class="w-full rounded-xl border border-stone-200 bg-parchment px-4 py-2.5 text-stone-900 transition-all duration-200 focus:border-field-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-field-500/20"
        :class="{ 'border-red-400!': nameError }"
      />
      <p v-if="nameError" data-testid="feld-name-error" class="mt-1.5 text-sm text-red-600">
        {{ nameError }}
      </p>
    </div>

    <div>
      <label for="field-size" class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">Größe (ha)</label>
      <input
        id="field-size"
        v-model.number="sizeHa"
        type="number"
        step="0.01"
        min="0"
        data-testid="feld-size-input"
        class="w-full rounded-xl border border-stone-200 bg-parchment px-4 py-2.5 text-stone-900 transition-all duration-200 focus:border-field-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-field-500/20"
        :class="{ 'border-red-400!': sizeError }"
      />
      <p v-if="sizeError" data-testid="feld-size-error" class="mt-1.5 text-sm text-red-600">
        {{ sizeError }}
      </p>
    </div>

    <!-- Nmin Section -->
    <div data-testid="nmin-section">
      <button
        type="button"
        data-testid="nmin-toggle"
        class="flex w-full items-center justify-between rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-600 transition-colors hover:bg-parchment"
        @click="nminExpanded = !nminExpanded"
      >
        <span>Nmin-Bodenprobe (optional)</span>
        <svg
          class="h-4 w-4 text-stone-400 transition-transform duration-200"
          :class="{ 'rotate-180': nminExpanded }"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div v-if="nminExpanded" class="mt-2 space-y-3 rounded-xl border border-stone-200 p-4">
        <div class="flex items-center gap-2">
          <button
            type="button"
            data-testid="nmin-mode-toggle"
            class="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
            :class="nminMode === 'layers'
              ? 'bg-field-100 text-field-700'
              : 'bg-stone-100 text-stone-600'"
            @click="nminMode = nminMode === 'layers' ? 'total' : 'layers'"
          >
            {{ nminMode === 'layers' ? 'Tiefenschichten' : 'Gesamtwert' }}
          </button>
        </div>

        <template v-if="nminMode === 'layers'">
          <div>
            <label class="mb-1 block text-sm text-stone-600">0-30 cm (kg N/ha)</label>
            <input
              v-model.number="nmin030"
              type="number"
              min="0"
              step="1"
              data-testid="nmin-0-30-input"
              class="w-full rounded-xl border border-stone-200 bg-parchment px-4 py-2.5 text-stone-900 transition-all duration-200 focus:border-field-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-field-500/20"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm text-stone-600">30-60 cm (kg N/ha)</label>
            <input
              v-model.number="nmin3060"
              type="number"
              min="0"
              step="1"
              data-testid="nmin-30-60-input"
              class="w-full rounded-xl border border-stone-200 bg-parchment px-4 py-2.5 text-stone-900 transition-all duration-200 focus:border-field-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-field-500/20"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm text-stone-600">60-90 cm (kg N/ha)</label>
            <input
              v-model.number="nmin6090"
              type="number"
              min="0"
              step="1"
              data-testid="nmin-60-90-input"
              class="w-full rounded-xl border border-stone-200 bg-parchment px-4 py-2.5 text-stone-900 transition-all duration-200 focus:border-field-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-field-500/20"
            />
          </div>
        </template>

        <template v-else>
          <div>
            <label class="mb-1 block text-sm text-stone-600">Gesamt-Nmin (kg N/ha)</label>
            <input
              v-model.number="nminGesamt"
              type="number"
              min="0"
              step="1"
              data-testid="nmin-gesamt-input"
              class="w-full rounded-xl border border-stone-200 bg-parchment px-4 py-2.5 text-stone-900 transition-all duration-200 focus:border-field-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-field-500/20"
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
      class="w-full rounded-xl bg-field-600 px-4 py-3 font-semibold text-white shadow-lg shadow-field-600/20 transition-all duration-200 hover:bg-field-700 active:scale-[0.98]"
    >
      Speichern
    </button>

    <div v-if="field" class="border-t border-stone-200 pt-4">
      <button
        v-if="!confirmDelete"
        type="button"
        data-testid="feld-loeschen-button"
        class="w-full rounded-xl border border-red-200 px-4 py-2.5 text-red-600 font-medium transition-colors hover:bg-red-50"
        @click="confirmDelete = true"
      >
        Feld löschen
      </button>
      <div v-else class="space-y-2">
        <p class="text-sm text-red-600">Feld wirklich löschen? Alle Planungen gehen verloren.</p>
        <button
          type="button"
          data-testid="feld-loeschen-confirm-button"
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
import { ref, watch } from 'vue'
import { useNutrientCalculation } from '@/composables/useNutrientCalculation'
import type { Field } from '@/types'

const { splitNminToLayers } = useNutrientCalculation()

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
        const layers = splitNminToLayers(nminGesamt.value)
        finalNmin030 = layers.nmin_0_30
        finalNmin3060 = layers.nmin_30_60
        finalNmin6090 = layers.nmin_60_90
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
