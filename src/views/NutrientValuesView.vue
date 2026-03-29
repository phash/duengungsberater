<template>
  <AppLayout title="Eigene Nährstoffwerte" :show-back="true">
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-stone-700">Kultur</label>
        <select
          v-model="selectedCropId"
          data-testid="kultur-select"
          class="mt-1 block w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-stone-900 focus:border-field-500 focus:ring-field-500"
          @change="loadDemandsForCrop"
        >
          <option value="">— Kultur wählen —</option>
          <option v-for="crop in crops" :key="crop.id" :value="crop.id">
            {{ crop.name_de }}
          </option>
        </select>
      </div>

      <!-- Nährstofftabelle -->
      <div
        v-if="selectedCropId && displayDemands.length > 0"
        class="overflow-hidden rounded-2xl border border-stone-200"
      >
        <div
          class="grid grid-cols-3 gap-2 border-b border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-500"
        >
          <span>Nährstoff</span>
          <span>LfL-Wert</span>
          <span>Eigener Wert</span>
        </div>
        <div
          v-for="demand in displayDemands"
          :key="demand.nutrientTypeId"
          :data-testid="`demand-row-${demand.code}`"
          class="grid cursor-pointer grid-cols-3 gap-2 border-b border-stone-100 px-3 py-3 text-sm last:border-0 hover:bg-stone-50"
          :class="{ 'opacity-50 cursor-not-allowed': !isOnline }"
          @click="isOnline && openDrawer(demand)"
        >
          <span class="font-medium text-stone-900">{{ demand.code }}</span>
          <span class="text-stone-500">{{ formatNumber(demand.lflValue) }} kg/ha</span>
          <span :class="demand.userValue !== null ? 'font-medium text-field-700' : 'text-stone-400'">
            {{ demand.userValue !== null ? `${demand.userValue} kg/ha` : '—' }}
          </span>
        </div>
      </div>

      <!-- Offline-Hinweis -->
      <div
        v-if="selectedCropId && !isOnline"
        data-testid="demand-offline-notice"
        class="rounded-xl bg-wheat-50 px-4 py-2 text-sm text-wheat-600"
      >
        Eigene Werte können nur online bearbeitet werden.
      </div>

      <!-- DrawerModal -->
      <DrawerModal data-testid="demand-drawer" :open="drawerOpen" @close="closeDrawer">
        <template #header>
          <span v-if="selectedDemand">{{ selectedDemand.code }} — {{ selectedCropName }}</span>
        </template>

        <div v-if="selectedDemand" class="space-y-4 p-4">
          <p class="text-sm text-stone-500">LfL-Wert: {{ formatNumber(selectedDemand.lflValue) }} kg/ha</p>

          <div>
            <label class="block text-sm font-medium text-stone-700">Grundbedarf (kg/ha) *</label>
            <input
              v-model.number="editDemandKgHa"
              type="number"
              min="0"
              max="999"
              step="1"
              data-testid="demand-kg-ha-input"
              class="mt-1 block w-full rounded-xl border border-stone-200 px-3 py-2 focus:border-field-500 focus:ring-field-500"
            />
          </div>

          <button
            type="button"
            data-testid="demand-advanced-toggle"
            class="text-sm text-field-700 underline"
            @click="showAdvanced = !showAdvanced"
          >
            {{ showAdvanced ? '▲' : '▶' }} Erweiterte Einstellungen
          </button>

          <template v-if="showAdvanced">
            <div>
              <label class="block text-sm font-medium text-stone-700">Referenzertrag (dt/ha)</label>
              <input
                v-model.number="editRefYield"
                type="number"
                min="0"
                max="999"
                step="1"
                data-testid="ref-yield-input"
                class="mt-1 block w-full rounded-xl border border-stone-200 px-3 py-2 focus:border-field-500 focus:ring-field-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-stone-700"
                >Ertragskorrektur (kg/dt)</label
              >
              <input
                v-model.number="editPerYield"
                type="number"
                min="-50"
                max="50"
                step="0.1"
                data-testid="per-yield-input"
                class="mt-1 block w-full rounded-xl border border-stone-200 px-3 py-2 focus:border-field-500 focus:ring-field-500"
              />
            </div>
          </template>

          <p v-if="drawerError" class="text-sm text-red-600">{{ drawerError }}</p>
        </div>

        <template #footer>
          <div class="flex gap-2 p-4">
            <button
              v-if="drawerHasUserDemand"
              type="button"
              data-testid="demand-reset-button"
              class="flex-1 rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              @click="handleReset"
            >
              Zurücksetzen auf LfL
            </button>
            <button
              type="button"
              data-testid="demand-save-button"
              :disabled="saving"
              class="flex-1 rounded-xl bg-field-600 px-4 py-2 text-sm font-medium text-white hover:bg-field-700 disabled:opacity-50"
              @click="handleSave"
            >
              {{ saving ? 'Wird gespeichert…' : 'Speichern' }}
            </button>
          </div>
        </template>
      </DrawerModal>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { getCrops, getNutrientDemands } from '@/services/crop.service'
import {
  getNutrientTypes,
  upsertUserNutrientDemand,
  deleteUserNutrientDemand,
} from '@/services/nutrient.service'
import AppLayout from '@/components/AppLayout.vue'
import DrawerModal from '@/components/DrawerModal.vue'
import { useNumberFormat } from '@/composables/useNumberFormat'
import type { Crop, CropNutrientDemand, NutrientType } from '@/types'

const auth = useAuthStore()
const { formatNumber } = useNumberFormat()

const selectedCropId = ref('')
const crops = ref<Crop[]>([])
const lflDemands = ref<CropNutrientDemand[]>([])
const userDemands = ref<CropNutrientDemand[]>([])
const nutrientTypes = ref<NutrientType[]>([])

const isOnline = ref(navigator.onLine)
const onOnline = () => {
  isOnline.value = true
}
const onOffline = () => {
  isOnline.value = false
}
onMounted(() => {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
})
onUnmounted(() => {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})

const selectedCropName = computed(
  () => crops.value.find((c) => c.id === selectedCropId.value)?.name_de ?? '',
)

type DisplayDemand = {
  nutrientTypeId: string
  code: string
  lflValue: number
  lflDemand: CropNutrientDemand
  userValue: number | null
  userDemand: CropNutrientDemand | null
}

const displayDemands = computed(() => {
  return nutrientTypes.value
    .map((nt) => {
      const lflDemand = lflDemands.value.find((d) => d.nutrient_type_id === nt.id)
      if (!lflDemand) return null
      const userDemand = userDemands.value.find((d) => d.nutrient_type_id === nt.id) ?? null
      return {
        nutrientTypeId: nt.id,
        code: nt.code,
        lflValue: lflDemand.demand_kg_ha,
        lflDemand,
        userValue: userDemand?.demand_kg_ha ?? null,
        userDemand,
      }
    })
    .filter(Boolean) as DisplayDemand[]
})

const drawerOpen = ref(false)
const selectedDemand = ref<DisplayDemand | null>(null)
const drawerHasUserDemand = ref(false)
const editDemandKgHa = ref<number | null>(null)
const editRefYield = ref<number | null>(null)
const editPerYield = ref<number | null>(null)
const showAdvanced = ref(false)
const drawerError = ref('')
const saving = ref(false)

onMounted(async () => {
  ;[crops.value, nutrientTypes.value] = await Promise.all([getCrops(), getNutrientTypes()])
})

async function loadDemandsForCrop() {
  if (!selectedCropId.value) {
    lflDemands.value = []
    userDemands.value = []
    return
  }
  // Always load LfL baseline (no userId)
  lflDemands.value = await getNutrientDemands(selectedCropId.value)
  // Load user overrides separately (merged result filtered to source='user')
  if (auth.userId) {
    const merged = await getNutrientDemands(selectedCropId.value, auth.userId)
    userDemands.value = merged.filter((d) => d.source === 'user')
  }
}

function openDrawer(demand: DisplayDemand) {
  selectedDemand.value = demand
  drawerHasUserDemand.value = demand.userDemand !== null
  editDemandKgHa.value = demand.userDemand?.demand_kg_ha ?? demand.lflDemand.demand_kg_ha
  editRefYield.value = demand.userDemand?.ref_yield_dt_ha ?? demand.lflDemand.ref_yield_dt_ha
  editPerYield.value =
    demand.userDemand?.per_yield_correction ?? demand.lflDemand.per_yield_correction
  showAdvanced.value = false
  drawerError.value = ''
  drawerOpen.value = true
}

function closeDrawer() {
  drawerOpen.value = false
  selectedDemand.value = null
  drawerHasUserDemand.value = false
}

async function handleSave() {
  if (!selectedDemand.value || !auth.userId) return
  drawerError.value = ''

  if (!editDemandKgHa.value || editDemandKgHa.value <= 0 || editDemandKgHa.value > 999) {
    drawerError.value = 'Grundbedarf muss zwischen 0 und 999 kg/ha liegen.'
    return
  }
  if (editRefYield.value !== null && (editRefYield.value <= 0 || editRefYield.value > 999)) {
    drawerError.value = 'Referenzertrag muss zwischen 0 und 999 dt/ha liegen.'
    return
  }
  if (editPerYield.value !== null && (editPerYield.value < -50 || editPerYield.value > 50)) {
    drawerError.value = 'Ertragskorrektur muss zwischen -50 und +50 kg/dt liegen.'
    return
  }

  saving.value = true
  try {
    const result = await upsertUserNutrientDemand(
      {
        crop_id: selectedDemand.value.lflDemand.crop_id,
        nutrient_type_id: selectedDemand.value.nutrientTypeId,
        demand_kg_ha: editDemandKgHa.value,
        ref_yield_dt_ha: editRefYield.value ?? selectedDemand.value.lflDemand.ref_yield_dt_ha,
        per_yield_correction:
          editPerYield.value ?? selectedDemand.value.lflDemand.per_yield_correction,
      },
      auth.userId,
    )
    const idx = userDemands.value.findIndex((d) => d.nutrient_type_id === result.nutrient_type_id)
    if (idx >= 0) {
      userDemands.value[idx] = result
    } else {
      userDemands.value.push(result)
    }
    closeDrawer()
  } catch (e) {
    drawerError.value = e instanceof Error ? e.message : 'Fehler beim Speichern.'
  } finally {
    saving.value = false
  }
}

async function handleReset() {
  if (!selectedDemand.value || !auth.userId) return
  try {
    await deleteUserNutrientDemand(
      selectedDemand.value.lflDemand.crop_id,
      selectedDemand.value.nutrientTypeId,
      auth.userId,
    )
    userDemands.value = userDemands.value.filter(
      (d) => d.nutrient_type_id !== selectedDemand.value!.nutrientTypeId,
    )
    closeDrawer()
  } catch (e) {
    drawerError.value = e instanceof Error ? e.message : 'Fehler beim Zurücksetzen.'
  }
}
</script>
