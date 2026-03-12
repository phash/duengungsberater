import { test, expect } from '@playwright/test'

test.describe('Admin: Zugang', () => {
  test('Admin-Bereich erreichbar, 4 Tabs sichtbar', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByTestId('admin-tabs')).toBeVisible()
    await expect(page.getByTestId('admin-tab-crops')).toBeVisible()
    await expect(page.getByTestId('admin-tab-nutrients')).toBeVisible()
    await expect(page.getByTestId('admin-tab-products')).toBeVisible()
    await expect(page.getByTestId('admin-tab-corrections')).toBeVisible()
  })
})

test.describe('Admin: Nicht-Admin Redirect', () => {
  test.use({ storageState: '.auth/user.json' })

  test('Nicht-Admin → kein Zugriff auf /admin', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).not.toHaveURL('/admin')
  })
})

// ─── Tab Kulturen ─────────────────────────────────────────────────────────────

test.describe('UC-A-01 / UC-A-02: Admin Kulturen', () => {
  let cropName: string

  test.beforeEach(async ({ page }) => {
    cropName = `E2E-Kultur-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
    await page.goto('/admin')
  })

  test.afterEach(async ({ page }) => {
    await page.goto('/admin')
    const item = page.locator('[data-testid^="admin-crop-item-"]').filter({ hasText: cropName })
    if ((await item.count()) === 0) return
    await item.click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await page.click('[data-testid="admin-crop-loeschen-button"]')
    await page.click('[data-testid="admin-crop-loeschen-confirm-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
  })

  test('UC-A-01: Kultur anlegen → in Liste sichtbar', async ({ page }) => {
    await page.click('[data-testid="admin-crop-anlegen-button"]')
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await page.fill('[data-testid="admin-crop-name-input"]', cropName)
    await page.fill('[data-testid="admin-crop-ref-yield-input"]', '75')
    await page.click('[data-testid="admin-crop-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
    await expect(page.locator('[data-testid^="admin-crop-item-"]').filter({ hasText: cropName })).toBeVisible()
  })

  test('UC-A-02: Kultur bearbeiten → Drawer vorausgefüllt, Änderung gespeichert', async ({ page }) => {
    await page.click('[data-testid="admin-crop-anlegen-button"]')
    await page.fill('[data-testid="admin-crop-name-input"]', cropName)
    await page.fill('[data-testid="admin-crop-ref-yield-input"]', '75')
    await page.click('[data-testid="admin-crop-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()

    await page.locator('[data-testid^="admin-crop-item-"]').filter({ hasText: cropName }).click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await expect(page.getByTestId('admin-crop-name-input')).toHaveValue(cropName)
    await page.fill('[data-testid="admin-crop-ref-yield-input"]', '80')
    await page.click('[data-testid="admin-crop-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
  })

  test('UC-A-02: Kultur löschen → verschwindet aus Liste', async ({ page }) => {
    await page.click('[data-testid="admin-crop-anlegen-button"]')
    await page.fill('[data-testid="admin-crop-name-input"]', cropName)
    await page.fill('[data-testid="admin-crop-ref-yield-input"]', '75')
    await page.click('[data-testid="admin-crop-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()

    await page.locator('[data-testid^="admin-crop-item-"]').filter({ hasText: cropName }).click()
    await page.click('[data-testid="admin-crop-loeschen-button"]')
    await page.click('[data-testid="admin-crop-loeschen-confirm-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
    await expect(page.locator('[data-testid^="admin-crop-item-"]').filter({ hasText: cropName })).toHaveCount(0)
  })
})

// ─── Tab Nährstoffwerte ───────────────────────────────────────────────────────

test.describe('UC-A-03 / UC-A-04: Admin Nährstoffwerte', () => {
  // Serial mode: nutrient records have no unique label to filter on, so cleanup
  // uses positional selectors (.last(), .first()) — serial prevents parallel collisions.
  test.describe.configure({ mode: 'serial' })

  let createdNutrientTestId: string | null = null

  test.beforeEach(async ({ page }) => {
    createdNutrientTestId = null
    await page.goto('/admin')
    await page.click('[data-testid="admin-tab-nutrients"]')
  })

  test.afterEach(async ({ page }) => {
    if (!createdNutrientTestId) return
    await page.goto('/admin')
    await page.click('[data-testid="admin-tab-nutrients"]')
    const item = page.locator(`[data-testid="${createdNutrientTestId}"]`)
    if ((await item.count()) === 0) return
    await item.click()
    await page.click('[data-testid="admin-nutrient-loeschen-button"]')
    await page.click('[data-testid="admin-nutrient-loeschen-confirm-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
  })

  test('UC-A-03: Nährstoffwert anlegen → sichtbar', async ({ page }) => {
    await page.click('[data-testid="admin-nutrient-anlegen-button"]')
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await page.getByTestId('admin-nutrient-crop-select').selectOption({ index: 1 })
    await page.getByTestId('admin-nutrient-type-select').selectOption({ index: 1 })
    await page.fill('[data-testid="admin-nutrient-demand-input"]', '150')
    await page.fill('[data-testid="admin-nutrient-ref-yield-input"]', '70')
    await page.fill('[data-testid="admin-nutrient-correction-input"]', '2.5')
    await page.click('[data-testid="admin-nutrient-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
    const lastItem = page.locator('[data-testid^="admin-nutrient-item-"]').last()
    await expect(lastItem).toBeVisible()
    createdNutrientTestId = await lastItem.getAttribute('data-testid')
  })

  test('US-26: Nährstoffwert mit source=user anlegen → Quelle sichtbar', async ({ page }) => {
    await page.click('[data-testid="admin-nutrient-anlegen-button"]')
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await page.getByTestId('admin-nutrient-crop-select').selectOption({ index: 1 })
    await page.getByTestId('admin-nutrient-type-select').selectOption({ index: 1 })
    await page.fill('[data-testid="admin-nutrient-demand-input"]', '999')
    await page.fill('[data-testid="admin-nutrient-ref-yield-input"]', '70')
    await page.fill('[data-testid="admin-nutrient-correction-input"]', '0')
    const sourceUser = page.locator('[data-testid="admin-nutrient-source-user"]')
    if ((await sourceUser.count()) > 0) {
      await sourceUser.click()
    }
    await page.click('[data-testid="admin-nutrient-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
    const lastItem = page.locator('[data-testid^="admin-nutrient-item-"]').last()
    await expect(lastItem).toContainText('user')
    createdNutrientTestId = await lastItem.getAttribute('data-testid')
  })

  test('UC-A-04: Nährstoffwert bearbeiten', async ({ page }) => {
    const item = page.locator('[data-testid^="admin-nutrient-item-"]').first()
    if ((await item.count()) === 0) test.skip()
    await item.click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await page.fill('[data-testid="admin-nutrient-demand-input"]', '160')
    await page.click('[data-testid="admin-nutrient-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
  })

  test('UC-A-04: Nährstoffwert löschen', async ({ page }) => {
    const item = page.locator('[data-testid^="admin-nutrient-item-"]').first()
    if ((await item.count()) === 0) test.skip()
    const testId = await item.getAttribute('data-testid')
    if (!testId) test.skip()
    const id = testId!.replace('admin-nutrient-item-', '')
    await item.click()
    await page.click('[data-testid="admin-nutrient-loeschen-button"]')
    await page.click('[data-testid="admin-nutrient-loeschen-confirm-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
    await expect(page.locator(`[data-testid="admin-nutrient-item-${id}"]`)).toHaveCount(0)
  })
})

// ─── Tab Produkte ─────────────────────────────────────────────────────────────

test.describe('UC-A-05 / UC-A-06: Admin Produkte', () => {
  let productName: string

  test.beforeEach(async ({ page }) => {
    productName = `E2E-Produkt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
    await page.goto('/admin')
    await page.click('[data-testid="admin-tab-products"]')
  })

  test.afterEach(async ({ page }) => {
    await page.goto('/admin')
    await page.click('[data-testid="admin-tab-products"]')
    const item = page.locator('[data-testid^="admin-product-item-"]').filter({ hasText: productName })
    if ((await item.count()) === 0) return
    await item.click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await page.click('[data-testid="admin-product-loeschen-button"]')
    await page.click('[data-testid="admin-product-loeschen-confirm-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
  })

  test('UC-A-05: Produkt anlegen → in Liste sichtbar', async ({ page }) => {
    await page.click('[data-testid="admin-product-anlegen-button"]')
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await page.fill('[data-testid="admin-product-name-input"]', productName)
    await page.fill('[data-testid="admin-product-n-pct-input"]', '27')
    await page.fill('[data-testid="admin-product-affiliate-input"]', 'https://example.com/produkt')
    await page.fill('[data-testid="admin-product-shop-input"]', 'E2E-Shop')
    await page.click('[data-testid="admin-product-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
    await expect(page.locator('[data-testid^="admin-product-item-"]').filter({ hasText: productName })).toBeVisible()
  })

  test('UC-A-05: Validierung — kein Nährstoffgehalt > 0 → Fehler', async ({ page }) => {
    await page.click('[data-testid="admin-product-anlegen-button"]')
    await page.fill('[data-testid="admin-product-name-input"]', 'E2E-Invalid')
    await page.fill('[data-testid="admin-product-affiliate-input"]', 'https://example.com')
    await page.fill('[data-testid="admin-product-shop-input"]', 'Shop')
    await page.click('[data-testid="admin-product-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await expect(page.getByTestId('admin-error')).toBeVisible()
  })

  test('UC-A-05: Validierung — ungültige URL → Fehler', async ({ page }) => {
    await page.click('[data-testid="admin-product-anlegen-button"]')
    await page.fill('[data-testid="admin-product-name-input"]', 'E2E-BadURL')
    await page.fill('[data-testid="admin-product-n-pct-input"]', '27')
    await page.fill('[data-testid="admin-product-affiliate-input"]', 'keine-url')
    await page.click('[data-testid="admin-product-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
  })

  test('UC-A-06: Produkt deaktivieren und reaktivieren', async ({ page }) => {
    await page.click('[data-testid="admin-product-anlegen-button"]')
    await page.fill('[data-testid="admin-product-name-input"]', productName)
    await page.fill('[data-testid="admin-product-n-pct-input"]', '27')
    await page.fill('[data-testid="admin-product-affiliate-input"]', 'https://example.com/p')
    await page.fill('[data-testid="admin-product-shop-input"]', 'E2E-Shop')
    await page.click('[data-testid="admin-product-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()

    await page.locator('[data-testid^="admin-product-item-"]').filter({ hasText: productName }).click()
    await page.getByTestId('admin-product-active-checkbox').setChecked(false)
    await page.click('[data-testid="admin-product-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()

    await page.locator('[data-testid^="admin-product-item-"]').filter({ hasText: productName }).click()
    await page.getByTestId('admin-product-active-checkbox').setChecked(true)
    await page.click('[data-testid="admin-product-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
  })
})

// ─── Tab Korrekturen ──────────────────────────────────────────────────────────

test.describe('UC-A-07 / UC-A-08: Admin Korrekturen', () => {
  let corrLabel: string

  test.beforeEach(async ({ page }) => {
    corrLabel = `E2E-Korr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
    await page.goto('/admin')
    await page.click('[data-testid="admin-tab-corrections"]')
  })

  test.afterEach(async ({ page }) => {
    await page.goto('/admin')
    await page.click('[data-testid="admin-tab-corrections"]')
    // UC-A-08 renames the item to ${corrLabel}-edit, so check both labels
    for (const label of [corrLabel, `${corrLabel}-edit`]) {
      const item = page.locator('[data-testid^="admin-correction-item-"]').filter({ hasText: label })
      if ((await item.count()) === 0) continue
      await item.click()
      await expect(page.getByTestId('drawer-modal')).toBeVisible()
      await page.click('[data-testid="admin-correction-loeschen-button"]')
      await page.click('[data-testid="admin-correction-loeschen-confirm-button"]')
      await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
    }
  })

  test('UC-A-07: Korrektur anlegen → in Liste sichtbar', async ({ page }) => {
    await page.click('[data-testid="admin-correction-anlegen-button"]')
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await page.fill('[data-testid="admin-correction-label-input"]', corrLabel)
    await page.getByTestId('admin-correction-type-select').selectOption('vorfrucht')
    await page.click('[data-testid="admin-correction-add-nutrient-button"]')
    const row = page.getByTestId('admin-correction-nutrient-row-0')
    await expect(row).toBeVisible()
    await row.locator('select').selectOption({ index: 1 })
    await row.locator('input[type="number"]').fill('-10')
    await page.click('[data-testid="admin-correction-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
    await expect(page.locator('[data-testid^="admin-correction-item-"]').filter({ hasText: corrLabel })).toBeVisible()
  })

  test('UC-A-07: Zweite Nährstoffzeile dynamisch hinzufügen', async ({ page }) => {
    await page.click('[data-testid="admin-correction-anlegen-button"]')
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await page.click('[data-testid="admin-correction-add-nutrient-button"]')
    await expect(page.getByTestId('admin-correction-nutrient-row-0')).toBeVisible()
    await page.click('[data-testid="admin-correction-add-nutrient-button"]')
    await expect(page.getByTestId('admin-correction-nutrient-row-1')).toBeVisible()
  })

  test('UC-A-07: Validierung — keine Nährstoffzeile → Fehler', async ({ page }) => {
    await page.click('[data-testid="admin-correction-anlegen-button"]')
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await page.fill('[data-testid="admin-correction-label-input"]', 'E2E-Invalid')
    await page.click('[data-testid="admin-correction-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
  })

  test('UC-A-08: Korrektur bearbeiten → Label geändert', async ({ page }) => {
    await page.click('[data-testid="admin-correction-anlegen-button"]')
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await page.fill('[data-testid="admin-correction-label-input"]', corrLabel)
    await page.getByTestId('admin-correction-type-select').selectOption('humus')
    await page.click('[data-testid="admin-correction-add-nutrient-button"]')
    const row = page.getByTestId('admin-correction-nutrient-row-0')
    await expect(row).toBeVisible()
    await row.locator('select').selectOption({ index: 1 })
    await row.locator('input[type="number"]').fill('-5')
    await page.click('[data-testid="admin-correction-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()

    await page.locator('[data-testid^="admin-correction-item-"]').filter({ hasText: corrLabel }).click()
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    const editedLabel = `${corrLabel}-edit`
    await page.fill('[data-testid="admin-correction-label-input"]', editedLabel)
    await page.click('[data-testid="admin-correction-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
    await expect(page.locator('[data-testid^="admin-correction-item-"]').filter({ hasText: editedLabel })).toBeVisible()
  })

  test('UC-A-08: Korrektur löschen → verschwindet aus Liste', async ({ page }) => {
    await page.click('[data-testid="admin-correction-anlegen-button"]')
    await expect(page.getByTestId('drawer-modal')).toBeVisible()
    await page.fill('[data-testid="admin-correction-label-input"]', corrLabel)
    await page.getByTestId('admin-correction-type-select').selectOption('zwischenfrucht')
    await page.click('[data-testid="admin-correction-add-nutrient-button"]')
    const row = page.getByTestId('admin-correction-nutrient-row-0')
    await expect(row).toBeVisible()
    await row.locator('select').selectOption({ index: 1 })
    await row.locator('input[type="number"]').fill('-8')
    await page.click('[data-testid="admin-correction-speichern-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()

    await page.locator('[data-testid^="admin-correction-item-"]').filter({ hasText: corrLabel }).click()
    await page.click('[data-testid="admin-correction-loeschen-button"]')
    await page.click('[data-testid="admin-correction-loeschen-confirm-button"]')
    await expect(page.getByTestId('drawer-modal')).not.toBeVisible()
    await expect(page.locator('[data-testid^="admin-correction-item-"]').filter({ hasText: corrLabel })).toHaveCount(0)
  })
})
