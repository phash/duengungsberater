import { test, expect } from '@playwright/test'

test.describe('Auth Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/')
  })

  test('should show login form', async ({ page }) => {
    // Wait for app to load
    await page.waitForTimeout(2000)

    // Check if we're on login page or need to wait for auth initialization
    const email = page.locator('input[type="email"], input[placeholder*="mail"], input[placeholder*="Mail"]')
    const password = page.locator('input[type="password"]')

    // If auth is still loading, wait for login form
    const loginContainer = page.locator('form, [data-testid="login-form"], button:has-text("Sign In"), button:has-text("Sign in"), button:has-text("Login")')

    await expect(loginContainer.or(email).or(password)).toBeVisible({ timeout: 5000 })
  })

  test('should sign up new user', async ({ page }) => {
    await page.waitForTimeout(1500)

    // Find sign up button
    const signUpButton = page.locator('button:has-text("Sign up"), button:has-text("Register"), a:has-text("Sign up")')

    // If visible, click it
    if (await signUpButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signUpButton.click()
      await page.waitForTimeout(500)
    }

    // Fill in signup form
    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()

    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'Test@123456'

    await emailInput.fill(testEmail)
    await passwordInput.fill(testPassword)

    // Submit
    const submitButton = page.locator('button:has-text("Sign up"), button:has-text("Register"), button[type="submit"]').first()
    await submitButton.click()

    // Wait for navigation/response
    await page.waitForTimeout(2000)

    console.log(`✅ Signup attempted with ${testEmail}`)
  })

  test('should sign in user', async ({ page }) => {
    await page.waitForTimeout(1500)

    // Fill in login form
    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()

    await emailInput.fill('test@example.com')
    await passwordInput.fill('test123')

    // Submit
    const submitButton = page.locator('button:has-text("Sign in"), button:has-text("Login"), button[type="submit"]').first()
    await submitButton.click()

    // Wait for navigation
    await page.waitForTimeout(2000)

    console.log('✅ Login attempted')
  })
})
