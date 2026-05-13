import { test, expect } from '@playwright/test';
import { closeSettingsDialog, loginAndGoToChat, openSettingsDialog } from './mcp-helpers';

test.describe('Settings dialog: General tab', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
    await openSettingsDialog(page);
  });

  test.afterEach(async ({ page }) => {
    await closeSettingsDialog(page);
  });

  test('General tab is selected by default', async ({ page }) => {
    const tab = page.getByRole('tab', { name: 'General' });
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  });

  test('shows Theme and Language comboboxes', async ({ page }) => {
    await expect(page.getByRole('combobox', { name: 'Theme' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Language' })).toBeVisible();
  });

  test('shows the expected General switches', async ({ page }) => {
    const panel = page.getByRole('tabpanel', { name: 'General' });
    await expect(
      panel.getByRole('switch', { name: /Render user messages as markdown/i }),
    ).toBeVisible();
    await expect(
      panel.getByRole('switch', { name: /Auto-Scroll to latest message/i }),
    ).toBeVisible();
    await expect(panel.getByRole('switch', { name: /Hide right-most side panel/i })).toBeVisible();
  });

  test('Archived chats has a Manage button', async ({ page }) => {
    const panel = page.getByRole('tabpanel', { name: 'General' });
    await expect(panel.getByRole('button', { name: /Archived chats/i })).toBeVisible();
  });
});
