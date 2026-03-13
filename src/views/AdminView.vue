<template>
  <AppLayout title="Admin">
    <div class="space-y-4 pb-24">
      <!-- Tab navigation -->
      <div data-testid="admin-tabs" class="flex gap-1 rounded-xl bg-gray-100 p-1">
        <button
          data-testid="admin-tab-crops"
          :class="[
            'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
            activeTab === 'crops'
              ? 'bg-white text-green-800 shadow'
              : 'text-gray-600 hover:text-gray-800',
          ]"
          @click="activeTab = 'crops'"
        >
          Kulturen
        </button>
        <button
          data-testid="admin-tab-nutrients"
          :class="[
            'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
            activeTab === 'nutrients'
              ? 'bg-white text-green-800 shadow'
              : 'text-gray-600 hover:text-gray-800',
          ]"
          @click="activeTab = 'nutrients'"
        >
          Nährstoffwerte
        </button>
        <button
          data-testid="admin-tab-products"
          :class="[
            'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
            activeTab === 'products'
              ? 'bg-white text-green-800 shadow'
              : 'text-gray-600 hover:text-gray-800',
          ]"
          @click="activeTab = 'products'"
        >
          Produkte
        </button>
        <button
          data-testid="admin-tab-corrections"
          :class="[
            'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
            activeTab === 'corrections'
              ? 'bg-white text-green-800 shadow'
              : 'text-gray-600 hover:text-gray-800',
          ]"
          @click="activeTab = 'corrections'"
        >
          Korrekturen
        </button>
      </div>

      <!-- Error message -->
      <p
        v-if="errorMessage"
        data-testid="admin-error"
        class="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600"
      >
        {{ errorMessage }}
      </p>

      <!-- Kulturen tab -->
      <template v-if="activeTab === 'crops'">
        <button
          data-testid="admin-crop-anlegen-button"
          class="w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 hover:border-green-500 hover:text-green-700"
          @click="openNewCrop"
        >
          + Kultur anlegen
        </button>
        <AdminCropList :crops="crops" @select="openEditCrop" />
      </template>

      <!-- Nährstoffwerte tab -->
      <template v-if="activeTab === 'nutrients'">
        <button
          data-testid="admin-nutrient-anlegen-button"
          class="w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 hover:border-green-500 hover:text-green-700"
          @click="openNewNutrient"
        >
          + Nährstoffwert anlegen
        </button>
        <AdminNutrientList
          :demands="demands"
          :nutrient-types="nutrientTypes"
          :crops="crops"
          @select="openEditNutrient"
        />
      </template>

      <!-- Produkte tab -->
      <template v-if="activeTab === 'products'">
        <button
          data-testid="admin-product-anlegen-button"
          class="w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 hover:border-green-500 hover:text-green-700"
          @click="openNewProduct"
        >
          + Produkt anlegen
        </button>
        <AdminProductList :products="products" @select="openEditProduct" />
      </template>

      <!-- Korrekturen tab -->
      <template v-if="activeTab === 'corrections'">
        <button
          data-testid="admin-correction-anlegen-button"
          class="w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 hover:border-green-500 hover:text-green-700"
          @click="openNewCorrection"
        >
          + Korrektur anlegen
        </button>
        <AdminCorrectionList
          :corrections="correctionsList"
          :correction-values="allCorrectionValues"
          :nutrient-types="nutrientTypes"
          @select="openEditCorrection"
        />
      </template>
    </div>

    <!-- Crop Drawer -->
    <DrawerModal
      :open="cropDrawerOpen"
      :title="editingCropId ? 'Kultur bearbeiten' : 'Neue Kultur'"
      @close="closeCropDrawer"
    >
      <AdminCropForm :crop="editingCrop" @save="saveCrop" @delete="deleteCropItem" />
    </DrawerModal>

    <!-- Nutrient Drawer -->
    <DrawerModal
      :open="nutrientDrawerOpen"
      :title="editingDemandId ? 'Nährstoffwert bearbeiten' : 'Neuer Nährstoffwert'"
      @close="closeNutrientDrawer"
    >
      <AdminNutrientForm
        :crops="crops"
        :nutrient-types="nutrientTypes"
        :demand="editingDemand"
        @save="saveDemand"
        @delete="deleteDemandItem"
      />
    </DrawerModal>

    <!-- Product Drawer -->
    <DrawerModal
      :open="productDrawerOpen"
      :title="editingProductId ? 'Produkt bearbeiten' : 'Neues Produkt'"
      @close="closeProductDrawer"
    >
      <AdminProductForm :product="editingProduct" @save="saveProduct" @delete="deleteProductItem" />
    </DrawerModal>

    <!-- Correction Drawer -->
    <DrawerModal
      :open="correctionDrawerOpen"
      :title="editingCorrectionId ? 'Korrektur bearbeiten' : 'Neue Korrektur'"
      @close="closeCorrectionDrawer"
    >
      <AdminCorrectionForm
        :nutrient-types="nutrientTypes"
        :correction="editingCorrection"
        :correction-values="editingCorrectionValues"
        @save="saveCorrection"
        @delete="deleteCorrectionItem"
      />
    </DrawerModal>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
import type {
  Crop,
  CropNutrientDemand,
  NutrientType,
  FertilizerProduct,
  Correction,
  CorrectionValue,
} from '@/types'

// State
const activeTab = ref<'crops' | 'nutrients' | 'products' | 'corrections'>('crops')
const errorMessage = ref('')

const crops = ref<Crop[]>([])
const nutrientTypes = ref<NutrientType[]>([])
const demands = ref<CropNutrientDemand[]>([])
const products = ref<FertilizerProduct[]>([])

// Crop drawer
const cropDrawerOpen = ref(false)
const editingCropId = ref<string | null>(null)
const editingCrop = computed(() =>
  editingCropId.value ? crops.value.find((c) => c.id === editingCropId.value) : undefined,
)

// Nutrient drawer
const nutrientDrawerOpen = ref(false)
const editingDemandId = ref<string | null>(null)
const editingDemand = computed(() =>
  editingDemandId.value ? demands.value.find((d) => d.id === editingDemandId.value) : undefined,
)

// Product drawer
const productDrawerOpen = ref(false)
const editingProductId = ref<string | null>(null)
const editingProduct = computed(() =>
  editingProductId.value ? products.value.find((p) => p.id === editingProductId.value) : undefined,
)

// Correction state
const correctionsList = ref<Correction[]>([])
const allCorrectionValues = ref<CorrectionValue[]>([])
const correctionDrawerOpen = ref(false)
const editingCorrectionId = ref<string | null>(null)
const editingCorrection = computed(() =>
  editingCorrectionId.value
    ? correctionsList.value.find((c) => c.id === editingCorrectionId.value)
    : undefined,
)
const editingCorrectionValues = computed(() =>
  editingCorrectionId.value
    ? allCorrectionValues.value.filter((v) => v.correction_id === editingCorrectionId.value)
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

    // Load all correction values for preview
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
function openNewCrop() {
  editingCropId.value = null
  cropDrawerOpen.value = true
}
function openEditCrop(cropId: string) {
  editingCropId.value = cropId
  cropDrawerOpen.value = true
}
function closeCropDrawer() {
  cropDrawerOpen.value = false
  editingCropId.value = null
}
async function saveCrop(data: Omit<Crop, 'id'>) {
  try {
    if (editingCropId.value) {
      const updated = await updateCrop(editingCropId.value, data)
      crops.value = crops.value.map((c) => (c.id === updated.id ? updated : c))
    } else {
      const created = await createCrop(data)
      crops.value.push(created)
    }
    closeCropDrawer()
  } catch {
    errorMessage.value = 'Kultur konnte nicht gespeichert werden'
  }
}
async function deleteCropItem() {
  if (!editingCropId.value) return
  try {
    await deleteCrop(editingCropId.value)
    crops.value = crops.value.filter((c) => c.id !== editingCropId.value)
    closeCropDrawer()
  } catch {
    errorMessage.value = 'Kultur konnte nicht gelöscht werden'
  }
}

// Nutrient actions
function openNewNutrient() {
  editingDemandId.value = null
  nutrientDrawerOpen.value = true
}
function openEditNutrient(demandId: string) {
  editingDemandId.value = demandId
  nutrientDrawerOpen.value = true
}
function closeNutrientDrawer() {
  nutrientDrawerOpen.value = false
  editingDemandId.value = null
}
async function saveDemand(data: Omit<CropNutrientDemand, 'id'>) {
  try {
    if (editingDemandId.value) {
      const updated = await updateNutrientDemand(editingDemandId.value, data)
      demands.value = demands.value.map((d) => (d.id === updated.id ? updated : d))
    } else {
      const created = await createNutrientDemand(data)
      demands.value.push(created)
    }
    closeNutrientDrawer()
  } catch {
    errorMessage.value = 'Nährstoffwert konnte nicht gespeichert werden'
  }
}
async function deleteDemandItem() {
  if (!editingDemandId.value) return
  try {
    await deleteNutrientDemand(editingDemandId.value)
    demands.value = demands.value.filter((d) => d.id !== editingDemandId.value)
    closeNutrientDrawer()
  } catch {
    errorMessage.value = 'Nährstoffwert konnte nicht gelöscht werden'
  }
}

// Product actions
function openNewProduct() {
  editingProductId.value = null
  productDrawerOpen.value = true
}
function openEditProduct(productId: string) {
  editingProductId.value = productId
  productDrawerOpen.value = true
}
function closeProductDrawer() {
  productDrawerOpen.value = false
  editingProductId.value = null
}
async function saveProduct(data: Omit<FertilizerProduct, 'id'>) {
  const hasNutrient =
    data.n_pct > 0 || data.p2o5_pct > 0 || data.k2o_pct > 0 || data.mgo_pct > 0 || data.s_pct > 0
  if (!hasNutrient) {
    errorMessage.value = 'Mindestens ein Nährstoffgehalt muss größer als 0 sein'
    return
  }
  try {
    if (editingProductId.value) {
      const updated = await updateProduct(editingProductId.value, data)
      products.value = products.value.map((p) => (p.id === updated.id ? updated : p))
    } else {
      const created = await createProduct(data)
      products.value.push(created)
    }
    closeProductDrawer()
  } catch {
    errorMessage.value = 'Produkt konnte nicht gespeichert werden'
  }
}
async function deleteProductItem() {
  if (!editingProductId.value) return
  try {
    await deleteProduct(editingProductId.value)
    products.value = products.value.filter((p) => p.id !== editingProductId.value)
    closeProductDrawer()
  } catch {
    errorMessage.value = 'Produkt konnte nicht gelöscht werden'
  }
}

// Correction actions
function openNewCorrection() {
  editingCorrectionId.value = null
  correctionDrawerOpen.value = true
}
function openEditCorrection(correctionId: string) {
  editingCorrectionId.value = correctionId
  correctionDrawerOpen.value = true
}
function closeCorrectionDrawer() {
  correctionDrawerOpen.value = false
  editingCorrectionId.value = null
}
async function saveCorrection(data: {
  correction: Omit<Correction, 'id'>
  values: { nutrient_type_id: string; value_kg_ha: number }[]
}) {
  try {
    if (editingCorrectionId.value) {
      await updateCorrection(editingCorrectionId.value, data.correction, data.values)
    } else {
      await createCorrection(data.correction, data.values)
    }
    closeCorrectionDrawer()
    await loadAll()
  } catch {
    errorMessage.value = 'Korrektur konnte nicht gespeichert werden'
  }
}
async function deleteCorrectionItem() {
  if (!editingCorrectionId.value) return
  try {
    await deleteCorrection(editingCorrectionId.value)
    closeCorrectionDrawer()
    await loadAll()
  } catch {
    errorMessage.value = 'Korrektur konnte nicht gelöscht werden'
  }
}
</script>
