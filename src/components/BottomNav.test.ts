import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import BottomNav from './BottomNav.vue'

// Mock the auth service to prevent Supabase initialization
vi.mock('@/services/auth.service', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue(null),
  getCurrentUserEmail: vi.fn().mockResolvedValue(null),
  isAdmin: vi.fn().mockResolvedValue(false),
  signIn: vi.fn().mockResolvedValue({ success: true }),
  signUp: vi.fn().mockResolvedValue({ success: true }),
  signOut: vi.fn().mockResolvedValue(undefined),
  onAuthStateChange: vi.fn(),
}))

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/felder', name: 'felder', component: { template: '<div />' } },
      { path: '/profil', name: 'profil', component: { template: '<div />' } },
      { path: '/admin', name: 'admin', component: { template: '<div />' } },
      { path: '/login', name: 'login', component: { template: '<div />' } },
    ],
  })
}

describe('BottomNav', () => {
  it('renders Felder and Profil links', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createTestRouter()
    const wrapper = mount(BottomNav, {
      props: { isAdmin: false },
      global: { plugins: [pinia, router] },
    })
    expect(wrapper.find('[data-testid="nav-felder"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav-profil"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav-admin"]').exists()).toBe(false)
  })

  it('renders Admin link when isAdmin is true', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createTestRouter()
    const wrapper = mount(BottomNav, {
      props: { isAdmin: true },
      global: { plugins: [pinia, router] },
    })
    expect(wrapper.find('[data-testid="nav-admin"]').exists()).toBe(true)
  })

  it('highlights active route', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createTestRouter()
    await router.push('/felder')
    await router.isReady()
    const wrapper = mount(BottomNav, {
      props: { isAdmin: false },
      global: { plugins: [pinia, router] },
    })
    expect(wrapper.find('[data-testid="nav-felder"]').classes()).toContain('text-field-600')
  })
})
