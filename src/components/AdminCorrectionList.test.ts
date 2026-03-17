import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AdminCorrectionList from './AdminCorrectionList.vue'
import type { Correction, CorrectionValue, NutrientType } from '@/types'

const mockNutrientTypes: NutrientType[] = [
  { id: 'nt-n', code: 'N', label_de: 'Stickstoff', unit: 'kg/ha', sort_order: 1, is_system: true },
]

const mockCorrections: Correction[] = [
  { id: 'c1', type: 'vorfrucht', label_de: 'Winterraps', sort_order: 1 },
  { id: 'c2', type: 'zwischenfrucht', label_de: 'Leguminosen', sort_order: 1 },
  { id: 'c3', type: 'humus', label_de: '> 4%', sort_order: 2 },
]

const mockValues: CorrectionValue[] = [
  { id: 'cv1', correction_id: 'c1', nutrient_type_id: 'nt-n', value_kg_ha: -10 },
  { id: 'cv2', correction_id: 'c2', nutrient_type_id: 'nt-n', value_kg_ha: -10 },
  { id: 'cv3', correction_id: 'c3', nutrient_type_id: 'nt-n', value_kg_ha: -20 },
]

const defaultProps = {
  corrections: mockCorrections,
  correctionValues: mockValues,
  nutrientTypes: mockNutrientTypes,
}

describe('AdminCorrectionList', () => {
  it('renders all corrections grouped by type', () => {
    const wrapper = mount(AdminCorrectionList, { props: defaultProps })
    expect(wrapper.text()).toContain('Vorfrucht')
    expect(wrapper.text()).toContain('Zwischenfrucht')
    expect(wrapper.text()).toContain('Humus')
  })

  it('shows correction label and N value preview with nutrient code', () => {
    const wrapper = mount(AdminCorrectionList, { props: defaultProps })
    expect(wrapper.find('[data-testid="admin-correction-item-c1"]').text()).toContain('Winterraps')
    expect(wrapper.find('[data-testid="admin-correction-item-c1"]').text()).toContain('N: -10')
  })

  it('emits select with correction id on click', async () => {
    const wrapper = mount(AdminCorrectionList, { props: defaultProps })
    await wrapper.find('[data-testid="admin-correction-item-c1"]').trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0]).toEqual(['c1'])
  })

  it('renders empty state when no corrections', () => {
    const wrapper = mount(AdminCorrectionList, {
      props: { corrections: [], correctionValues: [], nutrientTypes: mockNutrientTypes },
    })
    expect(wrapper.text()).toContain('Keine Korrekturen')
  })
})
