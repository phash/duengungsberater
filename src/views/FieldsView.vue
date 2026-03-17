<template>
  <AppLayout title="Meine Felder">
    <div class="space-y-4 stagger">
      <!-- Toggle Liste / Karte -->
      <div class="flex gap-1 rounded-2xl bg-stone-100 p-1">
        <button
          data-testid="toggle-liste"
          class="flex-1 rounded-xl py-1.5 text-sm font-medium transition-colors"
          :class="activeTab === 'liste' ? 'bg-white text-stone-900 shadow-warm-sm' : 'text-stone-500 hover:text-stone-700'"
          @click="activeTab = 'liste'"
        >
          Liste
        </button>
        <button
          data-testid="toggle-karte"
          class="flex-1 rounded-xl py-1.5 text-sm font-medium transition-colors"
          :class="activeTab === 'karte' ? 'bg-white text-stone-900 shadow-warm-sm' : 'text-stone-500 hover:text-stone-700'"
          @click="activeTab = 'karte'"
        >
          Karte
        </button>
      </div>

      <!-- Listen-Ansicht -->
      <template v-if="activeTab === 'liste'">
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

        <button
          data-testid="ibalis-import-button"
          class="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-600 shadow-warm-xs transition-colors hover:bg-parchment"
          @click="importDrawerOpen = true"
        >
          iBalis importieren
        </button>

        <p
          v-if="errorMessage"
          data-testid="fields-error"
          class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {{ errorMessage }}
        </p>

        <FieldList
          :fields="fieldsWithGeometry"
          :plan-counts="planCounts"
          @select="openEdit"
          @navigate="navigateToPlan"
        />
      </template>

      <!-- Karten-Ansicht -->
      <template v-else>
        <button
          data-testid="ibalis-import-button"
          class="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-600 shadow-warm-xs transition-colors hover:bg-parchment"
          @click="importDrawerOpen = true"
        >
          iBalis importieren
        </button>

        <FieldMap
          :fields="fieldsWithGeometry"
          @select="openEdit"
        />
      </template>
    </div>

    <!-- Feld bearbeiten/anlegen -->
    <DrawerModal
      :open="drawerOpen"
      :title="editingField ? 'Feld bearbeiten' : 'Neues Feld'"
      @close="closeDrawer"
    >
      <FieldForm :field="editingField" @save="handleSave" @delete="handleDelete" />
    </DrawerModal>

    <!-- iBalis Import -->
    <iBalisImportDrawer
      :open="importDrawerOpen"
      :user-id="auth.userId ?? ''"
      :existing-fields="fields"
      @close="importDrawerOpen = false"
      @imported="onImported"
    />
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { getFields, createField, updateField, deleteField } from '@/services/field.service'
import { getGeometriesForUser } from '@/services/field-geometry.service'
import { getPlansForField } from '@/services/field-crop-plan.service'
import type { Field, FieldGeometry } from '@/types'
import AppLayout from '@/components/AppLayout.vue'
import DrawerModal from '@/components/DrawerModal.vue'
import FieldList from '@/components/FieldList.vue'
import FieldForm from '@/components/FieldForm.vue'
import FieldMap from '@/components/FieldMap.vue'
import iBalisImportDrawer from '@/components/iBalisImportDrawer.vue'

const auth = useAuthStore()
const router = useRouter()

const fields = ref<Field[]>([])
const geometries = ref<FieldGeometry[]>([])
const planCounts = ref<Record<string, number>>({})
const drawerOpen = ref(false)
const importDrawerOpen = ref(false)
const editingField = ref<Field | undefined>()
const errorMessage = ref('')
const activeTab = ref<'liste' | 'karte'>('liste')

const fieldsWithGeometry = computed(() =>
  fields.value.map((f) => ({
    ...f,
    geometry: geometries.value.find((g) => g.field_id === f.id),
  })),
)

async function loadFields() {
  if (!auth.userId) return
  fields.value = await getFields(auth.userId)

  const counts: Record<string, number> = {}
  for (const field of fields.value) {
    const plans = await getPlansForField(field.id)
    counts[field.id] = plans.length
  }
  planCounts.value = counts
}

async function loadGeometries() {
  if (!auth.userId) return
  try {
    geometries.value = await getGeometriesForUser(auth.userId)
  } catch (e) {
    console.error('Geometrien konnten nicht geladen werden:', e)
  }
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

async function handleSave(data: {
  name: string
  size_ha: number
  nmin_0_30: number | null
  nmin_30_60: number | null
  nmin_60_90: number | null
}) {
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

async function onImported() {
  await Promise.all([loadFields(), loadGeometries()])
}

function navigateToPlan(fieldId: string) {
  router.push({ name: 'anbauplanung', params: { fieldId } })
}

onMounted(() => {
  Promise.all([loadFields(), loadGeometries()])
})
</script>
