import { Page } from '@playwright/test';

export async function login(page: Page, username: string = 'admin', password: string = 'Admin@123') {
  await page.goto('/login');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Fill username field
  const usernameInput = page.locator('input[autocomplete="username"], input[placeholder*="username" i]');
  await usernameInput.waitFor({ timeout: 10000 });
  await usernameInput.fill(username);

  // Fill password field
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill(password);

  // Click sign in button
  await page.click('button[type="submit"]:has-text("Sign In")');

  // Wait for navigation to dashboard or home
  await page.waitForURL(/\/(dashboard)?$/, { timeout: 15000 });
}

export async function logout(page: Page) {
  // Click user menu button
  await page.click('[data-testid="user-menu"], button:has-text("Admin")').catch(() => {});
  // Click logout
  await page.click('text=Logout, text=Sign Out').catch(() => {});
  await page.waitForURL('/login', { timeout: 5000 }).catch(() => {});
}
