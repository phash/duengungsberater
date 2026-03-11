import type { CropNutrientDemand, NutrientType, NutrientResult } from '@/types'

export function useNutrientCalculation() {
  function calculateNutrientDemand(
    demands: CropNutrientDemand[],
    nutrientTypes: NutrientType[],
    expectedYieldDtHa: number,
    fieldSizeHa: number,
  ): NutrientResult[] {
    return demands
      .map((demand) => {
        const nutrient = nutrientTypes.find((nt) => nt.id === demand.nutrient_type_id)
        if (!nutrient) return null

        const yieldDiff = expectedYieldDtHa - demand.ref_yield_dt_ha
        const valueKgHa = Math.max(0, demand.demand_kg_ha + yieldDiff * demand.per_yield_correction)

        return {
          nutrient_code: nutrient.code,
          nutrient_label: nutrient.label_de,
          value_kg_ha: Math.round(valueKgHa * 100) / 100,
          value_kg_total: Math.round(valueKgHa * fieldSizeHa * 100) / 100,
          unit: nutrient.unit,
        } satisfies NutrientResult
      })
      .filter((r): r is NutrientResult => r !== null)
      .sort((a, b) => {
        const orderA = nutrientTypes.find((nt) => nt.code === a.nutrient_code)?.sort_order ?? 99
        const orderB = nutrientTypes.find((nt) => nt.code === b.nutrient_code)?.sort_order ?? 99
        return orderA - orderB
      })
  }

  return { calculateNutrientDemand }
}
