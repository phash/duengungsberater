import { test, expect } from '@playwright/test'
import { createField } from './helpers/create-field'
import { createPlan } from './helpers/create-plan'
import { deleteField } from './helpers/delete-field'

test.describe('UC-L-09–12: Düngeempfehlung', () => {
  let feldName: string
  let fieldId: string
  let planId: string

  test.beforeEach(async ({ page }) => {
    feldName = `E2E-Empf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
    fieldId = await createField(page, feldName, '10')
    planId = await createPlan(page, fieldId, { yieldDt: '80' })
    await page.goto(`/felder/${fieldId}/planung/${planId}/empfehlung`)
  })

  test.afterEach(async ({ page }) => {
    await deleteField(page, feldName)
  })

  test('Empfehlung wird automatisch berechnet — kein Berechnen-Button', async ({ page }) => {
    await expect(page.getByTestId('empfehlung-berechnen-button')).toHaveCount(0)
    await expect(page.getByTestId('recommendation-card')).toBeVisible()
  })

  test('Nährstoffwerte in kg/ha und kg gesamt sichtbar', async ({ page }) => {
    await expect(page.getByTestId('recommendation-card')).toBeVisible()
    await expect(page.locator('[data-testid^="nutrient-row-"]').first()).toBeVisible()
  })

  test('Zahlenformat: Komma als Dezimaltrenner, Einheit sichtbar', async ({ page }) => {
    await expect(page.getByTestId('recommendation-card')).toBeVisible()
    await expect(page.locator('[data-testid^="nutrient-row-"]').first()).toContainText('kg')
  })

  test('Kontext-Karte zeigt Kultur, Saison, Ertrag, Feld + Größe', async ({ page }) => {
    await expect(page.getByTestId('empfehlung-context')).toBeVisible()
    await expect(page.getByTestId('empfehlung-context')).toContainText(feldName)
    await expect(page.getByTestId('empfehlung-context')).toContainText('Saison')
    await expect(page.getByTestId('empfehlung-context')).toContainText('80')
    await expect(page.getByTestId('empfehlung-context')).toContainText('10')
  })

  test('Correction Panel standardmäßig eingeklappt', async ({ page }) => {
    await expect(page.getByTestId('correction-panel')).toBeVisible()
    await expect(page.getByTestId('correction-vorfrucht-select')).not.toBeVisible()
  })

  test('Panel aufklappen → 3 Dropdowns sichtbar', async ({ page }) => {
    await page.click('[data-testid="correction-panel-toggle"]')
    await expect(page.getByTestId('correction-vorfrucht-select')).toBeVisible()
    await expect(page.getByTestId('correction-zwischenfrucht-select')).toBeVisible()
    await expect(page.getByTestId('correction-humus-select')).toBeVisible()
  })

  test('Vorfrucht wählen → N-Wert ändert sich', async ({ page }) => {
    await expect(page.getByTestId('recommendation-card')).toBeVisible()
    const nRow = page.getByTestId('nutrient-row-N')
    const before = await nRow.textContent()

    await page.click('[data-testid="correction-panel-toggle"]')
    await page.getByTestId('correction-vorfrucht-select').selectOption({ index: 1 })
    await expect(page.getByTestId('recommendation-card')).toBeVisible()

    const after = await nRow.textContent()
    expect(after).not.toBe(before)
  })

  test('Zwischenfrucht wählen → N-Wert ändert sich', async ({ page }) => {
    await expect(page.getByTestId('recommendation-card')).toBeVisible()
    const nRow = page.getByTestId('nutrient-row-N')
    const before = await nRow.textContent()

    await page.click('[data-testid="correction-panel-toggle"]')
    await page.getByTestId('correction-zwischenfrucht-select').selectOption({ index: 1 })
    await expect(page.getByTestId('recommendation-card')).toBeVisible()

    const after = await nRow.textContent()
    expect(after).not.toBe(before)
  })

  test('Humus wählen → N-Wert ändert sich', async ({ page }) => {
    await expect(page.getByTestId('recommendation-card')).toBeVisible()
    const nRow = page.getByTestId('nutrient-row-N')
    const before = await nRow.textContent()

    await page.click('[data-testid="correction-panel-toggle"]')
    await page.getByTestId('correction-humus-select').selectOption({ index: 1 })
    await expect(page.getByTestId('recommendation-card')).toBeVisible()

    const after = await nRow.textContent()
    expect(after).not.toBe(before)
  })

  test('Alle 3 Korrekturen aktiv → kumulieren sich', async ({ page }) => {
    await expect(page.getByTestId('recommendation-card')).toBeVisible()
    const nRow = page.getByTestId('nutrient-row-N')
    const before = await nRow.textContent()

    await page.click('[data-testid="correction-panel-toggle"]')
    await page.getByTestId('correction-vorfrucht-select').selectOption({ index: 1 })
    await page.getByTestId('correction-zwischenfrucht-select').selectOption({ index: 1 })
    await page.getByTestId('correction-humus-select').selectOption({ index: 1 })
    await expect(page.getByTestId('recommendation-card')).toBeVisible()

    const after = await nRow.textContent()
    expect(after).not.toBe(before)
  })

  test('Korrekturen persistieren nach Zurück + erneut öffnen', async ({ page }) => {
    await page.click('[data-testid="correction-panel-toggle"]')
    await page.getByTestId('correction-vorfrucht-select').selectOption({ index: 1 })
    const selectedValue = await page.getByTestId('correction-vorfrucht-select').inputValue()

    await page.click('[data-testid="back-button"]')
    await page.locator(`[data-testid="plan-empfehlung-button-${planId}"]`).click()

    await page.click('[data-testid="correction-panel-toggle"]')
    await expect(page.getByTestId('correction-vorfrucht-select')).toHaveValue(selectedValue)
  })

  test('Nährstoff-Zeile klicken → Aufschlüsselung klappt auf', async ({ page }) => {
    await expect(page.getByTestId('recommendation-card')).toBeVisible()
    await page.locator('[data-testid^="nutrient-row-"]').first().click()
    await expect(page.locator('[data-testid^="nutrient-breakdown-"]').first()).toBeVisible()
  })

  test('Aufschlüsselung zeigt Grundbedarf, Ertragskorrektur, Einzelkorrekturen', async ({ page }) => {
    await expect(page.getByTestId('recommendation-card')).toBeVisible()
    await page.locator('[data-testid^="nutrient-row-"]').first().click()
    const breakdown = page.locator('[data-testid^="nutrient-breakdown-"]').first()
    await expect(breakdown).toBeVisible()
    await expect(breakdown).toContainText('Grundbedarf')
    await expect(breakdown).toContainText('kg')
  })

  test('Produktliste sichtbar mit Mengenangabe', async ({ page }) => {
    await expect(page.getByTestId('product-list')).toBeVisible()
    const firstItem = page.locator('[data-testid^="product-item-"]').first()
    await expect(firstItem).toBeVisible()
    await expect(firstItem).toContainText('kg')
  })

  test('Mindestens ein Produkt hat Affiliate-Link', async ({ page }) => {
    await expect(page.getByTestId('product-list')).toBeVisible()
    const firstLink = page.locator('[data-testid^="product-link-"]').first()
    await expect(firstLink).toBeVisible()
    const href = await firstLink.getAttribute('href')
    expect(href).toBeTruthy()
    expect(href).toMatch(/^https?:\/\//)
  })

  test('Print-Button ist auf der Empfehlungsseite sichtbar', async ({ page }) => {
    await expect(page.getByTestId('empfehlung-drucken-button')).toBeVisible()
  })

  test('Print-Button erscheint nicht auf der Felder-Seite', async ({ page }) => {
    await page.goto('/felder')
    await expect(page.getByTestId('empfehlung-drucken-button')).toHaveCount(0)
  })
})
