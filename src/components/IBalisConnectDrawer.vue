<template>
  <DrawerModal title="iBalis Agrardatennetzwerk" :open="open" @close="$emit('close')">
    <div class="space-y-5">
      <!-- Schritt 1: Betriebsnummer eingeben -->
      <div v-if="step === 'connect'" class="space-y-4">
        <p class="text-sm text-stone-500">
          Verbinde dich mit dem bayerischen Agrardatennetzwerk und importiere deine
          Feldstücke direkt aus iBalis.
        </p>

        <!-- Betriebsnummer (3 Gruppen) -->
        <div>
          <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">
            Betriebsnummer (BNR15)
          </label>
          <div class="flex items-center gap-1.5">
            <input
              v-model="bnrLand"
              type="text"
              inputmode="numeric"
              maxlength="3"
              placeholder="276"
              data-testid="ibalis-bnr-land-input"
              class="w-16 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-2.5 text-center text-sm font-medium text-stone-500 shadow-warm-xs transition-colors focus:border-field-400 focus:bg-white focus:text-stone-800 focus:outline-none focus:ring-2 focus:ring-field-200"
              @input="onBnrInput('land')"
            />
            <input
              v-model="bnrRegion"
              type="text"
              inputmode="numeric"
              maxlength="2"
              placeholder="09"
              data-testid="ibalis-bnr-region-input"
              class="w-12 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-2.5 text-center text-sm font-medium text-stone-500 shadow-warm-xs transition-colors focus:border-field-400 focus:bg-white focus:text-stone-800 focus:outline-none focus:ring-2 focus:ring-field-200"
              @input="onBnrInput('region')"
            />
            <input
              v-model="bnrBetrieb"
              type="text"
              inputmode="numeric"
              maxlength="10"
              placeholder="0000000000"
              data-testid="ibalis-bnr-betrieb-input"
              class="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 shadow-warm-xs transition-colors focus:border-field-400 focus:outline-none focus:ring-2 focus:ring-field-200"
              @input="onBnrInput('betrieb')"
            />
          </div>
          <p class="mt-1.5 text-xs text-stone-400">
            Deutschland (276) + Bayern (09) + 10-stellige Betriebsnummer.
            Die BNR9 reicht — Land und Region werden automatisch ergänzt.
          </p>
          <p
            v-if="betriebsnummerError"
            data-testid="ibalis-betriebsnummer-error"
            class="mt-1 text-xs text-red-600"
          >
            {{ betriebsnummerError }}
          </p>
        </div>

        <!-- Jahr -->
        <div>
          <label
            for="ibalis-jahr"
            class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500"
          >
            Jahr
          </label>
          <select
            id="ibalis-jahr"
            v-model="jahr"
            data-testid="ibalis-jahr-select"
            class="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 shadow-warm-xs transition-colors focus:border-field-400 focus:outline-none focus:ring-2 focus:ring-field-200"
          >
            <option v-for="y in jahreOptionen" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>

        <!-- Verbinden-Button -->
        <button
          data-testid="ibalis-verbinden-button"
          :disabled="!isFormValid"
          class="w-full rounded-xl bg-field-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-field-700 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          @click="verbinden"
        >
          Mit iBalis verbinden
        </button>

        <p class="text-xs text-stone-400">
          Du wirst zur Anmeldung beim Agrardatennetzwerk weitergeleitet.
        </p>
      </div>

      <!-- Schritt 2: Feldstücke importieren -->
      <div v-else-if="step === 'import'" class="space-y-3">
        <div
          v-if="loading"
          data-testid="ibalis-loading"
          class="py-4 text-center text-sm text-stone-400"
        >
          Feldstücke werden geladen…
        </div>

        <div
          v-else-if="loadError"
          data-testid="ibalis-load-error"
          class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {{ loadError }}
        </div>

        <template v-else-if="feldstuecke.length > 0">
          <div class="flex items-center justify-between">
            <p class="text-sm text-stone-500">{{ feldstuecke.length }} Feldstücke gefunden:</p>
            <button
              v-if="importableCount > 0"
              data-testid="ibalis-alle-uebernehmen-button"
              :disabled="importingAll"
              class="rounded-xl bg-field-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-field-700 hover:shadow-md active:scale-95 disabled:opacity-50"
              @click="alleUebernehmen"
            >
              {{ importingAll ? 'Wird importiert…' : `Alle übernehmen (${importableCount})` }}
            </button>
          </div>

          <div
            v-for="(fs, index) in feldstuecke"
            :key="fs.fsNummer"
            :data-testid="`ibalis-feldstueck-row-${index}`"
            class="flex items-center justify-between rounded-xl border border-stone-200 bg-parchment px-3 py-2"
          >
            <div class="min-w-0 flex-1 pr-3">
              <p class="truncate text-sm font-medium text-stone-800">
                {{ fs.fsName || `Feldstück ${fs.fsNummer}` }}
              </p>
              <p class="text-xs text-stone-500">
                {{ formatArea(fs.flaecheInHektar) }}
                <span v-if="getPrimaryNutzung(fs)" class="ml-1 text-stone-400">
                  &middot; {{ getPrimaryNutzung(fs) }}
                </span>
              </p>
            </div>
            <div class="shrink-0">
              <button
                v-if="!fs._imported && !fs._alreadyExists"
                :data-testid="`ibalis-uebernehmen-button-${index}`"
                :disabled="fs._saving"
                class="rounded-xl bg-field-100 px-3 py-1 text-xs font-medium text-field-700 hover:bg-field-200 disabled:opacity-50"
                @click="uebernehmen(index)"
              >
                {{ fs._saving ? '…' : 'Übernehmen' }}
              </button>
              <span
                v-else-if="fs._alreadyExists"
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
                &#x2713; Übernommen
              </span>
            </div>
          </div>

          <p
            v-for="(fs, index) in feldstuecke"
            v-show="fs._error"
            :key="`err-${fs.fsNummer}`"
            :data-testid="`ibalis-feldstueck-error-${index}`"
            class="text-xs text-red-600"
          >
            Fehler beim Speichern von „{{ fs.fsName || fs.fsNummer }}"
          </p>
        </template>

        <div
          v-else
          data-testid="ibalis-keine-feldstuecke"
          class="py-4 text-center text-sm text-stone-400"
        >
          Keine Feldstücke gefunden.
        </div>
      </div>
    </div>
  </DrawerModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import DrawerModal from './DrawerModal.vue'
import { startIBalisAuth, getIBalisFeldstuecke, wktToGeoJSON } from '@/services/ibalis.service'
import type { IBalisFeldstueck } from '@/services/ibalis.service'
import { createField } from '@/services/field.service'
import { createFieldGeometry } from '@/services/field-geometry.service'
import { useNumberFormat } from '@/composables/useNumberFormat'
import type { Field } from '@/types'

// ─── Props & Emits ────────────────────────────────────────────────────────────

const props = defineProps<{
  open: boolean
  userId: string
  existingFields: Field[]
}>()

const emit = defineEmits<{
  close: []
  imported: []
}>()

// ─── State ────────────────────────────────────────────────────────────────────

type Step = 'connect' | 'import'

const route = useRoute()
const { formatArea } = useNumberFormat()

const step = ref<Step>('connect')
const bnrLand = ref('276')
const bnrRegion = ref('09')
const bnrBetrieb = ref('')
const betriebsnummerError = ref('')

const betriebsnummer = computed(() => bnrLand.value + bnrRegion.value + bnrBetrieb.value)

const currentYear = new Date().getFullYear()
const jahreOptionen = [2024, 2025, 2026, 2027]
const jahr = ref(jahreOptionen.includes(currentYear) ? currentYear : 2026)

// Import state
const loading = ref(false)
const loadError = ref('')
const importingAll = ref(false)

// Feldstuecke mit UI-State-Feldern (reaktiv erweiterter Typ)
interface FeldstueckUI extends IBalisFeldstueck {
  _alreadyExists: boolean
  _imported: boolean
  _saving: boolean
  _error: boolean
}

const feldstuecke = ref<FeldstueckUI[]>([])

// ─── Computed ─────────────────────────────────────────────────────────────────

const existingNames = computed(
  () => new Set(props.existingFields.map((f) => f.name.trim().toLowerCase())),
)

const isFormValid = computed(() => /^\d{15}$/.test(betriebsnummer.value))

const importableCount = computed(
  () => feldstuecke.value.filter((f) => !f._imported && !f._alreadyExists).length,
)

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(() => {
  // Nach OAuth2-Callback: Query-Param "ibalis=connected" prüfen.
  // Session-Token ist HttpOnly-Cookie und wird vom Browser automatisch mitgesendet.
  if (route.query['ibalis'] === 'connected') {
    const savedBetriebsnummer = sessionStorage.getItem('ibalis_betriebsnummer') ?? ''
    const savedJahr = parseInt(
      sessionStorage.getItem('ibalis_jahr') ?? String(currentYear),
      10,
    )

    // BNR15 in Gruppen aufteilen
    bnrLand.value = savedBetriebsnummer.substring(0, 3) || '276'
    bnrRegion.value = savedBetriebsnummer.substring(3, 5) || '09'
    bnrBetrieb.value = savedBetriebsnummer.substring(5)
    jahr.value = savedJahr
    step.value = 'import'
    loadFeldstuecke(savedBetriebsnummer, savedJahr)
  }
})

// ─── Methods ──────────────────────────────────────────────────────────────────

function onBnrInput(field: 'land' | 'region' | 'betrieb') {
  if (field === 'land') {
    bnrLand.value = bnrLand.value.replace(/[^0-9]/g, '').substring(0, 3)
  } else if (field === 'region') {
    bnrRegion.value = bnrRegion.value.replace(/[^0-9]/g, '').substring(0, 2)
  } else {
    bnrBetrieb.value = bnrBetrieb.value.replace(/[^0-9]/g, '').substring(0, 10)
  }
  betriebsnummerError.value = ''
}

function verbinden() {
  if (!isFormValid.value) {
    betriebsnummerError.value = 'Bitte eine gültige 15-stellige Betriebsnummer eingeben.'
    return
  }
  startIBalisAuth(betriebsnummer.value, jahr.value)
}

async function loadFeldstuecke(bnr: string, j: number) {
  loading.value = true
  loadError.value = ''

  try {
    const result = await getIBalisFeldstuecke(bnr, j)
    feldstuecke.value = result.map((fs) => ({
      ...fs,
      _alreadyExists: existingNames.value.has(
        (fs.fsName || `Feldstück ${fs.fsNummer}`).trim().toLowerCase(),
      ),
      _imported: false,
      _saving: false,
      _error: false,
    }))
  } catch (e) {
    loadError.value = 'Feldstücke konnten nicht geladen werden. Bitte erneut versuchen.'
    console.error('iBalis loadFeldstuecke error:', e)
  } finally {
    loading.value = false
  }
}

function getPrimaryNutzung(fs: IBalisFeldstueck): string {
  const first = fs.nutzungen?.[0]
  if (!first) return ''
  return first.nutzungscode?.bezeichnung ?? ''
}

async function uebernehmen(index: number) {
  const fs = feldstuecke.value[index]
  if (!fs) return

  fs._saving = true
  fs._error = false

  const name = fs.fsName || `Feldstück ${fs.fsNummer}`

  try {
    const newField = await createField({
      name,
      size_ha: fs.flaecheInHektar,
      region: null,
      nmin_0_30: null,
      nmin_30_60: null,
      nmin_60_90: null,
      user_id: props.userId,
    })

    const geometry = wktToGeoJSON(fs.geometryWKT)

    await createFieldGeometry({
      field_id: newField.id,
      user_id: props.userId,
      geometry,
      source: 'ibalis',
    })

    fs._imported = true
    emit('imported')
  } catch (e) {
    fs._error = true
    console.error('iBalis uebernehmen error:', e)
  } finally {
    fs._saving = false
  }
}

async function alleUebernehmen() {
  importingAll.value = true
  for (let i = 0; i < feldstuecke.value.length; i++) {
    const fs = feldstuecke.value[i]
    if (fs && !fs._imported && !fs._alreadyExists && !fs._error) {
      await uebernehmen(i)
    }
  }
  importingAll.value = false
}
</script>
