import { test, expect } from '@playwright/test'

test.describe('Admin-Bereich', () => {
  test('shows admin tabs', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByTestId('admin-tabs')).toBeVisible()
    await expect(page.getByTestId('admin-tab-crops')).toBeVisible()
    await expect(page.getByTestId('admin-tab-nutrients')).toBeVisible()
    await expect(page.getByTestId('admin-tab-products')).toBeVisible()
  })
  test('can switch between tabs', async ({ page }) => {
    await page.goto('/admin')
    await page.getByTestId('admin-tab-products').click()
    await expect(page.getByTestId('admin-product-anlegen-button')).toBeVisible()
    await page.getByTestId('admin-tab-crops').click()
    await expect(page.getByTestId('admin-crop-anlegen-button')).toBeVisible()
  })
  test('can open crop creation drawer', async ({ page }) => {
    await page.goto('/admin')
    await page.getByTestId('admin-crop-anlegen-button').click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await expect(page.getByTestId('admin-crop-name-input')).toBeVisible()
  })
  test('can open product creation drawer', async ({ page }) => {
    await page.goto('/admin')
    await page.getByTestId('admin-tab-products').click()
    await page.getByTestId('admin-product-anlegen-button').click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await expect(page.getByTestId('admin-product-name-input')).toBeVisible()
  })
})
