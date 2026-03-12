<template>
  <ul class="space-y-2">
    <li
      v-for="product in products"
      :key="product.id"
      :data-testid="`admin-product-item-${product.id}`"
      class="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50"
      @click="$emit('select', product.id)"
    >
      <div>
        <p class="font-medium">{{ product.name }}</p>
        <p class="text-sm text-gray-500">{{ product.form }} · {{ product.shop_name }}</p>
      </div>
      <span
        class="rounded-full px-2 py-0.5 text-xs font-medium"
        :class="product.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'"
      >
        {{ product.active ? 'aktiv' : 'inaktiv' }}
      </span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { FertilizerProduct } from '@/types'
defineProps<{ products: FertilizerProduct[] }>()
defineEmits<{ select: [productId: string] }>()
</script>
