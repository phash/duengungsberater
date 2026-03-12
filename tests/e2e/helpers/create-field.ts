import { type Page, expect } from '@playwright/test'

export async function createField(
  page: Page,
  name: string,
  sizeHa = '10',
): Promise<string> {
  await page.goto('/felder')
  await page.click('[data-testid="feld-anlegen-button"]')
  await expect(page.getByTestId('drawer-modal')).toBeVisible()
  await page.fill('[data-testid="feld-name-input"]', name)
  await page.fill('[data-testid="feld-size-input"]', sizeHa)
  await page.click('[data-testid="feld-speichern-button"]')
  await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
  const fieldItem = page
    .locator('[data-testid^="field-item-"]')
    .filter({ hasText: name })
    .first()
  await expect(fieldItem).toBeVisible()
  const testId = await fieldItem.getAttribute('data-testid')
  if (!testId) throw new Error('field-item data-testid not found')
  return testId.replace('field-item-', '')
}
