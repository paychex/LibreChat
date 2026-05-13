import { test, expect } from '@playwright/test';
import { loginAndGoToChat } from './mcp-helpers';

test.describe('Logout', () => {
  test('Log out menu item returns the user to /login', async ({ page }) => {
    await loginAndGoToChat(page);
    await page.getByTestId('nav-user').click();
    await page.getByRole('menuitem', { name: 'Log out' }).click();
    await page.waitForURL((url) => url.pathname.startsWith('/login'), { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
  });
});
