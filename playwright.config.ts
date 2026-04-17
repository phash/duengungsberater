import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  globalSetup: './tests/e2e/global.setup.ts',
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'de-DE',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'auth-tests',
      testMatch: ['**/auth.spec.ts', '**/login*.spec.ts', '**/auth-flow.spec.ts', '**/workflow.spec.ts', '**/onboarding.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'user-tests',
      testMatch: ['**/felder.spec.ts', '**/anbauplanung.spec.ts', '**/empfehlung.spec.ts'],
      use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' },
    },
    {
      name: 'admin-tests',
      testMatch: ['**/admin.spec.ts'],
      use: { ...devices['Desktop Chrome'], storageState: '.auth/admin.json' },
    },
    {
      name: 'profil-tests',
      testMatch: ['**/profil.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
