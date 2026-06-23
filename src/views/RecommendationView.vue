<template>
  <AppLayout title="Düngeempfehlung" :show-back="true">
    <template #actions>
      <button
        data-testid="empfehlung-drucken-button"
        class="flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100"
        @click="printPage"
      >
        <svg class="h-4 w-4" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
          />
        </svg>
        Drucken
      </button>
    </template>
    <div class="space-y-4 stagger">
      <!-- Context card -->
      <div v-if="plan && crop" data-testid="empfehlung-context" class="rounded-2xl bg-field-50 px-4 py-3.5 shadow-warm-xs">
        <p class="font-display font-semibold text-field-800">{{ crop.name_de }}</p>
        <p class="mt-0.5 text-sm text-field-600/80">
          Saison {{ plan.season_year }} ·
          <NumberDisplay :value="plan.expected_yield_dt_ha" format="yield" /> · Feld:
          {{ fieldName }} (<NumberDisplay :value="fieldSizeHa" format="area" />)
        </p>
      </div>

      <p
        v-if="errorMessage"
        data-testid="empfehlung-error"
        class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </p>

      <CorrectionPanel
        v-if="corrections.length > 0"
        :corrections="corrections"
        :vorfrucht-id="vorfruchtId"
        :zwischenfrucht-id="zwischenfruchtId"
        :humus-id="humusId"
        @update:vorfrucht-id="onCorrectionChange('vorfrucht_correction_id', $event)"
        @update:zwischenfrucht-id="onCorrectionChange('zwischenfrucht_correction_id', $event)"
        @update:humus-id="onCorrectionChange('humus_correction_id', $event)"
      />

      <!-- Nmin Info Badge -->
      <div
        v-if="crop && crop.nmin_depth_cm > 0"
        data-testid="nmin-info"
        class="rounded-2xl bg-wheat-50 px-4 py-3 text-sm"
      >
        <template v-if="nminSource.source === 'bodenprobe'">
          <span class="font-semibold text-wheat-600">Nmin:</span>
          <span class="text-stone-700"> {{ nminSum }} kg N/ha (0–{{ crop.nmin_depth_cm }} cm) — Bodenprobe</span>
        </template>
        <template v-else-if="nminSource.source === 'lfl'">
          <span class="font-semibold text-field-600">Nmin:</span>
          <span class="text-stone-700"> {{ nminSum }} kg N/ha (0–{{ crop.nmin_depth_cm }} cm) — {{ nminSource.label }}</span>
          <router-link
            :to="`/felder`"
            class="ml-1 text-xs font-medium text-field-600 underline decoration-field-300 transition-colors hover:text-field-700"
          >Eigene Bodenprobe eintragen</router-link>
        </template>
        <template v-else>
          <span class="font-semibold text-wheat-600">Nmin:</span>
          <span class="text-stone-600"> nicht verfügbar</span>
          <router-link
            :to="`/felder`"
            class="ml-1 font-medium text-field-600 underline decoration-field-300 transition-colors hover:text-field-700"
          >Bodenprobe oder Regierungsbezirk eintragen</router-link>
        </template>
      </div>

      <RecommendationCard :results="nutrientResults" />
      <ProductList :matches="productMatches" />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { getPlansForField, updatePlan } from '@/services/field-crop-plan.service'
import { getCrops, getNutrientDemands } from '@/services/crop.service'
import { getNutrientTypes } from '@/services/nutrient.service'
import { getProducts } from '@/services/product.service'
import { getFields } from '@/services/field.service'
import { getCorrections, getCorrectionValues } from '@/services/correction.service'
import { saveRecommendation } from '@/services/recommendation.service'
import { getNminRegionalValues, getNminCropGroupMappings, lookupNmin, CURRENT_NMIN_YEAR } from '@/services/nmin-regional.service'
import { useNutrientCalculation } from '@/composables/useNutrientCalculation'
import { useRecommendation } from '@/composables/useRecommendation'
import { getRegionLabel } from '@/constants/regions'
import type {
  FieldCropPlan,
  Crop,
  Field,
  Correction,
  NutrientResult,
  ProductMatch,
  ActiveCorrection,
  NminRegionalValue,
  NminCropGroupMapping,
} from '@/types'
import { trackEvent } from '@/utils/tracking'
import AppLayout from '@/components/AppLayout.vue'
import NumberDisplay from '@/components/NumberDisplay.vue'
import CorrectionPanel from '@/components/CorrectionPanel.vue'
import RecommendationCard from '@/components/RecommendationCard.vue'
import ProductList from '@/components/ProductList.vue'

const props = defineProps<{
  fieldId: string
  planId: string
}>()

function printPage() {
  window.print()
}

const auth = useAuthStore()
const { calculateNutrientDemand } = useNutrientCalculation()
const { matchProducts } = useRecommendation()

function sumNmin(fieldObj: Field, cropObj: Crop): number {
  if (cropObj.nmin_depth_cm === 0) return 0
  const v30 = fieldObj.nmin_0_30 ?? 0
  const v60 = fieldObj.nmin_30_60 ?? 0
  const v90 = fieldObj.nmin_60_90 ?? 0
  if (cropObj.nmin_depth_cm === 60) return v30 + v60
  return v30 + v60 + v90
}

// Echte Bodenprobe = mindestens eine relevante Schicht ist explizit erfasst (auch der Wert 0)
function hasBodenprobe(fieldObj: Field, cropObj: Crop): boolean {
  if (cropObj.nmin_depth_cm === 0) return false
  const layers =
    cropObj.nmin_depth_cm === 60
      ? [fieldObj.nmin_0_30, fieldObj.nmin_30_60]
      : [fieldObj.nmin_0_30, fieldObj.nmin_30_60, fieldObj.nmin_60_90]
  return layers.some((l) => l != null)
}

const plan = ref<FieldCropPlan | null>(null)
const crop = ref<Crop | null>(null)
const field = ref<Field | null>(null)
const fieldName = computed(() => field.value?.name ?? '')
const fieldSizeHa = computed(() => field.value?.size_ha ?? 0)
const corrections = ref<Correction[]>([])
const nutrientResults = ref<NutrientResult[]>([])
const productMatches = ref<ProductMatch[]>([])
const errorMessage = ref('')

// Nmin regional data
const nminValues = ref<NminRegionalValue[]>([])
const nminMappings = ref<NminCropGroupMapping[]>([])

const vorfruchtId = computed(() => plan.value?.vorfrucht_correction_id ?? null)
const zwischenfruchtId = computed(() => plan.value?.zwischenfrucht_correction_id ?? null)
const humusId = computed(() => plan.value?.humus_correction_id ?? null)

const nminSource = computed<{ value: number; source: 'bodenprobe' | 'lfl' | 'none'; label: string }>(() => {
  if (!field.value || !crop.value || crop.value.nmin_depth_cm === 0) {
    return { value: 0, source: 'none', label: '' }
  }

  // Priority 1: User's own soil sample (auch ein eingetragener Wert 0 zählt)
  if (hasBodenprobe(field.value, crop.value)) {
    return { value: sumNmin(field.value, crop.value), source: 'bodenprobe', label: 'Bodenprobe' }
  }

  // Priority 2: LfL regional reference value
  if (field.value.region && nminValues.value.length > 0 && nminMappings.value.length > 0) {
    const richtwert = lookupNmin(
      nminValues.value,
      nminMappings.value,
      crop.value.id,
      field.value.region,
      crop.value.nmin_depth_cm,
    )
    if (richtwert != null) {
      return {
        value: richtwert,
        source: 'lfl',
        label: `LfL-Richtwert ${getRegionLabel(field.value.region)} ${CURRENT_NMIN_YEAR}`,
      }
    }
  }

  return { value: 0, source: 'none', label: '' }
})

const nminSum = computed(() => nminSource.value.value)

async function loadData() {
  try {
    const plans = await getPlansForField(props.fieldId)
    plan.value = plans.find((p) => p.id === props.planId) ?? null

    if (!plan.value) {
      errorMessage.value = 'Planung nicht gefunden.'
      return
    }

    const crops = await getCrops()
    crop.value = crops.find((c) => c.id === plan.value!.crop_id) ?? null

    if (auth.userId) {
      const fields = await getFields(auth.userId)
      field.value = fields.find((f) => f.id === props.fieldId) ?? null
    }

    corrections.value = await getCorrections()

    // Load regional Nmin data
    nminValues.value = await getNminRegionalValues()
    nminMappings.value = await getNminCropGroupMappings()

    // Auto-calculate on load
    await calculate()
  } catch (e) {
    console.error('Fehler beim Laden:', e)
    errorMessage.value = 'Daten konnten nicht geladen werden.'
  }
}

async function onCorrectionChange(
  field: 'vorfrucht_correction_id' | 'zwischenfrucht_correction_id' | 'humus_correction_id',
  value: string | null,
) {
  if (!plan.value) return

  try {
    plan.value = await updatePlan(plan.value.id, { [field]: value })
    await calculate()
  } catch (e) {
    console.error('Fehler beim Speichern:', e)
    errorMessage.value = 'Korrektur konnte nicht gespeichert werden.'
  }
}

async function calculate() {
  if (!plan.value || !crop.value) return
  errorMessage.value = ''

  try {
    const nutrientTypes = await getNutrientTypes()
    const demands = await getNutrientDemands(plan.value.crop_id, auth.userId ?? undefined)
    const products = await getProducts()

    // Build active corrections
    const correctionIds = [
      plan.value.vorfrucht_correction_id,
      plan.value.zwischenfrucht_correction_id,
      plan.value.humus_correction_id,
    ].filter((id): id is string => id !== null)

    let activeCorr: ActiveCorrection[] = []
    if (correctionIds.length > 0) {
      const values = await getCorrectionValues(correctionIds)
      activeCorr = correctionIds
        .map((id) => ({
          correction: corrections.value.find((c) => c.id === id)!,
          values: values.filter((v) => v.correction_id === id),
        }))
        .filter((ac) => ac.correction)
    }

    // Compute Nmin (Bodenprobe > LfL-Richtwert > none)
    const nminKgHa = nminSource.value.value

    nutrientResults.value = calculateNutrientDemand(
      demands,
      nutrientTypes,
      plan.value.expected_yield_dt_ha,
      fieldSizeHa.value,
      activeCorr.length > 0 ? activeCorr : undefined,
      nminKgHa > 0 ? nminKgHa : undefined,
      nminSource.value.label || undefined,
    )

    productMatches.value = matchProducts(nutrientResults.value, products)

    // Save result
    const valuesToSave = nutrientResults.value.map((r) => {
      const ntId = nutrientTypes.find((nt) => nt.code === r.nutrient_code)?.id ?? ''
      const demandSource = demands.find((d) => d.nutrient_type_id === ntId)?.source ?? 'lfl'
      return {
        nutrient_type_id: ntId,
        value_kg_ha: r.value_kg_ha,
        value_kg_total: r.value_kg_total,
        source_used: demandSource,
      }
    })

    await saveRecommendation(props.planId, valuesToSave, !navigator.onLine)

    trackEvent('Calculator', 'recommendation-calculated', auth.isGuest ? 'guest' : 'user')
  } catch (e) {
    console.error('Fehler bei Berechnung:', e)
    errorMessage.value = 'Berechnung fehlgeschlagen. Bitte erneut versuchen.'
  }
}

onMounted(loadData)
</script>
