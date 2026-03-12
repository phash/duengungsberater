import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AdminCropList from './AdminCropList.vue'
import type { Crop } from '@/types'

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
  {
    id: 'crop-wintergerste',
    name_de: 'Wintergerste',
    category: 'Getreide',
    sow_month_from: 9,
    sow_month_to: 10,
    harvest_month_from: 6,
    harvest_month_to: 7,
    ref_yield_dt_ha: 70,
    nmin_depth_cm: 90,
  },
]

describe('AdminCropList', () => {
  it('renders list of crops', () => {
    const wrapper = mount(AdminCropList, { props: { crops: mockCrops } })
    expect(wrapper.findAll('[data-testid^="admin-crop-item-"]')).toHaveLength(2)
  })

  it('displays crop name and category', () => {
    const wrapper = mount(AdminCropList, { props: { crops: mockCrops } })
    const item = wrapper.find('[data-testid="admin-crop-item-crop-winterweizen"]')
    expect(item.text()).toContain('Winterweizen')
    expect(item.text()).toContain('Getreide')
  })

  it('emits select when crop is clicked', async () => {
    const wrapper = mount(AdminCropList, { props: { crops: mockCrops } })
    await wrapper.find('[data-testid="admin-crop-item-crop-winterweizen"]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['crop-winterweizen']])
  })
})
