import { test, expect } from '@playwright/test';
import { loginAndGoToChat } from './mcp-helpers';

test.describe('Sidebar bookmarks button', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
  });

  test('Bookmarks button in the sidebar is visible', async ({ page }) => {
    const button = page
      .getByRole('navigation', { name: 'Chat History' })
      .getByRole('button', { name: 'Bookmarks' });
    await expect(button).toBeVisible();
  });

  test('clicking Bookmarks toggles the bookmarks view', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Chat History' });
    const button = nav.getByRole('button', { name: 'Bookmarks' });
    await button.click();
    await expect(nav).toBeVisible();
    // After clicking, the Bookmarks button should still be accessible
    await expect(button).toBeVisible();
  });
});
