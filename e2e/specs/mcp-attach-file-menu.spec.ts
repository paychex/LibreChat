import { test, expect } from '@playwright/test';
import { loginAndGoToChat } from './mcp-helpers';

test.describe('Attach File menu', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
  });

  test('Attach File Options button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Attach File Options' })).toBeVisible();
  });

  test('opening the menu shows Upload Image and Upload as Text', async ({ page }) => {
    await page.getByRole('button', { name: 'Attach File Options' }).click();
    await expect(page.getByRole('menuitem', { name: /Upload Image/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Upload as Text/i })).toBeVisible();
  });

  test('menu items expose descriptive helper text', async ({ page }) => {
    await page.getByRole('button', { name: 'Attach File Options' }).click();
    const image = page.getByRole('menuitem', { name: /Upload Image/i });
    const text = page.getByRole('menuitem', { name: /Upload as Text/i });
    await expect(image).toContainText(/image for analysis/i);
    await expect(text).toContainText(/text from a document/i);
  });

  test('Escape closes the attach file menu', async ({ page }) => {
    await page.getByRole('button', { name: 'Attach File Options' }).click();
    await expect(page.getByRole('menuitem', { name: /Upload Image/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menuitem', { name: /Upload Image/i })).toBeHidden();
  });
});
