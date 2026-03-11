import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RecommendationCard from './RecommendationCard.vue'
import type { NutrientResult } from '@/types'

const mockResults: NutrientResult[] = [
  { nutrient_code: 'N', nutrient_label: 'Stickstoff', value_kg_ha: 230, value_kg_total: 2300, unit: 'kg/ha' },
  { nutrient_code: 'P2O5', nutrient_label: 'Phosphat', value_kg_ha: 64, value_kg_total: 640, unit: 'kg/ha' },
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
})
