import { test, expect } from '@playwright/test';
import { loginAndGoToChat } from './mcp-helpers';

const isLocal = (process.env.E2E_BASE_URL || '').includes('localhost');

test.describe('Logout', () => {
  test.skip(!isLocal, 'Logout asserts redirect to LibreChat /login form; deployed envs sign out through Azure Entra');
  test('Log out menu item returns the user to /login', async ({ page }) => {
    await loginAndGoToChat(page);
    await page.getByTestId('nav-user').click();
    await page.getByRole('menuitem', { name: 'Log out' }).click();
    await page.waitForURL((url) => url.pathname.startsWith('/login'), { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
  });
});
