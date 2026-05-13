import { test, expect } from '@playwright/test';
import { clickControlPanelButton, dismissReactQueryDevtools, loginAndGoToChat } from './mcp-helpers';

test.describe('Control Panel: Agent Builder', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToChat(page);
    // React Query Devtools overlay can intercept pointer events on the
    // right-side control panel in dev mode — dismiss it before tests.
    await dismissReactQueryDevtools(page);
  });

  test('expands and renders the Agent Builder form', async ({ page }) => {
    await clickControlPanelButton(page, 'Agent Builder');
    const button = page.getByRole('button', { name: 'Agent Builder' });
    await expect.poll(() => button.getAttribute('aria-expanded')).toBe('true');
    const panel = page.getByRole('navigation', { name: 'Controls' });
    await expect(panel).toContainText(/Create New Agent/i);
    await expect(panel).toContainText(/Instructions/i);
    await expect(panel).toContainText(/Capabilities/i);
  });

  test('shows tool capability sections (File Search, Web Search, Artifacts)', async ({ page }) => {
    await clickControlPanelButton(page, 'Agent Builder');
    const panel = page.getByRole('navigation', { name: 'Controls' });
    await expect(panel).toContainText(/File Search/i);
    await expect(panel).toContainText(/Web Search/i);
    await expect(panel).toContainText(/Artifacts/i);
  });
});
