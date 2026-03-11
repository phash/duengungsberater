import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AdminCropForm from './AdminCropForm.vue'
import type { Crop } from '@/types'

describe('AdminCropForm', () => {
  it('renders empty form for new crop', () => {
    const wrapper = mount(AdminCropForm, { props: {} })
    expect(wrapper.find('[data-testid="admin-crop-name-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-crop-category-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-crop-ref-yield-input"]').exists()).toBe(true)
  })

  it('pre-fills when editing', () => {
    const crop: Crop = {
      id: 'c1', name_de: 'Winterweizen', category: 'Getreide',
      sow_month_from: 9, sow_month_to: 11, harvest_month_from: 7, harvest_month_to: 8,
      ref_yield_dt_ha: 80, nmin_depth_cm: 90,
    }
    const wrapper = mount(AdminCropForm, { props: { crop } })
    const nameInput = wrapper.find('[data-testid="admin-crop-name-input"]').element as HTMLInputElement
    expect(nameInput.value).toBe('Winterweizen')
  })

  it('emits save with all form data', async () => {
    const wrapper = mount(AdminCropForm, { props: {} })
    await wrapper.find('[data-testid="admin-crop-name-input"]').setValue('Sommergerste')
    await wrapper.find('[data-testid="admin-crop-category-input"]').setValue('Getreide')
    await wrapper.find('[data-testid="admin-crop-sow-from-input"]').setValue('3')
    await wrapper.find('[data-testid="admin-crop-sow-to-input"]').setValue('4')
    await wrapper.find('[data-testid="admin-crop-harvest-from-input"]').setValue('7')
    await wrapper.find('[data-testid="admin-crop-harvest-to-input"]').setValue('8')
    await wrapper.find('[data-testid="admin-crop-ref-yield-input"]').setValue('60')
    await wrapper.find('[data-testid="admin-crop-nmin-depth-select"]').setValue('90')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('save')).toBeDefined()
    const emitted = wrapper.emitted('save')![0][0] as Omit<Crop, 'id'>
    expect(emitted.name_de).toBe('Sommergerste')
    expect(emitted.category).toBe('Getreide')
    expect(emitted.sow_month_from).toBe(3)
    expect(emitted.ref_yield_dt_ha).toBe(60)
    expect(emitted.nmin_depth_cm).toBe(90)
  })

  it('shows delete button when editing and emits delete on click', async () => {
    const crop: Crop = {
      id: 'c1', name_de: 'Test', category: 'Getreide',
      sow_month_from: 9, sow_month_to: 11, harvest_month_from: 7, harvest_month_to: 8,
      ref_yield_dt_ha: 80, nmin_depth_cm: 90,
    }
    const wrapper = mount(AdminCropForm, { props: { crop } })
    expect(wrapper.find('[data-testid="admin-crop-loeschen-button"]').exists()).toBe(true)
    await wrapper.find('[data-testid="admin-crop-loeschen-button"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeDefined()
  })

  it('hides delete button for new crop', () => {
    const wrapper = mount(AdminCropForm, { props: {} })
    expect(wrapper.find('[data-testid="admin-crop-loeschen-button"]').exists()).toBe(false)
  })
})
