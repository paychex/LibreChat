import { test, expect } from '@playwright/test';
import { loginAndGoToChat } from './mcp-helpers';

test.describe('Temporary chat toggle', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
  });

  test('button is visible and toggles aria-pressed', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Temporary Chat' });
    await expect(button).toBeVisible();
    const initial = await button.getAttribute('aria-pressed');
    await button.click();
    await expect.poll(() => button.getAttribute('aria-pressed')).not.toBe(initial);
    await button.click();
    await expect.poll(() => button.getAttribute('aria-pressed')).toBe(initial);
  });
});
