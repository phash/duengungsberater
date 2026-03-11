import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NumberDisplay from './NumberDisplay.vue'

describe('NumberDisplay', () => {
  it('renders area format', () => {
    const wrapper = mount(NumberDisplay, {
      props: { value: 12.5, format: 'area' },
    })
    expect(wrapper.find('[data-testid="number-display"]').text()).toBe('12,50 ha')
  })

  it('renders nutrient per ha format', () => {
    const wrapper = mount(NumberDisplay, {
      props: { value: 220, format: 'nutrient-per-ha', code: 'N' },
    })
    expect(wrapper.find('[data-testid="number-display"]').text()).toBe('220 kg N/ha')
  })

  it('renders nutrient total format', () => {
    const wrapper = mount(NumberDisplay, {
      props: { value: 2750, format: 'nutrient-total', code: 'N' },
    })
    expect(wrapper.find('[data-testid="number-display"]').text()).toBe('2.750 kg N')
  })

  it('renders yield format', () => {
    const wrapper = mount(NumberDisplay, {
      props: { value: 80, format: 'yield' },
    })
    expect(wrapper.find('[data-testid="number-display"]').text()).toBe('80 dt/ha')
  })

  it('renders percent format', () => {
    const wrapper = mount(NumberDisplay, {
      props: { value: 27, format: 'percent' },
    })
    expect(wrapper.find('[data-testid="number-display"]').text()).toBe('27 %')
  })
})
