import { type Page, expect } from '@playwright/test'

export async function deleteField(page: Page, fieldName: string): Promise<void> {
  await page.goto('/felder')
  const fieldItem = page
    .locator('[data-testid^="field-item-"]')
    .filter({ hasText: fieldName })
  if ((await fieldItem.count()) === 0) return
  await fieldItem.click()
  await expect(page.getByTestId('drawer-modal')).toBeVisible()
  await page.click('[data-testid="feld-loeschen-button"]')
  await page.click('[data-testid="feld-loeschen-confirm-button"]')
  await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
}
