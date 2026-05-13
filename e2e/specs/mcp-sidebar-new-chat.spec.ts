import { test, expect } from '@playwright/test';
import { loginAndGoToChat } from './mcp-helpers';

test.describe('New chat link', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
  });

  test('New chat link points to /c/new', async ({ page }) => {
    const link = page
      .getByRole('navigation', { name: 'Chat History' })
      .getByRole('link', { name: 'New chat' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/c/new');
  });

  test('clicking New chat keeps the user on /c/new', async ({ page }) => {
    const link = page
      .getByRole('navigation', { name: 'Chat History' })
      .getByRole('link', { name: 'New chat' });
    await link.click();
    await expect(page).toHaveURL(/\/c\/new$/);
  });
});
