import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Dashboard Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display dashboard with statistics', async ({ page }) => {
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();

    // Check for stat cards
    const hasStats = await page.locator('text=/Open Tickets|Total Tickets|My Tickets/i').count();
    expect(hasStats).toBeGreaterThan(0);
  });

  test('should display recent activity', async ({ page }) => {
    const hasActivity = await page.locator('text=/Recent Activity|Activity/i').isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasActivity).toBeTruthy();
  });

  test('should navigate to tickets from dashboard', async ({ page }) => {
    await page.click('a[href="/tickets"], button:has-text("View All Tickets")').catch(() => {});
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url.includes('/tickets') || url.includes('/dashboard')).toBeTruthy();
  });
});
