<template>
  <AppLayout title="Meine Felder">
    <div class="space-y-4 stagger">
      <GuestBanner />
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

      <div class="flex gap-2">
        <button
          data-testid="ibalis-import-button"
          class="flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-600 shadow-warm-xs transition-colors hover:bg-parchment"
          @click="importDrawerOpen = true"
        >
          iBalis importieren
        </button>
        <button
          v-if="auth.isRegistered"
          data-testid="ibalis-connect-button"
          class="flex-1 rounded-2xl border border-field-200 bg-field-50 px-4 py-3 text-sm font-semibold text-field-700 shadow-warm-xs transition-colors hover:bg-field-100"
          @click="connectDrawerOpen = true"
        >
          iBalis verbinden
        </button>
        <router-link
          v-else
          to="/login"
          data-testid="ibalis-connect-button"
          class="flex-1 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-center text-sm font-medium text-stone-400 shadow-warm-xs"
        >
          iBalis verbinden (Login)
        </router-link>
      </div>

      <p
        v-if="errorMessage"
        data-testid="fields-error"
        class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </p>

      <!-- Karte (ausblendbar) -->
      <div v-if="hasGeometries">
        <button
          data-testid="toggle-karte"
          class="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-medium text-stone-600 shadow-warm-xs transition-colors hover:bg-parchment"
          @click="mapVisible = !mapVisible"
        >
          <span class="inline-flex items-center gap-2">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
            Karte
          </span>
          <svg
            class="h-4 w-4 text-stone-400 transition-transform duration-200"
            :class="{ 'rotate-180': mapVisible }"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <div v-if="mapVisible" class="mt-2">
          <FieldMap
            :fields="fieldsWithGeometry"
            :selected-field-id="selectedFieldId"
            @select="onMapSelect"
          />
        </div>
      </div>

      <FieldList
        :fields="fieldsWithGeometry"
        :plan-counts="planCounts"
        :selected-id="selectedFieldId"
        @focus="onFieldFocus"
        @select="openEdit"
        @navigate="navigateToPlan"
      />
    </div>

    <!-- Feld bearbeiten/anlegen -->
    <DrawerModal
      :open="drawerOpen"
      :title="editingField ? 'Feld bearbeiten' : 'Neues Feld'"
      @close="closeDrawer"
    >
      <FieldForm :field="editingField" @save="handleSave" @delete="handleDelete" />
    </DrawerModal>

    <!-- iBalis Import (Datei-Upload) -->
    <iBalisImportDrawer
      :open="importDrawerOpen"
      :user-id="auth.userId ?? ''"
      :existing-fields="fields"
      @close="importDrawerOpen = false"
      @imported="onImported"
    />

    <!-- iBalis Connect (API-Anbindung) -->
    <IBalisConnectDrawer
      :open="connectDrawerOpen"
      :user-id="auth.userId ?? ''"
      :existing-fields="fields"
      @close="connectDrawerOpen = false"
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
import IBalisConnectDrawer from '@/components/IBalisConnectDrawer.vue'
import GuestBanner from '@/components/GuestBanner.vue'
import { trackEvent } from '@/utils/tracking'

const auth = useAuthStore()
const router = useRouter()

const fields = ref<Field[]>([])
const geometries = ref<FieldGeometry[]>([])
const planCounts = ref<Record<string, number>>({})
const drawerOpen = ref(false)
const importDrawerOpen = ref(false)
const connectDrawerOpen = ref(false)
const editingField = ref<Field | undefined>()
const errorMessage = ref('')
const mapVisible = ref(false)
const selectedFieldId = ref<string | null>(null)

const fieldsWithGeometry = computed(() =>
  fields.value.map((f) => ({
    ...f,
    geometry: geometries.value.find((g) => g.field_id === f.id),
  })),
)

const hasGeometries = computed(() => geometries.value.length > 0)

async function loadFields() {
  if (!auth.userId) return
  fields.value = await getFields(auth.userId)

  const entries = await Promise.all(
    fields.value.map(async (field) => {
      const plans = await getPlansForField(field.id)
      return [field.id, plans.length] as const
    }),
  )
  planCounts.value = Object.fromEntries(entries)
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

function onFieldFocus(fieldId: string) {
  selectedFieldId.value = fieldId
  // Karte öffnen und zum Feld scrollen
  if (hasGeometries.value) {
    mapVisible.value = true
  }
}

function openEdit(fieldId: string) {
  selectedFieldId.value = fieldId
  editingField.value = fields.value.find((f) => f.id === fieldId)
  drawerOpen.value = true
}

function onMapSelect(fieldId: string) {
  selectedFieldId.value = fieldId
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
      trackEvent('Calculator', 'field-created', auth.isGuest ? 'guest' : 'user')
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
  trackEvent('Calculator', 'shapefile-imported', auth.isGuest ? 'guest' : 'user')
}

function navigateToPlan(fieldId: string) {
  selectedFieldId.value = fieldId
  router.push({ name: 'anbauplanung', params: { fieldId } })
}

onMounted(() => {
  Promise.all([loadFields(), loadGeometries()])
})
</script>
