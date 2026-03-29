import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import AppLayout from './AppLayout.vue'

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

// Stub BottomNav to isolate AppLayout tests
const BottomNavStub = { template: '<nav data-testid="bottom-nav" />', props: ['isAdmin'] }

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/login', name: 'login', component: { template: '<div />' } },
    ],
  })
}

function mountLayout(props: Record<string, unknown> = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createTestRouter()
  return mount(AppLayout, {
    props: { title: 'Test-Titel', ...props },
    global: {
      plugins: [pinia, router],
      stubs: { BottomNav: BottomNavStub },
    },
    slots: { default: '<p>Slot-Inhalt</p>' },
  })
}

describe('AppLayout', () => {
  it('renders the page title', () => {
    const wrapper = mountLayout()
    expect(wrapper.find('[data-testid="page-title"]').text()).toBe('Test-Titel')
  })

  it('renders slot content', () => {
    const wrapper = mountLayout()
    expect(wrapper.text()).toContain('Slot-Inhalt')
  })

  it('hides back button by default', () => {
    const wrapper = mountLayout()
    expect(wrapper.find('[data-testid="back-button"]').exists()).toBe(false)
  })

  it('shows back button when showBack is true', () => {
    const wrapper = mountLayout({ showBack: true })
    expect(wrapper.find('[data-testid="back-button"]').exists()).toBe(true)
  })

  it('shows logout button after opening menu', async () => {
    const wrapper = mountLayout()
    expect(wrapper.find('[data-testid="logout-button"]').exists()).toBe(false)
    await wrapper.find('[data-testid="header-menu-button"]').trigger('click')
    expect(wrapper.find('[data-testid="logout-button"]').exists()).toBe(true)
  })
})
