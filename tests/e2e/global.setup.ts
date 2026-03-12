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
      await userPage.goto(`${baseURL}/login`)
      await userPage.fill('[data-testid="auth-email-input"]', 'test@example.com')
      await userPage.fill('[data-testid="auth-password-input"]', 'testpassword123')
      await userPage.click('[data-testid="auth-submit-button"]')
      await userPage.waitForURL('**/felder', { timeout: 10000 })
      await userContext.storageState({ path: '.auth/user.json' })
    } catch (error) {
      throw new Error('User auth setup failed', { cause: error })
    } finally {
      await userContext.close()
    }

    // Admin-Session speichern
    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    try {
      await adminPage.goto(`${baseURL}/login`)
      await adminPage.fill('[data-testid="auth-email-input"]', 'admin@example.com')
      await adminPage.fill('[data-testid="auth-password-input"]', 'adminpassword123')
      await adminPage.click('[data-testid="auth-submit-button"]')
      await adminPage.waitForURL('**/felder', { timeout: 10000 })
      await adminContext.storageState({ path: '.auth/admin.json' })
    } catch (error) {
      throw new Error('Admin auth setup failed', { cause: error })
    } finally {
      await adminContext.close()
    }
  } finally {
    await browser.close()
  }
}

export default globalSetup
