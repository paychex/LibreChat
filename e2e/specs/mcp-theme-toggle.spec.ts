import { test, expect } from '@playwright/test';

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
