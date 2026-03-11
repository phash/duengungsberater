<template>
  <AppLayout title="Meine Felder">
    <div class="space-y-4">
      <button
        data-testid="feld-anlegen-button"
        class="w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 hover:border-green-500 hover:text-green-700"
        @click="openNew"
      >
        + Feld anlegen
      </button>

      <p
        v-if="errorMessage"
        data-testid="fields-error"
        class="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600"
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

async function handleSave(data: { name: string; size_ha: number }) {
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
