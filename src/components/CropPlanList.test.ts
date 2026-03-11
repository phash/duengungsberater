import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CropPlanList from './CropPlanList.vue'
import type { FieldCropPlan, Crop } from '@/types'

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

const mockPlans: FieldCropPlan[] = [
  {
    id: 'plan-1',
    field_id: 'f1',
    crop_id: 'crop-winterweizen',
    season_year: 2026,
    expected_yield_dt_ha: 85,
    synced: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

describe('CropPlanList', () => {
  it('renders empty state when no plans', () => {
    const wrapper = mount(CropPlanList, { props: { plans: [], crops: mockCrops } })
    expect(wrapper.find('[data-testid="crop-plans-empty-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="crop-plan-list"]').exists()).toBe(false)
  })

  it('renders list of plans', () => {
    const wrapper = mount(CropPlanList, { props: { plans: mockPlans, crops: mockCrops } })
    expect(wrapper.find('[data-testid="crop-plan-list"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid^="plan-item-"]')).toHaveLength(1)
  })

  it('displays crop name and season', () => {
    const wrapper = mount(CropPlanList, { props: { plans: mockPlans, crops: mockCrops } })
    const item = wrapper.find('[data-testid="plan-item-plan-1"]')
    expect(item.text()).toContain('Winterweizen')
    expect(item.text()).toContain('2026')
  })

  it('displays expected yield in German format', () => {
    const wrapper = mount(CropPlanList, { props: { plans: mockPlans, crops: mockCrops } })
    const item = wrapper.find('[data-testid="plan-item-plan-1"]')
    expect(item.text()).toContain('85 dt/ha')
  })

  it('emits select when plan is clicked', async () => {
    const wrapper = mount(CropPlanList, { props: { plans: mockPlans, crops: mockCrops } })
    await wrapper.find('[data-testid="plan-item-plan-1"]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['plan-1']])
  })

  it('emits navigate when Empfehlung button is clicked', async () => {
    const wrapper = mount(CropPlanList, { props: { plans: mockPlans, crops: mockCrops } })
    await wrapper.find('[data-testid="plan-empfehlung-button-plan-1"]').trigger('click')
    expect(wrapper.emitted('navigate')).toEqual([['plan-1']])
    expect(wrapper.emitted('select')).toBeUndefined()
  })
})
