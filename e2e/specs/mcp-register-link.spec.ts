import { test, expect } from '@playwright/test';

// These tests exercise the local registration link — skip on deployed
// environments where login is via OpenID only.
const isLocal = (process.env.E2E_BASE_URL || '').includes('localhost');
test.skip(!isLocal, 'Register link tests only apply to local environments');

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Register link from login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('Sign up link points at /register', async ({ page }) => {
    const signUp = page.getByRole('link', { name: 'Sign up' });
    await expect(signUp).toBeVisible();
    await expect(signUp).toHaveAttribute('href', '/register');
  });

  test('clicking Sign up navigates to the register page', async ({ page }) => {
    await page.getByRole('link', { name: 'Sign up' }).click();
    await expect(page).toHaveURL(/\/register$/);
  });
});
