import { expect, test } from '@playwright/test';
import { closeOverlay, gotoChat } from './helpers';

/**
 * Features introduced or reshaped by the upstream v0.8.7 merge. A failure here
 * points at the upgrade rather than at Paychex code, which is the distinction
 * the merge triage depends on.
 */
test.describe('Upstream v0.8.7 features', () => {
  test('Skills panel is available in the side nav', { tag: ['@upstream'] }, async ({ page }) => {
    await gotoChat(page);

    const skills = page.getByTestId('nav-panel-skills');
    await expect(skills).toBeVisible();

    // Assert the toggle, not a "Skills" accessible name — the nav button itself
    // carries that name, so matching on it would pass even if nothing opened.
    await skills.click();
    await expect(skills).toHaveAttribute('aria-pressed', 'true');
  });

  test('Skills is offered as a tool in the composer', { tag: ['@upstream'] }, async ({ page }) => {
    await gotoChat(page);

    await page.locator('#tools-dropdown-button').click();
    await expect(page.getByTestId('tools-menu-skills')).toBeVisible();

    await closeOverlay(page);
  });

  test('MCP servers control is present in the composer', {
    tag: ['@upstream'],
  }, async ({ page }) => {
    await gotoChat(page);
    await expect(page.getByRole('button', { name: 'MCP Servers' })).toBeVisible();
  });

  test('Agent Builder panel opens', { tag: ['@upstream'] }, async ({ page }) => {
    await gotoChat(page);

    await page.getByTestId('nav-panel-agents').click();
    await expect(page.getByTestId('nav-panel-agents')).toHaveAttribute('aria-pressed', 'true');
  });
});
