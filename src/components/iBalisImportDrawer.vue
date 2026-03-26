<template>
  <DrawerModal title="iBalis importieren" :open="open" @close="$emit('close')">
    <div class="space-y-4">
      <!-- Datei-Auswahl -->
      <div v-if="parsedFeatures.length === 0">
        <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">iBalis-Datei wählen (.zip oder .gpkg)</label>
        <input
          ref="fileInput"
          type="file"
          accept=".zip,.gpkg"
          data-testid="ibalis-file-input"
          class="block w-full text-sm text-stone-500 file:mr-3 file:rounded-xl file:border-0 file:bg-field-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-field-600 hover:file:bg-field-100"
          @change="onFileChange"
        />
        <p v-if="parseError" data-testid="ibalis-parse-error" class="mt-2 text-sm text-red-600">
          {{ parseError }}
        </p>
        <p v-if="parsing" class="mt-2 text-sm text-stone-500">Datei wird gelesen…</p>
      </div>

      <!-- Vorschauliste -->
      <div v-if="parsedFeatures.length > 0" class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-sm text-stone-500">{{ parsedFeatures.length }} Felder gefunden:</p>
          <button
            v-if="importableCount > 0"
            data-testid="ibalis-alle-uebernehmen-button"
            class="rounded-xl bg-field-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-field-700 hover:shadow-md active:scale-95 disabled:opacity-50"
            :disabled="importingAll"
            @click="alleUebernehmen"
          >
            {{ importingAll ? 'Wird importiert…' : `Alle übernehmen (${importableCount})` }}
          </button>
        </div>

        <div
          v-for="(feature, index) in parsedFeatures"
          :key="index"
          :data-testid="`ibalis-feature-row-${index}`"
          class="flex items-center justify-between rounded-xl border border-stone-200 bg-parchment px-3 py-2"
        >
          <div>
            <p class="text-sm font-medium text-stone-800">{{ feature.name }}</p>
            <p class="text-xs text-stone-500">{{ formatArea(feature.area_ha) }} ha</p>
          </div>
          <div>
            <button
              v-if="!feature.imported && !feature.alreadyExists"
              :data-testid="`ibalis-uebernehmen-button-${index}`"
              class="rounded-xl bg-field-100 px-3 py-1 text-xs font-medium text-field-700 hover:bg-field-200 disabled:opacity-50"
              :disabled="feature.saving"
              @click="uebernehmen(index)"
            >
              {{ feature.saving ? '…' : 'Übernehmen' }}
            </button>
            <span
              v-else-if="feature.alreadyExists"
              :data-testid="`ibalis-bereits-vorhanden-${index}`"
              class="text-xs text-stone-400"
            >
              bereits vorhanden
            </span>
            <span
              v-else
              :data-testid="`ibalis-uebernommen-badge-${index}`"
              class="text-xs font-medium text-field-600"
            >
              ✓ Übernommen
            </span>
          </div>
        </div>
        <p
          v-for="(feature, index) in parsedFeatures"
          v-show="feature.error"
          :key="`err-${index}`"
          :data-testid="`ibalis-feature-error-${index}`"
          class="text-xs text-red-600"
        >
          Fehler beim Speichern von „{{ feature.name }}"
        </p>

        <button
          data-testid="ibalis-andere-datei-button"
          class="mt-2 text-sm text-stone-400 hover:text-stone-600"
          @click="reset"
        >
          Andere Datei wählen
        </button>
      </div>
    </div>
  </DrawerModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Polygon, MultiPolygon } from 'geojson'
import DrawerModal from './DrawerModal.vue'
import { parseZip, parseGpkg } from '@/composables/useIBalisImport'
import { createField } from '@/services/field.service'
import { createFieldGeometry } from '@/services/field-geometry.service'
import { useNumberFormat } from '@/composables/useNumberFormat'
import type { Field } from '@/types'

const props = defineProps<{
  open: boolean
  userId: string
  existingFields: Field[]
}>()

const emit = defineEmits<{
  close: []
  imported: []
}>()

interface ImportFeature {
  name: string
  area_ha: number
  geometry: Polygon | MultiPolygon
  alreadyExists: boolean
  imported: boolean
  saving: boolean
  error: boolean
}

const fileInput = ref<HTMLInputElement | null>(null)
const parsedFeatures = ref<ImportFeature[]>([])
const parseError = ref('')
const parsing = ref(false)
const importingAll = ref(false)

const existingNames = computed(
  () => new Set(props.existingFields.map((f) => f.name.trim().toLowerCase())),
)

const { formatArea } = useNumberFormat()

const importableCount = computed(
  () => parsedFeatures.value.filter((f) => !f.imported && !f.alreadyExists).length,
)

async function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  parseError.value = ''
  parsing.value = true

  try {
    const features = file.name.toLowerCase().endsWith('.gpkg')
      ? await parseGpkg(file)
      : await parseZip(file)
    parsedFeatures.value = features.map((f) => ({
      ...f,
      alreadyExists: existingNames.value.has(f.name.trim().toLowerCase()),
      imported: false,
      saving: false,
      error: false,
    }))
  } catch (e) {
    parseError.value = 'Datei konnte nicht gelesen werden. Bitte eine gültige iBalis ZIP- oder GPKG-Datei wählen.'
    console.error('iBalis parse error:', e)
  } finally {
    parsing.value = false
  }
}

async function uebernehmen(index: number) {
  const feature = parsedFeatures.value[index]
  if (!feature) return
  feature.saving = true
  feature.error = false

  try {
    const newField = await createField({
      name: feature.name,
      size_ha: feature.area_ha,
      nmin_0_30: null,
      nmin_30_60: null,
      nmin_60_90: null,
      user_id: props.userId,
    })

    await createFieldGeometry({
      field_id: newField.id,
      user_id: props.userId,
      geometry: feature.geometry,
      source: 'ibalis',
    })

    feature.imported = true
    emit('imported')
  } catch (e) {
    feature.error = true
    console.error('iBalis uebernehmen error:', e)
  } finally {
    feature.saving = false
  }
}

async function alleUebernehmen() {
  importingAll.value = true
  for (let i = 0; i < parsedFeatures.value.length; i++) {
    const f = parsedFeatures.value[i]
    if (f && !f.imported && !f.alreadyExists && !f.error) {
      await uebernehmen(i)
    }
  }
  importingAll.value = false
}

function reset() {
  parsedFeatures.value = []
  parseError.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>
