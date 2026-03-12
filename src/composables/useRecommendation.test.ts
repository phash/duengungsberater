import { describe, it, expect } from 'vitest'
import { useRecommendation } from './useRecommendation'
import type { FertilizerProduct, NutrientResult } from '@/types'

const mockProducts: FertilizerProduct[] = [
  {
    id: 'fp-kas',
    name: 'KAS 27% N',
    n_pct: 27,
    p2o5_pct: 0,
    k2o_pct: 0,
    mgo_pct: 4,
    s_pct: 0,
    form: 'mineral',
    affiliate_url: '',
    shop_name: 'Dünger-Shop.de',
    active: true,
  },
  {
    id: 'fp-dap',
    name: 'DAP 18/46',
    n_pct: 18,
    p2o5_pct: 46,
    k2o_pct: 0,
    mgo_pct: 0,
    s_pct: 0,
    form: 'mineral',
    affiliate_url: '',
    shop_name: 'Dünger-Shop.de',
    active: true,
  },
  {
    id: 'fp-kornkali',
    name: 'Kornkali 40% K2O',
    n_pct: 0,
    p2o5_pct: 0,
    k2o_pct: 40,
    mgo_pct: 6,
    s_pct: 4,
    form: 'mineral',
    affiliate_url: '',
    shop_name: 'Dünger-Shop.de',
    active: true,
  },
]

describe('useRecommendation', () => {
  const { matchProducts } = useRecommendation()

  describe('matchProducts', () => {
    it('matches N product for nitrogen demand', () => {
      const results: NutrientResult[] = [
        {
          nutrient_code: 'N',
          nutrient_label: 'Stickstoff',
          value_kg_ha: 230,
          value_kg_total: 2300,
          unit: 'kg/ha',
        },
      ]
      const matches = matchProducts(results, mockProducts)
      const nMatch = matches.find((m) => m.product.id === 'fp-kas')
      expect(nMatch).toBeDefined()
      expect(nMatch!.amount_kg_ha).toBeCloseTo(851.85, 0)
    })

    it('matches P2O5 product for phosphate demand', () => {
      const results: NutrientResult[] = [
        {
          nutrient_code: 'P2O5',
          nutrient_label: 'Phosphat',
          value_kg_ha: 64,
          value_kg_total: 640,
          unit: 'kg/ha',
        },
      ]
      const matches = matchProducts(results, mockProducts)
      const pMatch = matches.find((m) => m.product.id === 'fp-dap')
      expect(pMatch).toBeDefined()
      expect(pMatch!.amount_kg_ha).toBeCloseTo(139.13, 0)
    })

    it('calculates total amount based on field size', () => {
      const results: NutrientResult[] = [
        {
          nutrient_code: 'N',
          nutrient_label: 'Stickstoff',
          value_kg_ha: 230,
          value_kg_total: 2300,
          unit: 'kg/ha',
        },
      ]
      const matches = matchProducts(results, mockProducts)
      const nMatch = matches.find((m) => m.product.id === 'fp-kas')!
      expect(nMatch.amount_kg_total).toBeCloseTo(8518.52, 0)
    })

    it('returns empty array when no demand', () => {
      const matches = matchProducts([], mockProducts)
      expect(matches).toHaveLength(0)
    })

    it('skips nutrients with no matching product', () => {
      const results: NutrientResult[] = [
        {
          nutrient_code: 'Ca',
          nutrient_label: 'Calcium',
          value_kg_ha: 50,
          value_kg_total: 500,
          unit: 'kg/ha',
        },
      ]
      const matches = matchProducts(results, mockProducts)
      expect(matches).toHaveLength(0)
    })
  })
})
