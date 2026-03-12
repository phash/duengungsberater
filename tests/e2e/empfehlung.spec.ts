import { test, expect } from '@playwright/test'

test.describe('Düngeempfehlung', () => {
  // TODO: Auth-Setup + Feld + Plan Fixture

  test('shows recommendation card with nutrient values', async ({ page }) => {
    await page.goto('/felder/test-field-id/planung/test-plan-id/empfehlung')
    await expect(page.getByTestId('recommendation-card')).toBeVisible()
    await expect(page.getByTestId('nutrient-row-N')).toBeVisible()
  })

  test('shows product list with affiliate links', async ({ page }) => {
    await page.goto('/felder/test-field-id/planung/test-plan-id/empfehlung')
    await expect(page.getByTestId('product-list')).toBeVisible()
  })

  test('auto-calculates recommendation on load (no button needed)', async ({ page }) => {
    await page.goto('/felder/test-field-id/planung/test-plan-id/empfehlung')
    // Button should not exist in the DOM at all
    await expect(page.getByTestId('empfehlung-berechnen-button')).toHaveCount(0)
    // Results should appear automatically
    await expect(page.getByTestId('recommendation-card')).toBeVisible()
  })

  test('displays field and crop context', async ({ page }) => {
    await page.goto('/felder/test-field-id/planung/test-plan-id/empfehlung')
    await expect(page.getByTestId('empfehlung-context')).toBeVisible()
  })
})
