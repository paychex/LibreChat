import { test, expect } from '@playwright/test';
import { loginAndGoToChat } from './mcp-helpers';

test.describe('Model selector', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
  });

  test('shows the currently selected model in the header', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Select a model' });
    await expect(button).toBeVisible();
    expect((await button.innerText()).trim().length).toBeGreaterThan(0);
  });

  test('clicking opens a search input and a listbox of providers', async ({ page }) => {
    await page.getByRole('button', { name: 'Select a model' }).click();
    await expect(page.locator('#model-search')).toBeVisible();
    await expect(page.getByRole('listbox')).toBeVisible();
    const optionCount = await page.getByRole('listbox').getByRole('option').count();
    expect(optionCount).toBeGreaterThan(0);
  });

  test('Escape closes the model selector', async ({ page }) => {
    await page.getByRole('button', { name: 'Select a model' }).click();
    await expect(page.locator('#model-search')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#model-search')).toBeHidden();
  });
});
