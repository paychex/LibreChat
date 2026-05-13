import { test, expect } from '@playwright/test';
import { loginAndGoToChat } from './mcp-helpers';

test.describe('Account menu', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
  });

  test('opens via the Account Settings button', async ({ page }) => {
    await page.getByTestId('nav-user').click();
    await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeVisible();
  });

  test('contains the expected items in order', async ({ page }) => {
    await page.getByTestId('nav-user').click();
    const expected = ['My Files', 'Help & FAQ', 'Settings', 'Log out'];
    for (const name of expected) {
      await expect(page.getByRole('menuitem', { name })).toBeVisible();
    }
    const items = await page.getByRole('menuitem').allTextContents();
    expect(items.map((t) => t.trim())).toEqual(expected);
  });

  test('Escape closes the menu', async ({ page }) => {
    await page.getByTestId('nav-user').click();
    await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeHidden();
  });
});
