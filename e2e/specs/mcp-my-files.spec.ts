import { test, expect } from '@playwright/test';
import { loginAndGoToChat } from './mcp-helpers';

test.describe('My Files menu item', () => {
  test('opens a Files dialog or navigates to a Files surface', async ({ page }) => {
    await loginAndGoToChat(page);
    await page.getByTestId('nav-user').click();
    await page.getByRole('menuitem', { name: 'My Files' }).click();
    const filesHeading = page
      .getByRole('heading', { name: /Files/i })
      .or(page.getByRole('dialog', { name: /Files/i }));
    await expect(filesHeading.first()).toBeVisible({ timeout: 5000 });
  });
});
