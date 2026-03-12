import type { NutrientType } from '@/types'

export const NUTRIENT_TYPES: NutrientType[] = [
  { id: 'nt-n', code: 'N', label_de: 'Stickstoff', unit: 'kg/ha', sort_order: 1, is_system: true },
  {
    id: 'nt-p2o5',
    code: 'P2O5',
    label_de: 'Phosphat',
    unit: 'kg/ha',
    sort_order: 2,
    is_system: true,
  },
  { id: 'nt-k2o', code: 'K2O', label_de: 'Kalium', unit: 'kg/ha', sort_order: 3, is_system: true },
  {
    id: 'nt-mgo',
    code: 'MgO',
    label_de: 'Magnesium',
    unit: 'kg/ha',
    sort_order: 4,
    is_system: true,
  },
  { id: 'nt-s', code: 'S', label_de: 'Schwefel', unit: 'kg/ha', sort_order: 5, is_system: true },
]

export function getNutrientByCode(code: string): NutrientType | undefined {
  return NUTRIENT_TYPES.find((n) => n.code === code)
}
