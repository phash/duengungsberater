import fs from 'fs'
import { chromium, type FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  fs.mkdirSync('.auth', { recursive: true })

  const baseURL = config.projects[0].use.baseURL ?? 'http://localhost:5173'
  const browser = await chromium.launch()

  // User-Session speichern
  const userContext = await browser.newContext()
  const userPage = await userContext.newPage()
  await userPage.goto(`${baseURL}/login`)
  await userPage.fill('[data-testid="auth-email-input"]', 'test@example.com')
  await userPage.fill('[data-testid="auth-password-input"]', 'testpassword123')
  await userPage.click('[data-testid="auth-submit-button"]')
  await userPage.waitForURL('**/felder')
  await userContext.storageState({ path: '.auth/user.json' })
  await userContext.close()

  // Admin-Session speichern
  const adminContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  await adminPage.goto(`${baseURL}/login`)
  await adminPage.fill('[data-testid="auth-email-input"]', 'admin@example.com')
  await adminPage.fill('[data-testid="auth-password-input"]', 'adminpassword123')
  await adminPage.click('[data-testid="auth-submit-button"]')
  await adminPage.waitForURL('**/felder')
  await adminContext.storageState({ path: '.auth/admin.json' })
  await adminContext.close()

  await browser.close()
}

export default globalSetup
