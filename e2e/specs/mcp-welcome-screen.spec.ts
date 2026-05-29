import { test, expect } from '@playwright/test';
import { loginAndGoToChat } from './mcp-helpers';

test.describe('Welcome screen', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
  });

  test('greets the logged-in user by display name', async ({ page }) => {
    const greeting = page.getByText(/Good (morning|afternoon|evening), \w+/i);
    await expect(greeting).toBeVisible();
    const text = await greeting.textContent();
    expect(text).toMatch(/Good (morning|afternoon|evening), \S+/i);
  });

  test('renders a model logo image alongside the greeting', async ({ page }) => {
    const main = page.getByRole('main');
    // The model logo appears as a named img (e.g. "GPT-4o")
    const modelImg = main.locator('img[alt]').first();
    await expect(modelImg).toBeVisible();
    const alt = await modelImg.getAttribute('alt');
    expect(alt).toBeTruthy();
  });
});
