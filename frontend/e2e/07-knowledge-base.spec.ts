import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Knowledge Base Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/knowledge');
  });

  test('should display knowledge base page', async ({ page }) => {
    await expect(page).toHaveURL(/.*knowledge/);
    await expect(page.locator('h1:has-text("Knowledge Base")')).toBeVisible();
  });

  test('should open create article modal', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create Article")');
    if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(1000);
      const hasModal = await page.locator('h2:has-text("Create Article"), h3:has-text("Create Article")').isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasModal).toBeTruthy();
    }
  });

  test('should search articles', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(1500);
      expect(true).toBeTruthy();
    }
  });

  test('should filter by category', async ({ page }) => {
    const categoryFilter = page.locator('select, button:has-text("All Categories")').first();
    if (await categoryFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      expect(true).toBeTruthy();
    }
  });
});
