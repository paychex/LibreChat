import { test, expect } from '@playwright/test';
import { clickControlPanelButton, loginAndGoToChat } from './mcp-helpers';

test.describe('Control Panel: Memories', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
  });

  test('opens the Memories region with filter and Use memory switch', async ({ page }) => {
    await clickControlPanelButton(page, 'Memories');
    // NOTE: Two role="region" elements share the accessible name "Memories"
    // (accordion region + inner content). This is an ARIA accessibility concern.
    const region = page.getByRole('region', { name: 'Memories' }).first();
    await expect(region).toBeVisible();
    await expect(region).toContainText(/Filter memories/i);
    await expect(region.getByRole('switch', { name: /Use memory/i })).toBeVisible();
  });

  test('exposes Admin Settings link/button', async ({ page }) => {
    await clickControlPanelButton(page, 'Memories');
    const region = page.getByRole('region', { name: 'Memories' }).first();
    await expect(region.getByText(/Admin Settings/i)).toBeVisible();
  });
});
