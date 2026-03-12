import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FieldForm from './FieldForm.vue'
import type { Field } from '@/types'

describe('FieldForm', () => {
  it('renders empty form for new field', () => {
    const wrapper = mount(FieldForm, { props: {} })
    expect(wrapper.find('[data-testid="feld-name-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="feld-size-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="feld-loeschen-button"]').exists()).toBe(false)
  })

  it('pre-fills form when editing existing field', () => {
    const field: Field = {
      id: 'f1',
      user_id: 'u1',
      name: 'Schlag Nord',
      size_ha: 12.5,
      nmin_0_30: null,
      nmin_30_60: null,
      nmin_60_90: null,
      synced: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    const wrapper = mount(FieldForm, { props: { field } })
    const nameInput = wrapper.find('[data-testid="feld-name-input"]').element as HTMLInputElement
    const sizeInput = wrapper.find('[data-testid="feld-size-input"]').element as HTMLInputElement
    expect(nameInput.value).toBe('Schlag Nord')
    expect(sizeInput.value).toBe('12.5')
  })

  it('shows delete button when editing', () => {
    const field: Field = {
      id: 'f1', user_id: 'u1', name: 'Test', size_ha: 1,
      nmin_0_30: null, nmin_30_60: null, nmin_60_90: null,
      synced: true, created_at: '', updated_at: '',
    }
    const wrapper = mount(FieldForm, { props: { field } })
    expect(wrapper.find('[data-testid="feld-loeschen-button"]').exists()).toBe(true)
  })

  it('emits save with form data', async () => {
    const wrapper = mount(FieldForm, { props: {} })
    await wrapper.find('[data-testid="feld-name-input"]').setValue('Neues Feld')
    await wrapper.find('[data-testid="feld-size-input"]').setValue('5.5')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('save')).toEqual([[{ name: 'Neues Feld', size_ha: 5.5 }]])
  })

  it('emits delete when delete confirmed', async () => {
    const field: Field = {
      id: 'f1', user_id: 'u1', name: 'Test', size_ha: 1,
      nmin_0_30: null, nmin_30_60: null, nmin_60_90: null,
      synced: true, created_at: '', updated_at: '',
    }
    const wrapper = mount(FieldForm, { props: { field } })
    await wrapper.find('[data-testid="feld-loeschen-button"]').trigger('click')
    expect(wrapper.find('[data-testid="feld-loeschen-confirm-button"]').exists()).toBe(true)
    await wrapper.find('[data-testid="feld-loeschen-confirm-button"]').trigger('click')
    expect(wrapper.emitted('delete')).toEqual([[]])
  })

  it('validates that name is required', async () => {
    const wrapper = mount(FieldForm, { props: {} })
    await wrapper.find('[data-testid="feld-size-input"]').setValue('5.5')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.find('[data-testid="feld-name-error"]').exists()).toBe(true)
  })

  it('validates that size must be positive', async () => {
    const wrapper = mount(FieldForm, { props: {} })
    await wrapper.find('[data-testid="feld-name-input"]').setValue('Test')
    await wrapper.find('[data-testid="feld-size-input"]').setValue('0')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.find('[data-testid="feld-size-error"]').exists()).toBe(true)
  })
})
