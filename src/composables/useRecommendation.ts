import type { NutrientResult, FertilizerProduct, ProductMatch } from '@/types'

const NUTRIENT_TO_PCT: Record<string, keyof FertilizerProduct> = {
  N: 'n_pct',
  P2O5: 'p2o5_pct',
  K2O: 'k2o_pct',
  MgO: 'mgo_pct',
  S: 's_pct',
}

export function useRecommendation() {
  function matchProducts(
    nutrientResults: NutrientResult[],
    products: FertilizerProduct[],
  ): ProductMatch[] {
    const matches: ProductMatch[] = []

    for (const result of nutrientResults) {
      const pctKey = NUTRIENT_TO_PCT[result.nutrient_code]
      if (!pctKey) continue

      const bestProduct = products
        .filter((p) => (p[pctKey] as number) > 0)
        .sort((a, b) => (b[pctKey] as number) - (a[pctKey] as number))[0]

      if (!bestProduct) continue

      const pct = bestProduct[pctKey] as number
      const amountKgHa = Math.round((result.value_kg_ha / (pct / 100)) * 100) / 100
      const amountKgTotal = Math.round((result.value_kg_total / (pct / 100)) * 100) / 100

      matches.push({
        product: bestProduct,
        amount_kg_ha: amountKgHa,
        amount_kg_total: amountKgTotal,
      })
    }

    return matches
  }

  return { matchProducts }
}
