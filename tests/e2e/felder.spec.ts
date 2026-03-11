import { test, expect } from '@playwright/test'

// Hinweis: Diese Tests setzen einen eingeloggten User voraus.
// Im echten Setup wird ein test-Login-Helper benötigt (z.B. via Supabase Test-User).
// Für die erste Iteration wird der Login manuell im beforeEach ausgeführt.

test.describe('Felder CRUD', () => {
  // TODO: Auth-Setup für Tests — wird nach Supabase-Konfiguration ergänzt
  // test.beforeEach(async ({ page }) => {
  //   await loginAsTestUser(page)
  // })

  test('shows empty state when no fields exist', async ({ page }) => {
    await page.goto('/felder')
    await expect(page.getByTestId('fields-empty-state')).toBeVisible()
  })

  test('can open field creation drawer', async ({ page }) => {
    await page.goto('/felder')
    await page.getByTestId('feld-anlegen-button').click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await expect(page.getByTestId('feld-name-input')).toBeVisible()
    await expect(page.getByTestId('feld-size-input')).toBeVisible()
  })

  test('can create a new field', async ({ page }) => {
    await page.goto('/felder')
    await page.getByTestId('feld-anlegen-button').click()
    await page.getByTestId('feld-name-input').fill('Schlag Nord')
    await page.getByTestId('feld-size-input').fill('12.5')
    await page.getByTestId('feld-speichern-button').click()
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
    await expect(page.getByText('Schlag Nord')).toBeVisible()
  })

  test('can edit an existing field', async ({ page }) => {
    await page.goto('/felder')
    // Assumes a field exists from previous test or seed data
    await page.getByTestId('field-list').locator('[data-testid^="field-item-"]').first().click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await page.getByTestId('feld-name-input').fill('Schlag Süd')
    await page.getByTestId('feld-speichern-button').click()
    await expect(page.getByText('Schlag Süd')).toBeVisible()
  })

  test('can delete a field', async ({ page }) => {
    await page.goto('/felder')
    await page.getByTestId('field-list').locator('[data-testid^="field-item-"]').first().click()
    await page.getByTestId('feld-loeschen-button').click()
    // Confirm deletion
    await page.getByTestId('feld-loeschen-confirm-button').click()
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
  })

  test('field list shows size in German format', async ({ page }) => {
    await page.goto('/felder')
    // Assumes a field with size 12.5 exists
    await expect(page.getByText('12,50 ha')).toBeVisible()
  })
})
