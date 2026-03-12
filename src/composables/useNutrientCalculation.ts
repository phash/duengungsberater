import type { CropNutrientDemand, NutrientType, NutrientResult, ActiveCorrection, CorrectionBreakdownItem } from '@/types'

export function useNutrientCalculation() {
  function calculateNutrientDemand(
    demands: CropNutrientDemand[],
    nutrientTypes: NutrientType[],
    expectedYieldDtHa: number,
    fieldSizeHa: number,
    activeCorrections?: ActiveCorrection[],
    nminKgHa?: number,
  ): NutrientResult[] {
    return demands
      .map((demand) => {
        const nutrient = nutrientTypes.find((nt) => nt.id === demand.nutrient_type_id)
        if (!nutrient) return null

        const yieldDiff = expectedYieldDtHa - demand.ref_yield_dt_ha
        const baseDemand = demand.demand_kg_ha
        const yieldCorrection = yieldDiff * demand.per_yield_correction

        // Sum correction values for this nutrient
        const correctionItems: CorrectionBreakdownItem[] = []
        let sumCorrections = 0

        if (activeCorrections && activeCorrections.length > 0) {
          for (const ac of activeCorrections) {
            const cv = ac.values.find(v => v.nutrient_type_id === demand.nutrient_type_id)
            if (cv) {
              const typeLabel = ac.correction.type === 'vorfrucht' ? 'Vorfrucht'
                : ac.correction.type === 'zwischenfrucht' ? 'Zwischenfrucht'
                : 'Humus'
              correctionItems.push({
                label: `${typeLabel} (${ac.correction.label_de})`,
                value_kg_ha: cv.value_kg_ha,
              })
              sumCorrections += cv.value_kg_ha
            }
          }
        }

        // Add Nmin deduction to breakdown (N only)
        if (nminKgHa && nminKgHa > 0 && nutrient.code === 'N') {
          correctionItems.push({
            label: 'Nmin (Bodenprobe)',
            value_kg_ha: -nminKgHa,
          })
        }

        const nminDeduction = (nminKgHa && nutrient.code === 'N') ? nminKgHa : 0
        const valueKgHa = Math.max(0, baseDemand + yieldCorrection + sumCorrections - nminDeduction)

        const result: NutrientResult = {
          nutrient_code: nutrient.code,
          nutrient_label: nutrient.label_de,
          value_kg_ha: Math.round(valueKgHa * 100) / 100,
          value_kg_total: Math.round(valueKgHa * fieldSizeHa * 100) / 100,
          unit: nutrient.unit,
        }

        const hasBreakdown = (activeCorrections && activeCorrections.length > 0) || (nminKgHa && nminKgHa > 0)
        if (hasBreakdown) {
          result.breakdown = {
            base_demand_kg_ha: baseDemand,
            yield_correction_kg_ha: Math.round(yieldCorrection * 100) / 100,
            corrections_kg_ha: correctionItems,
          }
        }

        return result
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
