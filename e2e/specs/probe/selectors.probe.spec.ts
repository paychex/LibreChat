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

/** Kept short: every miss costs this much wall time. */
const PROBE_TIMEOUT = 2500;

type Group = {
  name: string;
  /** Reveals the surface under test (opens a menu, etc.). */
  open?: (page: Page) => Promise<void>;
  probes: Probe[];
};

const seen = (locator: ReturnType<Page['locator']>) =>
  locator
    .first()
    .waitFor({ state: 'attached', timeout: PROBE_TIMEOUT })
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

  // --- Side-nav entries ---
  { id: 'sidebar.nav', what: 'data-testid=nav', run: (p) => seen(p.getByTestId('nav')) },
  { id: 'sidebar.navRole', what: 'navigation landmark (any name)', run: (p) => seen(p.getByRole('navigation')) },
  { id: 'sidebar.newChat', what: 'data-testid=new-chat-button', run: (p) => seen(p.getByTestId('new-chat-button')) },
  { id: 'sideNav.mcpBuilder', what: 'data-testid=nav-panel-mcp-builder', run: (p) => seen(p.getByTestId('nav-panel-mcp-builder')) },
  { id: 'sideNav.files', what: 'data-testid=nav-panel-files', run: (p) => seen(p.getByTestId('nav-panel-files')) },
  { id: 'sideNav.skillsById', what: '#skills side-nav entry', run: (p) => seen(p.locator('#skills')) },
  {
    id: 'sideNav.skillsByName',
    what: 'control named "Skills" (new in v0.8.7)',
    run: (p) => seen(p.getByRole('button', { name: /^skills$/i })),
  },
];

/** Surfaces that must be opened first — probing them closed reports false MISSING. */
const MENU_GROUPS: Group[] = [
  {
    name: 'Account menu opened',
    open: (p) => p.getByTestId('nav-user').click(),
    probes: [
      {
        id: 'accountMenu.changelogLoose',
        what: 'menu item matching /changelog/i',
        run: (p) => seen(p.getByRole('menuitem', { name: /changelog/i })),
      },
      {
        id: 'accountMenu.changelogExact',
        what: 'menu item "Paychex Changelog"',
        run: (p) => seen(p.getByRole('menuitem', { name: 'Paychex Changelog' })),
      },
    ],
  },
  {
    name: 'Model selector opened',
    open: (p) => p.getByTestId('model-selector-button').click(),
    probes: [
      {
        id: 'modelSelector.anyOption',
        what: 'any option/menuitem in the list',
        run: (p) => seen(p.getByRole('option').or(p.getByRole('menuitem'))),
      },
      {
        id: 'modelSelector.defaultBadge',
        what: 'DEFAULT badge (Paychex)',
        run: (p) => seen(p.getByText('DEFAULT', { exact: true })),
      },
    ],
  },
  {
    name: 'Tools menu opened',
    open: (p) => p.getByRole('button', { name: /^tools$/i }).click(),
    probes: [
      {
        id: 'toolsMenu.skillsTestId',
        what: 'data-testid=tools-menu-skills',
        run: (p) => seen(p.getByTestId('tools-menu-skills')),
      },
      {
        id: 'toolsMenu.anyItem',
        what: 'any menu item',
        run: (p) => seen(p.getByRole('menuitem')),
      },
    ],
  },
  {
    name: 'Attach file menu opened',
    open: (p) => p.getByRole('button', { name: /attach file/i }).click(),
    probes: [
      { id: 'attachMenu.anyItem', what: 'any menu item', run: (p) => seen(p.getByRole('menuitem')) },
      {
        id: 'attachMenu.imageDescription',
        what: 'image upload description copy (Paychex UX)',
        run: (p) => seen(p.getByText(/add an image/i)),
      },
    ],
  },
];

test.describe('Selector probe', () => {
  test('report which candidate selectors resolve', async ({ page }) => {
    // Every miss burns PROBE_TIMEOUT, so the default 30s is far too tight.
    test.setTimeout(180000);

    await page.goto('/c/new', { waitUntil: 'domcontentloaded' });
    await page
      .getByTestId('text-input')
      .waitFor({ state: 'attached', timeout: 20000 })
      .catch(() => undefined);

    const results: { group: string; id: string; ok: boolean; what: string }[] = [];

    const record = async (group: string, probes: Probe[], reachable: boolean) => {
      for (const probe of probes) {
        const ok = reachable ? await probe.run(page).catch(() => false) : false;
        results.push({ group, id: probe.id, ok, what: probe.what });
      }
    };

    await record('Landing (no interaction)', PROBES, true);

    for (const group of MENU_GROUPS) {
      const opened = await group
        .open!(page)
        .then(() => true)
        .catch(() => false);
      await page.waitForTimeout(500);

      if (!opened) {
        results.push({
          group: group.name,
          id: 'OPEN_FAILED',
          ok: false,
          what: 'could not open this surface — its probes are inconclusive',
        });
      }
      await record(group.name, group.probes, opened);

      await page.keyboard.press('Escape').catch(() => undefined);
      await page.waitForTimeout(300);
    }

    const pad = Math.max(...results.map((r) => r.id.length));
    const lines = ['', '===== SELECTOR PROBE ====='];
    let currentGroup = '';
    for (const r of results) {
      if (r.group !== currentGroup) {
        currentGroup = r.group;
        lines.push(`-- ${currentGroup} --`);
      }
      lines.push(`${r.ok ? 'FOUND__' : 'MISSING'}|${r.id.padEnd(pad)}|${r.what}`);
    }
    lines.push(`===== ${results.filter((r) => r.ok).length}/${results.length} resolved =====`, '');
    console.log(lines.join('\n'));

    // The probe reports; it does not gate. Only a total wipeout means the run itself broke.
    expect(results.some((r) => r.ok)).toBe(true);
  });
});
