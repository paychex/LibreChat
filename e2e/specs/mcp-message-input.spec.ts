import { test, expect } from '@playwright/test';
import { loginAndGoToChat } from './mcp-helpers';

test.describe('Message input', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
  });

  test('renders an empty Message input textbox with model placeholder', async ({ page }) => {
    const input = page.getByRole('textbox', { name: 'Message input' });
    await expect(input).toBeVisible();
    const placeholder = await input.getAttribute('placeholder');
    expect(placeholder ?? '').toMatch(/^Message /);
  });

  test('Send button is disabled when the input is empty', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });

  test('Send button becomes enabled after typing', async ({ page }) => {
    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.click();
    await input.fill('Hello, world');
    await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
  });

  test('clearing the input disables Send again', async ({ page }) => {
    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.fill('temp');
    await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
    await input.fill('');
    await expect(page.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });
});
