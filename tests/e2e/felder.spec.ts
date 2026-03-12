import { test, expect } from '@playwright/test'
import { deleteField } from './helpers/delete-field'

test.describe('UC-L-03: Feld anlegen', () => {
  let feldName: string

  test.beforeEach(async () => {
    feldName = `E2E-Feld-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
  })

  test.afterEach(async ({ page }) => {
    await deleteField(page, feldName)
  })

  test('Leere Liste zeigt Empty-State oder Feldliste', async ({ page }) => {
    await page.goto('/felder')
    const list = page.getByTestId('field-list')
    const empty = page.getByTestId('fields-empty-state')
    await expect(list.or(empty)).toBeVisible()
  })

  test('Drawer öffnet sich mit Name- und Größen-Feld', async ({ page }) => {
    await page.goto('/felder')
    await page.click('[data-testid="feld-anlegen-button"]')
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await expect(page.getByTestId('feld-name-input')).toBeVisible()
    await expect(page.getByTestId('feld-size-input')).toBeVisible()
  })

  test('Feld anlegen erscheint in Liste', async ({ page }) => {
    await page.goto('/felder')
    await page.click('[data-testid="feld-anlegen-button"]')
    await page.fill('[data-testid="feld-name-input"]', feldName)
    await page.fill('[data-testid="feld-size-input"]', '12.5')
    await page.click('[data-testid="feld-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
    await expect(page.locator('[data-testid^="field-item-"]').filter({ hasText: feldName })).toBeVisible()
  })

  test('Größe wird im deutschen Format angezeigt', async ({ page }) => {
    await page.goto('/felder')
    await page.click('[data-testid="feld-anlegen-button"]')
    await page.fill('[data-testid="feld-name-input"]', feldName)
    await page.fill('[data-testid="feld-size-input"]', '12.5')
    await page.click('[data-testid="feld-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
    await expect(page.locator('[data-testid^="field-item-"]').filter({ hasText: feldName })).toContainText('12,50 ha')
  })

  test('Validierung: Name leer → Speichern blockiert', async ({ page }) => {
    await page.goto('/felder')
    await page.click('[data-testid="feld-anlegen-button"]')
    await page.fill('[data-testid="feld-size-input"]', '10')
    await page.click('[data-testid="feld-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await expect(page.getByTestId('feld-name-error')).toBeVisible()
  })

  test('Validierung: Größe ≤ 0 → Speichern blockiert', async ({ page }) => {
    await page.goto('/felder')
    await page.click('[data-testid="feld-anlegen-button"]')
    await page.fill('[data-testid="feld-name-input"]', feldName)
    await page.fill('[data-testid="feld-size-input"]', '0')
    await page.click('[data-testid="feld-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await expect(page.getByTestId('feld-size-error')).toBeVisible()
  })
})

test.describe('UC-L-04: Feld bearbeiten', () => {
  let feldName: string
  let editedName: string

  test.beforeEach(async ({ page }) => {
    feldName = `E2E-Edit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
    editedName = `${feldName}-editiert`
    await page.goto('/felder')
    await page.click('[data-testid="feld-anlegen-button"]')
    await page.fill('[data-testid="feld-name-input"]', feldName)
    await page.fill('[data-testid="feld-size-input"]', '5')
    await page.click('[data-testid="feld-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
  })

  test.afterEach(async ({ page }) => {
    await deleteField(page, editedName)
    await deleteField(page, feldName)
  })

  test('Drawer öffnet sich mit vorausgefüllten Werten', async ({ page }) => {
    await page.goto('/felder')
    await page.locator('[data-testid^="field-item-"]').filter({ hasText: feldName }).click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await expect(page.getByTestId('feld-name-input')).toHaveValue(feldName)
  })

  test('Name ändern → Liste zeigt neuen Namen', async ({ page }) => {
    await page.goto('/felder')
    await page.locator('[data-testid^="field-item-"]').filter({ hasText: feldName }).click()
    await page.fill('[data-testid="feld-name-input"]', editedName)
    await page.click('[data-testid="feld-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
    await expect(page.locator('[data-testid^="field-item-"]').filter({ hasText: editedName })).toBeVisible()
  })
})

test.describe('UC-L-05: Feld löschen', () => {
  let feldName: string

  test.beforeEach(async ({ page }) => {
    feldName = `E2E-Delete-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
    await page.goto('/felder')
    await page.click('[data-testid="feld-anlegen-button"]')
    await page.fill('[data-testid="feld-name-input"]', feldName)
    await page.fill('[data-testid="feld-size-input"]', '5')
    await page.click('[data-testid="feld-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
  })

  test.afterEach(async ({ page }) => {
    await deleteField(page, feldName)
  })

  test('Bestätigungsdialog erscheint', async ({ page }) => {
    await page.goto('/felder')
    await page.locator('[data-testid^="field-item-"]').filter({ hasText: feldName }).click()
    await page.click('[data-testid="feld-loeschen-button"]')
    await expect(page.getByTestId('feld-loeschen-confirm-button')).toBeVisible()
  })

  test('Abbrechen → Feld bleibt in Liste', async ({ page }) => {
    await page.goto('/felder')
    await page.locator('[data-testid^="field-item-"]').filter({ hasText: feldName }).click()
    await page.click('[data-testid="feld-loeschen-button"]')
    await page.click('[data-testid="drawer-close-button"]')
    await expect(page.locator('[data-testid^="field-item-"]').filter({ hasText: feldName })).toBeVisible()
  })

  test('Bestätigen → Feld verschwindet aus Liste', async ({ page }) => {
    await page.goto('/felder')
    await page.locator('[data-testid^="field-item-"]').filter({ hasText: feldName }).click()
    await page.click('[data-testid="feld-loeschen-button"]')
    await page.click('[data-testid="feld-loeschen-confirm-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
    await expect(page.locator('[data-testid^="field-item-"]').filter({ hasText: feldName })).toHaveCount(0)
  })
})
