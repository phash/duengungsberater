import fs from 'fs'
import { chromium, type FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  fs.mkdirSync('.auth', { recursive: true })

  const baseURL = config.projects?.[0]?.use?.baseURL ?? 'http://localhost:5173'
  const browser = await chromium.launch()

  try {
    // User-Session speichern
    const userContext = await browser.newContext()
    const userPage = await userContext.newPage()
    try {
      await userPage.goto(`${baseURL}/`)

      // Wait for form to appear (longer timeout for app hydration)
      await userPage.waitForSelector('input[type="email"]', { timeout: 5000 })

      // Try different selectors for email input
      const emailInput = userPage.locator('input[type="email"]').first()
      await emailInput.fill('user@test.de')

      const passwordInput = userPage.locator('input[type="password"]').first()
      await passwordInput.fill('test1234')

      const submitButton = userPage.locator('button[type="submit"]').first()
      await submitButton.click()

      // Wait for auth to complete (don't wait for specific URL, just wait for navigation)
      await userPage.waitForLoadState('networkidle')
      await userContext.storageState({ path: '.auth/user.json' })

      console.log('✅ User session saved')
    } catch (error) {
      console.warn('⚠️ User auth setup skipped (not critical):', error)
      // Don't throw - tests can run without pre-authenticated sessions
    } finally {
      await userContext.close()
    }

    // Admin-Session speichern (optional)
    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    try {
      await adminPage.goto(`${baseURL}/`)
      await adminPage.waitForSelector('input[type="email"]', { timeout: 5000 })

      const emailInput = adminPage.locator('input[type="email"]').first()
      await emailInput.fill('admin@test.de')

      const passwordInput = adminPage.locator('input[type="password"]').first()
      await passwordInput.fill('admin1234')

      const submitButton = adminPage.locator('button[type="submit"]').first()
      await submitButton.click()

      await adminPage.waitForLoadState('networkidle')
      await adminContext.storageState({ path: '.auth/admin.json' })

      console.log('✅ Admin session saved')
    } catch (error) {
      console.warn('⚠️ Admin auth setup skipped (not critical):', error)
    } finally {
      await adminContext.close()
    }
  } finally {
    await browser.close()
  }
}

export default globalSetup
