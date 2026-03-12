import { test, expect } from '@playwright/test'

test.describe('UC-L-02: Unauthentifizierter Zugriff', () => {
  test('Redirect zu /login wenn nicht angemeldet', async ({ page }) => {
    await page.goto('/felder')
    await expect(page).toHaveURL('/login')
    await expect(page.getByTestId('auth-form')).toBeVisible()
  })

  test('Login-Formular zeigt E-Mail, Passwort und Submit-Button', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByTestId('auth-email-input')).toBeVisible()
    await expect(page.getByTestId('auth-password-input')).toBeVisible()
    await expect(page.getByTestId('auth-submit-button')).toBeVisible()
  })
})

test.describe('UC-L-01: Registrierung', () => {
  test('Wechsel zwischen Login und Registrieren', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByTestId('auth-submit-button')).toHaveText('Anmelden')
    await page.click('[data-testid="auth-toggle-button"]')
    await expect(page.getByTestId('auth-submit-button')).toHaveText('Registrieren')
    await page.click('[data-testid="auth-toggle-button"]')
    await expect(page.getByTestId('auth-submit-button')).toHaveText('Anmelden')
  })

  test('Registrieren: bereits vergebene E-Mail → Fehlermeldung', async ({ page }) => {
    await page.goto('/login')
    await page.click('[data-testid="auth-toggle-button"]')
    await page.fill('[data-testid="auth-email-input"]', 'test@example.com')
    await page.fill('[data-testid="auth-password-input"]', 'testpassword123')
    await page.click('[data-testid="auth-submit-button"]')
    await expect(page.getByTestId('auth-error')).toBeVisible()
  })

  test('Registrieren: Passwort zu kurz → Validierungsfehler', async ({ page }) => {
    await page.goto('/login')
    await page.click('[data-testid="auth-toggle-button"]')
    await page.fill('[data-testid="auth-email-input"]', `short-pw-${Date.now()}@example.com`)
    await page.fill('[data-testid="auth-password-input"]', '123')
    await page.click('[data-testid="auth-submit-button"]')
    await expect(page.getByTestId('auth-error')).toBeVisible()
  })
})

test.describe('UC-L-02: Anmeldung', () => {
  test('Falsche Credentials → Fehlermeldung', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[data-testid="auth-email-input"]', 'wrong@example.com')
    await page.fill('[data-testid="auth-password-input"]', 'wrongpassword')
    await page.click('[data-testid="auth-submit-button"]')
    await expect(page.getByTestId('auth-error')).toBeVisible()
  })

  test('Erfolgreicher Login → Redirect zu /felder', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[data-testid="auth-email-input"]', 'test@example.com')
    await page.fill('[data-testid="auth-password-input"]', 'testpassword123')
    await page.click('[data-testid="auth-submit-button"]')
    await expect(page).toHaveURL('/felder')
  })
})

test.describe('UC-L-13: Abmelden', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('[data-testid="auth-email-input"]', 'test@example.com')
    await page.fill('[data-testid="auth-password-input"]', 'testpassword123')
    await page.click('[data-testid="auth-submit-button"]')
    await page.waitForURL('/felder')
  })

  test('Abmelden → Redirect zu /login', async ({ page }) => {
    await page.goto('/profil')
    await page.click('[data-testid="profile-logout-button"]')
    await expect(page).toHaveURL('/login')
  })

  test('Nach Abmelden: /felder → Redirect zu /login', async ({ page }) => {
    await page.goto('/profil')
    await page.click('[data-testid="profile-logout-button"]')
    await page.goto('/felder')
    await expect(page).toHaveURL('/login')
  })
})
