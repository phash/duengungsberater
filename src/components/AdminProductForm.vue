<template>
  <form class="space-y-4" @submit.prevent="handleSave">
    <div>
      <label class="block text-sm font-medium text-gray-700">Produktname</label>
      <input v-model="name" type="text" required data-testid="admin-product-name-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
    </div>
    <div class="grid grid-cols-3 gap-3">
      <div>
        <label class="block text-sm font-medium text-gray-700">N %</label>
        <input v-model.number="nPct" type="number" step="0.1" min="0" max="100" data-testid="admin-product-n-pct-input"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">P2O5 %</label>
        <input v-model.number="p2o5Pct" type="number" step="0.1" min="0" max="100" data-testid="admin-product-p2o5-pct-input"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">K2O %</label>
        <input v-model.number="k2oPct" type="number" step="0.1" min="0" max="100" data-testid="admin-product-k2o-pct-input"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm font-medium text-gray-700">MgO %</label>
        <input v-model.number="mgoPct" type="number" step="0.1" min="0" max="100" data-testid="admin-product-mgo-pct-input"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">S %</label>
        <input v-model.number="sPct" type="number" step="0.1" min="0" max="100" data-testid="admin-product-s-pct-input"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
      </div>
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700">Form</label>
      <select v-model="form" data-testid="admin-product-form-select"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2">
        <option value="mineral">Mineralisch</option>
        <option value="organic">Organisch</option>
      </select>
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700">Affiliate-URL</label>
      <input v-model="affiliateUrl" type="url" data-testid="admin-product-affiliate-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700">Shop-Name</label>
      <input v-model="shopName" type="text" data-testid="admin-product-shop-input"
        class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
    </div>
    <div class="flex items-center gap-2">
      <input v-model="active" type="checkbox" id="product-active" data-testid="admin-product-active-checkbox"
        class="rounded border-gray-300" />
      <label for="product-active" class="text-sm font-medium text-gray-700">Aktiv</label>
    </div>
    <button type="submit" data-testid="admin-product-speichern-button"
      class="w-full rounded-lg bg-green-700 px-4 py-2 text-white font-medium hover:bg-green-800">
      Speichern
    </button>
    <button v-if="product" type="button" data-testid="admin-product-loeschen-button"
      class="w-full rounded-lg border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
      @click="$emit('delete')">
      Produkt löschen
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FertilizerProduct } from '@/types'

const props = defineProps<{ product?: FertilizerProduct }>()
const emit = defineEmits<{ save: [data: Omit<FertilizerProduct, 'id'>]; delete: [] }>()

const name = ref(props.product?.name ?? '')
const nPct = ref(props.product?.n_pct ?? 0)
const p2o5Pct = ref(props.product?.p2o5_pct ?? 0)
const k2oPct = ref(props.product?.k2o_pct ?? 0)
const mgoPct = ref(props.product?.mgo_pct ?? 0)
const sPct = ref(props.product?.s_pct ?? 0)
const form = ref<'mineral' | 'organic'>(props.product?.form ?? 'mineral')
const affiliateUrl = ref(props.product?.affiliate_url ?? '')
const shopName = ref(props.product?.shop_name ?? '')
const active = ref(props.product?.active ?? true)

function handleSave() {
  emit('save', {
    name: name.value,
    n_pct: Number(nPct.value),
    p2o5_pct: Number(p2o5Pct.value),
    k2o_pct: Number(k2oPct.value),
    mgo_pct: Number(mgoPct.value),
    s_pct: Number(sPct.value),
    form: form.value,
    affiliate_url: affiliateUrl.value,
    shop_name: shopName.value,
    active: active.value,
  })
}
</script>
