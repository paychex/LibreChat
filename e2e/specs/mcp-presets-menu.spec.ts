import { test, expect } from '@playwright/test';
import { loginAndGoToChat } from './mcp-helpers';

test.describe('Presets menu', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
  });

  test('opens via the Presets button', async ({ page }) => {
    await page.getByTestId('presets-button').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/Default/i);
  });

  test('exposes Clear all and Import controls', async ({ page }) => {
    await page.getByTestId('presets-button').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/Clear all/i)).toBeVisible();
    await expect(dialog.getByText(/Import/i)).toBeVisible();
  });

  test('Escape closes the Presets menu', async ({ page }) => {
    await page.getByTestId('presets-button').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});
