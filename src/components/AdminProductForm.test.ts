import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AdminProductForm from './AdminProductForm.vue'
import type { FertilizerProduct } from '@/types'

describe('AdminProductForm', () => {
  it('renders all nutrient percent inputs', () => {
    const wrapper = mount(AdminProductForm, { props: {} })
    expect(wrapper.find('[data-testid="admin-product-name-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-product-n-pct-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-product-p2o5-pct-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-product-k2o-pct-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="admin-product-affiliate-input"]').exists()).toBe(true)
  })

  it('emits save with form data', async () => {
    const wrapper = mount(AdminProductForm, { props: {} })
    await wrapper.find('[data-testid="admin-product-name-input"]').setValue('Test-Dünger')
    await wrapper.find('[data-testid="admin-product-n-pct-input"]').setValue('27')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('save')).toBeDefined()
    const emitted = wrapper.emitted('save')![0][0] as Record<string, unknown>
    expect(emitted.name).toBe('Test-Dünger')
    expect(emitted.n_pct).toBe(27)
  })

  it('pre-fills when editing', () => {
    const product: FertilizerProduct = {
      id: 'fp-1',
      name: 'KAS 27%',
      n_pct: 27,
      p2o5_pct: 0,
      k2o_pct: 0,
      mgo_pct: 4,
      s_pct: 0,
      form: 'mineral',
      affiliate_url: 'https://example.com',
      shop_name: 'TestShop',
      active: true,
    }
    const wrapper = mount(AdminProductForm, { props: { product } })
    const nameInput = wrapper.find('[data-testid="admin-product-name-input"]')
      .element as HTMLInputElement
    expect(nameInput.value).toBe('KAS 27%')
  })

  it('emits delete after confirmation', async () => {
    const product: FertilizerProduct = {
      id: 'fp-1',
      name: 'KAS 27%',
      n_pct: 27,
      p2o5_pct: 0,
      k2o_pct: 0,
      mgo_pct: 4,
      s_pct: 0,
      form: 'mineral',
      affiliate_url: '',
      shop_name: 'Shop',
      active: true,
    }
    const wrapper = mount(AdminProductForm, { props: { product } })
    expect(wrapper.find('[data-testid="admin-product-loeschen-button"]').exists()).toBe(true)
    await wrapper.find('[data-testid="admin-product-loeschen-button"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeUndefined()
    expect(wrapper.find('[data-testid="admin-product-loeschen-confirm-button"]').exists()).toBe(
      true,
    )
    await wrapper.find('[data-testid="admin-product-loeschen-confirm-button"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeDefined()
  })

  it('hides delete button for new product', () => {
    const wrapper = mount(AdminProductForm, { props: {} })
    expect(wrapper.find('[data-testid="admin-product-loeschen-button"]').exists()).toBe(false)
  })
})
