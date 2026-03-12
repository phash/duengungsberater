import { test, expect } from '@playwright/test'
import { deleteField } from './helpers/delete-field'

test.describe('Hauptworkflow: Login → Empfehlung', () => {
  let feldName: string

  test.beforeEach(async () => {
    feldName = `E2E-WF-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
  })

  test.afterEach(async ({ page }) => {
    // Login nötig falls Session abgelaufen
    await page.goto('/login')
    if (await page.getByTestId('auth-form').isVisible()) {
      await page.fill('[data-testid="auth-email-input"]', 'test@example.com')
      await page.fill('[data-testid="auth-password-input"]', 'testpassword123')
      await page.click('[data-testid="auth-submit-button"]')
      await page.waitForURL('/felder')
    }
    await deleteField(page, feldName)
  })

  test('Kompletter Workflow: Login → Feld → Plan → Empfehlung mit Korrektur', async ({ page }) => {
    // 1. Login
    await page.goto('/login')
    await page.fill('[data-testid="auth-email-input"]', 'test@example.com')
    await page.fill('[data-testid="auth-password-input"]', 'testpassword123')
    await page.click('[data-testid="auth-submit-button"]')
    await expect(page).toHaveURL('/felder')

    // 2. Feld anlegen
    await page.click('[data-testid="feld-anlegen-button"]')
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await page.fill('[data-testid="feld-name-input"]', feldName)
    await page.fill('[data-testid="feld-size-input"]', '10')
    await page.click('[data-testid="feld-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()

    // 3. Zur Anbauplanung navigieren
    const fieldItem = page.locator('[data-testid^="field-item-"]').filter({ hasText: feldName })
    await expect(fieldItem).toBeVisible()
    await fieldItem.locator('[data-testid^="field-planung-button-"]').click()
    await expect(page.getByTestId('plan-anlegen-button')).toBeVisible()

    // 4. Anbauplanung erstellen
    await page.click('[data-testid="plan-anlegen-button"]')
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await page.getByTestId('plan-crop-select').selectOption({ index: 1 })
    await page.click('[data-testid="plan-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()

    // 5. Zur Empfehlung navigieren
    await page.locator('[data-testid^="plan-empfehlung-button-"]').first().click()
    await expect(page.getByTestId('recommendation-card')).toBeVisible()

    // 6. Korrekturfaktor wählen → N-Wert ändert sich
    const nRow = page.getByTestId('nutrient-row-N')
    const nBefore = await nRow.textContent()
    await page.click('[data-testid="correction-panel-toggle"]')
    await page.getByTestId('correction-vorfrucht-select').selectOption({ index: 1 })
    await expect(page.getByTestId('recommendation-card')).toBeVisible()
    const nAfter = await nRow.textContent()
    expect(nAfter).not.toBe(nBefore)

    // 7. Produktliste mit Affiliate-Link sichtbar
    await expect(page.getByTestId('product-list')).toBeVisible()
    const link = page.locator('[data-testid^="product-link-"]').first()
    await expect(link).toBeVisible()
    const href = await link.getAttribute('href')
    expect(href).toMatch(/^https?:\/\//)
  })
})
