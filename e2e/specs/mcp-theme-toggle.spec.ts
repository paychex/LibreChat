import { test, expect } from '@playwright/test';

// Theme toggle on the login page — skip on deployed environments where
// the login page is OpenID-only and may not render the toggle.
const isLocal = (process.env.E2E_BASE_URL || '').includes('localhost');
test.skip(!isLocal, 'Theme toggle (login page) tests only apply to local environments');

test.use({ storageState: { cookies: [], origins: [] } });

const isDark = async (page: import('@playwright/test').Page): Promise<boolean> =>
  page.evaluate(() => document.documentElement.classList.contains('dark'));

test.describe('Theme toggle (login page)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('Toggle theme button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Toggle theme' })).toBeVisible();
  });

  test('clicking the theme toggle flips the html dark class', async ({ page }) => {
    const before = await isDark(page);
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await expect.poll(() => isDark(page)).not.toBe(before);
  });
});
