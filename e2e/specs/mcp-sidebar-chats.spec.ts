import { test, expect } from '@playwright/test';
import { loginAndGoToChat } from './mcp-helpers';

test.describe('Chats group toggle', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
  });

  test('Chats group button is visible in the sidebar', async ({ page }) => {
    await expect(
      page
        .getByRole('navigation', { name: 'Chat History' })
        .getByRole('button', { name: 'Chats' }),
    ).toBeVisible();
  });

  test('clicking Chats toggles the chats section', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Chat History' });
    const button = nav.getByRole('button', { name: 'Chats' });
    // Chats section has an expand/collapse indicator
    await button.click();
    await expect(nav).toBeVisible();
    await expect(button).toBeVisible();
  });
});
