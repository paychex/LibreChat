import { test, expect } from '@playwright/test';
import { clickControlPanelButton, loginAndGoToChat } from './mcp-helpers';

test.describe('Control Panel: Bookmarks', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
  });

  test('expands the Bookmarks section with a filter input', async ({ page }) => {
    await clickControlPanelButton(page, 'Bookmarks');
    const panel = page.getByRole('navigation', { name: 'Controls' });
    const button = panel.getByRole('button', { name: 'Bookmarks', exact: true });
    await expect.poll(() => button.getAttribute('aria-expanded')).toBe('true');
    await expect(panel).toContainText(/Filter bookmarks/i);
  });
});
