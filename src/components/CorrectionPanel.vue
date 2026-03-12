<template>
  <div data-testid="correction-panel" class="rounded-lg border border-gray-200 bg-white">
    <button
      data-testid="correction-panel-toggle"
      class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700"
      @click="expanded = !expanded"
    >
      <span>Korrekturfaktoren (optional)</span>
      <span class="text-gray-400">{{ expanded ? '▲' : '▼' }}</span>
    </button>

    <div v-if="expanded" class="space-y-3 px-4 pb-4">
      <!-- Vorfrucht -->
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-500">Vorfrucht</label>
        <select
          data-testid="correction-vorfrucht-select"
          :value="vorfruchtId ?? ''"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          @change="$emit('update:vorfruchtId', ($event.target as HTMLSelectElement).value || null)"
        >
          <option value="">— keine —</option>
          <option v-for="c in vorfruchtOptions" :key="c.id" :value="c.id">{{ c.label_de }}</option>
        </select>
      </div>

      <!-- Zwischenfrucht -->
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-500">Zwischenfrucht</label>
        <select
          data-testid="correction-zwischenfrucht-select"
          :value="zwischenfruchtId ?? ''"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          @change="$emit('update:zwischenfruchtId', ($event.target as HTMLSelectElement).value || null)"
        >
          <option value="">— keine —</option>
          <option v-for="c in zwischenfruchtOptions" :key="c.id" :value="c.id">{{ c.label_de }}</option>
        </select>
      </div>

      <!-- Humus -->
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-500">Humus</label>
        <select
          data-testid="correction-humus-select"
          :value="humusId ?? ''"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          @change="$emit('update:humusId', ($event.target as HTMLSelectElement).value || null)"
        >
          <option value="">— keine —</option>
          <option v-for="c in humusOptions" :key="c.id" :value="c.id">{{ c.label_de }}</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Correction } from '@/types'

const props = defineProps<{
  corrections: Correction[]
  vorfruchtId: string | null
  zwischenfruchtId: string | null
  humusId: string | null
}>()

defineEmits<{
  'update:vorfruchtId': [id: string | null]
  'update:zwischenfruchtId': [id: string | null]
  'update:humusId': [id: string | null]
}>()

const expanded = ref(false)

const vorfruchtOptions = computed(() =>
  props.corrections.filter(c => c.type === 'vorfrucht').sort((a, b) => a.sort_order - b.sort_order)
)
const zwischenfruchtOptions = computed(() =>
  props.corrections.filter(c => c.type === 'zwischenfrucht').sort((a, b) => a.sort_order - b.sort_order)
)
const humusOptions = computed(() =>
  props.corrections.filter(c => c.type === 'humus').sort((a, b) => a.sort_order - b.sort_order)
)
</script>
