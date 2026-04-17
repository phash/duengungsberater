import { test, expect } from '@playwright/test'

test.describe('Onboarding-Checkliste', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/')
    await page.evaluate(() => {
      try {
        localStorage.clear()
      } catch { /* privater Modus */ }
      try {
        indexedDB.deleteDatabase('duengungsberater')
      } catch { /* dexie nicht geladen */ }
    })
  })

  test('zeigt Welcome-Card bei leerer App', async ({ page }) => {
    await page.goto('/felder')
    await expect(page.getByTestId('onboarding-card')).toBeVisible()
    await expect(page.getByTestId('onboarding-progress')).toHaveText('0/4')
  })

  test('Step 1 wird grün nach Feld-Anlage', async ({ page }) => {
    await page.goto('/felder')
    // Click auf den "Manuell anlegen"-Button innerhalb des ersten Steps
    await page.getByTestId('onboarding-step-1-action-new').click()
    await page.getByTestId('feld-name-input').fill('Onboarding-Testacker')
    await page.getByTestId('feld-size-input').fill('5')
    await page.getByTestId('feld-speichern-button').click()
    // Drawer schliesst, Feld erscheint — Step 1 jetzt done
    await expect(page.getByTestId('onboarding-progress')).toHaveText('1/4')
  })

  test('Dismiss persistiert über Reload', async ({ page }) => {
    await page.goto('/felder')
    await page.getByTestId('onboarding-dismiss').click()
    await expect(page.getByTestId('onboarding-card')).toBeHidden()
    await page.reload()
    await expect(page.getByTestId('onboarding-card')).toBeHidden()
  })

  test('Reset über LocalStorage reaktiviert Card', async ({ page }) => {
    // /profil ist registered-only, daher testen wir den Reset-Pfad
    // ueber das Low-Level-Verhalten (LocalStorage entfernen → Card sichtbar)
    await page.goto('/felder')
    await page.getByTestId('onboarding-dismiss').click()
    await expect(page.getByTestId('onboarding-card')).toBeHidden()
    await page.evaluate(() => localStorage.removeItem('onboarding_dismissed'))
    await page.reload()
    await expect(page.getByTestId('onboarding-card')).toBeVisible()
  })

  test('„Später" bei Step 4 markiert PWA-Schritt als erledigt', async ({ page }) => {
    await page.goto('/felder')
    await page.getByTestId('onboarding-step-4-action-later').click()
    await expect(page.getByTestId('onboarding-progress')).toHaveText('1/4')
  })
})
