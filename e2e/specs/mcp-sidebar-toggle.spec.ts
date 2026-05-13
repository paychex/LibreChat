import { test, expect } from '@playwright/test';
import { loginAndGoToChat } from './mcp-helpers';

test.describe('Sidebar toggle', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
  });

  test('Chat History sidebar is visible by default', async ({ page }) => {
    await expect(page.getByRole('navigation', { name: 'Chat History' })).toBeVisible();
  });

  test('clicking Close sidebar collapses the sidebar', async ({ page }) => {
    const close = page.getByRole('button', { name: 'Close sidebar' });
    await expect(close).toBeVisible();
    await close.click();
    await expect(page.getByRole('navigation', { name: 'Chat History' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Open sidebar' })).toBeVisible();
  });
});
