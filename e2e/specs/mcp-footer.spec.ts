import { test, expect } from '@playwright/test';
import { loginAndGoToChat } from './mcp-helpers';

test.describe('Footer', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
  });

  test('shows a LibreChat version link in the chat footer', async ({ page }) => {
    const link = page.getByRole('contentinfo').getByRole('link', { name: /LibreChat/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /librechat\.ai/);
  });

  test('shows the Every AI for Everyone tagline', async ({ page }) => {
    await expect(page.getByRole('contentinfo')).toContainText(/Every AI for Everyone/i);
  });
});
