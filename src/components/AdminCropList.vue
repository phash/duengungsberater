<template>
  <ul class="space-y-2">
    <li
      v-for="crop in crops"
      :key="crop.id"
      :data-testid="`admin-crop-item-${crop.id}`"
      class="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50"
      @click="$emit('select', crop.id)"
    >
      <div>
        <p class="font-medium">{{ crop.name_de }}</p>
        <p class="text-sm text-gray-500">
          {{ crop.category }} · Ref: {{ crop.ref_yield_dt_ha }} dt/ha
        </p>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { Crop } from '@/types'
defineProps<{ crops: Crop[] }>()
defineEmits<{ select: [cropId: string] }>()
</script>
