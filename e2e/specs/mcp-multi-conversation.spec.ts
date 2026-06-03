import { test, expect } from '@playwright/test';
import { loginAndGoToChat } from './mcp-helpers';

test.describe('Multi-conversation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
  });

  test('Add multi-conversation button is visible', async ({ page }) => {
    await expect(page.getByTestId('add-multi-convo-button')).toBeVisible();
  });

  test('clicking it adds a second conversation panel with close button', async ({ page }) => {
    const closeBtn = page.getByRole('button', { name: 'Close added conversation' });
    await expect(closeBtn).toBeHidden();
    await page.getByTestId('add-multi-convo-button').click();
    await expect(closeBtn).toBeVisible();
  });
});
