<template>
  <div data-testid="correction-panel" class="rounded-2xl bg-white shadow-warm-sm">
    <button
      data-testid="correction-panel-toggle"
      class="flex w-full items-center justify-between px-4 py-3.5 text-sm font-medium text-stone-700 transition-colors hover:bg-parchment rounded-2xl"
      @click="expanded = !expanded"
    >
      <span>Korrekturfaktoren (optional)</span>
      <svg
        class="h-4 w-4 text-stone-400 transition-transform duration-200"
        :class="{ 'rotate-180': expanded }"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <div v-if="expanded" class="space-y-3.5 px-4 pb-4">
      <!-- Vorfrucht -->
      <div>
        <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">Vorfrucht</label>
        <select
          data-testid="correction-vorfrucht-select"
          :value="vorfruchtId ?? ''"
          class="w-full rounded-xl border border-stone-200 bg-parchment px-4 py-2.5 text-sm text-stone-900 transition-all duration-200 focus:border-field-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-field-500/20"
          @change="$emit('update:vorfruchtId', ($event.target as HTMLSelectElement).value || null)"
        >
          <option value="">— keine —</option>
          <option v-for="c in vorfruchtOptions" :key="c.id" :value="c.id">{{ c.label_de }}</option>
        </select>
      </div>

      <!-- Zwischenfrucht -->
      <div>
        <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">Zwischenfrucht</label>
        <select
          data-testid="correction-zwischenfrucht-select"
          :value="zwischenfruchtId ?? ''"
          class="w-full rounded-xl border border-stone-200 bg-parchment px-4 py-2.5 text-sm text-stone-900 transition-all duration-200 focus:border-field-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-field-500/20"
          @change="
            $emit('update:zwischenfruchtId', ($event.target as HTMLSelectElement).value || null)
          "
        >
          <option value="">— keine —</option>
          <option v-for="c in zwischenfruchtOptions" :key="c.id" :value="c.id">
            {{ c.label_de }}
          </option>
        </select>
      </div>

      <!-- Humus -->
      <div>
        <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">Humus</label>
        <select
          data-testid="correction-humus-select"
          :value="humusId ?? ''"
          class="w-full rounded-xl border border-stone-200 bg-parchment px-4 py-2.5 text-sm text-stone-900 transition-all duration-200 focus:border-field-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-field-500/20"
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
  props.corrections
    .filter((c) => c.type === 'vorfrucht')
    .sort((a, b) => a.sort_order - b.sort_order),
)
const zwischenfruchtOptions = computed(() =>
  props.corrections
    .filter((c) => c.type === 'zwischenfrucht')
    .sort((a, b) => a.sort_order - b.sort_order),
)
const humusOptions = computed(() =>
  props.corrections.filter((c) => c.type === 'humus').sort((a, b) => a.sort_order - b.sort_order),
)
</script>
