import { test, expect } from '@playwright/test'

test.describe('Auth Flow', () => {
  test('shows login page for unauthenticated users', async ({ page }) => {
    await page.goto('/felder')
    await expect(page.getByTestId('app-title')).toHaveText('Düngungsberater')
    await expect(page.getByTestId('auth-form')).toBeVisible()
  })

  test('can toggle between login and register', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByTestId('auth-submit-button')).toHaveText('Anmelden')
    await page.getByTestId('auth-toggle-button').click()
    await expect(page.getByTestId('auth-submit-button')).toHaveText('Registrieren')
    await page.getByTestId('auth-toggle-button').click()
    await expect(page.getByTestId('auth-submit-button')).toHaveText('Anmelden')
  })

  test('shows error on invalid login', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('auth-email-input').fill('invalid@example.com')
    await page.getByTestId('auth-password-input').fill('wrongpassword')
    await page.getByTestId('auth-submit-button').click()
    await expect(page.getByTestId('auth-error')).toBeVisible()
  })

  test('bottom nav is not visible on login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByTestId('bottom-nav')).not.toBeVisible()
  })
})
