import { type Page, expect } from '@playwright/test'

export async function createPlan(
  page: Page,
  fieldId: string,
  options: { cropIndex?: number; yieldDt?: string; season?: string } = {},
): Promise<string> {
  await page.goto(`/felder/${fieldId}/planung`)
  await page.click('[data-testid="plan-anlegen-button"]')
  await expect(page.getByTestId('drawer-modal')).toBeVisible()
  await page.getByTestId('plan-crop-select').selectOption({ index: options.cropIndex ?? 1 })
  if (options.yieldDt) {
    await page.fill('[data-testid="plan-yield-input"]', options.yieldDt)
  }
  if (options.season) {
    await page.fill('[data-testid="plan-season-input"]', options.season)
  }
  await page.click('[data-testid="plan-speichern-button"]')
  await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
  const planItem = page.locator('[data-testid^="plan-item-"]').first()
  await expect(planItem).toBeVisible()
  const testId = await planItem.getAttribute('data-testid')
  return testId!.replace('plan-item-', '')
}
