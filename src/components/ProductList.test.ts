import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProductList from './ProductList.vue'
import type { ProductMatch } from '@/types'

const mockMatches: ProductMatch[] = [
  {
    product: {
      id: 'fp-kas', name: 'KAS 27% N',
      n_pct: 27, p2o5_pct: 0, k2o_pct: 0, mgo_pct: 4, s_pct: 0,
      form: 'mineral', affiliate_url: 'https://shop.example.com/kas', shop_name: 'Dünger-Shop.de', active: true,
    },
    amount_kg_ha: 851.85,
    amount_kg_total: 8518.52,
  },
  {
    product: {
      id: 'fp-dap', name: 'DAP 18/46',
      n_pct: 18, p2o5_pct: 46, k2o_pct: 0, mgo_pct: 0, s_pct: 0,
      form: 'mineral', affiliate_url: '', shop_name: 'Dünger-Shop.de', active: true,
    },
    amount_kg_ha: 139.13,
    amount_kg_total: 1391.3,
  },
]

describe('ProductList', () => {
  it('renders all product matches', () => {
    const wrapper = mount(ProductList, { props: { matches: mockMatches } })
    expect(wrapper.findAll('[data-testid^="product-item-"]')).toHaveLength(2)
  })

  it('displays product name and amount', () => {
    const wrapper = mount(ProductList, { props: { matches: mockMatches } })
    const item = wrapper.find('[data-testid="product-item-fp-kas"]')
    expect(item.text()).toContain('KAS 27% N')
    expect(item.text()).toContain('851')
  })

  it('shows affiliate link when URL is set', () => {
    const wrapper = mount(ProductList, { props: { matches: mockMatches } })
    const link = wrapper.find('[data-testid="product-link-fp-kas"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('https://shop.example.com/kas')
    expect(link.text()).toContain('Dünger-Shop.de')
  })

  it('hides affiliate link when URL is empty', () => {
    const wrapper = mount(ProductList, { props: { matches: mockMatches } })
    expect(wrapper.find('[data-testid="product-link-fp-dap"]').exists()).toBe(false)
  })

  it('renders nothing when no matches', () => {
    const wrapper = mount(ProductList, { props: { matches: [] } })
    expect(wrapper.find('[data-testid="product-list"]').exists()).toBe(false)
  })
})
