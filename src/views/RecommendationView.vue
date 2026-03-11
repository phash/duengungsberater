<template>
  <AppLayout title="Düngeempfehlung" :show-back="true">
    <div class="space-y-4">
      <div v-if="plan && crop" data-testid="empfehlung-context" class="rounded-lg bg-green-50 px-4 py-3">
        <p class="font-medium">{{ crop.name_de }}</p>
        <p class="text-sm text-gray-600">
          Saison {{ plan.season_year }} · <NumberDisplay :value="plan.expected_yield_dt_ha" format="yield" />
          · Feld: {{ fieldName }} (<NumberDisplay :value="fieldSizeHa" format="area" />)
        </p>
      </div>

      <p
        v-if="errorMessage"
        data-testid="empfehlung-error"
        class="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600"
      >
        {{ errorMessage }}
      </p>

      <button
        data-testid="empfehlung-berechnen-button"
        class="w-full rounded-lg bg-green-700 px-4 py-2 text-white font-medium hover:bg-green-800 disabled:opacity-50"
        :disabled="calculating"
        @click="calculate"
      >
        {{ calculating ? 'Berechne…' : (nutrientResults.length > 0 ? 'Neu berechnen' : 'Empfehlung berechnen') }}
      </button>

      <RecommendationCard :results="nutrientResults" />
      <ProductList :matches="productMatches" />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { getPlansForField } from '@/services/field-crop-plan.service'
import { getCrops } from '@/services/crop.service'
import { getNutrientDemands } from '@/services/crop.service'
import { getNutrientTypes } from '@/services/nutrient.service'
import { getProducts } from '@/services/product.service'
import { getFields } from '@/services/field.service'
import { saveRecommendation, getRecommendation } from '@/services/recommendation.service'
import { useNutrientCalculation } from '@/composables/useNutrientCalculation'
import { useRecommendation } from '@/composables/useRecommendation'
import type { FieldCropPlan, Crop, NutrientResult, ProductMatch } from '@/types'
import AppLayout from '@/components/AppLayout.vue'
import NumberDisplay from '@/components/NumberDisplay.vue'
import RecommendationCard from '@/components/RecommendationCard.vue'
import ProductList from '@/components/ProductList.vue'

const props = defineProps<{
  fieldId: string
  planId: string
}>()

const auth = useAuthStore()
const { calculateNutrientDemand } = useNutrientCalculation()
const { matchProducts } = useRecommendation()

const plan = ref<FieldCropPlan | null>(null)
const crop = ref<Crop | null>(null)
const fieldName = ref('')
const fieldSizeHa = ref(0)
const nutrientResults = ref<NutrientResult[]>([])
const productMatches = ref<ProductMatch[]>([])
const calculating = ref(false)
const errorMessage = ref('')

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
      const field = fields.find((f) => f.id === props.fieldId)
      fieldName.value = field?.name ?? ''
      fieldSizeHa.value = field?.size_ha ?? 0
    }

    // Load existing recommendation if already calculated
    const existing = await getRecommendation(props.planId)
    if (existing) {
      await rebuildResultsFromRecommendation(existing.values)
    }
  } catch (e) {
    console.error('Fehler beim Laden:', e)
    errorMessage.value = 'Daten konnten nicht geladen werden.'
  }
}

async function rebuildResultsFromRecommendation(
  values: { nutrient_type_id: string; value_kg_ha: number; value_kg_total: number; source_used: string }[],
) {
  const nutrientTypes = await getNutrientTypes()
  nutrientResults.value = values
    .map((v) => {
      const nt = nutrientTypes.find((n) => n.id === v.nutrient_type_id)
      if (!nt) return null
      return {
        nutrient_code: nt.code,
        nutrient_label: nt.label_de,
        value_kg_ha: v.value_kg_ha,
        value_kg_total: v.value_kg_total,
        unit: nt.unit,
      } satisfies NutrientResult
    })
    .filter((r): r is NutrientResult => r !== null)
    .sort((a, b) => {
      const allNt = nutrientTypes
      const orderA = allNt.find((nt) => nt.code === a.nutrient_code)?.sort_order ?? 99
      const orderB = allNt.find((nt) => nt.code === b.nutrient_code)?.sort_order ?? 99
      return orderA - orderB
    })

  const products = await getProducts()
  productMatches.value = matchProducts(nutrientResults.value, products)
}

async function calculate() {
  if (!plan.value || !crop.value) return
  calculating.value = true
  errorMessage.value = ''

  try {
    const nutrientTypes = await getNutrientTypes()
    const demands = await getNutrientDemands(plan.value.crop_id)
    const products = await getProducts()

    nutrientResults.value = calculateNutrientDemand(
      demands,
      nutrientTypes,
      plan.value.expected_yield_dt_ha,
      fieldSizeHa.value,
    )

    productMatches.value = matchProducts(nutrientResults.value, products)

    // Save result
    const valuesToSave = nutrientResults.value.map((r) => {
      const ntId = nutrientTypes.find((nt) => nt.code === r.nutrient_code)?.id ?? ''
      return {
        nutrient_type_id: ntId,
        value_kg_ha: r.value_kg_ha,
        value_kg_total: r.value_kg_total,
        source_used: 'lfl' as const,
      }
    })

    await saveRecommendation(props.planId, valuesToSave, !navigator.onLine)
  } catch (e) {
    console.error('Fehler bei Berechnung:', e)
    errorMessage.value = 'Berechnung fehlgeschlagen. Bitte erneut versuchen.'
  } finally {
    calculating.value = false
  }
}

onMounted(loadData)
</script>
