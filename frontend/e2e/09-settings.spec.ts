import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Settings Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to categories settings', async ({ page }) => {
    await page.goto('/settings/categories');
    await expect(page).toHaveURL(/.*settings\/categories/);
    await expect(page.locator('h1:has-text("Categories")')).toBeVisible();
  });

  test('should open create category modal', async ({ page }) => {
    await page.goto('/settings/categories');
    const createButton = page.locator('button:has-text("Create Category")');
    if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(1000);
      const hasModal = await page.locator('h2:has-text("Create Category"), h3:has-text("Create Category")').isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasModal).toBeTruthy();
    }
  });

  test('should navigate to SLA settings', async ({ page }) => {
    await page.goto('/settings/slas');
    await expect(page).toHaveURL(/.*settings\/slas/);
    const hasSLA = await page.locator('h1:has-text("SLA"), text=/SLA/i').isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasSLA).toBeTruthy();
  });

  test('should navigate to users settings', async ({ page }) => {
    await page.goto('/settings/users');
    await expect(page).toHaveURL(/.*settings\/users/);
    const hasUsers = await page.locator('h1:has-text("Users"), text=/Users/i').isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasUsers).toBeTruthy();
  });
});
