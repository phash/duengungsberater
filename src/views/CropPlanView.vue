<template>
  <AppLayout :title="fieldName ? `Planung: ${fieldName}` : 'Anbauplanung'" :show-back="true">
    <div class="space-y-4 stagger">
      <button
        data-testid="plan-anlegen-button"
        class="group w-full rounded-2xl border-2 border-dashed border-stone-300 px-4 py-4 text-sm font-medium text-stone-400 transition-all duration-200 hover:border-field-500 hover:bg-field-50 hover:text-field-600"
        @click="openNew"
      >
        <span class="inline-flex items-center gap-2">
          <svg class="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Planung anlegen
        </span>
      </button>

      <p
        v-if="errorMessage"
        data-testid="plans-error"
        class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </p>

      <CropPlanList
        :plans="plans"
        :crops="crops"
        @select="openEdit"
        @navigate="navigateToRecommendation"
      />
    </div>

    <DrawerModal
      :open="drawerOpen"
      :title="editingPlan ? 'Planung bearbeiten' : 'Neue Planung'"
      @close="closeDrawer"
    >
      <CropPlanForm :crops="crops" :plan="editingPlan" @save="handleSave" @delete="handleDelete" />
    </DrawerModal>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  getPlansForField,
  createPlan,
  updatePlan,
  deletePlan,
} from '@/services/field-crop-plan.service'
import { getCrops } from '@/services/crop.service'
import { getFields } from '@/services/field.service'
import { useAuthStore } from '@/stores/auth.store'
import type { FieldCropPlan, Crop } from '@/types'
import AppLayout from '@/components/AppLayout.vue'
import DrawerModal from '@/components/DrawerModal.vue'
import CropPlanList from '@/components/CropPlanList.vue'
import CropPlanForm from '@/components/CropPlanForm.vue'

const props = defineProps<{
  fieldId: string
}>()

const auth = useAuthStore()
const router = useRouter()

const plans = ref<FieldCropPlan[]>([])
const crops = ref<Crop[]>([])
const fieldName = ref('')
const drawerOpen = ref(false)
const editingPlan = ref<FieldCropPlan | undefined>()
const errorMessage = ref('')

async function loadData() {
  try {
    crops.value = await getCrops()
    plans.value = await getPlansForField(props.fieldId)

    // Feldname für Header laden
    if (auth.userId) {
      const fields = await getFields(auth.userId)
      const field = fields.find((f) => f.id === props.fieldId)
      fieldName.value = field?.name ?? ''
    }
  } catch (e) {
    console.error('Fehler beim Laden:', e)
    errorMessage.value = 'Daten konnten nicht geladen werden.'
  }
}

function openNew() {
  editingPlan.value = undefined
  drawerOpen.value = true
}

function openEdit(planId: string) {
  editingPlan.value = plans.value.find((p) => p.id === planId)
  drawerOpen.value = true
}

function closeDrawer() {
  drawerOpen.value = false
  editingPlan.value = undefined
}

function navigateToRecommendation(planId: string) {
  router.push({
    name: 'empfehlung',
    params: { fieldId: props.fieldId, planId },
  })
}

async function handleSave(data: {
  crop_id: string
  season_year: number
  expected_yield_dt_ha: number
}) {
  errorMessage.value = ''
  try {
    if (editingPlan.value) {
      await updatePlan(editingPlan.value.id, data)
    } else {
      await createPlan({ ...data, field_id: props.fieldId })
    }
    closeDrawer()
    await loadData()
  } catch (e) {
    console.error('Fehler beim Speichern:', e)
    errorMessage.value = 'Fehler beim Speichern. Bitte erneut versuchen.'
  }
}

async function handleDelete() {
  if (!editingPlan.value) return
  errorMessage.value = ''
  try {
    await deletePlan(editingPlan.value.id)
    closeDrawer()
    await loadData()
  } catch (e) {
    console.error('Fehler beim Löschen:', e)
    errorMessage.value = 'Fehler beim Löschen. Bitte erneut versuchen.'
  }
}

onMounted(loadData)
</script>
