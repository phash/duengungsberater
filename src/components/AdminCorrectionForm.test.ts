import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AdminCorrectionForm from './AdminCorrectionForm.vue'
import type { Correction, CorrectionValue, NutrientType } from '@/types'

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

const existingCorrection: Correction = {
  id: 'c1',
  type: 'vorfrucht',
  label_de: 'Winterraps',
  sort_order: 1,
}
const existingValues: CorrectionValue[] = [
  { id: 'cv1', correction_id: 'c1', nutrient_type_id: 'nt-n', value_kg_ha: -10 },
]

describe('AdminCorrectionForm', () => {
  it('renders empty form for new correction', () => {
    const wrapper = mount(AdminCorrectionForm, {
      props: { nutrientTypes: mockNutrientTypes },
    })
    expect(wrapper.find('[data-testid="admin-correction-label-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-correction-type-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-correction-speichern-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-correction-loeschen-button"]').exists()).toBe(false)
  })

  it('populates form when editing existing correction', () => {
    const wrapper = mount(AdminCorrectionForm, {
      props: {
        nutrientTypes: mockNutrientTypes,
        correction: existingCorrection,
        correctionValues: existingValues,
      },
    })
    const labelInput = wrapper.find('[data-testid="admin-correction-label-input"]')
      .element as HTMLInputElement
    expect(labelInput.value).toBe('Winterraps')
    expect(wrapper.find('[data-testid="admin-correction-loeschen-button"]').exists()).toBe(true)
  })

  it('can add nutrient value row', async () => {
    const wrapper = mount(AdminCorrectionForm, {
      props: { nutrientTypes: mockNutrientTypes },
    })
    await wrapper.find('[data-testid="admin-correction-add-nutrient-button"]').trigger('click')
    expect(wrapper.find('[data-testid="admin-correction-nutrient-row-0"]').exists()).toBe(true)
  })

  it('emits save with correction and values data', async () => {
    const wrapper = mount(AdminCorrectionForm, {
      props: { nutrientTypes: mockNutrientTypes },
    })
    await wrapper.find('[data-testid="admin-correction-label-input"]').setValue('Test')
    await wrapper.find('[data-testid="admin-correction-type-select"]').setValue('vorfrucht')
    await wrapper.find('[data-testid="admin-correction-add-nutrient-button"]').trigger('click')
    // Set nutrient and value in the new row
    const row = wrapper.find('[data-testid="admin-correction-nutrient-row-0"]')
    await row.find('select').setValue('nt-n')
    await row.find('input[type="number"]').setValue('-10')
    // IMPORTANT: use form trigger, NOT button click (jsdom limitation)
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('save')).toBeTruthy()
    const saveData = wrapper.emitted('save')![0][0] as {
      correction: Omit<Correction, 'id'>
      values: { nutrient_type_id: string; value_kg_ha: number }[]
    }
    expect(saveData.correction.label_de).toBe('Test')
    expect(saveData.correction.type).toBe('vorfrucht')
    expect(saveData.values).toHaveLength(1)
    expect(saveData.values[0].nutrient_type_id).toBe('nt-n')
    expect(saveData.values[0].value_kg_ha).toBe(-10)
  })

  it('emits delete after confirmation for existing correction', async () => {
    const wrapper = mount(AdminCorrectionForm, {
      props: {
        nutrientTypes: mockNutrientTypes,
        correction: existingCorrection,
        correctionValues: existingValues,
      },
    })
    await wrapper.find('[data-testid="admin-correction-loeschen-button"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeUndefined()
    await wrapper.find('[data-testid="admin-correction-loeschen-confirm-button"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
  })
})
