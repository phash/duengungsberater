import { test, expect } from '@playwright/test'

test.describe('Anbauplanung', () => {
  // TODO: Auth-Setup + Feld-Fixture für Tests

  test('shows empty state when no plans exist for field', async ({ page }) => {
    await page.goto('/felder/test-field-id/planung')
    await expect(page.getByTestId('crop-plans-empty-state')).toBeVisible()
  })

  test('can open plan creation drawer', async ({ page }) => {
    await page.goto('/felder/test-field-id/planung')
    await page.getByTestId('plan-anlegen-button').click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await expect(page.getByTestId('plan-crop-select')).toBeVisible()
    await expect(page.getByTestId('plan-yield-input')).toBeVisible()
    await expect(page.getByTestId('plan-season-input')).toBeVisible()
  })

  test('pre-fills yield when crop is selected', async ({ page }) => {
    await page.goto('/felder/test-field-id/planung')
    await page.getByTestId('plan-anlegen-button').click()
    await page.getByTestId('plan-crop-select').selectOption({ label: /Winterweizen/ })
    const yieldInput = page.getByTestId('plan-yield-input')
    await expect(yieldInput).not.toHaveValue('')
  })

  test('can create a new plan', async ({ page }) => {
    await page.goto('/felder/test-field-id/planung')
    await page.getByTestId('plan-anlegen-button').click()
    await page.getByTestId('plan-crop-select').selectOption({ index: 1 })
    await page.getByTestId('plan-season-input').fill('2026')
    await page.getByTestId('plan-speichern-button').click()
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
    await expect(page.getByTestId('crop-plan-list')).toBeVisible()
  })

  test('navigates to recommendation from plan', async ({ page }) => {
    await page.goto('/felder/test-field-id/planung')
    await page.getByTestId('crop-plan-list').locator('[data-testid^="plan-empfehlung-button-"]').first().click()
    await expect(page).toHaveURL(/empfehlung/)
  })
})
