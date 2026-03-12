import { test, expect } from '@playwright/test'
import { createField } from './helpers/create-field'
import { deleteField } from './helpers/delete-field'

test.describe('UC-L-06 / UC-L-07 / UC-L-08: Anbauplanung', () => {
  let feldName: string
  let fieldId: string

  test.beforeEach(async ({ page }) => {
    feldName = `E2E-Plan-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
    fieldId = await createField(page, feldName)
    await page.goto(`/felder/${fieldId}/planung`)
  })

  test.afterEach(async ({ page }) => {
    await deleteField(page, feldName)
  })

  test('Kultur-Dropdown zeigt verfügbare Kulturen', async ({ page }) => {
    await page.click('[data-testid="plan-anlegen-button"]')
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    const select = page.getByTestId('plan-crop-select')
    await expect(select).toBeVisible()
    const options = await select.locator('option').count()
    expect(options).toBeGreaterThan(1)
  })

  test('Kulturauswahl füllt Referenzertrag automatisch aus', async ({ page }) => {
    await page.click('[data-testid="plan-anlegen-button"]')
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await page.getByTestId('plan-crop-select').selectOption({ index: 1 })
    const yieldInput = page.getByTestId('plan-yield-input')
    const value = await yieldInput.inputValue()
    expect(value).not.toBe('')
    expect(Number(value)).toBeGreaterThan(0)
  })

  test('Ertrag ist editierbar', async ({ page }) => {
    await page.click('[data-testid="plan-anlegen-button"]')
    await page.getByTestId('plan-crop-select').selectOption({ index: 1 })
    await page.fill('[data-testid="plan-yield-input"]', '95')
    await expect(page.getByTestId('plan-yield-input')).toHaveValue('95')
  })

  test('Planung anlegen erscheint in Liste', async ({ page }) => {
    await page.click('[data-testid="plan-anlegen-button"]')
    await page.getByTestId('plan-crop-select').selectOption({ index: 1 })
    await page.click('[data-testid="plan-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
    await expect(page.getByTestId('crop-plan-list')).toBeVisible()
    await expect(page.locator('[data-testid^="plan-item-"]').first()).toBeVisible()
  })

  test('Mehrere Planungen pro Feld möglich', async ({ page }) => {
    await page.click('[data-testid="plan-anlegen-button"]')
    await page.getByTestId('plan-crop-select').selectOption({ index: 1 })
    await page.click('[data-testid="plan-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()

    await page.click('[data-testid="plan-anlegen-button"]')
    await page.getByTestId('plan-crop-select').selectOption({ index: 2 })
    await page.click('[data-testid="plan-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()

    await expect(page.locator('[data-testid^="plan-item-"]')).toHaveCount(2)
  })

  test('Planung bearbeiten: Drawer vorausgefüllt', async ({ page }) => {
    await page.click('[data-testid="plan-anlegen-button"]')
    await page.getByTestId('plan-crop-select').selectOption({ index: 1 })
    await page.fill('[data-testid="plan-season-input"]', '2026')
    await page.click('[data-testid="plan-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()

    await page.locator('[data-testid^="plan-item-"]').first().click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await expect(page.getByTestId('plan-season-input')).toHaveValue('2026')
  })

  test('Planung bearbeiten: Saison ändern → gespeichert', async ({ page }) => {
    await page.click('[data-testid="plan-anlegen-button"]')
    await page.getByTestId('plan-crop-select').selectOption({ index: 1 })
    await page.fill('[data-testid="plan-season-input"]', '2025')
    await page.click('[data-testid="plan-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()

    await page.locator('[data-testid^="plan-item-"]').first().click()
    await page.fill('[data-testid="plan-season-input"]', '2027')
    await page.click('[data-testid="plan-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
    await expect(page.locator('[data-testid^="plan-item-"]').first()).toContainText('2027')
  })

  test('Planung löschen: Bestätigung erforderlich', async ({ page }) => {
    await page.click('[data-testid="plan-anlegen-button"]')
    await page.getByTestId('plan-crop-select').selectOption({ index: 1 })
    await page.click('[data-testid="plan-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()

    await page.locator('[data-testid^="plan-item-"]').first().click()
    await page.click('[data-testid="plan-loeschen-button"]')
    await expect(page.getByTestId('plan-loeschen-confirm-button')).toBeVisible()
    await expect(page.locator('[data-testid^="plan-item-"]').first()).toBeVisible()
  })

  test('Planung löschen: verschwindet aus Liste', async ({ page }) => {
    await page.click('[data-testid="plan-anlegen-button"]')
    await page.getByTestId('plan-crop-select').selectOption({ index: 1 })
    await page.click('[data-testid="plan-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()

    await page.locator('[data-testid^="plan-item-"]').first().click()
    await page.click('[data-testid="plan-loeschen-button"]')
    await page.click('[data-testid="plan-loeschen-confirm-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
    await expect(page.locator('[data-testid^="plan-item-"]')).toHaveCount(0)
  })

  test('Zurück-Button führt zur Feldliste', async ({ page }) => {
    await page.click('[data-testid="back-button"]')
    await expect(page).toHaveURL('/felder')
  })
})
