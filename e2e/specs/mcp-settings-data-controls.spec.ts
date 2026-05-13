import { test, expect } from '@playwright/test';
import { closeSettingsDialog, loginAndGoToChat, openSettingsDialog } from './mcp-helpers';

test.describe('Settings dialog: Data controls tab', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
    await openSettingsDialog(page);
    await page.getByRole('tab', { name: 'Data controls' }).click();
  });

  test.afterEach(async ({ page }) => {
    await closeSettingsDialog(page);
  });

  test('panel shows import / shared links / clear chats actions', async ({ page }) => {
    const panel = page.getByRole('tabpanel');
    await expect(panel).toContainText(/Import conversations from a JSON file/i);
    await expect(panel).toContainText(/Shared links/i);
    await expect(panel).toContainText(/Clear all chats/i);
  });

  test('exposes destructive actions with explicit buttons', async ({ page }) => {
    const panel = page.getByRole('tabpanel');
    await expect(panel.getByRole('button', { name: /Revoke all user provided credentials/i })).toBeVisible();
    await expect(panel.getByRole('button', { name: /Delete TTS cache/i })).toBeVisible();
    await expect(panel.getByRole('button', { name: /Clear all chats/i })).toBeVisible();
  });
});
