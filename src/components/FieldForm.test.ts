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
      id: 'f1',
      user_id: 'u1',
      name: 'Test',
      size_ha: 1,
      nmin_0_30: null,
      nmin_30_60: null,
      nmin_60_90: null,
      synced: true,
      created_at: '',
      updated_at: '',
    }
    const wrapper = mount(FieldForm, { props: { field } })
    expect(wrapper.find('[data-testid="feld-loeschen-button"]').exists()).toBe(true)
  })

  it('emits save with form data including null Nmin', async () => {
    const wrapper = mount(FieldForm, { props: {} })
    await wrapper.find('[data-testid="feld-name-input"]').setValue('Neues Feld')
    await wrapper.find('[data-testid="feld-size-input"]').setValue('5.5')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('save')).toEqual([
      [
        {
          name: 'Neues Feld',
          size_ha: 5.5,
          region: null,
          nmin_0_30: null,
          nmin_30_60: null,
          nmin_60_90: null,
        },
      ],
    ])
  })

  it('emits delete when delete confirmed', async () => {
    const field: Field = {
      id: 'f1',
      user_id: 'u1',
      name: 'Test',
      size_ha: 1,
      nmin_0_30: null,
      nmin_30_60: null,
      nmin_60_90: null,
      synced: true,
      created_at: '',
      updated_at: '',
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

  it('shows Nmin inputs when section is expanded', async () => {
    const wrapper = mount(FieldForm, { props: {} })
    expect(wrapper.find('[data-testid="nmin-0-30-input"]').exists()).toBe(false)
    await wrapper.find('[data-testid="nmin-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="nmin-0-30-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nmin-30-60-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nmin-60-90-input"]').exists()).toBe(true)
  })

  it('emits Nmin layer values when filled', async () => {
    const wrapper = mount(FieldForm, { props: {} })
    await wrapper.find('[data-testid="feld-name-input"]').setValue('Test')
    await wrapper.find('[data-testid="feld-size-input"]').setValue('10')
    await wrapper.find('[data-testid="nmin-toggle"]').trigger('click')
    await wrapper.find('[data-testid="nmin-0-30-input"]').setValue('20')
    await wrapper.find('[data-testid="nmin-30-60-input"]').setValue('15')
    await wrapper.find('[data-testid="nmin-60-90-input"]').setValue('10')
    await wrapper.find('form').trigger('submit')
    const emitted = wrapper.emitted('save')![0][0] as Record<string, unknown>
    expect(emitted.nmin_0_30).toBe(20)
    expect(emitted.nmin_30_60).toBe(15)
    expect(emitted.nmin_60_90).toBe(10)
  })

  it('distributes Gesamtwert across 3 layers on save', async () => {
    const wrapper = mount(FieldForm, { props: {} })
    await wrapper.find('[data-testid="feld-name-input"]').setValue('Test')
    await wrapper.find('[data-testid="feld-size-input"]').setValue('10')
    await wrapper.find('[data-testid="nmin-toggle"]').trigger('click')
    await wrapper.find('[data-testid="nmin-mode-toggle"]').trigger('click')
    await wrapper.find('[data-testid="nmin-gesamt-input"]').setValue('46')
    await wrapper.find('form').trigger('submit')
    const emitted = wrapper.emitted('save')![0][0] as Record<string, unknown>
    expect(emitted.nmin_0_30).toBe(16)
    expect(emitted.nmin_30_60).toBe(15)
    expect(emitted.nmin_60_90).toBe(15)
  })

  it('rejects negative Nmin values', async () => {
    const wrapper = mount(FieldForm, { props: {} })
    await wrapper.find('[data-testid="feld-name-input"]').setValue('Test')
    await wrapper.find('[data-testid="feld-size-input"]').setValue('10')
    await wrapper.find('[data-testid="nmin-toggle"]').trigger('click')
    await wrapper.find('[data-testid="nmin-0-30-input"]').setValue('-5')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.find('[data-testid="nmin-validation-error"]').exists()).toBe(true)
  })

  it('pre-fills Nmin values and auto-expands when editing', () => {
    const field: Field = {
      id: 'f1',
      user_id: 'u1',
      name: 'Test',
      size_ha: 10,
      nmin_0_30: 20,
      nmin_30_60: 15,
      nmin_60_90: 10,
      synced: true,
      created_at: '',
      updated_at: '',
    }
    const wrapper = mount(FieldForm, { props: { field } })
    expect(wrapper.find('[data-testid="nmin-0-30-input"]').exists()).toBe(true)
    const input030 = wrapper.find('[data-testid="nmin-0-30-input"]').element as HTMLInputElement
    expect(input030.value).toBe('20')
  })

  it('shows sum of existing layers in Gesamtwert mode when editing', async () => {
    const field: Field = {
      id: 'f1',
      user_id: 'u1',
      name: 'Test',
      size_ha: 10,
      nmin_0_30: 20,
      nmin_30_60: 15,
      nmin_60_90: 10,
      synced: true,
      created_at: '',
      updated_at: '',
    }
    const wrapper = mount(FieldForm, { props: { field } })
    await wrapper.find('[data-testid="nmin-mode-toggle"]').trigger('click')
    const gesamtInput = wrapper.find('[data-testid="nmin-gesamt-input"]')
      .element as HTMLInputElement
    expect(gesamtInput.value).toBe('45')
  })

  it('syncs nminGesamt from layer values when switching to total mode', async () => {
    const wrapper = mount(FieldForm, { props: {} })
    await wrapper.find('[data-testid="nmin-toggle"]').trigger('click')
    await wrapper.find('[data-testid="nmin-0-30-input"]').setValue('20')
    await wrapper.find('[data-testid="nmin-30-60-input"]').setValue('15')
    await wrapper.find('[data-testid="nmin-60-90-input"]').setValue('10')
    await wrapper.find('[data-testid="nmin-mode-toggle"]').trigger('click')
    const gesamtInput = wrapper.find('[data-testid="nmin-gesamt-input"]')
      .element as HTMLInputElement
    expect(gesamtInput.value).toBe('45')
  })

  it('emits null for cleared Nmin inputs instead of empty string', async () => {
    const wrapper = mount(FieldForm, { props: {} })
    await wrapper.find('[data-testid="feld-name-input"]').setValue('Test')
    await wrapper.find('[data-testid="feld-size-input"]').setValue('10')
    await wrapper.find('[data-testid="nmin-toggle"]').trigger('click')
    await wrapper.find('[data-testid="nmin-0-30-input"]').setValue('20')
    await wrapper.find('[data-testid="nmin-0-30-input"]').setValue('')
    await wrapper.find('form').trigger('submit')
    const emitted = wrapper.emitted('save')![0][0] as Record<string, unknown>
    expect(emitted.nmin_0_30).toBeNull()
    expect(emitted.nmin_30_60).toBeNull()
    expect(emitted.nmin_60_90).toBeNull()
  })
})
