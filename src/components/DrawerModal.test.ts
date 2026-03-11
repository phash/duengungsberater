import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DrawerModal from './DrawerModal.vue'

// Teleport muss gestubbt werden, sonst landet der Content außerhalb des Wrappers
const mountOptions = (props: Record<string, unknown>) => ({
  props,
  global: { stubs: { Teleport: true } },
})

describe('DrawerModal', () => {
  it('renders nothing when not open', () => {
    const wrapper = mount(DrawerModal, mountOptions({ open: false, title: 'Test' }))
    expect(wrapper.find('[data-testid="drawer-modal"]').exists()).toBe(false)
  })

  it('renders overlay and content when open', () => {
    const wrapper = mount(DrawerModal, mountOptions({ open: true, title: 'Feld anlegen' }))
    const modal = wrapper.find('[data-testid="drawer-modal"]')
    expect(modal.exists()).toBe(true)
    expect(wrapper.text()).toContain('Feld anlegen')
  })

  it('emits close when overlay is clicked', async () => {
    const wrapper = mount(DrawerModal, mountOptions({ open: true, title: 'Test' }))
    await wrapper.find('[data-testid="drawer-overlay"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close when close button is clicked', async () => {
    const wrapper = mount(DrawerModal, mountOptions({ open: true, title: 'Test' }))
    await wrapper.find('[data-testid="drawer-close-button"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('renders slot content', () => {
    const wrapper = mount(DrawerModal, {
      ...mountOptions({ open: true, title: 'Test' }),
      slots: { default: '<p>Formular-Inhalt</p>' },
    })
    expect(wrapper.text()).toContain('Formular-Inhalt')
  })
})
