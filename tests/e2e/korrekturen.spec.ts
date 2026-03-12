import { test, expect } from '@playwright/test'

// Helper: Login as regular user
async function loginAsUser(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.fill('[data-testid="login-email"]', 'test@example.com')
  await page.fill('[data-testid="login-password"]', 'password123')
  await page.click('[data-testid="login-submit"]')
  await page.waitForURL(/\/felder/)
}

// Helper: Login as admin
async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.fill('[data-testid="login-email"]', 'admin@example.com')
  await page.fill('[data-testid="login-password"]', 'password123')
  await page.click('[data-testid="login-submit"]')
  await page.waitForURL(/\/felder/)
}

test.describe('Korrekturfaktoren', () => {
  test('correction panel is collapsed by default on recommendation page', async ({ page }) => {
    await loginAsUser(page)
    await page.goto('/felder')
    await page.click('[data-testid="feld-anlegen-button"]')
    await page.fill('[data-testid="feld-name-input"]', 'Testfeld Korrektur')
    await page.fill('[data-testid="feld-groesse-input"]', '10')
    await page.click('[data-testid="feld-speichern-button"]')
    await page.waitForTimeout(500)

    const fieldItem = page.locator('[data-testid^="feld-item-"]').first()
    await fieldItem.click()

    await page.click('[data-testid="plan-anlegen-button"]')
    await page.locator('[data-testid="plan-kultur-select"]').selectOption({ index: 1 })
    await page.fill('[data-testid="plan-ertrag-input"]', '80')
    await page.click('[data-testid="plan-speichern-button"]')
    await page.waitForTimeout(500)

    const planItem = page.locator('[data-testid^="plan-item-"]').first()
    await planItem.locator('[data-testid^="plan-empfehlung-"]').click()

    await expect(page.locator('[data-testid="correction-panel"]')).toBeVisible()
    await expect(page.locator('[data-testid="correction-vorfrucht-select"]')).not.toBeVisible()

    // Button should not exist in the DOM at all
    await expect(page.locator('[data-testid="empfehlung-berechnen-button"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="recommendation-card"]')).toBeVisible()
  })

  test('expanding panel shows 3 dropdowns and selecting correction updates results', async ({ page }) => {
    await loginAsUser(page)
    await page.goto('/felder')

    await page.click('[data-testid="feld-anlegen-button"]')
    await page.fill('[data-testid="feld-name-input"]', 'Testfeld Live')
    await page.fill('[data-testid="feld-groesse-input"]', '5')
    await page.click('[data-testid="feld-speichern-button"]')
    await page.waitForTimeout(500)

    const fieldItem = page.locator('[data-testid^="feld-item-"]').first()
    await fieldItem.click()

    await page.click('[data-testid="plan-anlegen-button"]')
    await page.locator('[data-testid="plan-kultur-select"]').selectOption({ index: 1 })
    await page.fill('[data-testid="plan-ertrag-input"]', '80')
    await page.click('[data-testid="plan-speichern-button"]')
    await page.waitForTimeout(500)

    const planItem = page.locator('[data-testid^="plan-item-"]').first()
    await planItem.locator('[data-testid^="plan-empfehlung-"]').click()
    await page.waitForTimeout(500)

    const nRowBefore = page.locator('[data-testid="nutrient-row-N"]')
    const textBefore = await nRowBefore.textContent()

    await page.click('[data-testid="correction-panel-toggle"]')
    await expect(page.locator('[data-testid="correction-vorfrucht-select"]')).toBeVisible()
    await expect(page.locator('[data-testid="correction-zwischenfrucht-select"]')).toBeVisible()
    await expect(page.locator('[data-testid="correction-humus-select"]')).toBeVisible()

    await page.locator('[data-testid="correction-vorfrucht-select"]').selectOption({ label: 'Winterraps' })
    await page.waitForTimeout(500)

    const nRowAfter = page.locator('[data-testid="nutrient-row-N"]')
    const textAfter = await nRowAfter.textContent()
    expect(textAfter).not.toBe(textBefore)
  })

  test('selected corrections persist after navigating away and back', async ({ page }) => {
    await loginAsUser(page)
    await page.goto('/felder')

    await page.click('[data-testid="feld-anlegen-button"]')
    await page.fill('[data-testid="feld-name-input"]', 'Testfeld Persist')
    await page.fill('[data-testid="feld-groesse-input"]', '5')
    await page.click('[data-testid="feld-speichern-button"]')
    await page.waitForTimeout(500)

    const fieldItem = page.locator('[data-testid^="feld-item-"]').first()
    await fieldItem.click()

    await page.click('[data-testid="plan-anlegen-button"]')
    await page.locator('[data-testid="plan-kultur-select"]').selectOption({ index: 1 })
    await page.fill('[data-testid="plan-ertrag-input"]', '80')
    await page.click('[data-testid="plan-speichern-button"]')
    await page.waitForTimeout(500)

    const planItem = page.locator('[data-testid^="plan-item-"]').first()
    await planItem.locator('[data-testid^="plan-empfehlung-"]').click()
    await page.waitForTimeout(500)

    await page.click('[data-testid="correction-panel-toggle"]')
    await page.locator('[data-testid="correction-vorfrucht-select"]').selectOption({ label: 'Winterraps' })
    await page.waitForTimeout(500)

    await page.goBack()
    await page.waitForTimeout(500)

    const planItem2 = page.locator('[data-testid^="plan-item-"]').first()
    await planItem2.locator('[data-testid^="plan-empfehlung-"]').click()
    await page.waitForTimeout(500)

    await page.click('[data-testid="correction-panel-toggle"]')
    const vorfruchtSelect = page.locator('[data-testid="correction-vorfrucht-select"]')
    await expect(vorfruchtSelect).toHaveValue(/corr-vf-winterraps/)
  })
})

test.describe('Admin Korrekturen', () => {
  test('corrections tab shows grouped list', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin')

    await page.click('[data-testid="admin-tab-corrections"]')
    await page.waitForTimeout(500)

    await expect(page.locator('[data-testid^="admin-correction-item-"]').first()).toBeVisible()
  })

  test('can create a new correction', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin')
    await page.click('[data-testid="admin-tab-corrections"]')
    await page.waitForTimeout(500)

    await page.click('[data-testid="admin-correction-anlegen-button"]')
    await page.fill('[data-testid="admin-correction-label-input"]', 'E2E Testkorrektur')
    await page.locator('[data-testid="admin-correction-type-select"]').selectOption('vorfrucht')
    await page.click('[data-testid="admin-correction-add-nutrient-button"]')
    const row = page.locator('[data-testid="admin-correction-nutrient-row-0"]')
    await row.locator('select').selectOption({ index: 1 })
    await row.locator('input[type="number"]').fill('-5')
    await page.click('[data-testid="admin-correction-speichern-button"]')
    await page.waitForTimeout(500)

    await expect(page.getByText('E2E Testkorrektur')).toBeVisible()
  })

  test('can edit an existing correction', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin')
    await page.click('[data-testid="admin-tab-corrections"]')
    await page.waitForTimeout(500)

    await page.locator('[data-testid^="admin-correction-item-"]').first().click()
    const labelInput = page.locator('[data-testid="admin-correction-label-input"]')
    await expect(labelInput).toBeVisible()

    await labelInput.clear()
    await labelInput.fill('Bearbeitete Korrektur')
    await page.click('[data-testid="admin-correction-speichern-button"]')
    await page.waitForTimeout(500)

    await expect(page.getByText('Bearbeitete Korrektur')).toBeVisible()
  })

  test('can delete a correction with confirmation', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin')
    await page.click('[data-testid="admin-tab-corrections"]')
    await page.waitForTimeout(500)

    await page.click('[data-testid="admin-correction-anlegen-button"]')
    await page.fill('[data-testid="admin-correction-label-input"]', 'Zum Löschen')
    await page.locator('[data-testid="admin-correction-type-select"]').selectOption('humus')
    await page.click('[data-testid="admin-correction-speichern-button"]')
    await page.waitForTimeout(500)

    await page.getByText('Zum Löschen').click()
    await page.click('[data-testid="admin-correction-loeschen-button"]')
    await page.click('[data-testid="admin-correction-loeschen-confirm-button"]')
    await page.waitForTimeout(500)

    await expect(page.getByText('Zum Löschen')).toHaveCount(0)
  })
})
