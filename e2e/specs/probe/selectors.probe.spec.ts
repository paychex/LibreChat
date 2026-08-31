import { test, expect, type Page } from '@playwright/test';

/**
 * Reports which candidate selectors resolve against a live environment.
 *
 * Deliberately non-failing: one run yields the full picture rather than stopping
 * at the first miss. Findings feed e2e/coverage-map.json and the journey suite.
 */

type Probe = {
  id: string;
  what: string;
  run: (page: Page) => Promise<boolean>;
};

const seen = (locator: ReturnType<Page['locator']>) =>
  locator
    .first()
    .waitFor({ state: 'attached', timeout: 4000 })
    .then(() => true)
    .catch(() => false);

const PROBES: Probe[] = [
  // --- Paychex analytics ---
  {
    id: 'pendo.window',
    what: 'window.pendo is initialized',
    run: (p) => p.evaluate(() => typeof (window as unknown as { pendo?: unknown }).pendo === 'object'),
  },
  { id: 'pendo.agentUsers', what: '#agentUsers tracking span', run: (p) => seen(p.locator('#agentUsers')) },

  // --- Paychex Changelog ---
  { id: 'changelog.navUser', what: 'nav-user trigger', run: (p) => seen(p.getByTestId('nav-user')) },
  {
    id: 'changelog.footerLink',
    what: 'Changelog link in footer',
    run: (p) => seen(p.getByRole('contentinfo').getByRole('link', { name: /changelog/i })),
  },

  // --- Prompt Catalog (Paychex) ---
  { id: 'promptCatalog.navById', what: '#prompt-catalog side-nav button', run: (p) => seen(p.locator('#prompt-catalog')) },
  {
    id: 'promptCatalog.navByName',
    what: 'button named "Prompt Catalog"',
    run: (p) => seen(p.getByRole('button', { name: 'Prompt Catalog', exact: true })),
  },
  {
    id: 'promptCatalog.panelLandmark',
    what: 'navigation landmark "Prompt Catalog"',
    run: (p) => seen(p.getByRole('navigation', { name: 'Prompt Catalog' })),
  },

  // --- Control Panel landmark (changed in v0.8.7) ---
  {
    id: 'controlPanel.complementary',
    what: 'complementary landmark "Control Panel" (v0.8.7)',
    run: (p) => seen(p.getByRole('complementary', { name: 'Control Panel' })),
  },
  {
    id: 'controlPanel.legacyNav',
    what: 'LEGACY navigation landmark "Controls" (expected GONE)',
    run: (p) => seen(p.getByRole('navigation', { name: 'Controls' })),
  },

  // --- Composer surfaces (upstream testids) ---
  { id: 'composer.textInput', what: 'data-testid=text-input', run: (p) => seen(p.getByTestId('text-input')) },
  { id: 'composer.sendButton', what: 'data-testid=send-button', run: (p) => seen(p.getByTestId('send-button')) },
  { id: 'composer.toolsMenu', what: 'data-testid=tools-menu-skills', run: (p) => seen(p.getByTestId('tools-menu-skills')) },
  {
    id: 'composer.attachFileButton',
    what: 'Attach File Options button',
    run: (p) => seen(p.getByRole('button', { name: /attach file/i })),
  },
  {
    id: 'composer.mcpServers',
    what: 'MCP Servers control',
    run: (p) => seen(p.getByRole('button', { name: /mcp server/i })),
  },

  // --- Model selector + Paychex DEFAULT badge ---
  {
    id: 'modelSelector.button',
    what: 'data-testid=model-selector-button',
    run: (p) => seen(p.getByTestId('model-selector-button')),
  },
  { id: 'modelSelector.defaultBadge', what: 'DEFAULT badge text', run: (p) => seen(p.getByText('DEFAULT', { exact: true })) },

  // --- Side-nav entries ---
  { id: 'sidebar.nav', what: 'data-testid=nav', run: (p) => seen(p.getByTestId('nav')) },
  { id: 'sidebar.newChat', what: 'data-testid=new-chat-button', run: (p) => seen(p.getByTestId('new-chat-button')) },
  { id: 'sideNav.mcpBuilder', what: 'data-testid=nav-panel-mcp-builder', run: (p) => seen(p.getByTestId('nav-panel-mcp-builder')) },
  { id: 'sideNav.skills', what: 'Skills entry (new in v0.8.7)', run: (p) => seen(p.locator('#skills')) },
  { id: 'sideNav.files', what: 'data-testid=nav-panel-files', run: (p) => seen(p.getByTestId('nav-panel-files')) },
];

test.describe('Selector probe', () => {
  test('report which candidate selectors resolve', async ({ page }) => {
    await page.goto('/c/new', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('text-input').waitFor({ state: 'attached', timeout: 20000 }).catch(() => undefined);

    const results: { id: string; ok: boolean; what: string }[] = [];
    for (const probe of PROBES) {
      let ok = false;
      try {
        ok = await probe.run(page);
      } catch {
        ok = false;
      }
      results.push({ id: probe.id, ok, what: probe.what });
    }

    const pad = Math.max(...results.map((r) => r.id.length));
    console.log('\n===== SELECTOR PROBE =====');
    for (const r of results) {
      console.log(`${r.ok ? 'FOUND  ' : 'MISSING'} ${r.id.padEnd(pad)}  ${r.what}`);
    }
    console.log(`===== ${results.filter((r) => r.ok).length}/${results.length} resolved =====\n`);

    // The probe reports; it does not gate. Only a total wipeout indicates a broken run.
    expect(results.some((r) => r.ok)).toBe(true);
  });
});
