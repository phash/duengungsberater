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

const mockUpdatePassword = vi.fn()
const mockDeleteAccount = vi.fn()

vi.mock('@/services/auth.service', () => ({
  updatePassword: (...args: unknown[]) => mockUpdatePassword(...args),
  deleteAccount: (...args: unknown[]) => mockDeleteAccount(...args),
}))

// Must also mock these to avoid Supabase import chain
vi.mock('@/services/supabase')

const stubs = {
  AppLayout: { template: '<div><slot /></div>' },
  RouterLink: { template: '<a><slot /></a>' },
}

describe('ProfileView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogout.mockResolvedValue(undefined)
    mockUpdatePassword.mockResolvedValue(undefined)
    mockDeleteAccount.mockResolvedValue(undefined)
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

  it('renders link to nutrient values page', async () => {
    const wrapper = mount(ProfileView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-testid="nutrient-values-link"]').exists()).toBe(true)
  })

  it('renders password change toggle', async () => {
    const wrapper = mount(ProfileView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-testid="password-change-toggle"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="new-password-input"]').exists()).toBe(false) // collapsed
  })

  it('shows password form after toggle click', async () => {
    const wrapper = mount(ProfileView, { global: { stubs } })
    await flushPromises()
    await wrapper.find('[data-testid="password-change-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="new-password-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="confirm-password-input"]').exists()).toBe(true)
  })

  it('shows error when password is too short', async () => {
    const wrapper = mount(ProfileView, { global: { stubs } })
    await wrapper.find('[data-testid="password-change-toggle"]').trigger('click')
    await wrapper.find('[data-testid="new-password-input"]').setValue('abc')
    await wrapper.find('[data-testid="confirm-password-input"]').setValue('abc')
    await wrapper.find('[data-testid="password-save-button"]').trigger('click')
    expect(wrapper.find('[data-testid="password-error"]').exists()).toBe(true)
    expect(mockUpdatePassword).not.toHaveBeenCalled()
  })

  it('shows delete confirm block after delete-account-button click', async () => {
    const wrapper = mount(ProfileView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-testid="delete-account-confirm-block"]').exists()).toBe(false)
    await wrapper.find('[data-testid="delete-account-button"]').trigger('click')
    expect(wrapper.find('[data-testid="delete-account-confirm-block"]').exists()).toBe(true)
  })

  it('hides delete confirm block after cancel click', async () => {
    const wrapper = mount(ProfileView, { global: { stubs } })
    await flushPromises()
    await wrapper.find('[data-testid="delete-account-button"]').trigger('click')
    await wrapper.find('[data-testid="delete-account-cancel-button"]').trigger('click')
    expect(wrapper.find('[data-testid="delete-account-confirm-block"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="delete-account-button"]').exists()).toBe(true)
  })
})
