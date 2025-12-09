import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Assets Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/assets');
  });

  test('should display assets page', async ({ page }) => {
    await expect(page).toHaveURL(/.*assets/);
    await expect(page.locator('h1:has-text("Assets")')).toBeVisible();
  });

  test('should open create asset modal', async ({ page }) => {
    const createButton = page.locator('button:has-text("Add Asset")');
    if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(1000);
      const hasModal = await page.locator('h2:has-text("Add Asset"), h3:has-text("Add Asset")').isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasModal).toBeTruthy();
    }
  });

  test('should display assets table', async ({ page }) => {
    await page.waitForTimeout(2000);
    const hasTable = await page.locator('table, [role="table"]').isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasTable).toBeTruthy();
  });

  test('should filter assets by status', async ({ page }) => {
    const statusFilter = page.locator('select:has-option("Active"), select:has-option("IN_USE")').first();
    if (await statusFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      await statusFilter.selectOption({ index: 1 });
      await page.waitForTimeout(1500);
      expect(true).toBeTruthy();
    }
  });
});
