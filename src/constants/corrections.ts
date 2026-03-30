import type { Correction, CorrectionValue } from '@/types'

// Stable IDs for seed data (referenced by correction_values and seed.sql)
const VORFRUCHT_WINTERRAPS = 'corr-vf-winterraps'
const VORFRUCHT_KOERNERLEGUMINOSEN = 'corr-vf-koernerleguminosen'
const VORFRUCHT_KARTOFFELN = 'corr-vf-kartoffeln'
const VORFRUCHT_ZUCKERRUEBEN = 'corr-vf-zuckerrueben'
const VORFRUCHT_MAIS = 'corr-vf-mais'
const VORFRUCHT_GETREIDE = 'corr-vf-getreide'

const ZF_LEGUMINOSEN = 'corr-zf-leguminosen'
const ZF_NICHTLEG_OHNE = 'corr-zf-nichtleg-ohne'
const ZF_NICHTLEG_MIT = 'corr-zf-nichtleg-mit'

const HUMUS_UNTER_4 = 'corr-humus-unter4'
const HUMUS_UEBER_4 = 'corr-humus-ueber4'

// N nutrient type ID (from src/constants/nutrients.ts)
const NT_N = 'nt-n'

export const DEFAULT_CORRECTIONS: Correction[] = [
  // Vorfrucht (LfL Tab. 9f)
  { id: VORFRUCHT_WINTERRAPS, type: 'vorfrucht', label_de: 'Winterraps', sort_order: 1 },
  {
    id: VORFRUCHT_KOERNERLEGUMINOSEN,
    type: 'vorfrucht',
    label_de: 'Körnerleguminosen',
    sort_order: 2,
  },
  { id: VORFRUCHT_KARTOFFELN, type: 'vorfrucht', label_de: 'Kartoffeln', sort_order: 3 },
  { id: VORFRUCHT_ZUCKERRUEBEN, type: 'vorfrucht', label_de: 'Zuckerrüben', sort_order: 4 },
  { id: VORFRUCHT_MAIS, type: 'vorfrucht', label_de: 'Mais', sort_order: 5 },
  { id: VORFRUCHT_GETREIDE, type: 'vorfrucht', label_de: 'Getreide', sort_order: 6 },

  // Zwischenfrucht (LfL Tab. 9f)
  { id: ZF_LEGUMINOSEN, type: 'zwischenfrucht', label_de: 'Leguminosen', sort_order: 1 },
  {
    id: ZF_NICHTLEG_OHNE,
    type: 'zwischenfrucht',
    label_de: 'Nichtleguminosen ohne Abfuhr (Gründüngung)',
    sort_order: 2,
  },
  {
    id: ZF_NICHTLEG_MIT,
    type: 'zwischenfrucht',
    label_de: 'Nichtleguminosen mit Abfuhr',
    sort_order: 3,
  },

  // Humus (LfL Tab. 9f)
  { id: HUMUS_UNTER_4, type: 'humus', label_de: '< 4% (kein Abschlag)', sort_order: 1 },
  { id: HUMUS_UEBER_4, type: 'humus', label_de: '> 4%', sort_order: 2 },
]

export const DEFAULT_CORRECTION_VALUES: CorrectionValue[] = [
  // Vorfrucht — N-Abschläge
  {
    id: 'cv-vf-winterraps-n',
    correction_id: VORFRUCHT_WINTERRAPS,
    nutrient_type_id: NT_N,
    value_kg_ha: -10,
  },
  {
    id: 'cv-vf-koernerleg-n',
    correction_id: VORFRUCHT_KOERNERLEGUMINOSEN,
    nutrient_type_id: NT_N,
    value_kg_ha: -10,
  },
  {
    id: 'cv-vf-kartoffeln-n',
    correction_id: VORFRUCHT_KARTOFFELN,
    nutrient_type_id: NT_N,
    value_kg_ha: 0,
  },
  {
    id: 'cv-vf-zuckerrueben-n',
    correction_id: VORFRUCHT_ZUCKERRUEBEN,
    nutrient_type_id: NT_N,
    value_kg_ha: 0,
  },
  { id: 'cv-vf-mais-n', correction_id: VORFRUCHT_MAIS, nutrient_type_id: NT_N, value_kg_ha: 0 },
  {
    id: 'cv-vf-getreide-n',
    correction_id: VORFRUCHT_GETREIDE,
    nutrient_type_id: NT_N,
    value_kg_ha: 0,
  },

  // Zwischenfrucht — N-Abschläge
  {
    id: 'cv-zf-leguminosen-n',
    correction_id: ZF_LEGUMINOSEN,
    nutrient_type_id: NT_N,
    value_kg_ha: -10,
  },
  {
    id: 'cv-zf-nichtleg-ohne-n',
    correction_id: ZF_NICHTLEG_OHNE,
    nutrient_type_id: NT_N,
    value_kg_ha: -20,
  },
  {
    id: 'cv-zf-nichtleg-mit-n',
    correction_id: ZF_NICHTLEG_MIT,
    nutrient_type_id: NT_N,
    value_kg_ha: 0,
  },

  // Humus — N-Abschläge
  { id: 'cv-humus-unter4-n', correction_id: HUMUS_UNTER_4, nutrient_type_id: NT_N, value_kg_ha: 0 },
  {
    id: 'cv-humus-ueber4-n',
    correction_id: HUMUS_UEBER_4,
    nutrient_type_id: NT_N,
    value_kg_ha: -20,
  },
]

export function getCorrectionsByType(type: Correction['type']): Correction[] {
  return DEFAULT_CORRECTIONS.filter((c) => c.type === type).sort(
    (a, b) => a.sort_order - b.sort_order,
  )
}

export function getCorrectionValuesForIds(correctionIds: string[]): CorrectionValue[] {
  return DEFAULT_CORRECTION_VALUES.filter((cv) => correctionIds.includes(cv.correction_id))
}
