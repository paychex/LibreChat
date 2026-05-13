import { test, expect } from '@playwright/test';
import { loginAndGoToChat } from './mcp-helpers';

test.describe('Model selector search', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
    await page.getByRole('button', { name: 'Select a model' }).click();
    await expect(page.locator('#model-search')).toBeVisible();
  });

  test('typing a query narrows the listbox', async ({ page }) => {
    const search = page.locator('#model-search');
    const listbox = page.getByRole('listbox');
    const initial = await listbox.getByRole('option').count();
    await search.fill('xyz-no-such-model');
    await expect(listbox.getByRole('option')).toHaveCount(0, { timeout: 5000 });
    await search.fill('');
    await expect.poll(() => listbox.getByRole('option').count()).toBeGreaterThanOrEqual(initial);
  });

  test('clearing the search restores all options', async ({ page }) => {
    const search = page.locator('#model-search');
    const listbox = page.getByRole('listbox');
    const initial = await listbox.getByRole('option').count();
    expect(initial).toBeGreaterThan(0);
    await search.fill('zzzzzzzz');
    await search.fill('');
    await expect.poll(() => listbox.getByRole('option').count()).toBe(initial);
  });
});
