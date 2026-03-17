import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AdminProductList from './AdminProductList.vue'
import type { FertilizerProduct } from '@/types'

const mockProducts: FertilizerProduct[] = [
  {
    id: 'fp-kas',
    name: 'KAS 27% N',
    n_pct: 27,
    p2o5_pct: 0,
    k2o_pct: 0,
    mgo_pct: 4,
    s_pct: 0,
    form: 'mineral',
    affiliate_url: 'https://example.com',
    shop_name: 'Shop',
    active: true,
  },
  {
    id: 'fp-dap',
    name: 'DAP 18/46',
    n_pct: 18,
    p2o5_pct: 46,
    k2o_pct: 0,
    mgo_pct: 0,
    s_pct: 0,
    form: 'mineral',
    affiliate_url: '',
    shop_name: 'Shop',
    active: false,
  },
]

describe('AdminProductList', () => {
  it('renders list of products', () => {
    const wrapper = mount(AdminProductList, { props: { products: mockProducts } })
    expect(wrapper.findAll('[data-testid^="admin-product-item-"]')).toHaveLength(2)
  })
  it('shows active/inactive status', () => {
    const wrapper = mount(AdminProductList, { props: { products: mockProducts } })
    const inactive = wrapper.find('[data-testid="admin-product-item-fp-dap"]')
    expect(inactive.text()).toContain('inaktiv')
  })
  it('emits select when clicked', async () => {
    const wrapper = mount(AdminProductList, { props: { products: mockProducts } })
    await wrapper.find('[data-testid="admin-product-item-fp-kas"]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['fp-kas']])
  })
})
