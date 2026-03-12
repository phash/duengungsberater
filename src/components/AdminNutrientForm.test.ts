import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AdminNutrientForm from './AdminNutrientForm.vue'
import type { Crop, NutrientType, CropNutrientDemand } from '@/types'

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
const mockNutrientTypes: NutrientType[] = [
  { id: 'nt-n', code: 'N', label_de: 'Stickstoff', unit: 'kg/ha', sort_order: 1, is_system: true },
  {
    id: 'nt-p2o5',
    code: 'P2O5',
    label_de: 'Phosphat',
    unit: 'kg/ha',
    sort_order: 2,
    is_system: true,
  },
]

describe('AdminNutrientForm', () => {
  it('renders crop and nutrient selects', () => {
    const wrapper = mount(AdminNutrientForm, {
      props: { crops: mockCrops, nutrientTypes: mockNutrientTypes },
    })
    expect(wrapper.find('[data-testid="admin-nutrient-crop-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-nutrient-type-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-nutrient-demand-input"]').exists()).toBe(true)
  })

  it('emits save with form data', async () => {
    const wrapper = mount(AdminNutrientForm, {
      props: { crops: mockCrops, nutrientTypes: mockNutrientTypes },
    })
    await wrapper.find('[data-testid="admin-nutrient-crop-select"]').setValue('crop-winterweizen')
    await wrapper.find('[data-testid="admin-nutrient-type-select"]').setValue('nt-n')
    await wrapper.find('[data-testid="admin-nutrient-demand-input"]').setValue('230')
    await wrapper.find('[data-testid="admin-nutrient-ref-yield-input"]').setValue('80')
    await wrapper.find('[data-testid="admin-nutrient-correction-input"]').setValue('1.0')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('save')).toBeDefined()
    const emitted = wrapper.emitted('save')![0][0] as Record<string, unknown>
    expect(emitted.crop_id).toBe('crop-winterweizen')
    expect(emitted.nutrient_type_id).toBe('nt-n')
    expect(emitted.demand_kg_ha).toBe(230)
  })

  it('pre-fills when editing', () => {
    const demand: CropNutrientDemand = {
      id: 'cnd-1',
      crop_id: 'crop-winterweizen',
      nutrient_type_id: 'nt-n',
      demand_kg_ha: 230,
      ref_yield_dt_ha: 80,
      per_yield_correction: 1.0,
      source: 'lfl',
      user_id: null,
      valid_from: '2025-01-01',
    }
    const wrapper = mount(AdminNutrientForm, {
      props: { crops: mockCrops, nutrientTypes: mockNutrientTypes, demand },
    })
    const demandInput = wrapper.find('[data-testid="admin-nutrient-demand-input"]')
      .element as HTMLInputElement
    expect(Number(demandInput.value)).toBe(230)
  })

  it('emits delete after confirmation', async () => {
    const demand: CropNutrientDemand = {
      id: 'cnd-1',
      crop_id: 'crop-winterweizen',
      nutrient_type_id: 'nt-n',
      demand_kg_ha: 230,
      ref_yield_dt_ha: 80,
      per_yield_correction: 1.0,
      source: 'lfl',
      user_id: null,
      valid_from: '2025-01-01',
    }
    const wrapper = mount(AdminNutrientForm, {
      props: { crops: mockCrops, nutrientTypes: mockNutrientTypes, demand },
    })
    expect(wrapper.find('[data-testid="admin-nutrient-loeschen-button"]').exists()).toBe(true)
    await wrapper.find('[data-testid="admin-nutrient-loeschen-button"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeUndefined()
    expect(wrapper.find('[data-testid="admin-nutrient-loeschen-confirm-button"]').exists()).toBe(
      true,
    )
    await wrapper.find('[data-testid="admin-nutrient-loeschen-confirm-button"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeDefined()
  })

  it('hides delete button for new demand', () => {
    const wrapper = mount(AdminNutrientForm, {
      props: { crops: mockCrops, nutrientTypes: mockNutrientTypes },
    })
    expect(wrapper.find('[data-testid="admin-nutrient-loeschen-button"]').exists()).toBe(false)
  })
})
