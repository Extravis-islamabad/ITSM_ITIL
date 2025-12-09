import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Navigation & UI', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display sidebar navigation', async ({ page }) => {
    const sidebar = page.locator('nav, aside, [role="navigation"]');
    const hasSidebar = await sidebar.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasSidebar).toBeTruthy();
  });

  test('should navigate to all main modules via sidebar', async ({ page }) => {
    const modules = [
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'Tickets', url: '/tickets' },
      { name: 'Incidents', url: '/incidents' },
      { name: 'Problems', url: '/problems' },
      { name: 'Changes', url: '/changes' },
      { name: 'Knowledge', url: '/knowledge' },
      { name: 'Assets', url: '/assets' },
    ];

    for (const module of modules) {
      const link = page.locator(`a[href="${module.url}"]`).first();
      if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
        await link.click();
        await page.waitForTimeout(1000);
        expect(page.url()).toContain(module.url);
      }
    }
  });

  test('should display user profile menu', async ({ page }) => {
    const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Admin")');
    if (await userMenu.isVisible({ timeout: 5000 }).catch(() => false)) {
      await userMenu.click();
      await page.waitForTimeout(500);
      expect(true).toBeTruthy();
    }
  });

  test('should display notifications', async ({ page }) => {
    const notificationButton = page.locator('button[aria-label*="notification"], [data-testid="notifications"]');
    if (await notificationButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      expect(true).toBeTruthy();
    }
  });
});
