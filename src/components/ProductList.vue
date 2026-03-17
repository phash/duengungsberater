<template>
  <div v-if="matches.length > 0" data-testid="product-list" class="rounded-2xl bg-white p-5 shadow-warm-sm">
    <h3 class="mb-4 font-display text-base font-semibold text-stone-800">Empfohlene Düngerprodukte</h3>
    <div class="space-y-3">
      <div
        v-for="match in matches"
        :key="match.product.id"
        :data-testid="`product-item-${match.product.id}`"
        class="rounded-xl bg-parchment p-3.5"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-sm text-stone-800">{{ match.product.name }}</p>
            <p class="mt-1 text-xs text-stone-500">
              <NumberDisplay :value="match.amount_kg_ha" format="nutrient-per-ha" code="Produkt" />
              · gesamt: {{ formatKg(match.amount_kg_total) }}
            </p>
          </div>
          <a
            v-if="match.product.affiliate_url"
            :href="match.product.affiliate_url"
            :data-testid="`product-link-${match.product.id}`"
            target="_blank"
            rel="noopener noreferrer"
            class="shrink-0 rounded-xl bg-harvest px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:brightness-110 active:scale-95"
          >
            {{ match.product.shop_name }} →
          </a>
        </div>
      </div>
    </div>
    <p class="mt-4 text-xs text-stone-400">
      Shop-Links sind Affiliate-Links. Bei Kauf erhalten wir eine Provision.
    </p>
  </div>
</template>

<script setup lang="ts">
import type { ProductMatch } from '@/types'
import NumberDisplay from './NumberDisplay.vue'
import { useNumberFormat } from '@/composables/useNumberFormat'

defineProps<{
  matches: ProductMatch[]
}>()

const { formatNumber } = useNumberFormat()

function formatKg(kg: number): string {
  return `${formatNumber(kg)} kg`
}
</script>
