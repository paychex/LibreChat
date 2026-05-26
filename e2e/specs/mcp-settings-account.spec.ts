import { test, expect } from '@playwright/test';
import { closeSettingsDialog, loginAndGoToChat, openSettingsDialog } from './mcp-helpers';

test.describe('Settings dialog: Account tab', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
    await openSettingsDialog(page);
    await page.getByRole('tab', { name: 'Account' }).click();
  });

  test.afterEach(async ({ page }) => {
    await closeSettingsDialog(page);
  });

  test('shows Profile Picture and Two-Factor controls', async ({ page }) => {
    const panel = page.getByRole('tabpanel');
    await expect(panel).toContainText(/Profile Picture/i);
    await expect(panel).toContainText(/Two-Factor Authentication/i);
  });

  test('Display username in messages switch is present', async ({ page }) => {
    const panel = page.getByRole('tabpanel');
    await expect(panel.getByRole('switch', { name: /Display username in messages/i })).toBeVisible();
  });

  test('exposes a Delete account action', async ({ page }) => {
    const panel = page.getByRole('tabpanel');
    await expect(panel).toContainText(/Delete account/i);
  });
});
