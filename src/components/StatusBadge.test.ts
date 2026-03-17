import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusBadge from './StatusBadge.vue'

describe('StatusBadge', () => {
  it('renders green badge for status "done"', () => {
    const wrapper = mount(StatusBadge, { props: { status: 'done' } })
    const badge = wrapper.find('[data-testid="status-badge"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('✓')
    expect(badge.classes()).toContain('bg-field-100')
  })

  it('renders yellow badge for status "action"', () => {
    const wrapper = mount(StatusBadge, { props: { status: 'action' } })
    const badge = wrapper.find('[data-testid="status-badge"]')
    expect(badge.text()).toContain('⚠')
    expect(badge.classes()).toContain('bg-wheat-100')
  })

  it('renders gray badge for status "empty"', () => {
    const wrapper = mount(StatusBadge, { props: { status: 'empty' } })
    const badge = wrapper.find('[data-testid="status-badge"]')
    expect(badge.text()).toContain('—')
    expect(badge.classes()).toContain('bg-stone-100')
  })

  it('shows optional label text', () => {
    const wrapper = mount(StatusBadge, { props: { status: 'done', label: 'Erledigt' } })
    expect(wrapper.text()).toContain('Erledigt')
  })
})
