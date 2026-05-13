import { test, expect } from '@playwright/test';
import { closeSettingsDialog, loginAndGoToChat, openSettingsDialog } from './mcp-helpers';

test.describe('Settings dialog: Chat / Commands / Speech tabs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
    await openSettingsDialog(page);
  });

  test.afterEach(async ({ page }) => {
    await closeSettingsDialog(page);
  });

  test('Chat tab shows core chat preferences', async ({ page }) => {
    await page.getByRole('tab', { name: 'Chat' }).click();
    const panel = page.getByRole('tabpanel');
    await expect(panel).toContainText(/Message Font Size/i);
    await expect(panel).toContainText(/Press Enter to send messages/i);
  });

  test('Commands tab toggles for @, +, /', async ({ page }) => {
    await page.getByRole('tab', { name: 'Commands' }).click();
    const panel = page.getByRole('tabpanel');
    await expect(panel).toContainText(/Toggle command "@"/i);
    await expect(panel).toContainText(/Toggle command "\+"/i);
    await expect(panel).toContainText(/Toggle command "\/"/i);
  });

  test('Speech tab shows STT and TTS sections', async ({ page }) => {
    await page.getByRole('tab', { name: 'Speech' }).click();
    const panel = page.getByRole('tabpanel', { name: 'Speech' });
    await expect(panel).toContainText(/Speech to Text/i);
    await expect(panel).toContainText(/Text to Speech/i);
  });
});
