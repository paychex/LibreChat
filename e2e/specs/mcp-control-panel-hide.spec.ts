import { test, expect } from '@playwright/test';
import { clickControlPanelButton, loginAndGoToChat } from './mcp-helpers';

test.describe('Control Panel: hide & show', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
  });

  test('Hide Panel collapses the right-side controls', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Controls' });
    await expect(nav).toBeVisible();
    await clickControlPanelButton(page, 'Hide Panel');
    await expect(nav).toBeHidden();
  });

  test('a button to re-open the Control Panel is exposed after hiding', async ({ page }) => {
    await clickControlPanelButton(page, 'Hide Panel');
    await expect(page.getByRole('button', { name: /Open Control Panel/i })).toBeVisible();
  });
});
