import { test, expect } from '@playwright/test';
import { clickControlPanelButton, loginAndGoToChat } from './mcp-helpers';

test.describe('Control Panel: Prompts', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
  });

  test('opens the Prompts region with filter and create controls', async ({ page }) => {
    await clickControlPanelButton(page, 'Prompts');
    const region = page.getByRole('region', { name: 'Prompts' });
    await expect(region).toBeVisible();
    await expect(region.getByRole('textbox', { name: /Filter prompts by name/i })).toBeVisible();
    await expect(region.getByRole('link', { name: /Create Prompt/i })).toBeVisible();
  });

  test('shows Auto-send Prompts switch', async ({ page }) => {
    await clickControlPanelButton(page, 'Prompts');
    const region = page.getByRole('region', { name: 'Prompts' });
    await expect(region.getByRole('switch', { name: /Auto-send Prompts/i })).toBeVisible();
  });

  test('shows pagination controls (Prev/Next)', async ({ page }) => {
    await clickControlPanelButton(page, 'Prompts');
    const region = page.getByRole('region', { name: 'Prompts' });
    await expect(region.getByRole('button', { name: 'Prev' })).toBeVisible();
    await expect(region.getByRole('button', { name: 'Next' })).toBeVisible();
  });
});
