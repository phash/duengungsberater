import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CropPlanForm from './CropPlanForm.vue'
import type { Crop, FieldCropPlan } from '@/types'

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

describe('CropPlanForm', () => {
  it('renders crop select with all crops', () => {
    const wrapper = mount(CropPlanForm, { props: { crops: mockCrops } })
    const select = wrapper.find('[data-testid="plan-crop-select"]')
    expect(select.exists()).toBe(true)
    const options = select.findAll('option').filter((o) => o.element.value !== '')
    expect(options).toHaveLength(2)
  })

  it('pre-fills yield when crop is selected', async () => {
    const wrapper = mount(CropPlanForm, { props: { crops: mockCrops } })
    await wrapper.find('[data-testid="plan-crop-select"]').setValue('crop-winterweizen')
    const yieldInput = wrapper.find('[data-testid="plan-yield-input"]').element as HTMLInputElement
    expect(yieldInput.value).toBe('80')
  })

  it('pre-fills current year as season', () => {
    const wrapper = mount(CropPlanForm, { props: { crops: mockCrops } })
    const seasonInput = wrapper.find('[data-testid="plan-season-input"]').element as HTMLInputElement
    expect(seasonInput.value).toBe(new Date().getFullYear().toString())
  })

  it('pre-fills form when editing existing plan', () => {
    const plan: FieldCropPlan = {
      id: 'p1',
      field_id: 'f1',
      crop_id: 'crop-wintergerste',
      season_year: 2025,
      expected_yield_dt_ha: 75,
      synced: true,
      created_at: '',
      updated_at: '',
    }
    const wrapper = mount(CropPlanForm, { props: { crops: mockCrops, plan } })
    const cropSelect = wrapper.find('[data-testid="plan-crop-select"]').element as HTMLSelectElement
    const yieldInput = wrapper.find('[data-testid="plan-yield-input"]').element as HTMLInputElement
    const seasonInput = wrapper.find('[data-testid="plan-season-input"]').element as HTMLInputElement
    expect(cropSelect.value).toBe('crop-wintergerste')
    expect(yieldInput.value).toBe('75')
    expect(seasonInput.value).toBe('2025')
  })

  it('emits save with form data', async () => {
    const wrapper = mount(CropPlanForm, { props: { crops: mockCrops } })
    await wrapper.find('[data-testid="plan-crop-select"]').setValue('crop-winterweizen')
    await wrapper.find('[data-testid="plan-yield-input"]').setValue('90')
    await wrapper.find('[data-testid="plan-season-input"]').setValue('2026')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('save')).toEqual([[{
      crop_id: 'crop-winterweizen',
      season_year: 2026,
      expected_yield_dt_ha: 90,
    }]])
  })

  it('validates that crop is required', async () => {
    const wrapper = mount(CropPlanForm, { props: { crops: mockCrops } })
    await wrapper.find('[data-testid="plan-season-input"]').setValue('2026')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.find('[data-testid="plan-crop-error"]').exists()).toBe(true)
  })

  it('shows delete button only when editing', () => {
    const wrapper = mount(CropPlanForm, { props: { crops: mockCrops } })
    expect(wrapper.find('[data-testid="plan-loeschen-button"]').exists()).toBe(false)

    const plan: FieldCropPlan = {
      id: 'p1', field_id: 'f1', crop_id: 'crop-winterweizen',
      season_year: 2026, expected_yield_dt_ha: 80,
      synced: true, created_at: '', updated_at: '',
    }
    const wrapperEdit = mount(CropPlanForm, { props: { crops: mockCrops, plan } })
    expect(wrapperEdit.find('[data-testid="plan-loeschen-button"]').exists()).toBe(true)
  })

  it('emits delete when delete is confirmed', async () => {
    const plan: FieldCropPlan = {
      id: 'p1', field_id: 'f1', crop_id: 'crop-winterweizen',
      season_year: 2026, expected_yield_dt_ha: 80,
      synced: true, created_at: '', updated_at: '',
    }
    const wrapper = mount(CropPlanForm, { props: { crops: mockCrops, plan } })
    await wrapper.find('[data-testid="plan-loeschen-button"]').trigger('click')
    expect(wrapper.find('[data-testid="plan-loeschen-confirm-button"]').exists()).toBe(true)
    await wrapper.find('[data-testid="plan-loeschen-confirm-button"]').trigger('click')
    expect(wrapper.emitted('delete')).toHaveLength(1)
  })
})
