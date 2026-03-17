<template>
  <AppLayout title="Meine Felder">
    <div class="space-y-4 stagger">
      <button
        data-testid="feld-anlegen-button"
        class="group w-full rounded-2xl border-2 border-dashed border-stone-300 px-4 py-4 text-sm font-medium text-stone-400 transition-all duration-200 hover:border-field-500 hover:bg-field-50 hover:text-field-600"
        @click="openNew"
      >
        <span class="inline-flex items-center gap-2">
          <svg class="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Feld anlegen
        </span>
      </button>

      <p
        v-if="errorMessage"
        data-testid="fields-error"
        class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </p>

      <FieldList
        :fields="fields"
        :plan-counts="planCounts"
        @select="openEdit"
        @navigate="navigateToPlan"
      />
    </div>

    <DrawerModal
      :open="drawerOpen"
      :title="editingField ? 'Feld bearbeiten' : 'Neues Feld'"
      @close="closeDrawer"
    >
      <FieldForm
        :field="editingField"
        @save="handleSave"
        @delete="handleDelete"
      />
    </DrawerModal>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { getFields, createField, updateField, deleteField } from '@/services/field.service'
import { getPlansForField } from '@/services/field-crop-plan.service'
import type { Field } from '@/types'
import AppLayout from '@/components/AppLayout.vue'
import DrawerModal from '@/components/DrawerModal.vue'
import FieldList from '@/components/FieldList.vue'
import FieldForm from '@/components/FieldForm.vue'

const auth = useAuthStore()
const router = useRouter()

const fields = ref<Field[]>([])
const planCounts = ref<Record<string, number>>({})
const drawerOpen = ref(false)
const editingField = ref<Field | undefined>()

async function loadFields() {
  if (!auth.userId) return
  fields.value = await getFields(auth.userId)

  // Plan-Counts für Status-Badges laden
  const counts: Record<string, number> = {}
  for (const field of fields.value) {
    const plans = await getPlansForField(field.id)
    counts[field.id] = plans.length
  }
  planCounts.value = counts
}

function openNew() {
  editingField.value = undefined
  drawerOpen.value = true
}

function openEdit(fieldId: string) {
  editingField.value = fields.value.find((f) => f.id === fieldId)
  drawerOpen.value = true
}

function closeDrawer() {
  drawerOpen.value = false
  editingField.value = undefined
}

const errorMessage = ref('')

async function handleSave(data: { name: string; size_ha: number; nmin_0_30: number | null; nmin_30_60: number | null; nmin_60_90: number | null }) {
  if (!auth.userId) return
  errorMessage.value = ''

  try {
    if (editingField.value) {
      await updateField(editingField.value.id, data)
    } else {
      await createField({ ...data, user_id: auth.userId })
    }
    closeDrawer()
    await loadFields()
  } catch (e) {
    console.error('Fehler beim Speichern:', e)
    errorMessage.value = 'Fehler beim Speichern. Bitte erneut versuchen.'
  }
}

async function handleDelete() {
  if (!editingField.value) return
  errorMessage.value = ''

  try {
    await deleteField(editingField.value.id)
    closeDrawer()
    await loadFields()
  } catch (e) {
    console.error('Fehler beim Löschen:', e)
    errorMessage.value = 'Fehler beim Löschen. Bitte erneut versuchen.'
  }
}

function navigateToPlan(fieldId: string) {
  router.push({ name: 'anbauplanung', params: { fieldId } })
}

onMounted(loadFields)
</script>
