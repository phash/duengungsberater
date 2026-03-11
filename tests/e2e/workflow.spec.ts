import { test, expect } from '@playwright/test'

test.describe('Hauptworkflow: Login → Feld → Anbauplanung → Empfehlung', () => {
  // Voraussetzung: Test-User existiert in Supabase.
  // Auth-Fixture wie in auth.spec.ts konfigurieren.

  test('complete workflow produces recommendation', async ({ page }) => {
    // 1. Login
    await page.goto('/login')
    await page.getByTestId('login-email-input').fill('test@example.com')
    await page.getByTestId('login-password-input').fill('testpassword123')
    await page.getByTestId('login-submit-button').click()
    await expect(page).toHaveURL('/felder')

    // 2. Feld anlegen
    await page.getByTestId('feld-anlegen-button').click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await page.getByTestId('feld-name-input').fill('Testfeld Workflow')
    await page.getByTestId('feld-size-input').fill('10')
    await page.getByTestId('feld-speichern-button').click()
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()

    // 3. Feld in Liste sichtbar
    const fieldItem = page.locator('[data-testid^="field-item-"]').filter({ hasText: 'Testfeld Workflow' })
    await expect(fieldItem).toBeVisible()

    // 4. Zur Anbauplanung navigieren (über Planung-Button, nicht Klick auf Feld)
    await fieldItem.locator('[data-testid^="field-planung-button-"]').click()
    await expect(page.getByTestId('plan-anlegen-button')).toBeVisible()

    // 5. Anbauplanung erstellen
    await page.getByTestId('plan-anlegen-button').click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await page.getByTestId('plan-crop-select').selectOption({ label: /Winterweizen/ })
    await page.getByTestId('plan-speichern-button').click()
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()

    // 6. Zur Empfehlung navigieren (über Empfehlung-Button am Plan-Eintrag)
    await page.locator('[data-testid^="plan-empfehlung-button-"]').first().click()

    // 7. Empfehlung wird angezeigt
    await expect(page.getByTestId('recommendation-card')).toBeVisible()
    await expect(page.getByTestId('nutrient-row-N')).toBeVisible()

    // 8. Produktempfehlungen sichtbar
    await expect(page.getByTestId('product-list')).toBeVisible()
  })
})
