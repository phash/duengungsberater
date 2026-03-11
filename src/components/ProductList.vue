<template>
  <div v-if="matches.length > 0" data-testid="product-list" class="rounded-xl border border-gray-200 bg-white p-4">
    <h3 class="mb-3 text-sm font-semibold text-gray-700">Empfohlene Düngerprodukte</h3>
    <div class="space-y-3">
      <div
        v-for="match in matches"
        :key="match.product.id"
        :data-testid="`product-item-${match.product.id}`"
        class="rounded-lg border border-gray-100 bg-gray-50 p-3"
      >
        <div class="flex items-start justify-between">
          <div>
            <p class="font-medium text-sm">{{ match.product.name }}</p>
            <p class="text-xs text-gray-500 mt-1">
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
            class="shrink-0 rounded-lg bg-green-700 px-3 py-1 text-xs font-medium text-white hover:bg-green-800"
          >
            {{ match.product.shop_name }} →
          </a>
        </div>
      </div>
    </div>
    <p class="mt-3 text-xs text-gray-400">
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
