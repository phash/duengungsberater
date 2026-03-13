import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import RecommendationCard from './RecommendationCard.vue'
import type { NutrientResult } from '@/types'

const mockResults: NutrientResult[] = [
  {
    nutrient_code: 'N',
    nutrient_label: 'Stickstoff',
    value_kg_ha: 230,
    value_kg_total: 2300,
    unit: 'kg/ha',
  },
  {
    nutrient_code: 'P2O5',
    nutrient_label: 'Phosphat',
    value_kg_ha: 64,
    value_kg_total: 640,
    unit: 'kg/ha',
  },
]

describe('RecommendationCard', () => {
  it('renders all nutrient results', () => {
    const wrapper = mount(RecommendationCard, { props: { results: mockResults } })
    expect(wrapper.findAll('[data-testid^="nutrient-row-"]')).toHaveLength(2)
  })

  it('displays nutrient code and value per ha', () => {
    const wrapper = mount(RecommendationCard, { props: { results: mockResults } })
    const nRow = wrapper.find('[data-testid="nutrient-row-N"]')
    expect(nRow.text()).toContain('N')
    expect(nRow.text()).toContain('230')
    expect(nRow.text()).toContain('kg N/ha')
  })

  it('displays total value', () => {
    const wrapper = mount(RecommendationCard, { props: { results: mockResults } })
    const nRow = wrapper.find('[data-testid="nutrient-row-N"]')
    expect(nRow.text()).toContain('2.300')
  })

  it('renders nothing when no results', () => {
    const wrapper = mount(RecommendationCard, { props: { results: [] } })
    expect(wrapper.find('[data-testid="recommendation-card"]').exists()).toBe(false)
  })

  // --- Stufe 2: Breakdown Accordion ---

  const mockResultsWithBreakdown: NutrientResult[] = [
    {
      nutrient_code: 'N',
      nutrient_label: 'Stickstoff',
      value_kg_ha: 220,
      value_kg_total: 2200,
      unit: 'kg/ha',
      breakdown: {
        base_demand_kg_ha: 230,
        yield_correction_kg_ha: 0,
        corrections_kg_ha: [{ label: 'Vorfrucht (Winterraps)', value_kg_ha: -10 }],
      },
    },
    {
      nutrient_code: 'P2O5',
      nutrient_label: 'Phosphat',
      value_kg_ha: 64,
      value_kg_total: 640,
      unit: 'kg/ha',
    },
  ]

  it('does not show breakdown by default', () => {
    const wrapper = mount(RecommendationCard, { props: { results: mockResultsWithBreakdown } })
    const breakdown = wrapper.find('[data-testid="nutrient-breakdown-N"]')
    expect(breakdown.exists()).toBe(true)
    expect(breakdown.isVisible()).toBe(false)
  })

  it('shows breakdown after clicking nutrient row', async () => {
    const wrapper = mount(RecommendationCard, { props: { results: mockResultsWithBreakdown } })
    await wrapper.find('[data-testid="nutrient-row-N"]').trigger('click')
    const breakdown = wrapper.find('[data-testid="nutrient-breakdown-N"]')
    // Check element is not hidden by v-show (display is not 'none')
    expect((breakdown.element as HTMLElement).style.display).not.toBe('none')
    expect(breakdown.text()).toContain('230')
    expect(breakdown.text()).toContain('Vorfrucht (Winterraps)')
    expect(breakdown.text()).toContain('-10')
  })

  it('closes breakdown when clicking same row again', async () => {
    const wrapper = mount(RecommendationCard, { props: { results: mockResultsWithBreakdown } })
    await wrapper.find('[data-testid="nutrient-row-N"]').trigger('click')
    await nextTick()
    expect((wrapper.find('[data-testid="nutrient-breakdown-N"]').element as HTMLElement).style.display).not.toBe('none')
    await wrapper.find('[data-testid="nutrient-row-N"]').trigger('click')
    await nextTick()
    expect((wrapper.find('[data-testid="nutrient-breakdown-N"]').element as HTMLElement).style.display).toBe('none')
  })

  it('closes other breakdown when opening a new one (accordion)', async () => {
    const wrapper = mount(RecommendationCard, { props: { results: mockResultsWithBreakdown } })
    await wrapper.find('[data-testid="nutrient-row-N"]').trigger('click')
    await nextTick()
    await flushPromises()
    expect((wrapper.find('[data-testid="nutrient-breakdown-N"]').element as HTMLElement).style.display).not.toBe('none')
    await wrapper.find('[data-testid="nutrient-row-P2O5"]').trigger('click')
    await nextTick()
    await flushPromises()
    expect((wrapper.find('[data-testid="nutrient-breakdown-N"]').element as HTMLElement).style.display).toBe('none')
  })

  it('does not show breakdown for nutrient without breakdown data', async () => {
    const wrapper = mount(RecommendationCard, { props: { results: mockResultsWithBreakdown } })
    await wrapper.find('[data-testid="nutrient-row-P2O5"]').trigger('click')
    const breakdown = wrapper.find('[data-testid="nutrient-breakdown-P2O5"]')
    expect(breakdown.exists()).toBe(true)
    expect(breakdown.isVisible()).toBe(false)
  })
})
