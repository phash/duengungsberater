import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import NutrientValuesView from './NutrientValuesView.vue'
import type { Crop, CropNutrientDemand, NutrientType } from '@/types'

const CROPS: Crop[] = [
  {
    id: 'c1',
    name_de: 'Winterweizen',
    category: 'Getreide',
    sow_month_from: 9,
    sow_month_to: 11,
    harvest_month_from: 7,
    harvest_month_to: 8,
    ref_yield_dt_ha: 80,
    nmin_depth_cm: 90,
  },
]
const NUTRIENT_TYPES: NutrientType[] = [
  { id: 'nt-n', code: 'N', label_de: 'Stickstoff', unit: 'kg/ha', sort_order: 1, is_system: true },
  { id: 'nt-p', code: 'P2O5', label_de: 'Phosphat', unit: 'kg/ha', sort_order: 2, is_system: true },
]
const LFL_DEMANDS: CropNutrientDemand[] = [
  {
    id: 'd1',
    crop_id: 'c1',
    nutrient_type_id: 'nt-n',
    demand_kg_ha: 230,
    ref_yield_dt_ha: 80,
    per_yield_correction: 1,
    source: 'lfl',
    user_id: null,
    valid_from: '2025-01-01',
  },
  {
    id: 'd2',
    crop_id: 'c1',
    nutrient_type_id: 'nt-p',
    demand_kg_ha: 64,
    ref_yield_dt_ha: 80,
    per_yield_correction: 0.8,
    source: 'lfl',
    user_id: null,
    valid_from: '2025-01-01',
  },
]
const USER_N: CropNutrientDemand = {
  id: 'd3',
  crop_id: 'c1',
  nutrient_type_id: 'nt-n',
  demand_kg_ha: 210,
  ref_yield_dt_ha: 80,
  per_yield_correction: 1,
  source: 'user',
  user_id: 'u1',
  valid_from: '2026-01-01',
}

const mockGetNutrientDemands = vi.fn()
const mockGetNutrientTypes = vi.fn()
const mockUpsert = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: vi.fn(() => ({ userId: 'u1', userEmail: 'bauer@test.de', isAuthenticated: true })),
}))
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))
vi.mock('@/services/nutrient.service', () => ({
  getNutrientTypes: (...args: unknown[]) => mockGetNutrientTypes(...args),
  upsertUserNutrientDemand: (...args: unknown[]) => mockUpsert(...args),
  deleteUserNutrientDemand: (...args: unknown[]) => mockDelete(...args),
}))
const mockGetCrops = vi.fn()
vi.mock('@/services/crop.service', () => ({
  getCrops: (...args: unknown[]) => mockGetCrops(...args),
  getNutrientDemands: (...args: unknown[]) => mockGetNutrientDemands(...args),
}))
vi.mock('@/services/supabase')

const stubs = {
  AppLayout: { template: '<div><slot /></div>' },
  DrawerModal: {
    template: '<div v-if="open"><slot name="header" /><slot /><slot name="footer" /></div>',
    props: ['open'],
  },
}

describe('NutrientValuesView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCrops.mockResolvedValue(CROPS)
    mockGetNutrientTypes.mockResolvedValue(NUTRIENT_TYPES)
    mockGetNutrientDemands.mockResolvedValue(LFL_DEMANDS)
    mockUpsert.mockResolvedValue(USER_N)
    mockDelete.mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  it('renders kultur-select', async () => {
    const wrapper = mount(NutrientValuesView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-testid="kultur-select"]').exists()).toBe(true)
  })

  it('shows demand rows after crop selection', async () => {
    mockGetNutrientDemands.mockResolvedValue(LFL_DEMANDS)
    const wrapper = mount(NutrientValuesView, { global: { stubs } })
    await flushPromises()
    await wrapper.find('[data-testid="kultur-select"]').setValue('c1')
    await wrapper.find('[data-testid="kultur-select"]').trigger('change')
    await flushPromises()
    expect(wrapper.find('[data-testid="demand-row-N"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="demand-row-P2O5"]').exists()).toBe(true)
  })

  it('opens drawer when demand row is clicked', async () => {
    const wrapper = mount(NutrientValuesView, { global: { stubs } })
    await flushPromises()
    await wrapper.find('[data-testid="kultur-select"]').setValue('c1')
    await wrapper.find('[data-testid="kultur-select"]').trigger('change')
    await flushPromises()
    expect(wrapper.find('[data-testid="demand-drawer"]').exists()).toBe(false)
    await wrapper.find('[data-testid="demand-row-N"]').trigger('click')
    expect(wrapper.find('[data-testid="demand-drawer"]').exists()).toBe(true)
  })

  it('calls upsertUserNutrientDemand on save', async () => {
    const wrapper = mount(NutrientValuesView, { global: { stubs } })
    await flushPromises()
    await wrapper.find('[data-testid="kultur-select"]').setValue('c1')
    await wrapper.find('[data-testid="kultur-select"]').trigger('change')
    await flushPromises()
    await wrapper.find('[data-testid="demand-row-N"]').trigger('click')
    await wrapper.find('[data-testid="demand-kg-ha-input"]').setValue('215')
    await wrapper.find('[data-testid="demand-save-button"]').trigger('click')
    await flushPromises()
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({ demand_kg_ha: 215 }), 'u1')
  })

  it('shows validation error when demand_kg_ha is 0', async () => {
    const wrapper = mount(NutrientValuesView, { global: { stubs } })
    await flushPromises()
    await wrapper.find('[data-testid="kultur-select"]').setValue('c1')
    await wrapper.find('[data-testid="kultur-select"]').trigger('change')
    await flushPromises()
    await wrapper.find('[data-testid="demand-row-N"]').trigger('click')
    await wrapper.find('[data-testid="demand-kg-ha-input"]').setValue('0')
    await wrapper.find('[data-testid="demand-save-button"]').trigger('click')
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('shows reset button when user override exists', async () => {
    mockGetNutrientDemands
      .mockResolvedValueOnce(LFL_DEMANDS)
      .mockResolvedValueOnce([USER_N, LFL_DEMANDS[1]])
    const wrapper = mount(NutrientValuesView, { global: { stubs } })
    await flushPromises()
    await wrapper.find('[data-testid="kultur-select"]').setValue('c1')
    await flushPromises()
    await wrapper.find('[data-testid="demand-row-N"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="demand-reset-button"]').exists()).toBe(true)
  })

  it('hides reset button when no user override', async () => {
    const wrapper = mount(NutrientValuesView, { global: { stubs } })
    await flushPromises()
    await wrapper.find('[data-testid="kultur-select"]').setValue('c1')
    await wrapper.find('[data-testid="kultur-select"]').trigger('change')
    await flushPromises()
    await wrapper.find('[data-testid="demand-row-P2O5"]').trigger('click')
    expect(wrapper.find('[data-testid="demand-reset-button"]').exists()).toBe(false)
  })
})
