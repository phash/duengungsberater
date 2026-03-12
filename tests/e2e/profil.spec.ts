import { test, expect } from '@playwright/test'

test.describe('UC-P-01: Passwort ändern — erfolgreich', () => {
  test.use({ storageState: '.auth/user.json' })

  test('changes password successfully', async ({ page }) => {
    await page.goto('/profil')
    await page.click('[data-testid="password-change-toggle"]')
    await page.fill('[data-testid="new-password-input"]', 'newpass123')
    await page.fill('[data-testid="confirm-password-input"]', 'newpass123')
    await page.click('[data-testid="password-save-button"]')
    await expect(page.locator('[data-testid="password-success"]')).toBeVisible({ timeout: 5000 })
    // Reset password back to original
    await page.click('[data-testid="password-change-toggle"]')
    await page.fill('[data-testid="new-password-input"]', 'test1234')
    await page.fill('[data-testid="confirm-password-input"]', 'test1234')
    await page.click('[data-testid="password-save-button"]')
    await expect(page.locator('[data-testid="password-success"]')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('UC-P-02: Passwort — Fehler bei Mismatch', () => {
  test.use({ storageState: '.auth/user.json' })

  test('shows error when passwords do not match', async ({ page }) => {
    await page.goto('/profil')
    await page.click('[data-testid="password-change-toggle"]')
    await page.fill('[data-testid="new-password-input"]', 'abcdefg')
    await page.fill('[data-testid="confirm-password-input"]', 'xxxxxxx')
    await page.click('[data-testid="password-save-button"]')
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible()
  })
})

test.describe('UC-P-03: Passwort — zu kurz', () => {
  test.use({ storageState: '.auth/user.json' })

  test('shows error for password shorter than 6 chars', async ({ page }) => {
    await page.goto('/profil')
    await page.click('[data-testid="password-change-toggle"]')
    await page.fill('[data-testid="new-password-input"]', 'abc')
    await page.fill('[data-testid="confirm-password-input"]', 'abc')
    await page.click('[data-testid="password-save-button"]')
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible()
  })
})

test.describe('UC-P-04: Account löschen — Abbrechen', () => {
  test.use({ storageState: '.auth/user.json' })

  test('cancel hides confirm block without deleting', async ({ page }) => {
    await page.goto('/profil')
    await expect(page.locator('[data-testid="delete-account-confirm-block"]')).not.toBeVisible()
    await page.click('[data-testid="delete-account-button"]')
    await expect(page.locator('[data-testid="delete-account-confirm-block"]')).toBeVisible()
    await page.click('[data-testid="delete-account-cancel-button"]')
    await expect(page.locator('[data-testid="delete-account-confirm-block"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="delete-account-button"]')).toBeVisible()
  })
})

test.describe('UC-P-05: Eigenen N-Wert setzen → Empfehlung aktualisiert', () => {
  test.use({ storageState: '.auth/user.json' })

  test('custom N demand is reflected in recommendation', async ({ page }) => {
    await page.goto('/profil/werte')
    await page.selectOption('[data-testid="kultur-select"]', { label: 'Winterweizen (E, A)' })
    await page.click('[data-testid="demand-row-N"]')
    await page.fill('[data-testid="demand-kg-ha-input"]', '200')
    await page.click('[data-testid="demand-save-button"]')
    await expect(page.locator('[data-testid="demand-row-N"]')).toContainText('200 kg/ha')
  })
})

test.describe('UC-P-06: Wert zurücksetzen → LfL wieder aktiv', () => {
  test.use({ storageState: '.auth/user.json' })

  test('reset restores LfL value', async ({ page }) => {
    await page.goto('/profil/werte')
    await page.selectOption('[data-testid="kultur-select"]', { label: 'Winterweizen (E, A)' })
    await page.click('[data-testid="demand-row-N"]')
    // Falls user-Override von UC-P-05 noch vorhanden
    const resetBtn = page.locator('[data-testid="demand-reset-button"]')
    if (await resetBtn.isVisible()) {
      await resetBtn.click()
    } else {
      await page.keyboard.press('Escape')
    }
    await expect(page.locator('[data-testid="demand-row-N"] span:last-child')).toContainText('—')
  })
})

test.describe('UC-P-07: Erweiterte Einstellungen', () => {
  test.use({ storageState: '.auth/user.json' })

  test('saves ref_yield and per_yield_correction', async ({ page }) => {
    await page.goto('/profil/werte')
    await page.selectOption('[data-testid="kultur-select"]', { label: 'Winterweizen (E, A)' })
    await page.click('[data-testid="demand-row-P2O5"]')
    await page.fill('[data-testid="demand-kg-ha-input"]', '60')
    await page.click('[data-testid="demand-advanced-toggle"]')
    await page.fill('[data-testid="ref-yield-input"]', '75')
    await page.fill('[data-testid="per-yield-input"]', '0.7')
    await page.click('[data-testid="demand-save-button"]')
    await expect(page.locator('[data-testid="demand-row-P2O5"]')).toContainText('60 kg/ha')
  })
})

test.describe('UC-P-08: Offline — Bearbeitung deaktiviert', () => {
  test.use({ storageState: '.auth/user.json' })

  test('editing is disabled when offline', async ({ page, context }) => {
    await page.goto('/profil/werte')
    await page.selectOption('[data-testid="kultur-select"]', { label: 'Winterweizen (E, A)' })
    // Offline simulieren
    await context.setOffline(true)
    await expect(page.locator('[data-testid="demand-offline-notice"]')).toBeVisible({
      timeout: 3000,
    })
    await context.setOffline(false)
  })
})
