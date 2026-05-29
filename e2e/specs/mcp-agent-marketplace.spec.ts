import { test, expect } from '@playwright/test';
import { loginAndGoToChat } from './mcp-helpers';

const isLocal = (process.env.E2E_BASE_URL || '').includes('localhost');

test.describe('Agent Marketplace entry', () => {
  test.skip(!isLocal, 'Agent Marketplace is not enabled in deployed librechat.<env>.yml interface config');
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
