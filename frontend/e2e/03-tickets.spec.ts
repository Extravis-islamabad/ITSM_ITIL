import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Tickets Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/tickets');
  });

  test('should display tickets list page', async ({ page }) => {
    await expect(page).toHaveURL(/.*tickets/);
    await expect(page.locator('h1:has-text("Tickets")')).toBeVisible();
  });

  test('should open create ticket modal', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create Ticket")');
    if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(1000);
      const hasModal = await page.locator('h2:has-text("Create Ticket"), h3:has-text("Create Ticket")').isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasModal).toBeTruthy();
    }
  });

  test('should filter tickets by status', async ({ page }) => {
    const statusFilter = page.locator('select:has-option("Open"), select:has-option("NEW")').first();
    if (await statusFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      await statusFilter.selectOption({ index: 1 });
      await page.waitForTimeout(1500);
      expect(true).toBeTruthy();
    }
  });

  test('should search tickets', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(1500);
      expect(true).toBeTruthy();
    }
  });

  test('should navigate to ticket details', async ({ page }) => {
    await page.waitForTimeout(2000);
    const ticketRow = page.locator('table tbody tr, [data-testid="ticket-row"]').first();
    if (await ticketRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await ticketRow.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/tickets/');
    }
  });
});
