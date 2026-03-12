import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AdminNutrientList from './AdminNutrientList.vue'
import type { CropNutrientDemand, NutrientType, Crop } from '@/types'

const mockNutrientTypes: NutrientType[] = [
  { id: 'nt-n', code: 'N', label_de: 'Stickstoff', unit: 'kg/ha', sort_order: 1, is_system: true },
]
const mockCrops: Crop[] = [
  {
    id: 'crop-winterweizen',
    name_de: 'Winterweizen',
    category: 'Getreide',
    sow_month_from: 9,
    sow_month_to: 11,
    harvest_month_from: 7,
    harvest_month_to: 8,
    ref_yield_dt_ha: 80,
    nmin_depth_cm: 90,
  },
]
const mockDemands: CropNutrientDemand[] = [
  {
    id: 'cnd-1',
    crop_id: 'crop-winterweizen',
    nutrient_type_id: 'nt-n',
    demand_kg_ha: 230,
    ref_yield_dt_ha: 80,
    per_yield_correction: 1.0,
    source: 'lfl',
    user_id: null,
    valid_from: '2025-01-01',
  },
]

describe('AdminNutrientList', () => {
  it('renders list of demands', () => {
    const wrapper = mount(AdminNutrientList, {
      props: { demands: mockDemands, nutrientTypes: mockNutrientTypes, crops: mockCrops },
    })
    expect(wrapper.findAll('[data-testid^="admin-nutrient-item-"]')).toHaveLength(1)
  })
  it('displays crop name, nutrient code, and demand', () => {
    const wrapper = mount(AdminNutrientList, {
      props: { demands: mockDemands, nutrientTypes: mockNutrientTypes, crops: mockCrops },
    })
    const item = wrapper.find('[data-testid="admin-nutrient-item-cnd-1"]')
    expect(item.text()).toContain('Winterweizen')
    expect(item.text()).toContain('N')
    expect(item.text()).toContain('230')
  })
  it('emits select when demand is clicked', async () => {
    const wrapper = mount(AdminNutrientList, {
      props: { demands: mockDemands, nutrientTypes: mockNutrientTypes, crops: mockCrops },
    })
    await wrapper.find('[data-testid="admin-nutrient-item-cnd-1"]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['cnd-1']])
  })
})
