import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Authentication Module', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*login/);

    // Check for login page elements
    const hasWelcome = await page.locator('text=/Welcome Back|Sign in/i').isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasWelcome).toBeTruthy();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill invalid credentials
    await page.fill('input[autocomplete="username"]', 'invaliduser');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]:has-text("Sign In")');

    // Wait for error or timeout
    await page.waitForTimeout(3000);

    // Check if still on login page (indicates error)
    const onLoginPage = page.url().includes('/login');
    expect(onLoginPage).toBeTruthy();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    await login(page);
    // Should be redirected to dashboard or home
    const url = page.url();
    const isAuthenticated = url.includes('/dashboard') || url === 'http://localhost:5173/';
    expect(isAuthenticated).toBeTruthy();
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies();
    await page.goto('/tickets');
    await page.waitForTimeout(2000);

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });
});
