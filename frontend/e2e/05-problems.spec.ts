import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Problems Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/problems');
  });

  test('should display problems list page', async ({ page }) => {
    await expect(page).toHaveURL(/.*problems/);
    await expect(page.locator('h1:has-text("Problems")')).toBeVisible();
  });

  test('should open create problem modal', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create Problem")');
    if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(1000);
      const hasModal = await page.locator('h2:has-text("Create Problem"), h3:has-text("Create Problem")').isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasModal).toBeTruthy();
    }
  });

  test('should display problems table', async ({ page }) => {
    await page.waitForTimeout(2000);
    const hasTable = await page.locator('table, [role="table"]').isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasTable).toBeTruthy();
  });

  test('should navigate to problem details', async ({ page }) => {
    await page.waitForTimeout(2000);
    const problemRow = page.locator('table tbody tr').first();
    if (await problemRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await problemRow.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/problems/');
    }
  });
});
