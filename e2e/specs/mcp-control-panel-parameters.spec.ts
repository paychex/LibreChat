import { test, expect } from '@playwright/test';
import { clickControlPanelButton, loginAndGoToChat } from './mcp-helpers';

test.describe('Control Panel: Parameters', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
  });

  test('expands the Parameters section and shows core fields', async ({ page }) => {
    await clickControlPanelButton(page, 'Parameters');
    // NOTE: getByRole('button', { name: 'Parameters' }) without exact:true
    // matches both the accordion header AND "Reset Model Parameters" button —
    // accessible name substring collision. Using exact: true here.
    const button = page.getByRole('button', { name: 'Parameters', exact: true });
    await expect.poll(() => button.getAttribute('aria-expanded')).toBe('true');
    const panel = page.getByRole('navigation', { name: 'Controls' });
    await expect(panel).toContainText(/Custom Name/i);
    await expect(panel).toContainText(/Custom Instructions/i);
    await expect(panel).toContainText(/Max Context Tokens/i);
  });

  test('shows a Reset Model Parameters button', async ({ page }) => {
    await clickControlPanelButton(page, 'Parameters');
    const panel = page.getByRole('navigation', { name: 'Controls' });
    await expect(panel.getByRole('button', { name: /Reset Model Parameters/i })).toBeVisible();
  });
});
