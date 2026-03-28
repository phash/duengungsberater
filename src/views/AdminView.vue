<template>
  <AppLayout title="Admin">
    <div class="space-y-4 pb-24">
      <!-- Tab navigation -->
      <div data-testid="admin-tabs" class="flex gap-1 rounded-2xl bg-stone-100 p-1">
        <button
          data-testid="admin-tab-crops"
          :class="[
            'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200',
            activeTab === 'crops'
              ? 'bg-white text-field-700 shadow-warm-sm'
              : 'text-stone-500 hover:text-stone-700',
          ]"
          @click="activeTab = 'crops'"
        >
          Kulturen
        </button>
        <button
          data-testid="admin-tab-nutrients"
          :class="[
            'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200',
            activeTab === 'nutrients'
              ? 'bg-white text-field-700 shadow-warm-sm'
              : 'text-stone-500 hover:text-stone-700',
          ]"
          @click="activeTab = 'nutrients'"
        >
          Nährstoffe
        </button>
        <button
          data-testid="admin-tab-products"
          :class="[
            'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200',
            activeTab === 'products'
              ? 'bg-white text-field-700 shadow-warm-sm'
              : 'text-stone-500 hover:text-stone-700',
          ]"
          @click="activeTab = 'products'"
        >
          Produkte
        </button>
        <button
          data-testid="admin-tab-corrections"
          :class="[
            'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200',
            activeTab === 'corrections'
              ? 'bg-white text-field-700 shadow-warm-sm'
              : 'text-stone-500 hover:text-stone-700',
          ]"
          @click="activeTab = 'corrections'"
        >
          Korrektur
        </button>
        <button
          data-testid="admin-tab-users"
          :class="[
            'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200',
            activeTab === 'users'
              ? 'bg-white text-field-700 shadow-warm-sm'
              : 'text-stone-500 hover:text-stone-700',
          ]"
          @click="activeTab = 'users'"
        >
          User
        </button>
      </div>

      <!-- Error message -->
      <p
        v-if="errorMessage"
        data-testid="admin-error"
        class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </p>

      <!-- Kulturen tab -->
      <template v-if="activeTab === 'crops'">
        <button
          data-testid="admin-crop-anlegen-button"
          class="group w-full rounded-2xl border-2 border-dashed border-stone-300 px-4 py-4 text-sm font-medium text-stone-400 transition-all duration-200 hover:border-field-500 hover:bg-field-50 hover:text-field-600"
          @click="cropDrawer.openNew"
        >
          + Kultur anlegen
        </button>
        <AdminCropList :crops="crops" @select="cropDrawer.openEdit" />
      </template>

      <!-- Nährstoffwerte tab -->
      <template v-if="activeTab === 'nutrients'">
        <button
          data-testid="admin-nutrient-anlegen-button"
          class="group w-full rounded-2xl border-2 border-dashed border-stone-300 px-4 py-4 text-sm font-medium text-stone-400 transition-all duration-200 hover:border-field-500 hover:bg-field-50 hover:text-field-600"
          @click="nutrientDrawer.openNew"
        >
          + Nährstoffwert anlegen
        </button>
        <AdminNutrientList
          :demands="demands"
          :nutrient-types="nutrientTypes"
          :crops="crops"
          @select="nutrientDrawer.openEdit"
        />
      </template>

      <!-- Produkte tab -->
      <template v-if="activeTab === 'products'">
        <button
          data-testid="admin-product-anlegen-button"
          class="group w-full rounded-2xl border-2 border-dashed border-stone-300 px-4 py-4 text-sm font-medium text-stone-400 transition-all duration-200 hover:border-field-500 hover:bg-field-50 hover:text-field-600"
          @click="productDrawer.openNew"
        >
          + Produkt anlegen
        </button>
        <AdminProductList :products="products" @select="productDrawer.openEdit" />
      </template>

      <!-- Korrekturen tab -->
      <template v-if="activeTab === 'corrections'">
        <button
          data-testid="admin-correction-anlegen-button"
          class="group w-full rounded-2xl border-2 border-dashed border-stone-300 px-4 py-4 text-sm font-medium text-stone-400 transition-all duration-200 hover:border-field-500 hover:bg-field-50 hover:text-field-600"
          @click="correctionDrawer.openNew"
        >
          + Korrektur anlegen
        </button>
        <AdminCorrectionList
          :corrections="correctionsList"
          :correction-values="allCorrectionValues"
          :nutrient-types="nutrientTypes"
          @select="correctionDrawer.openEdit"
        />
      </template>

      <!-- Benutzer tab -->
      <template v-if="activeTab === 'users'">
        <AdminUserList
          :users="adminUsers"
          @ban="handleBanUser"
          @unban="handleUnbanUser"
          @delete="confirmDeleteUser"
        />
      </template>
    </div>

    <!-- Delete User Confirm Dialog -->
    <Teleport to="body">
      <div
        v-if="deleteConfirm.show"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        data-testid="admin-user-delete-confirm"
        @click.self="deleteConfirm.show = false"
      >
        <div class="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-warm-lg">
          <h3 class="font-display text-base font-semibold text-stone-900">
            Benutzer löschen?
          </h3>
          <p class="mt-2 text-sm text-stone-500">
            <strong class="text-stone-700">{{ deleteConfirm.email }}</strong> und alle
            zugehörigen Daten (Felder, Pläne, Empfehlungen) werden unwiderruflich gelöscht.
          </p>
          <div class="mt-5 flex gap-3">
            <button
              data-testid="admin-user-delete-cancel"
              class="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50"
              @click="deleteConfirm.show = false"
            >
              Abbrechen
            </button>
            <button
              data-testid="admin-user-delete-confirm-button"
              class="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
              @click="handleDeleteUser"
            >
              Endgültig löschen
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Crop Drawer -->
    <DrawerModal
      :open="cropDrawer.drawerOpen.value"
      :title="cropDrawer.editingId.value ? 'Kultur bearbeiten' : 'Neue Kultur'"
      @close="cropDrawer.close"
    >
      <AdminCropForm :crop="cropDrawer.editingItem.value" @save="saveCrop" @delete="deleteCropItem" />
    </DrawerModal>

    <!-- Nutrient Drawer -->
    <DrawerModal
      :open="nutrientDrawer.drawerOpen.value"
      :title="nutrientDrawer.editingId.value ? 'Nährstoffwert bearbeiten' : 'Neuer Nährstoffwert'"
      @close="nutrientDrawer.close"
    >
      <AdminNutrientForm
        :crops="crops"
        :nutrient-types="nutrientTypes"
        :demand="nutrientDrawer.editingItem.value"
        @save="saveDemand"
        @delete="deleteDemandItem"
      />
    </DrawerModal>

    <!-- Product Drawer -->
    <DrawerModal
      :open="productDrawer.drawerOpen.value"
      :title="productDrawer.editingId.value ? 'Produkt bearbeiten' : 'Neues Produkt'"
      @close="productDrawer.close"
    >
      <AdminProductForm :product="productDrawer.editingItem.value" @save="saveProduct" @delete="deleteProductItem" />
    </DrawerModal>

    <!-- Correction Drawer -->
    <DrawerModal
      :open="correctionDrawer.drawerOpen.value"
      :title="correctionDrawer.editingId.value ? 'Korrektur bearbeiten' : 'Neue Korrektur'"
      @close="correctionDrawer.close"
    >
      <AdminCorrectionForm
        :nutrient-types="nutrientTypes"
        :correction="correctionDrawer.editingItem.value"
        :correction-values="editingCorrectionValues"
        @save="saveCorrection"
        @delete="deleteCorrectionItem"
      />
    </DrawerModal>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import DrawerModal from '@/components/DrawerModal.vue'
import AdminCropList from '@/components/AdminCropList.vue'
import AdminCropForm from '@/components/AdminCropForm.vue'
import AdminNutrientList from '@/components/AdminNutrientList.vue'
import AdminNutrientForm from '@/components/AdminNutrientForm.vue'
import AdminProductList from '@/components/AdminProductList.vue'
import AdminProductForm from '@/components/AdminProductForm.vue'
import AdminCorrectionList from '@/components/AdminCorrectionList.vue'
import AdminCorrectionForm from '@/components/AdminCorrectionForm.vue'
import AdminUserList from '@/components/AdminUserList.vue'
import { useCrudDrawer } from '@/composables/useCrudDrawer'
import { getCrops, createCrop, updateCrop, deleteCrop } from '@/services/crop.service'
import {
  getNutrientTypes,
  getAllNutrientDemands,
  createNutrientDemand,
  updateNutrientDemand,
  deleteNutrientDemand,
} from '@/services/nutrient.service'
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '@/services/product.service'
import {
  getCorrections,
  getCorrectionValues,
  createCorrection,
  updateCorrection,
  deleteCorrection,
} from '@/services/correction.service'
import { getAdminUsers, banUser, unbanUser, adminDeleteUser } from '@/services/user-admin.service'
import type {
  Crop,
  CropNutrientDemand,
  NutrientType,
  FertilizerProduct,
  Correction,
  CorrectionValue,
  AdminUser,
} from '@/types'

// State
const activeTab = ref<'crops' | 'nutrients' | 'products' | 'corrections' | 'users'>('crops')
const errorMessage = ref('')

const crops = ref<Crop[]>([])
const nutrientTypes = ref<NutrientType[]>([])
const demands = ref<CropNutrientDemand[]>([])
const products = ref<FertilizerProduct[]>([])
const correctionsList = ref<Correction[]>([])
const allCorrectionValues = ref<CorrectionValue[]>([])
const adminUsers = ref<AdminUser[]>([])
const usersLoaded = ref(false)
const deleteConfirm = ref<{ show: boolean; userId: string; email: string }>({
  show: false,
  userId: '',
  email: '',
})

// Drawers via composable
const cropDrawer = useCrudDrawer(crops)
const nutrientDrawer = useCrudDrawer(demands)
const productDrawer = useCrudDrawer(products)
const correctionDrawer = useCrudDrawer(correctionsList)

const editingCorrectionValues = computed(() =>
  correctionDrawer.editingId.value
    ? allCorrectionValues.value.filter((v) => v.correction_id === correctionDrawer.editingId.value)
    : undefined,
)

// Load all data
async function loadAll() {
  try {
    const [cropsData, typesData, demandsData, productsData, correctionsData] = await Promise.all([
      getCrops(),
      getNutrientTypes(),
      getAllNutrientDemands(),
      getAllProducts(),
      getCorrections(),
    ])
    crops.value = cropsData
    nutrientTypes.value = typesData
    demands.value = demandsData
    products.value = productsData
    correctionsList.value = correctionsData

    const allIds = correctionsData.map((c) => c.id)
    if (allIds.length > 0) {
      allCorrectionValues.value = await getCorrectionValues(allIds)
    }

    errorMessage.value = ''
  } catch {
    errorMessage.value = 'Admin-Daten konnten nicht geladen werden'
  }
}

onMounted(loadAll)

// Crop actions
async function saveCrop(data: Omit<Crop, 'id'>) {
  try {
    if (cropDrawer.editingId.value) {
      const updated = await updateCrop(cropDrawer.editingId.value, data)
      crops.value = crops.value.map((c) => (c.id === updated.id ? updated : c))
    } else {
      const created = await createCrop(data)
      crops.value.push(created)
    }
    cropDrawer.close()
  } catch {
    errorMessage.value = 'Kultur konnte nicht gespeichert werden'
  }
}
async function deleteCropItem() {
  if (!cropDrawer.editingId.value) return
  try {
    await deleteCrop(cropDrawer.editingId.value)
    crops.value = crops.value.filter((c) => c.id !== cropDrawer.editingId.value)
    cropDrawer.close()
  } catch {
    errorMessage.value = 'Kultur konnte nicht gelöscht werden'
  }
}

// Nutrient actions
async function saveDemand(data: Omit<CropNutrientDemand, 'id'>) {
  try {
    if (nutrientDrawer.editingId.value) {
      const updated = await updateNutrientDemand(nutrientDrawer.editingId.value, data)
      demands.value = demands.value.map((d) => (d.id === updated.id ? updated : d))
    } else {
      const created = await createNutrientDemand(data)
      demands.value.push(created)
    }
    nutrientDrawer.close()
  } catch {
    errorMessage.value = 'Nährstoffwert konnte nicht gespeichert werden'
  }
}
async function deleteDemandItem() {
  if (!nutrientDrawer.editingId.value) return
  try {
    await deleteNutrientDemand(nutrientDrawer.editingId.value)
    demands.value = demands.value.filter((d) => d.id !== nutrientDrawer.editingId.value)
    nutrientDrawer.close()
  } catch {
    errorMessage.value = 'Nährstoffwert konnte nicht gelöscht werden'
  }
}

// Product actions
async function saveProduct(data: Omit<FertilizerProduct, 'id'>) {
  const hasNutrient =
    data.n_pct > 0 || data.p2o5_pct > 0 || data.k2o_pct > 0 || data.mgo_pct > 0 || data.s_pct > 0
  if (!hasNutrient) {
    errorMessage.value = 'Mindestens ein Nährstoffgehalt muss größer als 0 sein'
    return
  }
  try {
    if (productDrawer.editingId.value) {
      const updated = await updateProduct(productDrawer.editingId.value, data)
      products.value = products.value.map((p) => (p.id === updated.id ? updated : p))
    } else {
      const created = await createProduct(data)
      products.value.push(created)
    }
    productDrawer.close()
  } catch {
    errorMessage.value = 'Produkt konnte nicht gespeichert werden'
  }
}
async function deleteProductItem() {
  if (!productDrawer.editingId.value) return
  try {
    await deleteProduct(productDrawer.editingId.value)
    products.value = products.value.filter((p) => p.id !== productDrawer.editingId.value)
    productDrawer.close()
  } catch {
    errorMessage.value = 'Produkt konnte nicht gelöscht werden'
  }
}

// Correction actions
async function saveCorrection(data: {
  correction: Omit<Correction, 'id'>
  values: { nutrient_type_id: string; value_kg_ha: number }[]
}) {
  try {
    if (correctionDrawer.editingId.value) {
      await updateCorrection(correctionDrawer.editingId.value, data.correction, data.values)
    } else {
      await createCorrection(data.correction, data.values)
    }
    correctionDrawer.close()
    await loadAll()
  } catch {
    errorMessage.value = 'Korrektur konnte nicht gespeichert werden'
  }
}
async function deleteCorrectionItem() {
  if (!correctionDrawer.editingId.value) return
  try {
    await deleteCorrection(correctionDrawer.editingId.value)
    correctionDrawer.close()
    await loadAll()
  } catch {
    errorMessage.value = 'Korrektur konnte nicht gelöscht werden'
  }
}

// User management (lazy-loaded)
watch(activeTab, async (tab) => {
  if (tab === 'users' && !usersLoaded.value) {
    await loadUsers()
    usersLoaded.value = true
  }
})

async function loadUsers() {
  try {
    adminUsers.value = await getAdminUsers()
  } catch {
    errorMessage.value = 'Benutzerliste konnte nicht geladen werden'
  }
}

async function handleBanUser(userId: string) {
  try {
    await banUser(userId)
    await loadUsers()
  } catch {
    errorMessage.value = 'Benutzer konnte nicht gesperrt werden'
  }
}

async function handleUnbanUser(userId: string) {
  try {
    await unbanUser(userId)
    await loadUsers()
  } catch {
    errorMessage.value = 'Benutzer konnte nicht entsperrt werden'
  }
}

function confirmDeleteUser(userId: string, email: string) {
  deleteConfirm.value = { show: true, userId, email }
}

async function handleDeleteUser() {
  try {
    await adminDeleteUser(deleteConfirm.value.userId)
    deleteConfirm.value.show = false
    await loadUsers()
  } catch {
    errorMessage.value = 'Benutzer konnte nicht gelöscht werden'
  }
}
</script>
