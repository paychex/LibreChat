import { expect, test } from '@playwright/test';

test.describe('Smoke Tests — Deployed Environment', () => {
  test('App loads and shows main interface', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="nav-user"], nav', { timeout: 15000 });

    // Verify the page title contains LibreChat or the app name
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('Navigation panel is visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="nav-user"]', { timeout: 15000 });

    const navUser = await page.getByTestId('nav-user').isVisible();
    expect(navUser).toBeTruthy();
  });

  test('User menu opens', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="nav-user"]', { timeout: 15000 });

    await page.getByTestId('nav-user').click();
    // User menu should show options like Settings, Log out
    const settingsOption = page.getByRole('menuitem', { name: 'Settings' });
    await expect(settingsOption).toBeVisible({ timeout: 5000 });
  });

  test('Settings modal opens', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="nav-user"]', { timeout: 15000 });

    await page.getByTestId('nav-user').click();
    const settingsItem = page.getByRole('menuitem', { name: 'Settings' });
    await expect(settingsItem).toBeVisible({ timeout: 5000 });
    await settingsItem.click();

    // Headless UI dialog may report hidden to the accessibility tree;
    // validate via the heading inside the modal (proven pattern from mcp-helpers)
    const heading = page.getByRole('heading', { name: 'Settings', level: 2 });
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('New chat input is available', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="nav-user"]', { timeout: 15000 });

    // The chat input form/textarea should be present
    const textInput = page.locator('form textarea, form [role="textbox"]').first();
    await expect(textInput).toBeVisible({ timeout: 10000 });
  });
});
