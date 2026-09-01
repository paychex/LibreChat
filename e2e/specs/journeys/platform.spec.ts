import { expect, test } from '@playwright/test';
import { gotoChat } from './helpers';

/**
 * Core application surfaces that must survive any upgrade. These are upstream
 * features, but a failure means the deployed environment is broken for users
 * regardless of who caused it.
 */
test.describe('Platform health', () => {
  test('Composer accepts input and enables sending', {
    tag: ['@platform', '@critical'],
  }, async ({ page }) => {
    await gotoChat(page);

    const input = page.getByTestId('text-input');
    await expect(input).toBeVisible();

    // Send stays disabled until there is something to send.
    await expect(page.getByTestId('send-button')).toBeDisabled();

    await input.fill('E2E journey check — not submitted');
    await expect(page.getByTestId('send-button')).toBeEnabled();

    await input.fill('');
  });

  test('Control Panel landmark is present', { tag: ['@platform'] }, async ({ page }) => {
    await gotoChat(page);
    await expect(page.getByRole('complementary', { name: 'Control Panel' })).toBeVisible();
  });

  test('Side navigation exposes the expected panels', {
    tag: ['@platform'],
  }, async ({ page }) => {
    await gotoChat(page);

    for (const testId of [
      'nav-panel-conversations',
      'nav-panel-agents',
      'nav-panel-prompt-catalog',
      'nav-panel-files',
      'nav-panel-mcp-builder',
    ]) {
      await expect(page.getByTestId(testId), `${testId} missing from side nav`).toBeVisible();
    }
  });

  test('Model selector lists selectable endpoints', { tag: ['@platform'] }, async ({ page }) => {
    await gotoChat(page);

    await page.getByTestId('model-selector-button').click();
    await expect(page.getByRole('option').first()).toBeVisible();
  });
});
