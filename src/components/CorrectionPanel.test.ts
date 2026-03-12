import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CorrectionPanel from './CorrectionPanel.vue'
import type { Correction } from '@/types'

const mockCorrections: Correction[] = [
  { id: 'c1', type: 'vorfrucht', label_de: 'Winterraps', sort_order: 1 },
  { id: 'c2', type: 'vorfrucht', label_de: 'Getreide', sort_order: 6 },
  { id: 'c3', type: 'zwischenfrucht', label_de: 'Leguminosen', sort_order: 1 },
  { id: 'c4', type: 'humus', label_de: '< 4% (kein Abschlag)', sort_order: 1 },
  { id: 'c5', type: 'humus', label_de: '> 4%', sort_order: 2 },
]

describe('CorrectionPanel', () => {
  it('renders collapsed by default', () => {
    const wrapper = mount(CorrectionPanel, {
      props: { corrections: mockCorrections, vorfruchtId: null, zwischenfruchtId: null, humusId: null },
    })
    expect(wrapper.find('[data-testid="correction-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="correction-vorfrucht-select"]').exists()).toBe(false)
  })

  it('expands when toggle button is clicked', async () => {
    const wrapper = mount(CorrectionPanel, {
      props: { corrections: mockCorrections, vorfruchtId: null, zwischenfruchtId: null, humusId: null },
    })
    await wrapper.find('[data-testid="correction-panel-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="correction-vorfrucht-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="correction-zwischenfrucht-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="correction-humus-select"]').exists()).toBe(true)
  })

  it('shows only vorfrucht options in vorfrucht dropdown', async () => {
    const wrapper = mount(CorrectionPanel, {
      props: { corrections: mockCorrections, vorfruchtId: null, zwischenfruchtId: null, humusId: null },
    })
    await wrapper.find('[data-testid="correction-panel-toggle"]').trigger('click')
    const select = wrapper.find('[data-testid="correction-vorfrucht-select"]')
    const options = select.findAll('option')
    // "-- keine --" + Winterraps + Getreide = 3
    expect(options).toHaveLength(3)
    expect(options[0].text()).toBe('— keine —')
    expect(options[1].text()).toBe('Winterraps')
  })

  it('emits update:vorfruchtId when vorfrucht changes', async () => {
    const wrapper = mount(CorrectionPanel, {
      props: { corrections: mockCorrections, vorfruchtId: null, zwischenfruchtId: null, humusId: null },
    })
    await wrapper.find('[data-testid="correction-panel-toggle"]').trigger('click')
    await wrapper.find('[data-testid="correction-vorfrucht-select"]').setValue('c1')
    expect(wrapper.emitted('update:vorfruchtId')).toBeTruthy()
    expect(wrapper.emitted('update:vorfruchtId')![0]).toEqual(['c1'])
  })

  it('emits null when "keine" is selected', async () => {
    const wrapper = mount(CorrectionPanel, {
      props: { corrections: mockCorrections, vorfruchtId: 'c1', zwischenfruchtId: null, humusId: null },
    })
    await wrapper.find('[data-testid="correction-panel-toggle"]').trigger('click')
    await wrapper.find('[data-testid="correction-vorfrucht-select"]').setValue('')
    expect(wrapper.emitted('update:vorfruchtId')![0]).toEqual([null])
  })
})
