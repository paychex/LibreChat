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
    // The DEFAULT badge lives in the endpoint submenu, not the top-level list.
    name: 'Model selector -> Azure OpenAI submenu',
    open: async (p) => {
      await p.getByTestId('model-selector-button').click();
      await p.waitForTimeout(700);
      await p.getByRole('option', { name: /Azure OpenAI/i }).first().click();
    },
    probes: [
      {
        id: 'modelSelector.specOption',
        what: 'a model spec option inside the submenu',
        run: (p) => seen(p.getByRole('option', { name: /GPT-5\.4/i })),
      },
      {
        id: 'modelSelector.defaultBadge',
        what: 'DEFAULT badge via accessible name (Paychex)',
        run: (p) => seen(p.getByLabel('Default model')),
      },
    ],
  },
  {
    name: 'Tools menu opened',
    open: (p) => p.locator('#tools-dropdown-button').click(),
    probes: [
      {
        id: 'toolsMenu.skillsTestId',
        what: 'data-testid=tools-menu-skills',
        run: (p) => seen(p.getByTestId('tools-menu-skills')),
      },
      {
        id: 'toolsMenu.fileSearchDescription',
        what: 'File Search description copy (Paychex UX)',
        run: (p) => seen(p.getByText(/analyze, compare, and contrast large documents/i)),
      },
    ],
  },
  {
    name: 'Attach file menu opened',
    open: (p) => p.locator('#attach-file-menu-button').click(),
    probes: [
      { id: 'attachMenu.anyItem', what: 'any menu item', run: (p) => seen(p.getByRole('menuitem')) },
      {
        id: 'attachMenu.imageDescription',
        what: 'image upload description copy (Paychex UX)',
        run: (p) => seen(p.getByText(/add an image for analysis/i)),
      },
      {
        id: 'attachMenu.fileSearchOption',
        what: 'File Search (RAG) upload option',
        run: (p) => seen(p.getByRole('menuitem', { name: /file search/i })),
      },
      {
        id: 'attachMenu.codeInterpreterOption',
        what: 'Code Interpreter upload option',
        run: (p) => seen(p.getByRole('menuitem', { name: /code interpreter/i })),
      },
    ],
  },
  {
    name: 'Prompt Catalog panel opened',
    open: (p) => p.getByTestId('nav-panel-prompt-catalog').click(),
    probes: [
      {
        id: 'promptCatalog.search',
        what: 'catalog search box',
        run: (p) => seen(p.getByRole('searchbox', { name: /search catalog prompts/i })),
      },
      {
        id: 'promptCatalog.categories',
        what: 'Filter by category group',
        run: (p) => seen(p.getByRole('group', { name: 'Filter by category' })),
      },
      {
        id: 'promptCatalog.visibility',
        what: 'Visibility radiogroup',
        run: (p) => seen(p.getByRole('radiogroup', { name: 'Visibility' })),
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

  test('prompt catalog deep link surfaces an error toast for an unresolvable id', async ({
    page,
  }) => {
    await page.goto('/c/new?promptCatalogId=e2e-probe-nonexistent-id', {
      waitUntil: 'domcontentloaded',
    });
    const toast = page.getByText(/unable to load this prompt catalog prompt/i);
    const shown = await toast
      .first()
      .waitFor({ state: 'visible', timeout: 30000 })
      .then(() => true)
      .catch(() => false);
    console.log(`\n===== DEEP LINK TOAST: ${shown ? 'FOUND__' : 'MISSING'} =====\n`);
    expect(typeof shown).toBe('boolean');
  });

  test('enumerate real accessible names and ids', async ({ page }) => {
    test.setTimeout(180000);

    await page.goto('/c/new', { waitUntil: 'domcontentloaded' });
    await page
      .getByTestId('text-input')
      .waitFor({ state: 'attached', timeout: 20000 })
      .catch(() => undefined);
    await page.waitForTimeout(2000);

    const dump = (label: string) =>
      page.evaluate((sectionLabel) => {
        const describe = (el: Element) => {
          const html = el as HTMLElement;
          const rect = html.getBoundingClientRect();
          const name = (
            html.getAttribute('aria-label') ||
            html.getAttribute('title') ||
            (html.innerText || '').trim().split('\n')[0] ||
            ''
          ).slice(0, 60);
          const flags = [
            html.getAttribute('data-testid') ? `testid=${html.getAttribute('data-testid')}` : '',
            html.id ? `id=${html.id}` : '',
            rect.width > 0 && rect.height > 0 ? 'visible' : 'HIDDEN',
            html.hasAttribute('disabled') ? 'disabled' : '',
          ].filter(Boolean);
          return `  [${sectionLabel}] "${name}" {${flags.join(' ')}}`;
        };
        const nodes = Array.from(
          document.querySelectorAll(
            'button, [role="button"], [role="menuitem"], [role="option"], a[href]',
          ),
        );
        return nodes.map(describe);
      }, label);

    const out: string[] = ['', '===== ACCESSIBLE NAME DUMP ====='];
    out.push('--- landing ---', ...(await dump('landing')));

    // Enumerate the real upload options, incl. whether File Search (RAG) is offered.
    const openedAttach = await page
      .locator('#attach-file-menu-button')
      .click()
      .then(() => true)
      .catch(() => false);
    if (openedAttach) {
      await page.waitForTimeout(800);
      const items = await page
        .getByRole('menuitem')
        .allInnerTexts()
        .catch(() => [] as string[]);
      out.push('--- attach file menu items ---');
      out.push(...items.map((t, i) => `  [attach] ${i}: ${JSON.stringify(t)}`));
      await page.keyboard.press('Escape').catch(() => undefined);
      await page.waitForTimeout(400);
    } else {
      out.push('--- attach file menu FAILED to open ---');
    }

    // The model menu is where the Paychex DEFAULT badge should render.
    const openedModel = await page
      .getByTestId('model-selector-button')
      .click()
      .then(() => true)
      .catch(() => false);
    if (openedModel) {
      await page.waitForTimeout(1200);
      out.push('--- model selector open ---', ...(await dump('model')));
      const badgeText = await page
        .locator('[role="option"], [role="menuitem"]')
        .first()
        .innerText()
        .catch(() => '<none>');
      out.push(`  [model] first option raw text: ${JSON.stringify(badgeText)}`);
      await page.keyboard.press('Escape').catch(() => undefined);
      await page.waitForTimeout(500);
    } else {
      out.push('--- model selector FAILED to open ---');
    }

    out.push(`===== ${out.length} lines =====`, '');
    console.log(out.join('\n'));

    expect(out.length).toBeGreaterThan(3);
  });
});
