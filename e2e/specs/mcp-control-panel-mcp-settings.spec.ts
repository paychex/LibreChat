import { test, expect } from '@playwright/test';
import { clickControlPanelButton, loginAndGoToChat } from './mcp-helpers';

test.describe('Control Panel: MCP Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
  });

  test('expands and shows the MCP server filter', async ({ page }) => {
    await clickControlPanelButton(page, 'MCP Settings');
    const button = page.getByRole('button', { name: 'MCP Settings' });
    await expect.poll(() => button.getAttribute('aria-expanded')).toBe('true');
    const panel = page.getByRole('navigation', { name: 'Controls' });
    await expect(panel).toContainText(/Filter MCP servers/i);
  });

  test('exposes Admin Settings link/button', async ({ page }) => {
    await clickControlPanelButton(page, 'MCP Settings');
    const panel = page.getByRole('navigation', { name: 'Controls' });
    await expect(panel.getByText(/Admin Settings/i)).toBeVisible();
  });
});
