import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ProfileView from './ProfileView.vue'

const mockLogout = vi.fn()

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: vi.fn(() => ({
    userId: 'u1',
    userEmail: 'bauer@test.de',
    isAuthenticated: true,
    logout: mockLogout,
  })),
}))

vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

// Must also mock these to avoid Supabase import chain
vi.mock('@/services/supabase')
vi.mock('@/services/auth.service')

const stubs = {
  AppLayout: { template: '<div><slot /></div>' },
}

describe('ProfileView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogout.mockResolvedValue(undefined)
  })

  it('displays user email', async () => {
    const wrapper = mount(ProfileView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-testid="profile-email"]').text()).toContain('bauer@test.de')
  })

  it('renders logout button', async () => {
    const wrapper = mount(ProfileView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-testid="profile-logout-button"]').exists()).toBe(true)
  })

  it('shows app version info', async () => {
    const wrapper = mount(ProfileView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-testid="profile-version"]').exists()).toBe(true)
  })

  it('shows error when logout fails', async () => {
    mockLogout.mockRejectedValue(new Error('Network'))
    const wrapper = mount(ProfileView, { global: { stubs } })
    await flushPromises()
    await wrapper.find('[data-testid="profile-logout-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="profile-error"]').exists()).toBe(true)
  })
})
