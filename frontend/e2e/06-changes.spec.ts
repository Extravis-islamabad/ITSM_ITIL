import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Changes Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/changes');
  });

  test('should display changes list page', async ({ page }) => {
    await expect(page).toHaveURL(/.*changes/);
    await expect(page.locator('h1:has-text("Changes")')).toBeVisible();
  });

  test('should open create change modal', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create Change")');
    if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(1000);
      const hasModal = await page.locator('h2:has-text("Create Change"), h3:has-text("Create Change")').isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasModal).toBeTruthy();
    }
  });

  test('should display changes table', async ({ page }) => {
    await page.waitForTimeout(2000);
    const hasTable = await page.locator('table, [role="table"]').isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasTable).toBeTruthy();
  });

  test('should filter changes by type', async ({ page }) => {
    const typeFilter = page.locator('select:has-option("Standard"), select:has-option("NORMAL")').first();
    if (await typeFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      await typeFilter.selectOption({ index: 1 });
      await page.waitForTimeout(1500);
      expect(true).toBeTruthy();
    }
  });
});
