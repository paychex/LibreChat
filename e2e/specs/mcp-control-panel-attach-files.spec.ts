import { test, expect } from '@playwright/test';
import { clickControlPanelButton, loginAndGoToChat } from './mcp-helpers';

test.describe('Control Panel: Attach Files', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
  });

  test('expands and shows the file filter and Manage Files action', async ({ page }) => {
    await clickControlPanelButton(page, 'Attach Files');
    const button = page.getByRole('button', { name: 'Attach Files' });
    await expect.poll(() => button.getAttribute('aria-expanded')).toBe('true');
    const panel = page.getByRole('navigation', { name: 'Controls' });
    await expect(panel).toContainText(/Filter files/i);
    await expect(panel.getByRole('button', { name: /Manage Files/i })).toBeVisible();
  });

  test('shows pagination (Prev/Next)', async ({ page }) => {
    await clickControlPanelButton(page, 'Attach Files');
    const panel = page.getByRole('navigation', { name: 'Controls' });
    await expect(panel.getByRole('button', { name: 'Prev' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Next' })).toBeVisible();
  });
});
