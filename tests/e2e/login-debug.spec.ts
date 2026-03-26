import { test, expect } from '@playwright/test'

test.describe('Login Debug - Real Browser', () => {
  test('should debug login request/response', async ({ page }) => {
    // Listen to all network requests
    page.on('request', (request) => {
      console.log(`📤 Request: ${request.method()} ${request.url()}`)
      if (request.method() === 'POST') {
        console.log(`   Headers:`, Object.fromEntries(request.allHeaders()))
        console.log(`   Body:`, request.postDataJSON() || request.postDataBuffer())
      }
    })

    page.on('response', (response) => {
      if (response.url().includes('auth') || response.url().includes('token')) {
        console.log(`📥 Response: ${response.status()} ${response.url()}`)
        response.text().then((text) => {
          console.log(`   Body:`, text)
        })
      }
    })

    // Navigate to app
    console.log('\n🌐 Navigating to app...')
    await page.goto('http://localhost:5173/')
    await page.waitForLoadState('networkidle')

    // Wait for login form
    console.log('\n📝 Waiting for login form...')
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible({ timeout: 5000 })

    // Fill form
    console.log('\n✍️ Filling login form...')
    const testEmail = `test-${Date.now()}@example.com`
    await emailInput.fill(testEmail)

    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.fill('test123')

    // Submit
    console.log('\n🔐 Submitting login form...')
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // Wait for response
    console.log('\n⏳ Waiting for auth response...')
    await page.waitForLoadState('networkidle')

    // Check result
    console.log('\n📊 Checking login result...')
    const currentUrl = page.url()
    console.log(`   Current URL: ${currentUrl}`)

    // Check for success indicators
    const isLoggedIn = currentUrl.includes('felder') || currentUrl.includes('feld')
    const hasError = await page.locator('text=/error|Error|ERROR|Fehler/i').isVisible({ timeout: 1000 }).catch(() => false)

    if (hasError) {
      console.log('\n❌ Error found on page')
      const errorText = await page.locator('text=/error|Error|ERROR|Fehler/i').textContent()
      console.log(`   Error: ${errorText}`)
    }

    if (isLoggedIn) {
      console.log('\n✅ Login successful!')
    } else {
      console.log('\n⚠️ Login result unclear - check URLs above')
    }
  })

  test('should test auth signup directly', async ({ page }) => {
    console.log('\n🔬 Testing Auth Signup Endpoint Directly')

    page.on('request', (request) => {
      if (request.url().includes('auth') || request.url().includes('token')) {
        console.log(`📤 ${request.method()} ${request.url()}`)
        if (request.method() === 'POST') {
          console.log(`   Body:`, request.postDataJSON() || request.postDataBuffer()?.toString())
        }
      }
    })

    page.on('response', (response) => {
      if (response.url().includes('auth') || response.url().includes('token')) {
        console.log(`📥 ${response.status()} ${response.url()}`)
        response.text().then((text) => console.log(`   Response:`, text.substring(0, 200)))
      }
    })

    // Go to app and wait for initialization
    await page.goto('http://localhost:5173/')
    await page.waitForLoadState('networkidle')

    // Try signup via browser DevTools
    console.log('\n🚀 Attempting signup...')
    const testEmail = `browser-test-${Date.now()}@test.de`
    const testPassword = 'BrowserTest123'

    // Fill and submit
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)

    // Look for signup button
    const signupButton = page.locator('button:has-text("Sign up"), button:has-text("Register"), a:has-text("Register")')
    const loginButton = page.locator('button:has-text("Sign in"), button:has-text("Login"), button[type="submit"]')

    if (await signupButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('Found signup button, clicking...')
      await signupButton.click()
    } else if (await loginButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('Found login button, clicking...')
      await loginButton.click()
    }

    // Wait and observe
    await page.waitForTimeout(3000)

    console.log('\n📍 Final URL:', page.url())
    console.log('Done!')
  })
})
