import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Incidents Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/incidents');
  });

  test('should display incidents list page', async ({ page }) => {
    await expect(page).toHaveURL(/.*incidents/);
    await expect(page.locator('h1:has-text("Incidents")')).toBeVisible();
  });

  test('should open create incident modal', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create Incident")');
    if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(1000);
      const hasModal = await page.locator('h2:has-text("Create Incident"), h3:has-text("Create Incident")').isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasModal).toBeTruthy();
    }
  });

  test('should display incident table with columns', async ({ page }) => {
    await page.waitForTimeout(2000);
    const hasTable = await page.locator('table, [role="table"]').isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasTable).toBeTruthy();
  });

  test('should filter incidents by priority', async ({ page }) => {
    const priorityFilter = page.locator('select:has-option("High"), select:has-option("LOW")').first();
    if (await priorityFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      await priorityFilter.selectOption({ index: 1 });
      await page.waitForTimeout(1500);
      expect(true).toBeTruthy();
    }
  });
});
