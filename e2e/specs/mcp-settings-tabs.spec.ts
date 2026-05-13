import { test, expect } from '@playwright/test';
import { closeSettingsDialog, loginAndGoToChat, openSettingsDialog } from './mcp-helpers';

const EXPECTED_TABS = [
  'General',
  'Chat',
  'Commands',
  'Speech',
  'Personalization',
  'Data controls',
  'Account',
] as const;

test.describe('Settings dialog: tab navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
    await openSettingsDialog(page);
  });

  test.afterEach(async ({ page }) => {
    await closeSettingsDialog(page);
  });

  test('renders all expected tabs', async ({ page }) => {
    for (const name of EXPECTED_TABS) {
      await expect(page.getByRole('tab', { name })).toBeVisible();
    }
  });

  test('clicking a tab updates aria-selected', async ({ page }) => {
    const chatTab = page.getByRole('tab', { name: 'Chat' });
    await chatTab.click();
    await expect(chatTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'General' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  test('Close Settings button closes the dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Close Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Settings', level: 2 })).toBeHidden();
  });
});
