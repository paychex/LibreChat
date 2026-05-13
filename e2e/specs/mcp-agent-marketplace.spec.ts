import { test, expect } from '@playwright/test';
import { loginAndGoToChat } from './mcp-helpers';

test.describe('Agent Marketplace entry', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
  });

  test('Agent Marketplace button is visible in the sidebar', async ({ page }) => {
    await expect(
      page
        .getByRole('navigation', { name: 'Chat History' })
        .getByRole('button', { name: 'Agent Marketplace' }),
    ).toBeVisible();
  });

  test('clicking Agent Marketplace navigates to the agents discovery page', async ({ page }) => {
    await page
      .getByRole('navigation', { name: 'Chat History' })
      .getByRole('button', { name: 'Agent Marketplace' })
      .click();
    await expect(page).toHaveURL(/\/agents/);
  });
});
