import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FieldList from './FieldList.vue'
import type { Field } from '@/types'

const mockFields: Field[] = [
  {
    id: 'f1',
    user_id: 'u1',
    name: 'Schlag Nord',
    size_ha: 12.5,
    synced: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f2',
    user_id: 'u1',
    name: 'Schlag Süd',
    size_ha: 8.75,
    synced: true,
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
]

describe('FieldList', () => {
  it('renders empty state when no fields', () => {
    const wrapper = mount(FieldList, { props: { fields: [], planCounts: {} } })
    expect(wrapper.find('[data-testid="fields-empty-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="field-list"]').exists()).toBe(false)
  })

  it('renders list of fields', () => {
    const wrapper = mount(FieldList, { props: { fields: mockFields, planCounts: {} } })
    expect(wrapper.find('[data-testid="field-list"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid^="field-item-"]')).toHaveLength(2)
  })

  it('displays field name and size', () => {
    const wrapper = mount(FieldList, { props: { fields: mockFields, planCounts: {} } })
    const firstItem = wrapper.find('[data-testid="field-item-f1"]')
    expect(firstItem.text()).toContain('Schlag Nord')
    expect(firstItem.text()).toContain('12,50 ha')
  })

  it('shows "done" badge when field has plans', () => {
    const wrapper = mount(FieldList, {
      props: { fields: mockFields, planCounts: { f1: 2 } },
    })
    const badge = wrapper.find('[data-testid="field-item-f1"] [data-testid="status-badge"]')
    expect(badge.text()).toContain('✓')
  })

  it('shows "empty" badge when field has no plans', () => {
    const wrapper = mount(FieldList, {
      props: { fields: mockFields, planCounts: {} },
    })
    const badge = wrapper.find('[data-testid="field-item-f1"] [data-testid="status-badge"]')
    expect(badge.text()).toContain('—')
  })

  it('emits select event when field is clicked', async () => {
    const wrapper = mount(FieldList, { props: { fields: mockFields, planCounts: {} } })
    await wrapper.find('[data-testid="field-item-f1"]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['f1']])
  })
})
