import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import BottomNav from './BottomNav.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/felder', name: 'felder', component: { template: '<div />' } },
      { path: '/profil', name: 'profil', component: { template: '<div />' } },
      { path: '/admin', name: 'admin', component: { template: '<div />' } },
    ],
  })
}

describe('BottomNav', () => {
  it('renders Felder and Profil links', () => {
    const router = createTestRouter()
    const wrapper = mount(BottomNav, {
      props: { isAdmin: false },
      global: { plugins: [router] },
    })
    expect(wrapper.find('[data-testid="nav-felder"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav-profil"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav-admin"]').exists()).toBe(false)
  })

  it('renders Admin link when isAdmin is true', () => {
    const router = createTestRouter()
    const wrapper = mount(BottomNav, {
      props: { isAdmin: true },
      global: { plugins: [router] },
    })
    expect(wrapper.find('[data-testid="nav-admin"]').exists()).toBe(true)
  })

  it('highlights active route', async () => {
    const router = createTestRouter()
    await router.push('/felder')
    await router.isReady()
    const wrapper = mount(BottomNav, {
      props: { isAdmin: false },
      global: { plugins: [router] },
    })
    expect(wrapper.find('[data-testid="nav-felder"]').classes()).toContain('text-field-600')
  })
})
