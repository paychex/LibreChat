import { test, expect } from '@playwright/test';
import { loginAndGoToChat } from './mcp-helpers';

test.describe('Microphone button', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
  });

  test('Use microphone button is rendered next to the message input', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Use microphone' })).toBeVisible();
  });
});
