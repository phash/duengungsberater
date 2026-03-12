import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AdminView from './AdminView.vue'

vi.mock('@/services/supabase', () => ({ supabase: {} }))
vi.mock('@/services/auth.service', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue(null),
  getCurrentUserEmail: vi.fn().mockResolvedValue(null),
  isAdmin: vi.fn().mockResolvedValue(false),
  onAuthStateChange: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@/services/crop.service', () => ({
  getCrops: vi.fn(),
  createCrop: vi.fn(),
  updateCrop: vi.fn(),
  deleteCrop: vi.fn(),
}))
vi.mock('@/services/nutrient.service', () => ({
  getNutrientTypes: vi.fn(),
  getAllNutrientDemands: vi.fn(),
  createNutrientDemand: vi.fn(),
  updateNutrientDemand: vi.fn(),
  deleteNutrientDemand: vi.fn(),
}))
vi.mock('@/services/product.service', () => ({
  getAllProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
}))
vi.mock('@/services/correction.service', () => ({
  getCorrections: vi.fn(),
  getCorrectionValues: vi.fn(),
  createCorrection: vi.fn(),
  updateCorrection: vi.fn(),
  deleteCorrection: vi.fn(),
}))

const stubs = {
  AppLayout: { template: '<div><slot /></div>' },
  AdminCropList: true,
  AdminCropForm: true,
  AdminNutrientList: true,
  AdminNutrientForm: true,
  AdminProductList: true,
  AdminProductForm: true,
  AdminCorrectionList: true,
  AdminCorrectionForm: true,
  DrawerModal: {
    template: '<div v-if="open" data-testid="drawer-modal"><slot /></div>',
    props: ['open', 'title'],
  },
}

import { getCrops } from '@/services/crop.service'
import { getNutrientTypes, getAllNutrientDemands } from '@/services/nutrient.service'
import { getAllProducts } from '@/services/product.service'
import { getCorrections } from '@/services/correction.service'

const mockGetCrops = getCrops as ReturnType<typeof vi.fn>
const mockGetNutrientTypes = getNutrientTypes as ReturnType<typeof vi.fn>
const mockGetAllDemands = getAllNutrientDemands as ReturnType<typeof vi.fn>
const mockGetAllProducts = getAllProducts as ReturnType<typeof vi.fn>
const mockGetCorrections = getCorrections as ReturnType<typeof vi.fn>

describe('AdminView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCrops.mockResolvedValue([])
    mockGetNutrientTypes.mockResolvedValue([])
    mockGetAllDemands.mockResolvedValue([])
    mockGetAllProducts.mockResolvedValue([])
    mockGetCorrections.mockResolvedValue([])
  })

  it('renders all four tabs', async () => {
    const wrapper = mount(AdminView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-testid="admin-tab-crops"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-tab-nutrients"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-tab-products"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-tab-corrections"]').exists()).toBe(true)
  })

  it('loads data on mount', async () => {
    mount(AdminView, { global: { stubs } })
    await flushPromises()
    expect(mockGetCrops).toHaveBeenCalledOnce()
    expect(mockGetNutrientTypes).toHaveBeenCalledOnce()
    expect(mockGetAllDemands).toHaveBeenCalledOnce()
    expect(mockGetAllProducts).toHaveBeenCalledOnce()
    expect(mockGetCorrections).toHaveBeenCalledOnce()
  })

  it('shows error message when loadAll fails', async () => {
    mockGetCrops.mockRejectedValue(new Error('Network error'))
    const wrapper = mount(AdminView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-testid="admin-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-error"]').text()).toContain(
      'Admin-Daten konnten nicht geladen werden',
    )
  })

  it('hides error message initially when load succeeds', async () => {
    const wrapper = mount(AdminView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-testid="admin-error"]').exists()).toBe(false)
  })

  it('switches tabs on click', async () => {
    const wrapper = mount(AdminView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-testid="admin-crop-anlegen-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-product-anlegen-button"]').exists()).toBe(false)
    await wrapper.find('[data-testid="admin-tab-products"]').trigger('click')
    expect(wrapper.find('[data-testid="admin-product-anlegen-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-crop-anlegen-button"]').exists()).toBe(false)
  })
})
